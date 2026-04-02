import { describe, expect, it } from 'vitest'
import { parseOmniQuery } from '../parseQuery'

describe('parseOmniQuery', () => {
  it('parses plain text as all mode', () => {
    expect(parseOmniQuery('figma')).toEqual({
      rawQuery: 'figma',
      normalizedQuery: 'figma',
      keyword: 'figma',
      mode: 'all',
      isCommand: false,
      commandToken: null,
    })
  })

  it('parses slash commands and strips the command token', () => {
    expect(parseOmniQuery('/tabs figma')).toEqual({
      rawQuery: '/tabs figma',
      normalizedQuery: '/tabs figma',
      keyword: 'figma',
      mode: 'tabs',
      isCommand: true,
      commandToken: 'tabs',
    })
  })

  it('supports chinese aliases', () => {
    expect(parseOmniQuery('/历史 github')).toEqual({
      rawQuery: '/历史 github',
      normalizedQuery: '/历史 github',
      keyword: 'github',
      mode: 'history',
      isCommand: true,
      commandToken: '历史',
    })
  })

  it('supports requested english short aliases', () => {
    expect(parseOmniQuery('/bm figma')).toEqual({
      rawQuery: '/bm figma',
      normalizedQuery: '/bm figma',
      keyword: 'figma',
      mode: 'bookmarks',
      isCommand: true,
      commandToken: 'bm',
    })

    expect(parseOmniQuery('/his github')).toEqual({
      rawQuery: '/his github',
      normalizedQuery: '/his github',
      keyword: 'github',
      mode: 'history',
      isCommand: true,
      commandToken: 'his',
    })

    expect(parseOmniQuery('/act close')).toEqual({
      rawQuery: '/act close',
      normalizedQuery: '/act close',
      keyword: 'close',
      mode: 'actions',
      isCommand: true,
      commandToken: 'act',
    })

    expect(parseOmniQuery('/tab repo')).toEqual({
      rawQuery: '/tab repo',
      normalizedQuery: '/tab repo',
      keyword: 'repo',
      mode: 'tabs',
      isCommand: true,
      commandToken: 'tab',
    })

    expect(parseOmniQuery('/fs docs')).toEqual({
      rawQuery: '/fs docs',
      normalizedQuery: '/fs docs',
      keyword: 'docs',
      mode: 'feishu',
      isCommand: true,
      commandToken: 'fs',
    })
  })

  it('falls back to all mode for unknown commands', () => {
    expect(parseOmniQuery('/unknown value')).toEqual({
      rawQuery: '/unknown value',
      normalizedQuery: '/unknown value',
      keyword: '/unknown value',
      mode: 'all',
      isCommand: false,
      commandToken: null,
    })
  })
})
