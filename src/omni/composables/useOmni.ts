import { computed, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { sendMessage } from 'webext-bridge/content-script'
import { OMNI_GROUP_LABELS, OMNI_GROUP_ORDER } from '../constants'
import { parseOmniQuery } from '../parser/parseQuery'
import type {
  OmniActionExecutionResult,
  OmniResult,
  OmniSearchRequest,
  OmniSearchResponse,
  OmniSearchSource,
  ParsedOmniQuery,
} from '../types'
import { orderOmniResults } from '../utils/orderResults'
import { omniSettings } from '~/composables/useSettings'

interface UseOmniOptions {
  initialQuery?: string
  onClose?: () => void
}

interface OmniSearchPlan {
  primarySources: OmniSearchSource[]
  secondarySources: OmniSearchSource[]
}

function getResultIdentity(result: Pick<OmniResult, 'id' | 'group'>): string {
  return `${result.group}:${result.id}`
}

function mergeResults(
  currentResults: OmniResult[],
  incomingResults: OmniResult[],
): OmniResult[] {
  const resultMap = new Map<string, OmniResult>()

  for (const result of currentResults) {
    resultMap.set(getResultIdentity(result), result)
  }

  for (const result of incomingResults) {
    resultMap.set(getResultIdentity(result), result)
  }

  return orderOmniResults([...resultMap.values()])
}

function buildSearchPlan(parsedQuery: ParsedOmniQuery): OmniSearchPlan {
  if (!parsedQuery.keyword) {
    return {
      primarySources: ['recent', 'actions', 'tabs'],
      secondarySources: [],
    }
  }

  switch (parsedQuery.mode) {
    case 'tabs':
      return {
        primarySources: ['tabs'],
        secondarySources: [],
      }
    case 'bookmarks':
      return {
        primarySources: ['bookmarks'],
        secondarySources: [],
      }
    case 'history':
      return {
        primarySources: ['history'],
        secondarySources: [],
      }
    case 'actions':
      return {
        primarySources: ['actions'],
        secondarySources: [],
      }
    case 'feishu':
      return {
        primarySources: ['feishu'],
        secondarySources: [],
      }
    default:
      return {
        primarySources: ['tabs', 'bookmarks', 'history', 'actions', 'search'],
        secondarySources: omniSettings.value.searchFeishu ? ['feishu'] : [],
      }
  }
}

export function useOmni(options: UseOmniOptions = {}) {
  const query = ref(options.initialQuery ?? '')
  const results = ref<OmniResult[]>([])
  const isSearching = ref(false)
  const isHydratingRemote = ref(false)
  const selectedIndex = ref(0)
  const status = ref<{
    tone: 'info' | 'success' | 'error'
    text: string
  } | null>(null)
  const confirmingActionKey = ref<string | null>(null)
  let searchSequence = 0

  const parsedQuery = computed(() => parseOmniQuery(query.value))
  const flatResults = computed(() => orderOmniResults(results.value))
  const hasResults = computed(() => flatResults.value.length > 0)

  const groupedResults = computed(() => {
    let absoluteIndex = 0

    return OMNI_GROUP_ORDER
      .map((groupId) => {
        const items = flatResults.value
          .filter(result => result.group === groupId)
          .map((result) => {
            const currentIndex = absoluteIndex
            absoluteIndex += 1

            return {
              index: currentIndex,
              result,
            }
          })

        if (items.length === 0) {
          return null
        }

        return {
          id: groupId,
          label: OMNI_GROUP_LABELS[groupId],
          items,
        }
      })
      .filter((group): group is {
        id: (typeof OMNI_GROUP_ORDER)[number]
        label: string
        items: Array<{
          index: number
          result: OmniResult
        }>
      } => Boolean(group))
  })

  function clearStatus() {
    status.value = null
  }

  function updateResults(
    nextResults: OmniResult[],
    options: {
      preserveSelection?: boolean
    } = {},
  ) {
    const selectedResultKey = options.preserveSelection && selectedIndex.value >= 0
      ? getResultIdentity(flatResults.value[selectedIndex.value])
      : null

    results.value = orderOmniResults(nextResults)

    if (flatResults.value.length === 0) {
      selectedIndex.value = -1
      return
    }

    if (selectedResultKey) {
      const nextSelectedIndex = flatResults.value.findIndex(
        result => getResultIdentity(result) === selectedResultKey,
      )

      if (nextSelectedIndex >= 0) {
        selectedIndex.value = nextSelectedIndex
        return
      }
    }

    selectedIndex.value = 0
  }

  async function requestSearchPhase(
    request: OmniSearchRequest,
  ): Promise<OmniSearchResponse> {
    return await sendMessage(
      'omni:search',
      request as unknown as never,
    ) as unknown as OmniSearchResponse
  }

  async function search() {
    const sequence = ++searchSequence
    isSearching.value = true
    isHydratingRemote.value = false

    const searchPlan = buildSearchPlan(parsedQuery.value)

    if (searchPlan.primarySources.length === 0 && searchPlan.secondarySources.length === 0) {
      updateResults([])
      clearStatus()
      isSearching.value = false
      return
    }

    try {
      const response = await requestSearchPhase({
        query: query.value,
        sources: searchPlan.primarySources,
      })

      if (sequence !== searchSequence) {
        return
      }

      if (!response.success || !response.data) {
        updateResults([])
        isSearching.value = false
        status.value = {
          tone: 'error',
          text: response.error || 'Omni 搜索失败',
        }
        return
      }

      updateResults(response.data.results)

      if (response.data.message) {
        status.value = {
          tone: 'info',
          text: response.data.message,
        }
      }
      else if (status.value?.tone === 'info') {
        clearStatus()
      }

      if (searchPlan.secondarySources.length === 0) {
        isSearching.value = false
        return
      }

      isHydratingRemote.value = true

      if (flatResults.value.length > 0) {
        isSearching.value = false
      }

      const secondaryResponse = await requestSearchPhase({
        query: query.value,
        sources: searchPlan.secondarySources,
      })

      if (sequence !== searchSequence) {
        return
      }

      isHydratingRemote.value = false
      isSearching.value = false

      if (!secondaryResponse.success || !secondaryResponse.data) {
        if (parsedQuery.value.mode === 'feishu') {
          status.value = {
            tone: 'error',
            text: secondaryResponse.error || 'Omni 搜索失败',
          }
        }
        return
      }

      updateResults(
        mergeResults(results.value, secondaryResponse.data.results),
        { preserveSelection: true },
      )

      if (secondaryResponse.data.message) {
        status.value = {
          tone: 'info',
          text: secondaryResponse.data.message,
        }
      }
      else if (status.value?.tone === 'info') {
        clearStatus()
      }
    }
    catch (error) {
      if (sequence !== searchSequence) {
        return
      }

      isSearching.value = false
      isHydratingRemote.value = false
      updateResults([])
      status.value = {
        tone: 'error',
        text: (error as Error).message || 'Omni 搜索失败',
      }
    }
  }

  const debouncedSearch = useDebounceFn(() => {
    void search()
  }, 180)

  watch(
    query,
    () => {
      confirmingActionKey.value = null
      debouncedSearch()
    },
    { immediate: true },
  )

  watch(flatResults, () => {
    if (flatResults.value.length === 0) {
      selectedIndex.value = -1
      return
    }

    if (selectedIndex.value >= flatResults.value.length) {
      selectedIndex.value = flatResults.value.length - 1
    }
  })

  function selectNext() {
    if (!flatResults.value.length) {
      return
    }

    selectedIndex.value = (selectedIndex.value + 1) % flatResults.value.length
    confirmingActionKey.value = null
  }

  function selectPrev() {
    if (!flatResults.value.length) {
      return
    }

    selectedIndex.value
      = (selectedIndex.value - 1 + flatResults.value.length) % flatResults.value.length
    confirmingActionKey.value = null
  }

  function selectIndex(index: number) {
    selectedIndex.value = index
    confirmingActionKey.value = null
  }

  function getActionKey(result: OmniResult): string {
    return `${result.id}:${result.primaryAction.command}:${JSON.stringify(
      result.primaryAction.payload ?? {},
    )}`
  }

  async function executeIndex(index = selectedIndex.value) {
    const result = flatResults.value[index]

    if (!result) {
      return
    }

    const actionKey = getActionKey(result)
    const requiresConfirmation = Boolean(result.primaryAction.dangerous)
      && omniSettings.value.confirmDangerousActions

    if (requiresConfirmation && confirmingActionKey.value !== actionKey) {
      confirmingActionKey.value = actionKey
      status.value = {
        tone: 'info',
        text: '这是一个危险动作，再按一次回车确认执行。',
      }
      return
    }

    confirmingActionKey.value = null

    try {
      const response = await sendMessage('omni:execute', {
        action: result.primaryAction,
        result,
      } as unknown as never) as unknown as OmniActionExecutionResult

      if (!response.success) {
        status.value = {
          tone: 'error',
          text: response.error || response.message || '执行失败',
        }
        return
      }

      if (response.message) {
        status.value = {
          tone: 'success',
          text: response.message,
        }
      }
      else {
        clearStatus()
      }

      if (response.shouldRefresh) {
        await search()
      }

      if (response.shouldClose) {
        options.onClose?.()
      }
    }
    catch (error) {
      status.value = {
        tone: 'error',
        text: (error as Error).message || '执行失败',
      }
    }
  }

  return {
    query,
    parsedQuery,
    groupedResults,
    flatResults,
    hasResults,
    isSearching,
    isHydratingRemote,
    selectedIndex,
    status,
    confirmingActionKey,
    selectNext,
    selectPrev,
    selectIndex,
    executeIndex,
  }
}
