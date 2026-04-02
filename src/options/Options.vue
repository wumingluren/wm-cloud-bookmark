<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import BookmarkFolderDialog from './components/BookmarkFolderDialog.vue'
import FeishuConfig from './components/FeishuConfig.vue'
import ImportExport from './components/ImportExport.vue'
import OmniSettings from './components/OmniSettings.vue'
import OtherSettings from './components/OtherSettings.vue'

const activeMenu = ref('feishu-config')
const showFolderSelectDialog = ref(false)
const exportType = ref<'json' | 'xlsx'>('json')
const bookmarkFolderDialogRef = ref<InstanceType<typeof BookmarkFolderDialog> | null>(null)

function scrollToSection(sectionId: string, event: Event) {
  event.preventDefault()

  const section = document.getElementById(sectionId)
  if (section) {
    section.scrollIntoView({ behavior: 'smooth' })
  }

  activeMenu.value = sectionId
}

function showFolderSelect(type: 'json' | 'xlsx') {
  bookmarkFolderDialogRef.value?.openDialog(type)
}

function handleExportSuccess(data: { type: 'json' | 'xlsx', count: number }) {
  ElMessage.success(`成功导出 ${data.count} 条书签为 ${data.type.toUpperCase()} 格式`)
}
</script>

<template>
  <main class="flex min-h-screen">
    <aside
      class="fixed h-screen w-64 overflow-y-auto border-r border-gray-200 bg-gray-100 p-4"
    >
      <h1 class="mb-6 text-xl font-bold">
        无名云书签
      </h1>

      <nav class="space-y-2">
        <a
          href="#feishu-config"
          class="block rounded p-2 transition-colors"
          :class="
            activeMenu === 'feishu-config'
              ? 'bg-primary text-white'
              : 'hover:bg-gray-200'
          "
          @click="scrollToSection('feishu-config', $event)"
        >
          飞书配置
        </a>
        <a
          href="#omni-settings"
          class="block rounded p-2 transition-colors"
          :class="
            activeMenu === 'omni-settings'
              ? 'bg-primary text-white'
              : 'hover:bg-gray-200'
          "
          @click="scrollToSection('omni-settings', $event)"
        >
          Omni 面板
        </a>
        <a
          href="#other-settings"
          class="block rounded p-2 transition-colors"
          :class="
            activeMenu === 'other-settings'
              ? 'bg-primary text-white'
              : 'hover:bg-gray-200'
          "
          @click="scrollToSection('other-settings', $event)"
        >
          其他设置
        </a>
        <a
          href="#import-export"
          class="block rounded p-2 transition-colors"
          :class="
            activeMenu === 'import-export'
              ? 'bg-primary text-white'
              : 'hover:bg-gray-200'
          "
          @click="scrollToSection('import-export', $event)"
        >
          导入导出
        </a>
      </nav>
    </aside>

    <div class="ml-64 flex-1 overflow-auto p-6">
      <section id="feishu-config" class="mb-10">
        <FeishuConfig />
      </section>

      <section id="omni-settings" class="mb-10">
        <OmniSettings />
      </section>

      <section id="other-settings" class="mb-10">
        <OtherSettings />
      </section>

      <section id="import-export" class="mb-10">
        <ImportExport @show-folder-select="showFolderSelect" />
      </section>
    </div>
  </main>

  <BookmarkFolderDialog
    ref="bookmarkFolderDialogRef"
    v-model:visible="showFolderSelectDialog"
    :export-type="exportType"
    @ok="handleExportSuccess"
  />
</template>
