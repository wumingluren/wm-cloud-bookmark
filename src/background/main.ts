import { onMessage } from 'webext-bridge/background'
import { MenuService } from './services/menuService'
import { OmniService } from './services/omniService'
import {
  type FeishuConfigItem,
  STORAGE_KEYS,
  getSettingsFromStorage,
} from '~/composables/useSettings'
import { isForbiddenUrl } from '~/env'
import type {
  OmniActionDescriptor,
  OmniResult,
  OmniSearchRequest,
  OmniSearchResponse,
} from '~/omni/types'
import { FeishuService } from '~/services/feishu'

if (import.meta.hot) {
  // @ts-expect-error for background HMR
  import('/@vite/client')
  import('./contentScriptHMR')
}

const omniService = new OmniService()

async function getValidFeishuService(): Promise<FeishuService> {
  const configs = await getSettingsFromStorage<FeishuConfigItem[]>(
    STORAGE_KEYS.FEISHU_CONFIGS,
    [],
  )
  const activeConfigId = await getSettingsFromStorage<string>(
    STORAGE_KEYS.ACTIVE_CONFIG_ID,
    '',
  )
  const activeConfig = configs.find(config => config.id === activeConfigId)

  if (activeConfig?.appId && activeConfig.appSecret && activeConfig.baseId && activeConfig.tableId) {
    return new FeishuService(activeConfig)
  }

  const legacyConfig = await getSettingsFromStorage(
    STORAGE_KEYS.LEGACY_FEISHU_CONFIG,
    {
      appId: '',
      appSecret: '',
      baseId: '',
      tableId: '',
    },
  )

  if (!legacyConfig?.appId || !legacyConfig?.appSecret) {
    throw new Error('请先配置飞书应用的 AppID 和 AppSecret')
  }

  return new FeishuService(legacyConfig)
}

const USE_SIDE_PANEL = false

if (USE_SIDE_PANEL) {
  // @ts-expect-error Chromium sidePanel is not in shared polyfill types
  browser.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error: unknown) => console.error(error))
}

async function injectContentScript(tabId: number): Promise<void> {
  const scriptingApi = (browser as typeof browser & {
    scripting?: {
      executeScript?: (options: {
        target: { tabId: number }
        files: string[]
      }) => Promise<unknown>
    }
  }).scripting

  if (!scriptingApi?.executeScript) {
    throw new Error('当前浏览器不支持动态注入内容脚本')
  }

  await scriptingApi.executeScript({
    target: { tabId },
    files: ['dist/contentScripts/index.global.js'],
  })

  await new Promise(resolve => setTimeout(resolve, 80))
}

async function openOmniPaletteInTab(tabId: number): Promise<void> {
  try {
    await browser.tabs.sendMessage(tabId, {
      type: 'toggleOmniPalette',
    })
  }
  catch {
    await injectContentScript(tabId)
    await browser.tabs.sendMessage(tabId, {
      type: 'toggleOmniPalette',
    })
  }
}

browser.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-omni') {
    return
  }

  const [activeTab] = await browser.tabs.query({
    active: true,
    lastFocusedWindow: true,
  })

  if (!activeTab?.id || !activeTab.url || isForbiddenUrl(activeTab.url)) {
    console.warn('当前页面不支持打开 Omni 面板')
    return
  }

  try {
    await openOmniPaletteInTab(activeTab.id)
  }
  catch (error) {
    console.error('打开 Omni 面板失败:', error)
  }
})

onMessage(
  'saveBookmark',
  async (message: { data: { title: string, url: string, tags?: string } }) => {
    try {
      const feishuService = await getValidFeishuService()
      await feishuService.saveBookmark(message.data)

      return { success: true }
    }
    catch (error) {
      console.error('保存书签失败:', error)
      return { success: false, error: (error as Error).message }
    }
  },
)

onMessage('checkUrl', async (message: { data: { url: string } }) => {
  try {
    const feishuService = await getValidFeishuService()
    const exists = await feishuService.isUrlExists(message.data.url)

    return {
      success: true,
      exists,
      error: null,
    }
  }
  catch (error) {
    console.error('检查 URL 失败:', error)
    return {
      success: false,
      exists: false,
      error: (error as Error).message,
    }
  }
})

async function initialize() {
  const menuService = new MenuService()
  await menuService.initialize()
}

initialize().catch(console.error)

onMessage('getRecommendedBookmarks', async () => {
  try {
    const feishuService = await getValidFeishuService()
    const recommendedBookmarks = await feishuService.getRecommendedBookmarks()

    return {
      success: true,
      data: recommendedBookmarks,
    }
  }
  catch (error) {
    console.error('获取推荐书签失败:', error)
    return {
      success: false,
      error: (error as Error).message || '获取推荐书签失败',
    }
  }
})

onMessage('searchBookmarks', async (message: { data: { query: string } }) => {
  try {
    const feishuService = await getValidFeishuService()
    const searchResults = await feishuService.searchBookmarks(message.data.query)

    return {
      success: true,
      data: searchResults,
    }
  }
  catch (error) {
    console.error('搜索书签失败:', error)
    return {
      success: false,
      error: (error as Error).message || '搜索书签失败',
    }
  }
})

onMessage('executeSearch', async (message: { data: { query: string } }) => {
  try {
    const response = await omniService.execute({
      command: 'search-web',
      label: '搜索网页',
      payload: { query: message.data.query },
    })

    return response
  }
  catch (error) {
    console.error('执行搜索失败:', error)
    return {
      success: false,
      error: (error as Error).message || '搜索执行失败',
    }
  }
})

onMessage('omni:search', async (message) => {
  const payload = message.data as unknown as OmniSearchRequest

  try {
    const searchPayload = await omniService.search(
      payload.query,
      payload.sources,
    )
    const response: OmniSearchResponse = {
      success: true,
      data: searchPayload,
    }

    return response
  }
  catch (error) {
    return {
      success: false,
      error: (error as Error).message || 'Omni 搜索失败',
    } satisfies OmniSearchResponse
  }
})

onMessage(
  'omni:execute',
  async (message) => {
    const payload = message.data as unknown as {
      action: OmniActionDescriptor
      result?: OmniResult
    }

    return omniService.execute(payload.action, payload.result)
  },
)
