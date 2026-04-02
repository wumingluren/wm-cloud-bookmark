import { describe, expect, it } from 'vitest'
import { orderOmniResults } from '../orderResults'
import type { OmniResult } from '../../types'

function createResult(
  id: string,
  group: OmniResult['group'],
  title = id,
): OmniResult {
  return {
    id,
    group,
    title,
    sourceLabel: group,
    score: 1,
    primaryAction: {
      command: 'open-url',
      label: '打开',
      payload: { url: `https://example.com/${id}` },
    },
  }
}

describe('orderOmniResults', () => {
  it('orders mixed groups by the Omni display order', () => {
    const input = [
      createResult('search-1', 'search'),
      createResult('action-1', 'actions'),
      createResult('tab-1', 'tabs'),
      createResult('recent-1', 'recent'),
    ]

    expect(orderOmniResults(input).map(result => result.id)).toEqual([
      'recent-1',
      'tab-1',
      'action-1',
      'search-1',
    ])
  })

  it('preserves the existing order inside the same group', () => {
    const input = [
      createResult('tab-2', 'tabs'),
      createResult('tab-1', 'tabs'),
      createResult('tab-3', 'tabs'),
    ]

    expect(orderOmniResults(input).map(result => result.id)).toEqual([
      'tab-2',
      'tab-1',
      'tab-3',
    ])
  })
})
