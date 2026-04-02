import type { Bookmarks, Tabs } from 'webextension-polyfill'
import { type FeishuConfigItem, STORAGE_KEYS, getSettingsFromStorage } from '~/composables/useSettings'
import { isForbiddenUrl } from '~/env'
import { DEFAULT_OMNI_SETTINGS } from '~/omni/constants'
import { parseOmniQuery } from '~/omni/parser/parseQuery'
import type {
  OmniActionDescriptor,
  OmniActionExecutionResult,
  OmniQueryMode,
  OmniResult,
  OmniSearchPayload,
  OmniSearchSource,
  OmniSettings,
} from '~/omni/types'
import { orderOmniResults } from '~/omni/utils/orderResults'
import { FeishuService } from '~/services/feishu'

const RECENT_STORAGE_KEY = 'omni-recent-items'
const MAX_RECENT_ITEMS = 8

interface ActiveFeishuConfig {
  name: string
  appId: string
  appSecret: string
  baseId: string
  tableId: string
}

interface ActionDefinition {
  id: string
  title: string
  subtitle: string
  keywords: string[]
  dangerous?: boolean
}

export class OmniService {
  public async search(
    rawQuery: string,
    sources?: OmniSearchSource[],
  ): Promise<OmniSearchPayload> {
    const settings = await this.getSettings()

    if (!settings.enabled) {
      throw new Error('Omni 已在设置中停用，请先到设置页开启。')
    }

    const parsed = parseOmniQuery(rawQuery)
    const limit = this.getResultLimit(settings)
    const results: OmniResult[] = []
    const tasks: Array<Promise<OmniResult[]>> = []
    let message = ''
    const enabledSources = sources ? new Set(sources) : null

    if (!parsed.keyword) {
      if (this.includesSource(enabledSources, 'recent') && settings.showRecent) {
        tasks.push(this.getRecentItems(limit))
      }

      if (this.includesSource(enabledSources, 'actions') && settings.searchActions) {
        tasks.push(this.searchActions('', limit))
      }

      if (this.includesSource(enabledSources, 'tabs') && settings.searchTabs) {
        tasks.push(this.searchTabs('', limit))
      }

      const settled = await Promise.allSettled(tasks)
      settled.forEach((entry) => {
        if (entry.status === 'fulfilled') {
          results.push(...entry.value)
        }
      })

      return {
        parsed,
        results: this.sortResults(results),
      }
    }

    if (
      this.includesSource(enabledSources, 'feishu')
      && this.shouldSearchMode(parsed.mode, 'feishu')
      && settings.searchFeishu
    ) {
      tasks.push(this.searchFeishu(parsed.keyword, limit))
    }
    else if (this.includesSource(enabledSources, 'feishu') && parsed.mode === 'feishu') {
      message = '请先在设置中开启云书签搜索，或完成飞书配置。'
    }

    if (
      this.includesSource(enabledSources, 'tabs')
      && this.shouldSearchMode(parsed.mode, 'tabs')
      && settings.searchTabs
    ) {
      tasks.push(this.searchTabs(parsed.keyword, limit))
    }

    if (
      this.includesSource(enabledSources, 'bookmarks')
      && this.shouldSearchMode(parsed.mode, 'bookmarks')
      && settings.searchBookmarks
    ) {
      tasks.push(this.searchBrowserBookmarks(parsed.keyword, limit))
    }

    if (
      this.includesSource(enabledSources, 'history')
      && this.shouldSearchMode(parsed.mode, 'history')
      && settings.searchHistory
    ) {
      tasks.push(this.searchHistory(parsed.keyword, limit))
    }

    if (
      this.includesSource(enabledSources, 'actions')
      && this.shouldSearchMode(parsed.mode, 'actions')
      && settings.searchActions
    ) {
      tasks.push(this.searchActions(parsed.keyword, limit))
    }

    if (this.includesSource(enabledSources, 'search') && parsed.mode === 'all') {
      results.push(this.buildSearchSuggestionResult(parsed.keyword))
    }

    const settled = await Promise.allSettled(tasks)

    settled.forEach((entry) => {
      if (entry.status === 'fulfilled') {
        results.push(...entry.value)
      }
    })

    if (
      this.includesSource(enabledSources, 'feishu')
      && parsed.mode === 'feishu'
      && !results.some(result => result.group === 'feishu')
    ) {
      message ||= '没有命中云书签，或者飞书配置尚未完成。'
    }

    return {
      parsed,
      results: this.sortResults(results),
      message,
    }
  }

  public async execute(
    action: OmniActionDescriptor,
    result?: OmniResult,
  ): Promise<OmniActionExecutionResult> {
    try {
      const executionResult = await this.runAction(action)

      if (executionResult.success && result) {
        await this.saveRecentItem(result)
      }

      return executionResult
    }
    catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      }
    }
  }

  private async getSettings(): Promise<OmniSettings> {
    return getSettingsFromStorage<OmniSettings>(
      STORAGE_KEYS.OMNI_SETTINGS,
      DEFAULT_OMNI_SETTINGS,
    )
  }

  private getResultLimit(settings: OmniSettings): number {
    return Math.max(3, Math.min(settings.maxResultsPerGroup, 12))
  }

  private shouldSearchMode(mode: OmniQueryMode, expected: OmniQueryMode): boolean {
    return mode === 'all' || mode === expected
  }

  private includesSource(
    selectedSources: Set<OmniSearchSource> | null,
    source: OmniSearchSource,
  ): boolean {
    return selectedSources ? selectedSources.has(source) : true
  }

  private sortResults(results: OmniResult[]): OmniResult[] {
    return orderOmniResults(results)
  }

  private async searchFeishu(query: string, limit: number): Promise<OmniResult[]> {
    const config = await this.getActiveFeishuConfig()

    if (!config) {
      return []
    }

    const feishuService = new FeishuService(config)
    const bookmarks = await feishuService.searchBookmarks(query)

    return this.sliceByScore(
      bookmarks.map((bookmark: any) => {
        const host = this.getHost(bookmark.url)
        const score = this.getSearchScore(query, [
          bookmark.title,
          bookmark.url,
          bookmark.description,
          ...(bookmark.tags ?? []),
        ])

        return {
          id: `feishu:${bookmark.id}`,
          group: 'feishu',
          sourceLabel: config.name,
          title: bookmark.title || host || '未命名云书签',
          subtitle: bookmark.description?.trim() || host || bookmark.url,
          url: bookmark.url,
          icon: this.getFaviconUrl(bookmark.url),
          badges: (bookmark.tags ?? []).slice(0, 3),
          score,
          primaryAction: {
            command: 'open-url',
            label: '打开链接',
            payload: { url: bookmark.url },
          },
        } satisfies OmniResult
      }),
      limit,
    )
  }

  private async searchBrowserBookmarks(
    query: string,
    limit: number,
  ): Promise<OmniResult[]> {
    const nodes = await browser.bookmarks.search(query)

    return this.sliceByScore(
      nodes
        .filter((node): node is Bookmarks.BookmarkTreeNode => Boolean(node.url))
        .map((node) => {
          const host = this.getHost(node.url)
          const score = this.getSearchScore(query, [node.title, node.url, host])

          return {
            id: `bookmark:${node.id}`,
            group: 'bookmarks',
            sourceLabel: '浏览器书签',
            title: node.title || host || '未命名书签',
            subtitle: node.url || host,
            url: node.url,
            icon: this.getFaviconUrl(node.url),
            score,
            primaryAction: {
              command: 'open-url',
              label: '打开链接',
              payload: { url: node.url },
            },
          } satisfies OmniResult
        }),
      limit,
    )
  }

  private async searchTabs(query: string, limit: number): Promise<OmniResult[]> {
    const [activeTab] = await browser.tabs.query({ active: true, lastFocusedWindow: true })
    const tabs = await browser.tabs.query({})

    return this.sliceByScore(
      tabs
        .filter(tab => Boolean(tab.id))
        .map((tab) => {
          const title = tab.title || this.getHost(tab.url || tab.pendingUrl) || '未命名标签页'
          const url = tab.url || tab.pendingUrl || ''
          const host = this.getHost(url)
          let score = query
            ? this.getSearchScore(query, [title, url, host])
            : 40

          if (tab.windowId === activeTab?.windowId) {
            score += 20
          }

          if (tab.active) {
            score += 30
          }

          if (tab.pinned) {
            score += 4
          }

          const badges = [
            tab.active ? '当前' : '',
            tab.pinned ? '固定' : '',
            tab.mutedInfo?.muted ? '静音' : '',
          ].filter(Boolean)

          return {
            id: `tab:${tab.id}`,
            group: 'tabs',
            sourceLabel: '标签页',
            title,
            subtitle: host || url,
            url,
            icon: tab.favIconUrl,
            badges,
            score,
            primaryAction: {
              command: 'switch-tab',
              label: '切换标签页',
              payload: {
                tabId: tab.id,
                windowId: tab.windowId,
              },
            },
          } satisfies OmniResult
        }),
      limit,
    )
  }

  private async searchHistory(query: string, limit: number): Promise<OmniResult[]> {
    const items = await browser.history.search({
      text: query,
      maxResults: limit * 2,
      startTime: 0,
    })

    return this.sliceByScore(
      items.map((item) => {
        const host = this.getHost(item.url)
        const score = this.getSearchScore(query, [item.title, item.url, host])
        const lastVisitedAt = item.lastVisitTime
          ? new Date(item.lastVisitTime).toLocaleString('zh-CN', {
              month: 'numeric',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : ''

        return {
          id: `history:${item.id}`,
          group: 'history',
          sourceLabel: '浏览历史',
          title: item.title || host || '未命名历史记录',
          subtitle: lastVisitedAt
            ? `${host || item.url} · ${lastVisitedAt}`
            : host || item.url,
          url: item.url,
          icon: this.getFaviconUrl(item.url),
          score,
          primaryAction: {
            command: 'open-url',
            label: '打开记录',
            payload: { url: item.url },
          },
        } satisfies OmniResult
      }),
      limit,
    )
  }

  private async searchActions(query: string, limit: number): Promise<OmniResult[]> {
    const actions = this.getActionDefinitions()
      .map((action) => {
        const score = query
          ? this.getSearchScore(query, [action.title, action.subtitle, ...action.keywords])
          : 50

        return {
          id: `action:${action.id}`,
          group: 'actions',
          sourceLabel: '快捷动作',
          title: action.title,
          subtitle: action.subtitle,
          badges: action.dangerous ? ['需确认'] : undefined,
          score,
          primaryAction: {
            command: action.id as OmniActionDescriptor['command'],
            label: '执行动作',
            dangerous: action.dangerous,
            payload: query ? { query } : undefined,
          },
        } satisfies OmniResult
      })
      .filter(item => query ? item.score > 0 : true)

    return this.sliceByScore(actions, limit)
  }

  private buildSearchSuggestionResult(query: string): OmniResult {
    return {
      id: `search:${query}`,
      group: 'search',
      sourceLabel: '默认搜索',
      title: `搜索网页：${query}`,
      subtitle: '使用浏览器默认搜索引擎打开新标签页',
      score: 15,
      primaryAction: {
        command: 'search-web',
        label: '搜索网页',
        payload: { query },
      },
    }
  }

  private sliceByScore(results: OmniResult[], limit: number): OmniResult[] {
    return [...results]
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
  }

  private getSearchScore(query: string, values: Array<string | undefined>): number {
    const normalizedQuery = this.normalizeText(query)

    if (!normalizedQuery) {
      return 1
    }

    let bestScore = 0

    values.forEach((value) => {
      const normalizedValue = this.normalizeText(value)

      if (!normalizedValue) {
        return
      }

      if (normalizedValue === normalizedQuery) {
        bestScore = Math.max(bestScore, 140)
        return
      }

      if (normalizedValue.startsWith(normalizedQuery)) {
        bestScore = Math.max(bestScore, 120)
        return
      }

      const wordIndex = normalizedValue.indexOf(` ${normalizedQuery}`)
      if (wordIndex >= 0) {
        bestScore = Math.max(bestScore, 100 - wordIndex)
        return
      }

      const containsIndex = normalizedValue.indexOf(normalizedQuery)
      if (containsIndex >= 0) {
        bestScore = Math.max(bestScore, 80 - containsIndex)
      }
    })

    return bestScore
  }

  private normalizeText(value?: string): string {
    return value?.trim().toLowerCase() ?? ''
  }

  private getHost(url?: string): string {
    if (!url) {
      return ''
    }

    try {
      return new URL(url).host
    }
    catch {
      return url.replace(/^https?:\/\//, '')
    }
  }

  private getFaviconUrl(url?: string): string | undefined {
    if (!url || isForbiddenUrl(url)) {
      return undefined
    }

    try {
      const faviconUrl = new URL(browser.runtime.getURL('/_favicon/'))
      faviconUrl.searchParams.set('pageUrl', url)
      faviconUrl.searchParams.set('size', '32')
      return faviconUrl.toString()
    }
    catch {
      try {
        return new URL('/favicon.ico', url).toString()
      }
      catch {
        return undefined
      }
    }
  }

  private getActionDefinitions(): ActionDefinition[] {
    return [
      {
        id: 'open-new-tab',
        title: '打开新标签页',
        subtitle: '快速创建一个空白标签页',
        keywords: ['new tab', 'blank', '新建'],
      },
      {
        id: 'open-options',
        title: '打开扩展设置',
        subtitle: '前往无名云书签配置页',
        keywords: ['settings', 'options', '配置'],
      },
      {
        id: 'open-sidepanel',
        title: '打开侧边栏',
        subtitle: '打开扩展侧边栏面板',
        keywords: ['sidepanel', 'sidebar', '侧边栏'],
      },
      {
        id: 'save-current-page-to-feishu',
        title: '收藏当前页到飞书',
        subtitle: '直接将当前标签页保存到飞书多维表格',
        keywords: ['save', 'bookmark', 'feishu', '收藏'],
      },
      {
        id: 'save-current-page-to-browser-bookmarks',
        title: '收藏当前页到浏览器书签',
        subtitle: '使用浏览器原生书签保存当前页面',
        keywords: ['save', 'bookmark', 'browser', '浏览器书签'],
      },
      {
        id: 'search-web',
        title: '搜索网页',
        subtitle: '用默认搜索引擎搜索当前输入',
        keywords: ['search', 'web', '网页搜索'],
      },
      {
        id: 'close-current-tab',
        title: '关闭当前标签页',
        subtitle: '关闭当前活动标签页',
        keywords: ['close', 'tab', '关闭'],
        dangerous: true,
      },
      {
        id: 'close-other-tabs',
        title: '关闭其他标签页',
        subtitle: '保留当前标签页，关闭同窗口其他标签页',
        keywords: ['close others', 'tabs', '关闭其他'],
        dangerous: true,
      },
      {
        id: 'close-tabs-to-right',
        title: '关闭右侧标签页',
        subtitle: '关闭当前标签页右侧的所有标签页',
        keywords: ['close right tabs', 'tabs', '右侧'],
        dangerous: true,
      },
      {
        id: 'toggle-tab-pin',
        title: '固定或取消固定当前标签页',
        subtitle: '切换当前标签页的固定状态',
        keywords: ['pin', 'unpin', '固定'],
      },
      {
        id: 'toggle-tab-mute',
        title: '静音或取消静音当前标签页',
        subtitle: '切换当前标签页的声音状态',
        keywords: ['mute', 'unmute', '静音'],
      },
    ]
  }

  private async runAction(
    action: OmniActionDescriptor,
  ): Promise<OmniActionExecutionResult> {
    switch (action.command) {
      case 'open-url':
        return this.openUrl(String(action.payload?.url ?? ''))

      case 'switch-tab':
        return this.switchTab(
          Number(action.payload?.tabId),
          Number(action.payload?.windowId),
        )

      case 'open-new-tab':
        await browser.tabs.create({})
        return {
          success: true,
          shouldClose: true,
        }

      case 'open-options':
        await browser.runtime.openOptionsPage()
        return {
          success: true,
          shouldClose: true,
        }

      case 'open-sidepanel':
        return this.openSidepanel()

      case 'search-web':
        return this.searchWeb(String(action.payload?.query ?? ''))

      case 'save-current-page-to-feishu':
        return this.saveCurrentPageToFeishu()

      case 'save-current-page-to-browser-bookmarks':
        return this.saveCurrentPageToBrowserBookmarks()

      case 'close-current-tab':
        return this.closeCurrentTab()

      case 'close-tab':
        return this.closeTab(Number(action.payload?.tabId))

      case 'close-other-tabs':
        return this.closeOtherTabs()

      case 'close-tabs-to-right':
        return this.closeTabsToRight()

      case 'toggle-tab-pin':
        return this.toggleCurrentTabPin()

      case 'toggle-tab-mute':
        return this.toggleCurrentTabMute()

      default:
        throw new Error(`暂不支持的动作：${action.command}`)
    }
  }

  private async openUrl(url: string): Promise<OmniActionExecutionResult> {
    if (!url) {
      throw new Error('链接为空，无法打开')
    }

    await browser.tabs.create({ url })
    return {
      success: true,
      shouldClose: true,
    }
  }

  private async switchTab(
    tabId: number,
    windowId: number,
  ): Promise<OmniActionExecutionResult> {
    await browser.tabs.update(tabId, { active: true })
    await browser.windows.update(windowId, { focused: true })

    return {
      success: true,
      shouldClose: true,
    }
  }

  private async openSidepanel(): Promise<OmniActionExecutionResult> {
    const activeTab = await this.getCurrentTab()
    const sidePanelApi = (browser as typeof browser & {
      sidePanel?: {
        open?: (options: { windowId?: number }) => Promise<void>
      }
    }).sidePanel

    if (!sidePanelApi?.open) {
      return {
        success: false,
        error: '当前浏览器暂不支持程序化打开侧边栏。',
      }
    }

    await sidePanelApi.open({ windowId: activeTab.windowId })
    return {
      success: true,
      shouldClose: true,
    }
  }

  private async searchWeb(query: string): Promise<OmniActionExecutionResult> {
    if (!query.trim()) {
      throw new Error('请输入要搜索的关键词')
    }

    if (browser.search?.query) {
      await browser.search.query({ text: query, disposition: 'NEW_TAB' })
    }
    else {
      await browser.tabs.create({
        url: `https://www.baidu.com/s?q=${encodeURIComponent(query)}`,
      })
    }

    return {
      success: true,
      shouldClose: true,
    }
  }

  private async saveCurrentPageToFeishu(): Promise<OmniActionExecutionResult> {
    const currentTab = await this.getCurrentTab()

    if (!currentTab.url || isForbiddenUrl(currentTab.url)) {
      throw new Error('当前页面无法保存到飞书')
    }

    const config = await this.getActiveFeishuConfig()

    if (!config) {
      throw new Error('请先在设置页配置飞书应用信息')
    }

    const feishuService = new FeishuService(config)
    await feishuService.saveBookmark({
      title: currentTab.title || this.getHost(currentTab.url),
      url: currentTab.url,
    })

    return {
      success: true,
      message: '已收藏到飞书',
      shouldRefresh: true,
    }
  }

  private async saveCurrentPageToBrowserBookmarks(): Promise<OmniActionExecutionResult> {
    const currentTab = await this.getCurrentTab()

    if (!currentTab.url || isForbiddenUrl(currentTab.url)) {
      throw new Error('当前页面无法保存到浏览器书签')
    }

    await browser.bookmarks.create({
      title: currentTab.title || this.getHost(currentTab.url),
      url: currentTab.url,
    })

    return {
      success: true,
      message: '已收藏到浏览器书签',
      shouldRefresh: true,
    }
  }

  private async closeCurrentTab(): Promise<OmniActionExecutionResult> {
    const currentTab = await this.getCurrentTab()

    if (!currentTab.id) {
      throw new Error('没有找到当前标签页')
    }

    await browser.tabs.remove(currentTab.id)
    return {
      success: true,
      shouldClose: true,
    }
  }

  private async closeTab(tabId: number): Promise<OmniActionExecutionResult> {
    await browser.tabs.remove(tabId)
    return {
      success: true,
      shouldRefresh: true,
    }
  }

  private async closeOtherTabs(): Promise<OmniActionExecutionResult> {
    const currentTab = await this.getCurrentTab()
    const tabs = await browser.tabs.query({ lastFocusedWindow: true })
    const tabsToRemove = tabs
      .filter(tab => tab.id && tab.id !== currentTab.id)
      .map(tab => tab.id as number)

    if (tabsToRemove.length > 0) {
      await browser.tabs.remove(tabsToRemove)
    }

    return {
      success: true,
      message: tabsToRemove.length > 0 ? '已关闭其他标签页' : '没有可关闭的其他标签页',
      shouldRefresh: true,
    }
  }

  private async closeTabsToRight(): Promise<OmniActionExecutionResult> {
    const currentTab = await this.getCurrentTab()
    const tabs = await browser.tabs.query({ lastFocusedWindow: true })
    const tabsToRemove = tabs
      .filter(tab => tab.id && typeof tab.index === 'number' && tab.index > (currentTab.index ?? -1))
      .map(tab => tab.id as number)

    if (tabsToRemove.length > 0) {
      await browser.tabs.remove(tabsToRemove)
    }

    return {
      success: true,
      message: tabsToRemove.length > 0 ? '已关闭右侧标签页' : '右侧没有可关闭的标签页',
      shouldRefresh: true,
    }
  }

  private async toggleCurrentTabPin(): Promise<OmniActionExecutionResult> {
    const currentTab = await this.getCurrentTab()

    if (!currentTab.id) {
      throw new Error('没有找到当前标签页')
    }

    const nextPinned = !currentTab.pinned
    await browser.tabs.update(currentTab.id, { pinned: nextPinned })

    return {
      success: true,
      message: nextPinned ? '已固定当前标签页' : '已取消固定当前标签页',
      shouldRefresh: true,
    }
  }

  private async toggleCurrentTabMute(): Promise<OmniActionExecutionResult> {
    const currentTab = await this.getCurrentTab()

    if (!currentTab.id) {
      throw new Error('没有找到当前标签页')
    }

    const nextMuted = !currentTab.mutedInfo?.muted
    await browser.tabs.update(currentTab.id, { muted: nextMuted })

    return {
      success: true,
      message: nextMuted ? '已静音当前标签页' : '已取消静音当前标签页',
      shouldRefresh: true,
    }
  }

  private async getCurrentTab(): Promise<Tabs.Tab> {
    const [currentTab] = await browser.tabs.query({
      active: true,
      lastFocusedWindow: true,
    })

    if (!currentTab) {
      throw new Error('没有找到当前活动标签页')
    }

    return currentTab
  }

  private async getRecentItems(limit: number): Promise<OmniResult[]> {
    const storage = await browser.storage.local.get(RECENT_STORAGE_KEY)
    const items = (storage[RECENT_STORAGE_KEY] as OmniResult[] | undefined) ?? []
    return items.slice(0, limit).map(item => ({ ...item, group: 'recent', score: item.score + 20 }))
  }

  private async saveRecentItem(result: OmniResult): Promise<void> {
    const currentItems = await this.getRecentItems(MAX_RECENT_ITEMS)
    const nextItems = [
      {
        ...result,
        group: result.group,
        score: 100,
      },
      ...currentItems.filter(item => item.id !== result.id),
    ].slice(0, MAX_RECENT_ITEMS)

    await browser.storage.local.set({
      [RECENT_STORAGE_KEY]: nextItems,
    })
  }

  private async getActiveFeishuConfig(): Promise<ActiveFeishuConfig | null> {
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
      return {
        name: activeConfig.name,
        appId: activeConfig.appId,
        appSecret: activeConfig.appSecret,
        baseId: activeConfig.baseId,
        tableId: activeConfig.tableId,
      }
    }

    const legacyConfig = await getSettingsFromStorage<{
      appId: string
      appSecret: string
      baseId: string
      tableId: string
    }>(
      STORAGE_KEYS.LEGACY_FEISHU_CONFIG,
      {
        appId: '',
        appSecret: '',
        baseId: '',
        tableId: '',
      },
    )

    if (
      legacyConfig.appId
      && legacyConfig.appSecret
      && legacyConfig.baseId
      && legacyConfig.tableId
    ) {
      return {
        name: '当前飞书配置',
        ...legacyConfig,
      }
    }

    return null
  }
}
