import fs from 'fs-extra'
import type { Manifest } from 'webextension-polyfill'
import type PkgType from '../package.json'
import { isDev, isFirefox, port, r } from '../scripts/utils'

export async function getManifest() {
  const pkg = (await fs.readJSON(r('package.json'))) as typeof PkgType

  const manifest: Manifest.WebExtensionManifest = {
    manifest_version: 3,
    name: isDev ? `${pkg.displayName || pkg.name}（开发版）` : pkg.displayName || pkg.name,
    version: pkg.version,
    description: pkg.description,
    action: {
      default_icon: './assets/icon-512.png',
      default_popup: './dist/popup/index.html',
    },
    options_ui: {
      page: './dist/options/index.html',
      open_in_tab: true,
    },
    background: isFirefox
      ? {
          scripts: ['dist/background/index.mjs'],
          type: 'module',
        }
      : {
          service_worker: './dist/background/index.mjs',
        },
    icons: {
      16: './assets/icon-512.png',
      48: './assets/icon-512.png',
      128: './assets/icon-512.png',
    },
    permissions: [
      'tabs',
      'storage',
      'activeTab',
      'favicon',
      'contextMenus',
      'scripting',
      'sidePanel',
      'search',
      'bookmarks',
      'history',
    ],
    host_permissions: ['*://*/*'],
    content_scripts: [
      {
        matches: ['<all_urls>'],
        js: ['dist/contentScripts/index.global.js'],
        css: ['dist/contentScripts/style.css'],
        all_frames: true,
        match_about_blank: true,
        world: 'ISOLATED',
      },
    ],
    web_accessible_resources: [
      {
        resources: ['dist/contentScripts/style.css'],
        matches: ['<all_urls>'],
      },
    ],
    content_security_policy: {
      extension_pages: isDev
        ? `script-src 'self' http://localhost:${port}; object-src 'self'`
        : `script-src 'self'; object-src 'self'`,
    },
    chrome_url_overrides: {
      newtab: './dist/newtab/index.html',
    },
    commands: {
      'toggle-omni': {
        suggested_key: {
          default: 'Ctrl+Shift+K',
          mac: 'Command+Shift+K',
        },
        description: '打开无名云书签 Omni 命令面板',
      },
    },
  }

  if (isFirefox) {
    manifest.sidebar_action = {
      default_panel: 'dist/sidepanel/index.html',
    }
  }
  else {
    ;(manifest as typeof manifest & {
      side_panel?: {
        default_path: string
      }
    }).side_panel = {
      default_path: 'dist/sidepanel/index.html',
    }
  }

  if (isDev && false) {
    delete manifest.content_scripts
    manifest.permissions?.push('webNavigation')
  }

  return manifest
}
