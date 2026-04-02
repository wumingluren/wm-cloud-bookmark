import { useWebExtensionStorage } from './useWebExtensionStorage'
import { DEFAULT_OMNI_SETTINGS } from '~/omni/constants'
import type { OmniSettings, OmniTheme } from '~/omni/types'
import {
  DEFAULT_NEW_TAB_THEME_ID,
  type NewTabThemeId,
  getNewTabThemeById,
} from '~/newtab/themes'

// 飞书配置类型
export interface FeishuConfigItem {
  id: string
  name: string
  appId: string
  appSecret: string
  baseId: string
  tableId: string
}

// 其他设置类型
export interface OtherSettings {
  recommendCount: number
}

// 导出数据的结构
export interface ExportData {
  feishuConfigs: FeishuConfigItem[]
  activeConfigId: string
  otherSettings: OtherSettings
  omniSettings: OmniSettings
  omniTheme: OmniTheme
  newTabTheme: NewTabThemeId
}

// 存储键名常量
export const STORAGE_KEYS = {
  FEISHU_CONFIGS: 'feishu-configs',
  ACTIVE_CONFIG_ID: 'active-config-id',
  LEGACY_FEISHU_CONFIG: 'feishu-config',
  OTHER_SETTINGS: 'other-settings',
  OMNI_SETTINGS: 'omni-settings',
  OMNI_THEME: 'omni-theme',
  NEW_TAB_THEME: 'newtab-theme',
}

// 导出所有设置
export const feishuConfigs = useWebExtensionStorage<FeishuConfigItem[]>(
  STORAGE_KEYS.FEISHU_CONFIGS,
  [],
)
export const activeConfigId = useWebExtensionStorage<string>(
  STORAGE_KEYS.ACTIVE_CONFIG_ID,
  '',
)
export const feishuConfig = useWebExtensionStorage(
  STORAGE_KEYS.LEGACY_FEISHU_CONFIG,
  {
    appId: '',
    appSecret: '',
    baseId: '',
    tableId: '',
  },
)
export const otherSettings = useWebExtensionStorage<OtherSettings>(
  STORAGE_KEYS.OTHER_SETTINGS,
  {
    recommendCount: 12,
  },
)
export const omniSettings = useWebExtensionStorage<OmniSettings>(
  STORAGE_KEYS.OMNI_SETTINGS,
  DEFAULT_OMNI_SETTINGS,
)
export const omniTheme = useWebExtensionStorage<OmniTheme>(
  STORAGE_KEYS.OMNI_THEME,
  'light',
)
export const newTabTheme = useWebExtensionStorage<NewTabThemeId>(
  STORAGE_KEYS.NEW_TAB_THEME,
  DEFAULT_NEW_TAB_THEME_ID,
)

// 获取当前活动的配置
export function getActiveConfig(): FeishuConfigItem | null {
  if (!activeConfigId.value || feishuConfigs.value.length === 0) {
    return null
  }

  return (
    feishuConfigs.value.find(config => config.id === activeConfigId.value)
    || null
  )
}

// 同步方式获取推荐书签数量
export function getRecommendCount(): number {
  return otherSettings.value.recommendCount
}

// 导出所有配置数据
export function exportSettings(): ExportData {
  return {
    feishuConfigs: feishuConfigs.value,
    activeConfigId: activeConfigId.value,
    otherSettings: otherSettings.value,
    omniSettings: omniSettings.value,
    omniTheme: omniTheme.value,
    newTabTheme: newTabTheme.value,
  }
}

// 导入配置数据
export async function importSettings(data: ExportData): Promise<boolean> {
  try {
    // 验证导入的数据结构
    if (!Array.isArray(data.feishuConfigs)) {
      throw new TypeError('无效的配置数据：缺少飞书配置列表')
    }

    // 验证每个配置项
    for (const config of data.feishuConfigs) {
      if (!config.id || !config.name || !config.appId || !config.appSecret
        || !config.baseId || !config.tableId) {
        throw new Error('无效的配置数据：配置项缺少必要字段')
      }
    }

    // 更新存储
    feishuConfigs.value = data.feishuConfigs

    // 设置活动配置ID
    if (data.activeConfigId && data.feishuConfigs.some(c => c.id === data.activeConfigId)) {
      activeConfigId.value = data.activeConfigId
    }
    else if (data.feishuConfigs.length > 0) {
      activeConfigId.value = data.feishuConfigs[0].id
    }

    // 更新其他设置
    if (data.otherSettings && typeof data.otherSettings.recommendCount === 'number') {
      otherSettings.value = data.otherSettings
    }

    if (!isValidOmniSettings(data.omniSettings)) {
      throw new TypeError('无效的配置数据：Omni 面板配置不完整')
    }

    if (!isValidOmniTheme(data.omniTheme)) {
      throw new TypeError('无效的配置数据：Omni 主题配置无效')
    }

    if (!isValidNewTabTheme(data.newTabTheme)) {
      throw new TypeError('无效的配置数据：新标签页主题配置无效')
    }

    omniSettings.value = data.omniSettings
    omniTheme.value = data.omniTheme
    newTabTheme.value = data.newTabTheme

    // 更新旧版配置以保持兼容性
    updateLegacyConfig()

    return true
  }
  catch (error) {
    console.error('导入设置失败:', error)
    return false
  }
}

function isValidOmniSettings(value: unknown): value is OmniSettings {
  if (!value || typeof value !== 'object') {
    return false
  }

  const settings = value as Record<string, unknown>

  return typeof settings.enabled === 'boolean'
    && typeof settings.searchTabs === 'boolean'
    && typeof settings.searchBookmarks === 'boolean'
    && typeof settings.searchHistory === 'boolean'
    && typeof settings.searchFeishu === 'boolean'
    && typeof settings.searchActions === 'boolean'
    && typeof settings.showRecent === 'boolean'
    && typeof settings.maxResultsPerGroup === 'number'
    && Number.isFinite(settings.maxResultsPerGroup)
    && typeof settings.confirmDangerousActions === 'boolean'
}

function isValidOmniTheme(value: unknown): value is OmniTheme {
  return value === 'light' || value === 'dark'
}

function isValidNewTabTheme(value: unknown): value is NewTabThemeId {
  return typeof value === 'string' && getNewTabThemeById(value).id === value
}

// 更新旧版配置以保持兼容性
function updateLegacyConfig() {
  if (activeConfigId.value && feishuConfigs.value.length > 0) {
    const activeConfig = feishuConfigs.value.find(
      config => config.id === activeConfigId.value,
    )
    if (activeConfig) {
      feishuConfig.value = {
        appId: activeConfig.appId,
        appSecret: activeConfig.appSecret,
        baseId: activeConfig.baseId,
        tableId: activeConfig.tableId,
      }
    }
  }
}

// 直接从浏览器存储获取设置（用于需要立即获取的场景）
export async function getSettingsFromStorage<T>(
  key: string,
  defaultValue: T,
): Promise<T> {
  try {
    const storage = await browser.storage.local.get(key)
    if (!storage[key]) {
      return defaultValue
    }

    // 处理可能的JSON字符串
    if (typeof storage[key] === 'string') {
      try {
        return JSON.parse(storage[key])
      }
      catch {
        return storage[key] as unknown as T
      }
    }

    return storage[key] as T
  }
  catch (error) {
    console.error(`获取设置 ${key} 失败:`, error)
    return defaultValue
  }
}
