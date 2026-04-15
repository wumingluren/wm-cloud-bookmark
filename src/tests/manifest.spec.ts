import { describe, expect, it } from 'vitest'
import { getManifest } from '../manifest'

describe('extension manifest', () => {
  it('does not inject content script CSS into host pages', async () => {
    const manifest = await getManifest()
    const [contentScript] = manifest.content_scripts ?? []

    expect(contentScript?.css).toBeUndefined()
  })

  it('keeps the content script stylesheet web accessible for Shadow DOM mounting', async () => {
    const manifest = await getManifest()

    expect(manifest.web_accessible_resources).toContainEqual(
      expect.objectContaining({
        resources: expect.arrayContaining(['dist/contentScripts/style.css']),
      }),
    )
  })
})
