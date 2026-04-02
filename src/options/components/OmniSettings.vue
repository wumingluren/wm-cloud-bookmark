<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { omniSettings } from '~/composables/useSettings'
import { OMNI_SHORTCUT_LABEL } from '~/omni/constants'

const form = ref({ ...omniSettings.value })

watch(
  () => omniSettings.value,
  (value) => {
    form.value = { ...value }
  },
  { deep: true },
)

function saveOmniSettings() {
  form.value.maxResultsPerGroup = Math.max(
    3,
    Math.min(form.value.maxResultsPerGroup, 12),
  )
  omniSettings.value = { ...form.value }
  ElMessage.success('Omni 设置已保存')
}
</script>

<template>
  <div>
    <h2 class="mb-6 text-2xl font-bold">
      Omni 命令面板
    </h2>

    <div class="rounded-lg bg-white p-6 shadow">
      <form class="space-y-6" @submit.prevent="saveOmniSettings">
        <section class="space-y-3">
          <div>
            <h3 class="text-base font-semibold text-gray-800">
              基础开关
            </h3>
            <p class="mt-1 text-sm text-gray-500">
              全局命令面板可在任意网页通过快捷键呼出。默认快捷键为
              {{ OMNI_SHORTCUT_LABEL }}。
            </p>
          </div>

          <label class="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-3">
            <div>
              <div class="font-medium text-gray-800">启用 Omni 面板</div>
              <div class="text-sm text-gray-500">关闭后将无法通过快捷键打开命令面板。</div>
            </div>
            <input v-model="form.enabled" type="checkbox" class="h-4 w-4">
          </label>

          <label class="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-3">
            <div>
              <div class="font-medium text-gray-800">显示最近使用</div>
              <div class="text-sm text-gray-500">空查询时优先展示最近执行过的结果。</div>
            </div>
            <input v-model="form.showRecent" type="checkbox" class="h-4 w-4">
          </label>

          <label class="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-3">
            <div>
              <div class="font-medium text-gray-800">危险动作二次确认</div>
              <div class="text-sm text-gray-500">关闭标签页等动作需要再次回车确认。</div>
            </div>
            <input v-model="form.confirmDangerousActions" type="checkbox" class="h-4 w-4">
          </label>
        </section>

        <section class="space-y-3">
          <div>
            <h3 class="text-base font-semibold text-gray-800">
              搜索来源
            </h3>
            <p class="mt-1 text-sm text-gray-500">
              关闭某个来源后，它将不再参与聚合搜索。
            </p>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <label class="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
              <span>云书签</span>
              <input v-model="form.searchFeishu" type="checkbox" class="h-4 w-4">
            </label>
            <label class="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
              <span>标签页</span>
              <input v-model="form.searchTabs" type="checkbox" class="h-4 w-4">
            </label>
            <label class="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
              <span>浏览器书签</span>
              <input v-model="form.searchBookmarks" type="checkbox" class="h-4 w-4">
            </label>
            <label class="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
              <span>浏览历史</span>
              <input v-model="form.searchHistory" type="checkbox" class="h-4 w-4">
            </label>
            <label class="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 md:col-span-2">
              <span>快捷动作</span>
              <input v-model="form.searchActions" type="checkbox" class="h-4 w-4">
            </label>
          </div>
        </section>

        <section class="space-y-3">
          <div>
            <h3 class="text-base font-semibold text-gray-800">
              结果数量
            </h3>
            <p class="mt-1 text-sm text-gray-500">
              控制每个结果分组最多显示多少条，建议 6 条。
            </p>
          </div>

          <input
            v-model.number="form.maxResultsPerGroup"
            type="number"
            min="3"
            max="12"
            class="w-full rounded border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
        </section>

        <div class="flex items-center gap-4 pt-2">
          <button
            type="submit"
            class="rounded bg-primary px-4 py-2 text-white hover:bg-[#66b1ff]"
          >
            保存
          </button>
          <span class="text-sm text-gray-500">
            浏览器快捷键可在扩展快捷键页面中自定义。
          </span>
        </div>
      </form>
    </div>
  </div>
</template>
