import { OMNI_GROUP_ORDER } from '../constants'
import type { OmniResult } from '../types'

export function orderOmniResults(results: OmniResult[]): OmniResult[] {
  const ordered = OMNI_GROUP_ORDER.flatMap(groupId =>
    results.filter(result => result.group === groupId),
  )

  if (ordered.length === results.length) {
    return ordered
  }

  const knownIds = new Set(ordered.map(result => result.id))
  const rest = results.filter(result => !knownIds.has(result.id))
  return [...ordered, ...rest]
}
