import type { OmniQueryMode, OmniResultGroupId, OmniSettings } from './types'

export const DEFAULT_OMNI_SETTINGS: OmniSettings = {
  enabled: true,
  searchTabs: true,
  searchBookmarks: true,
  searchHistory: true,
  searchFeishu: true,
  searchActions: true,
  showRecent: true,
  maxResultsPerGroup: 6,
  confirmDangerousActions: true,
}

export const OMNI_GROUP_ORDER: OmniResultGroupId[] = [
  'recent',
  'feishu',
  'tabs',
  'bookmarks',
  'history',
  'actions',
  'search',
]

export const OMNI_GROUP_LABELS: Record<OmniResultGroupId, string> = {
  recent: '最近使用',
  feishu: '云书签',
  tabs: '标签页',
  bookmarks: '浏览器书签',
  history: '浏览历史',
  actions: '快捷动作',
  search: '搜索网页',
}

export const OMNI_COMMAND_ALIASES: Record<string, OmniQueryMode> = {
  tabs: 'tabs',
  tab: 'tabs',
  标签页: 'tabs',
  bookmarks: 'bookmarks',
  bm: 'bookmarks',
  bookmark: 'bookmarks',
  书签: 'bookmarks',
  feishu: 'feishu',
  cloud: 'feishu',
  fs: 'feishu',
  云书签: 'feishu',
  history: 'history',
  his: 'history',
  历史: 'history',
  actions: 'actions',
  act: 'actions',
  action: 'actions',
  动作: 'actions',
}

export const OMNI_SHORTCUT_LABEL = 'Cmd/Ctrl + Shift + K'
