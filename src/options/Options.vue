<script setup lang="ts">
import { ref } from "vue";
import FeishuConfig from "./components/FeishuConfig.vue";
import OtherSettings from "./components/OtherSettings.vue";
import ImportExport from "./components/ImportExport.vue";
import BookmarkFolderDialog from "./components/BookmarkFolderDialog.vue";
import { ElMessage } from "element-plus";

// 当前活动的菜单项
const activeMenu = ref("feishu-config");
// 书签文件夹选择相关
const showFolderSelectDialog = ref(false);
const exportType = ref<"json" | "xlsx">("json");
const bookmarkFolderDialogRef = ref();

// 滚动到指定部分
function scrollToSection(sectionId: string, event: Event) {
  event.preventDefault(); // 阻止默认的链接行为

  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: "smooth" });
  }

  activeMenu.value = sectionId;
}

// 显示文件夹选择弹窗
function showFolderSelect(type: "json" | "xlsx") {
  bookmarkFolderDialogRef.value.openDialog(type);
}

// 处理导出成功事件
function handleExportSuccess(data: { type: "json" | "xlsx"; count: number }) {
  ElMessage.success(
    `成功导出 ${data.count} 条书签为 ${data.type.toUpperCase()} 格式`
  );
}
</script>

<template>
  <main class="flex min-h-screen">
    <!-- 左侧菜单 - 添加固定定位 -->
    <aside
      class="w-64 bg-gray-100 p-4 border-r border-gray-200 fixed h-screen overflow-y-auto"
    >
      <h1 class="text-xl font-bold mb-6">无名云书签</h1>

      <!-- 在左侧菜单中添加导入导出选项 -->
      <nav class="space-y-2">
        <a
          href="#feishu-config"
          class="block p-2 rounded transition-colors"
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
          href="#other-settings"
          class="block p-2 rounded transition-colors"
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
          class="block p-2 rounded transition-colors"
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

    <!-- 右侧内容区 - 添加左边距以匹配左侧菜单宽度 -->
    <div class="flex-1 p-6 overflow-auto ml-64">
      <!-- 飞书配置部分 -->
      <section id="feishu-config" class="mb-10">
        <FeishuConfig />
      </section>

      <!-- 其他设置部分 -->
      <section id="other-settings" class="mb-10">
        <OtherSettings />
      </section>

      <!-- 导入导出部分 -->
      <section id="import-export" class="mb-10">
        <ImportExport @show-folder-select="showFolderSelect" />
      </section>
    </div>
  </main>

  <!-- 书签文件夹选择弹窗 -->
  <BookmarkFolderDialog
    ref="bookmarkFolderDialogRef"
    v-model:visible="showFolderSelectDialog"
    :export-type="exportType"
    @ok="handleExportSuccess"
  />
</template>
