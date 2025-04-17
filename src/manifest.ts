import fs from "fs-extra";
import type { Manifest } from "webextension-polyfill";
import type PkgType from "../package.json";
import { isDev, isFirefox, port, r } from "../scripts/utils";

export async function getManifest() {
  const pkg = (await fs.readJSON(r("package.json"))) as typeof PkgType;

  // update this file to update this manifest.json
  // can also be conditional based on your need
  const manifest: Manifest.WebExtensionManifest = {
    manifest_version: 3,
    name: isDev ? `${pkg.displayName || pkg.name}（开发版）` : pkg.displayName || pkg.name,
    version: pkg.version,
    description: pkg.description,
    action: {
      default_icon: "./assets/icon-512.png",
      default_popup: "./dist/popup/index.html",
    },
    options_ui: {
      page: "./dist/options/index.html",
      open_in_tab: true,
    },
    background: isFirefox
      ? {
          scripts: ["dist/background/index.mjs"],
          type: "module",
        }
      : {
          service_worker: "./dist/background/index.mjs",
        },
    icons: {
      16: "./assets/icon-512.png",
      48: "./assets/icon-512.png",
      128: "./assets/icon-512.png",
    },
    // 在permissions数组中添加bookmarks权限
    permissions: [
      "tabs",
      "storage",
      "activeTab",
      "contextMenus",
      "scripting",
      "sidePanel",
      "search",
      "bookmarks",
    ],
    host_permissions: ["*://*/*"],
    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["dist/contentScripts/index.global.js"],
        css: ["dist/contentScripts/style.css"], // 添加隔离样式表
        all_frames: true, // 在所有iframe中生效
        match_about_blank: true, // 匹配about:blank页面
        world: "ISOLATED", // 使用隔离的JS执行环境(仅Chrome 89+支持)
      },
    ],
    web_accessible_resources: [
      {
        resources: ["dist/contentScripts/style.css"],
        matches: ["<all_urls>"],
      },
    ],
    content_security_policy: {
      extension_pages: isDev
        ? // this is required on dev for Vite script to load
          `script-src \'self\' http://localhost:${port}; object-src \'self\'`
        : "script-src 'self'; object-src 'self'",
    },
    chrome_url_overrides: {
      newtab: "./dist/newtab/index.html", // 修改为正确的路径
    },
  };

  // add sidepanel
  if (isFirefox) {
    manifest.sidebar_action = {
      default_panel: "dist/sidepanel/index.html",
    };
  } else {
    // the sidebar_action does not work for chromium based
    (manifest as any).side_panel = {
      default_path: "dist/sidepanel/index.html",
    };
  }

  // FIXME: not work in MV3
  if (isDev && false) {
    // for content script, as browsers will cache them for each reload,
    // we use a background script to always inject the latest version
    // see src/background/contentScriptHMR.ts
    delete manifest.content_scripts;
    manifest.permissions?.push("webNavigation");
  }

  return manifest;
}
