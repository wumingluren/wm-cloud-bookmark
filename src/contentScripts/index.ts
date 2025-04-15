/* eslint-disable no-console */
// 导入必要的库和模块
import { onMessage } from 'webext-bridge/content-script' // 用于跨脚本通信
import { createApp } from 'vue' // Vue 3的创建应用方法
import App from './views/App.vue' // 主应用组件
import { setupApp } from '~/logic/common-setup' // 通用应用设置

// 使用IIFE(立即调用函数表达式)来封装内容脚本逻辑
// 这是为了确保变量作用域隔离，避免污染全局空间
(() => {
  // 内容脚本加载时的日志
  console.info('[vitesse-webext] Hello world from content script')

  // 监听来自background页面的消息示例
  // 当收到'tab-prev'消息时，打印前一页的标题
  onMessage('tab-prev', ({ data }) => {
    console.log(`[vitesse-webext] Navigate from page "${data.title}"`)
  })

  // 创建并挂载Vue应用到页面中的流程
  // 1. 创建容器元素
  const container = document.createElement('div')
  container.id = __NAME__ // 使用扩展名称作为ID
  
  // 2. 创建根元素用于挂载Vue应用
  const root = document.createElement('div')
  
  // 3. 创建样式链接元素
  const styleEl = document.createElement('link')
  
  // 4. 创建Shadow DOM实现样式隔离
  // 开发模式下使用open模式便于调试，生产环境使用closed模式
  const shadowDOM = container.attachShadow?.({ mode: __DEV__ ? 'open' : 'closed' }) || container
  
  // 5. 设置并添加样式表
  styleEl.setAttribute('rel', 'stylesheet')
  styleEl.setAttribute('href', browser.runtime.getURL('dist/contentScripts/style.css'))
  shadowDOM.appendChild(styleEl)
  
  // 6. 将根元素添加到Shadow DOM中
  shadowDOM.appendChild(root)
  
  // 7. 将容器添加到页面body中
  document.body.appendChild(container)
  
  // 8. 创建Vue应用实例并进行通用设置
  const app = createApp(App)
  setupApp(app)
  
  // 9. 挂载应用到准备好的根元素
  app.mount(root)
})()
