import { OMNI_COMMAND_ALIASES } from '../constants'
import type { ParsedOmniQuery } from '../types'

export function parseOmniQuery(rawQuery: string): ParsedOmniQuery {
  const normalizedQuery = rawQuery.trim()

  if (!normalizedQuery) {
    return {
      rawQuery,
      normalizedQuery: '',
      keyword: '',
      mode: 'all',
      isCommand: false,
      commandToken: null,
    }
  }

  if (!normalizedQuery.startsWith('/')) {
    return {
      rawQuery,
      normalizedQuery,
      keyword: normalizedQuery,
      mode: 'all',
      isCommand: false,
      commandToken: null,
    }
  }

  const [token = '', ...rest] = normalizedQuery.split(/\s+/)
  const commandToken = token.slice(1).toLowerCase()
  const mode = OMNI_COMMAND_ALIASES[commandToken]

  if (!mode) {
    return {
      rawQuery,
      normalizedQuery,
      keyword: normalizedQuery,
      mode: 'all',
      isCommand: false,
      commandToken: null,
    }
  }

  return {
    rawQuery,
    normalizedQuery,
    keyword: rest.join(' ').trim(),
    mode,
    isCommand: true,
    commandToken,
  }
}
