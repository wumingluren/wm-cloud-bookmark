# Vite 浏览器扩展开发模板

基于 [Vite](https://vitejs.dev/) 构建的浏览器扩展开发模板（支持 [Chrome](https://developer.chrome.com/docs/extensions/reference/)、[FireFox](https://addons.mozilla.org/en-US/developers/) 等）

<p align="center">
<sub>弹出窗口</sub><br/>
<img width="655" src="https://user-images.githubusercontent.com/11247099/126741643-813b3773-17ff-4281-9737-f319e00feddc.png"><br/>
<sub>选项页面</sub><br/>
<img width="655" src="https://user-images.githubusercontent.com/11247099/126741653-43125b62-6578-4452-83a7-bee19be2eaa2.png"><br/>
<sub>在内容脚本中注入 Vue 应用</sub><br/>
<img src="https://user-images.githubusercontent.com/11247099/130695439-52418cf0-e186-4085-8e19-23fe808a274e.png">
</p>

## 核心特性

- ⚡️ **即时热更新** - 开发时使用 Vite（无需手动刷新！）
- 🥝 Vue 3 - 组合式 API，[`<script setup>` 语法](https://github.com/vuejs/rfcs/blob/master/active-rfcs/0040-script-setup.md) 等
- 💬 无缝通信 - 基于 [`webext-bridge`](https://github.com/antfu/webext-bridge) 和 [VueUse](https://github.com/antfu/vueuse) 存储
- 🌈 [UnoCSS](https://github.com/unocss/unocss) - 按需原子 CSS 引擎
- 🦾 [TypeScript](https://www.typescriptlang.org/) - 类型安全
- 📦 [组件自动导入](./src/components)
- 🌟 [图标系统](./src/components) - 直接使用任意图标集的图标
- 🖥 内容脚本 - 在内容脚本中使用 Vue
- 🌍 浏览器扩展 - 支持 Chrome、Firefox 等多浏览器
- 📃 动态 `manifest.json` 并支持完整类型

## 内置技术栈

### 浏览器扩展库

- [`webextension-polyfill`](https://github.com/mozilla/webextension-polyfill) - 浏览器 API 多平台兼容层
- [`webext-bridge`](https://github.com/antfu/webext-bridge) - 跨上下文通信解决方案

### Vite 插件

- [`unplugin-auto-import`](https://github.com/antfu/unplugin-auto-import) - 自动导入浏览器 API 和 Vue 组合式 API
- [`unplugin-vue-components`](https://github.com/antfu/vite-plugin-components) - 组件自动导入
- [`unplugin-icons`](https://github.com/antfu/unplugin-icons) - 图标组件化
  - [Iconify](https://iconify.design) - 支持任意图标集 [🔍Icônes](https://icones.netlify.app/)

### Vue 插件

- [VueUse](https://github.com/antfu/vueuse) - 实用组合式 API 集合

### UI 框架

- [UnoCSS](https://github.com/unocss/unocss) - 即时按需原子 CSS 引擎

### 代码风格

- 使用组合式 API 和 [`<script setup>` SFC 语法](https://github.com/vuejs/rfcs/pull/227)
- [ESLint](https://eslint.org/) 配置 [@antfu/eslint-config](https://github.com/antfu/eslint-config)，单引号，无分号

### 开发工具

- [TypeScript](https://www.typescriptlang.org/)
- [pnpm](https://pnpm.js.org/) - 高效磁盘利用的包管理器
- [esno](https://github.com/antfu/esno) - 基于 esbuild 的 TypeScript 运行时
- [npm-run-all](https://github.com/mysticatea/npm-run-all) - 并行/串行运行多个 npm 脚本
- [web-ext](https://github.com/mozilla/web-ext) - 浏览器扩展开发工具

## 使用模板

### GitHub 模板

[在 GitHub 上基于此模板创建仓库](https://github.com/antfu/vitesse-webext/generate)

### 本地克隆

如需手动克隆并保持干净的 git 历史记录：

> 如果未安装 pnpm，请运行：npm install -g pnpm

```bash
npx degit antfu/vitesse-webext my-webext
cd my-webext
pnpm i
```

## 使用说明

### 目录结构

- src - 主源码目录
  - contentScript - 注入为 content_script 的脚本和组件
  - background - 后台脚本
  - components - 自动导入的 Vue 组件（弹出窗口和选项页面共享）
  - styles - 弹出窗口和选项页面共享的样式
  - assets - Vue 组件使用的资源
  - manifest.ts - 扩展清单配置
  - extension - 扩展包根目录
  - assets - 静态资源（主要用于 manifest.json ）
  - dist - 构建文件，开发时也作为 Vite 的入口
  - scripts - 开发和打包辅助脚本

### Development

```bash
pnpm dev
```

然后在浏览器中加载 extension/ 目录

Firefox 开发者可改用：

```bash
pnpm dev-firefox
```

`web-ext` 会在 `extension/` 文件变更时自动重载扩展

> 虽然 Vite 在大多数情况下会自动处理热更新，但仍推荐使用, [Extensions Reloader](https://chrome.google.com/webstore/detail/fimgfedafeadlieiabdeeaodndnlbhid) 以获得更干净的重载体验

## Using Gitpod

一键获取预配置的开发环境：

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/antfu/vitesse-webext)

### Build

构建扩展

```bash
pnpm build
```

然后打包 extension 目录下的文件，可将 extension.crx 或 extension.xpi 上传至相应的扩展商店

## Credits

[![Volta](https://user-images.githubusercontent.com/904724/195351818-9e826ea9-12a0-4b06-8274-352743cd2047.png)](https://volta.net)

本模板最初为 [volta.net](https://volta.net) 浏览器扩展开发而创建

## Variations

This is a variant of [Vitesse](https://github.com/antfu/vitesse), check out the [full variations list](https://github.com/antfu/vitesse#variations).
