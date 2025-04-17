<script setup lang="ts">
import { ref } from "vue";
import { ElMessage } from "element-plus";
import {
  exportSettings,
  importSettings,
  ExportData,
} from "~/composables/useSettings";

// 定义事件
const emit = defineEmits(['showFolderSelect']);

// 文件输入引用
const fileInput = ref<HTMLInputElement | null>(null);
// 导入文本
const importText = ref("");

// 导出到剪贴板
async function exportToClipboard() {
  try {
    const data = exportSettings();
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    ElMessage.success("配置已复制到剪贴板");
  } catch (error) {
    ElMessage.error("复制失败：" + (error as Error).message);
  }
}

// 导出为文件
function exportToFile() {
  try {
    const data = exportSettings();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wm-bookmark-config-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    ElMessage.success("配置已导出为文件");
  } catch (error) {
    ElMessage.error("导出失败：" + (error as Error).message);
  }
}

// 触发文件选择
function triggerFileInput() {
  fileInput.value?.click();
}

// 处理文件导入
async function handleFileImport(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  const file = input.files[0];
  try {
    const text = await file.text();
    const data = JSON.parse(text) as ExportData;
    const success = await importSettings(data);

    if (success) {
      ElMessage.success("配置导入成功");
      // 重置文件输入
      if (input) input.value = "";
    } else {
      ElMessage.error("配置导入失败：无效的配置数据");
    }
  } catch (error) {
    ElMessage.error("导入失败：" + (error as Error).message);
    // 重置文件输入
    if (input) input.value = "";
  }
}

// 从文本导入
async function importFromText() {
  try {
    if (!importText.value.trim()) {
      ElMessage.warning("请先粘贴配置数据");
      return;
    }

    const data = JSON.parse(importText.value) as ExportData;
    const success = await importSettings(data);

    if (success) {
      ElMessage.success("配置导入成功");
      importText.value = ""; // 清空输入
    } else {
      ElMessage.error("配置导入失败：无效的配置数据");
    }
  } catch (error) {
    ElMessage.error("导入失败：" + (error as Error).message);
  }
}

// 显示文件夹选择弹窗
function showFolderSelect(type: "json" | "xlsx") {
  emit('showFolderSelect', type);
}
</script>

<template>
  <div>
    <h2 class="text-2xl font-bold mb-6">导入导出</h2>

    <div class="bg-white rounded-lg shadow p-6">
      <div class="space-y-6">
        <!-- 导出配置 -->
        <div>
          <h3 class="text-lg font-semibold mb-2">导出配置</h3>
          <p class="text-sm text-gray-500 mb-4">
            将当前所有配置导出为 JSON 格式，可用于备份或迁移到其他设备。
          </p>
          <div class="flex space-x-4">
            <button
              @click="exportToClipboard"
              class="px-4 py-2 bg-primary text-white rounded hover:bg-[#66b1ff]"
            >
              复制到剪贴板
            </button>
            <button
              @click="exportToFile"
              class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              导出为Json文件
            </button>
          </div>
        </div>

        <!-- 添加浏览器书签导出部分 -->
        <div class="mt-6">
          <h3 class="text-lg font-semibold mb-2">导出浏览器书签</h3>
          <p class="text-sm text-gray-500 mb-4">
            将当前浏览器的所有书签导出，可用于备份或分析。
          </p>
          <div class="flex space-x-4">
            <button
              @click="showFolderSelect('json')"
              class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              导出为 JSON
            </button>
            <button
              @click="showFolderSelect('xlsx')"
              class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              导出为 Excel
            </button>
          </div>
        </div>
        
        <!-- 导入配置 -->
        <div>
          <h3 class="text-lg font-semibold mb-2">导入配置</h3>
          <p class="text-sm text-gray-500 mb-4">
            从 JSON 文件导入配置，将覆盖当前所有配置。
          </p>
          <div class="flex flex-col">
            <input
              type="file"
              ref="fileInput"
              accept=".json"
              class="hidden"
              @change="handleFileImport"
            />
            <button
              @click="triggerFileInput"
              class="px-4 py-2 bg-primary text-white rounded hover:bg-[#66b1ff] w-fit"
            >
              选择文件导入
            </button>

            <!-- 粘贴导入 -->
            <div class="mt-4">
              <h4 class="text-md font-medium mb-2">或从剪贴板粘贴</h4>
              <textarea
                v-model="importText"
                class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                rows="5"
                placeholder="粘贴 JSON 格式的配置数据..."
              ></textarea>
              <button
                @click="importFromText"
                class="mt-2 px-4 py-2 bg-primary text-white rounded hover:bg-[#66b1ff] disabled:opacity-50"
                :disabled="!importText.trim()"
              >
                导入
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
