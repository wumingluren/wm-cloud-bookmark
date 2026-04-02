export type OmniQueryMode
  = | 'all'
    | 'tabs'
    | 'bookmarks'
    | 'feishu'
    | 'history'
    | 'actions'

export type OmniTheme = 'light' | 'dark'

export type OmniResultGroupId
  = | 'recent'
    | 'feishu'
    | 'tabs'
    | 'bookmarks'
    | 'history'
    | 'actions'
    | 'search'

export type OmniSearchSource = OmniResultGroupId

export type OmniActionCommand
  = | 'open-url'
    | 'switch-tab'
    | 'close-tab'
    | 'toggle-tab-pin'
    | 'toggle-tab-mute'
    | 'open-options'
    | 'open-sidepanel'
    | 'open-new-tab'
    | 'search-web'
    | 'save-current-page-to-feishu'
    | 'save-current-page-to-browser-bookmarks'
    | 'close-current-tab'
    | 'close-other-tabs'
    | 'close-tabs-to-right'

export interface OmniSettings {
  enabled: boolean
  searchTabs: boolean
  searchBookmarks: boolean
  searchHistory: boolean
  searchFeishu: boolean
  searchActions: boolean
  showRecent: boolean
  maxResultsPerGroup: number
  confirmDangerousActions: boolean
}

export interface ParsedOmniQuery {
  rawQuery: string
  normalizedQuery: string
  keyword: string
  mode: OmniQueryMode
  isCommand: boolean
  commandToken: string | null
}

export interface OmniActionDescriptor {
  command: OmniActionCommand
  label: string
  dangerous?: boolean
  payload?: Record<string, unknown>
}

export interface OmniResult {
  id: string
  group: OmniResultGroupId
  sourceLabel: string
  title: string
  subtitle?: string
  url?: string
  icon?: string
  badges?: string[]
  score: number
  primaryAction: OmniActionDescriptor
}

export interface OmniSearchPayload {
  parsed: ParsedOmniQuery
  results: OmniResult[]
  message?: string
}

export interface OmniSearchRequest {
  query: string
  sources?: OmniSearchSource[]
}

export interface OmniSearchResponse {
  success: boolean
  data?: OmniSearchPayload
  error?: string
}

export interface OmniActionExecutionResult {
  success: boolean
  message?: string
  shouldClose?: boolean
  shouldRefresh?: boolean
  error?: string
}
