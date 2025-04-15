<script setup lang="ts">
import { useWebExtensionStorage } from '~/composables/useWebExtensionStorage'

// 获取飞书配置
const feishuConfig = useWebExtensionStorage('feishu-config', {
  appId: '',
  appSecret: '',
  baseId: '',
  tableId: '',
})

// 打开选项页面
function openOptionsPage() {
  browser.runtime.openOptionsPage()
}

// 检查配置是否完整
const isConfigured = computed(() => {
  return Object.values(feishuConfig.value).every(value => value)
})
</script>

<template>
  <main class="w-[300px] px4 py5 text-center">
    <h1 class="text-lg font-bold mb4">無名云书签-收藏网址到飞书多维表格</h1>

    <div v-if="!isConfigured" class="mb4">
      <p class="text-red-500 mb2">请先完成飞书配置</p>
      <button
        class="px4 py2 bg-blue-500 text-white rounded hover:bg-blue-600"
        @click="openOptionsPage"
      >
        前往配置
      </button>
    </div>

    <div v-else class="text-gray-600">
      <p class="mb2">在网页中单击右键，点击"收藏当前网址到飞书多维表格"</p>
      <p class="text-sm">点击下方按钮修改配置</p>
      <button
        class="mt4 px3 py1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
        @click="openOptionsPage"
      >
        修改配置
      </button>
    </div>
  </main>
</template>
