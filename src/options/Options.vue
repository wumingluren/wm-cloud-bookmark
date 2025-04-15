<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useWebExtensionStorage } from "~/composables/useWebExtensionStorage";
import { FeishuService } from "~/services/feishu";
import { ElMessage, ElMessageBox } from "element-plus"; // 添加 ElMessageBox 导入
// import 'element-plus/es/components/message/style/css';
import {
  exportSettings,
  importSettings,
  ExportData,
} from "~/composables/useSettings";
import * as XLSX from "xlsx"; // 导入 XLSX 库

// 生成唯一ID的函数
function generateId() {
  return `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

// 定义飞书配置类型
interface FeishuConfigItem {
  id: string;
  name: string;
  appId: string;
  appSecret: string;
  baseId: string;
  tableId: string;
}

// 定义飞书配置存储 - 兼容旧版本
const legacyFeishuConfig = useWebExtensionStorage("feishu-config", {
  appId: "",
  appSecret: "",
  baseId: "",
  tableId: "",
});

// 新的多配置存储，明确指定类型
const feishuConfigs = useWebExtensionStorage<FeishuConfigItem[]>(
  "feishu-configs",
  []
);
const activeConfigId = useWebExtensionStorage("active-config-id", "");

// 其他配置
const otherSettings = useWebExtensionStorage("other-settings", {
  recommendCount: 12, // 默认推荐书签条数
});

// 推荐书签条数
const recommendCount = ref(otherSettings.value.recommendCount);

// 监听 otherSettings 变化，同步更新 recommendCount
watch(
  () => otherSettings.value,
  (newSettings) => {
    recommendCount.value = newSettings.recommendCount;
  }
);

// 表单数据
const formData = ref<FeishuConfigItem>({
  id: "",
  name: "",
  appId: "",
  appSecret: "",
  baseId: "",
  tableId: "",
});

// 当前活动的菜单项
const activeMenu = ref("feishu-config");

// 控制配置表单的显示/隐藏
const showConfigForm = ref(false);

onMounted(() => {});

// 更新旧配置以保持兼容性
function updateLegacyConfig() {
  if (activeConfigId.value && feishuConfigs.value.length > 0) {
    const activeConfig = feishuConfigs.value.find(
      (config) => config.id === activeConfigId.value
    );
    if (activeConfig) {
      // 更新旧配置存储，保持向后兼容
      legacyFeishuConfig.value = {
        appId: activeConfig.appId,
        appSecret: activeConfig.appSecret,
        baseId: activeConfig.baseId,
        tableId: activeConfig.tableId,
      };
    }
  }
}

// // 监听活动配置变化，同步到表单
// watch(
//   () => activeConfigId.value,
//   (newId) => {
//     if (newId) {
//       const config = feishuConfigs.value.find((c) => c.id === newId);
//       if (config) {
//         formData.value = { ...config };
//       }
//     } else if (feishuConfigs.value.length > 0) {
//       // 如果没有活动配置但有配置列表，选择第一个
//       activeConfigId.value = feishuConfigs.value[0].id;
//     } else {
//       // 没有任何配置，清空表单
//       resetForm();
//     }
//   },
//   { immediate: true }
// );

// 监听配置列表变化
watch(
  () => feishuConfigs.value,
  () => {
    // 如果没有活动配置但有配置列表，选择第一个
    if (!activeConfigId.value && feishuConfigs.value.length > 0) {
      activeConfigId.value = feishuConfigs.value[0].id;
    }
    // 如果活动配置不在列表中，重置
    else if (
      activeConfigId.value &&
      !feishuConfigs.value.find((c) => c.id === activeConfigId.value)
    ) {
      if (feishuConfigs.value.length > 0) {
        activeConfigId.value = feishuConfigs.value[0].id;
      } else {
        activeConfigId.value = "";
        resetForm();
      }
    }
  }
);

// 保存状态
const isSaving = ref(false);
const saveMessage = ref("");

// 表单验证
const errors = ref({
  name: "",
  appId: "",
  appSecret: "",
  baseId: "",
  tableId: "",
});

const isFormValid = computed(() => {
  return (
    !Object.values(errors.value).some((error) => error) &&
    formData.value.name &&
    formData.value.appId &&
    formData.value.appSecret &&
    formData.value.baseId &&
    formData.value.tableId
  );
});

function validateForm() {
  errors.value.name = !formData.value.name ? "配置名称不能为空" : "";
  errors.value.appId = !formData.value.appId ? "APP ID 不能为空" : "";
  errors.value.appSecret = !formData.value.appSecret
    ? "App Secret 不能为空"
    : "";
  errors.value.baseId = !formData.value.baseId ? "多维表格 ID 不能为空" : "";
  errors.value.tableId = !formData.value.tableId ? "表格 ID 不能为空" : "";
  return isFormValid.value;
}

// 重置表单
function resetForm() {
  formData.value = {
    id: "",
    name: "",
    appId: "",
    appSecret: "",
    baseId: "",
    tableId: "",
  };
}

// 创建新配置
function createNewConfig() {
  // 检查是否已有配置，免费版只能添加一个
  if (feishuConfigs.value.length >= 1) {
    ElMessageBox.confirm(
      '免费版只能添加一个飞书配置，仅需9.9元，添加微信号"wmluren"付费。当然直接点击"确定"即可继续使用，不会有任何验证，完全基于信任。',
      "温馨提示",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }
    )
      .then(() => {
        // 用户点击确认按钮
        resetForm();
        formData.value.id = generateId();
        showConfigForm.value = true; // 显示表单
      })
      .catch(() => {
        // 用户点击取消按钮
        ElMessage.info("您可以继续使用当前配置");
      });
    return;
  }
}

// 保存配置
async function saveConfig() {
  if (!validateForm()) {
    ElMessage.error("请填写所有必填项");
    return;
  }

  try {
    isSaving.value = true;

    // 确保表单数据有 ID
    if (!formData.value.id) {
      formData.value.id = generateId();
    }

    // 检查是新增还是更新
    const existingIndex = feishuConfigs.value.findIndex(
      (c) => c.id === formData.value.id
    );

    if (existingIndex >= 0) {
      // 更新现有配置
      feishuConfigs.value[existingIndex] = { ...formData.value };
    } else {
      // 添加新配置
      feishuConfigs.value.push({ ...formData.value });
    }

    // 设置为活动配置
    activeConfigId.value = formData.value.id;

    // 更新旧配置以保持兼容性
    updateLegacyConfig();

    ElMessage.success("保存成功");
    showConfigForm.value = false; // 保存成功后隐藏表单
  } catch (error) {
    ElMessage.error("保存失败：" + (error as Error).message);
  } finally {
    isSaving.value = false;
  }
}

// 删除配置
function deleteConfig(id: string) {
  if (feishuConfigs.value.length <= 1) {
    ElMessage.warning("至少保留一个配置");
    return;
  }

  feishuConfigs.value = feishuConfigs.value.filter((c) => c.id !== id);

  if (activeConfigId.value === id) {
    activeConfigId.value = feishuConfigs.value[0]?.id || "";
  }

  updateLegacyConfig();

  ElMessage.success("删除成功");
}

// 设置为活动配置
function setActiveConfig(id: string) {
  activeConfigId.value = id;
  updateLegacyConfig();
  ElMessage.success("已切换配置");
}

// 编辑配置
function editConfig(config: FeishuConfigItem) {
  formData.value = { ...config };
  showConfigForm.value = true; // 显示表单
}

// 保存其他设置
function saveOtherSettings() {
  otherSettings.value = {
    ...otherSettings.value,
    recommendCount: recommendCount.value,
  };

  ElMessage.success("保存成功");
}

// 测试连接状态
const isTesting = ref(false);

// 测试连接
async function testConnection() {
  if (!validateForm()) {
    ElMessage.error("请先填写并保存配置信息");
    return;
  }

  try {
    isTesting.value = true;
    const feishuService = new FeishuService({
      appId: formData.value.appId,
      appSecret: formData.value.appSecret,
      baseId: formData.value.baseId,
      tableId: formData.value.tableId,
    });
    const result = await feishuService.testConnection();

    ElMessage.success(result.message);
  } catch (error) {
    ElMessage.error("测试失败：" + (error as Error).message);
  } finally {
    isTesting.value = false;
  }
}

// 滚动到指定部分
function scrollToSection(sectionId: string, event: Event) {
  event.preventDefault(); // 阻止默认的链接行为

  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: "smooth" });
  }

  activeMenu.value = sectionId;
}

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

// 获取浏览器所有书签
async function getAllBookmarks() {
  try {
    // 检查是否有书签权限
    if (!browser.bookmarks) {
      throw new Error(
        "浏览器书签API不可用，请确保在manifest.json中添加了bookmarks权限"
      );
    }

    // 定义书签项的接口
    interface BookmarkItem {
      title: string;
      url: string;
    }

    // 递归提取书签的辅助函数，添加明确的返回类型
    function extractBookmarks(nodes: any[]): BookmarkItem[] {
      let result: BookmarkItem[] = [];

      for (const node of nodes) {
        // 如果有url字段，说明是书签而不是文件夹
        if (node.url && node.title) {
          result.push({
            title: node.title,
            url: node.url,
          });
        }

        // 如果有子节点，递归处理
        if (node.children) {
          result = result.concat(extractBookmarks(node.children));
        }
      }

      return result;
    }

    // 尝试获取书签
    const bookmarkTree = await browser.bookmarks.getTree();
    // 提取所有书签到扁平数组
    const flatBookmarks = extractBookmarks(bookmarkTree);
    return flatBookmarks;
  } catch (error) {
    console.error("获取书签失败:", error);
    throw error;
  }
}

// 导出浏览器书签为JSON
async function exportBrowserBookmarks() {
  try {
    // 检查权限
    const bookmarks = await getAllBookmarks();

    // 创建并下载文件
    const blob = new Blob([JSON.stringify(bookmarks, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `browser-bookmarks-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    ElMessage.success(`浏览器书签导出成功，共 ${bookmarks.length} 条书签`);
  } catch (error) {
    ElMessage.error("导出浏览器书签失败：" + (error as Error).message);
  }
}

// 导出浏览器书签为 XLSX
async function exportBrowserBookmarksToXlsx() {
  try {
    // 检查权限
    const bookmarks = await getAllBookmarks();

    // 创建工作簿
    const workbook = XLSX.utils.book_new();

    // 设置表头并准备数据 - 确保只有标题和网址两列
    const headers = [["标题", "网址"]];
    const data = bookmarks.map((bookmark) => [bookmark.title, bookmark.url]);
    const worksheet = XLSX.utils.aoa_to_sheet([...headers, ...data]);

    // 设置列宽
    const wscols = [
      { wch: 40 }, // 标题列宽
      { wch: 80 }, // 网址列宽
    ];
    worksheet["!cols"] = wscols;

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, "浏览器书签");

    // 导出文件
    XLSX.writeFile(
      workbook,
      `browser-bookmarks-${new Date().toISOString().slice(0, 10)}.xlsx`
    );

    ElMessage.success(`浏览器书签导出成功，共 ${bookmarks.length} 条书签`);
  } catch (error) {
    ElMessage.error("导出浏览器书签失败：" + (error as Error).message);
  }
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
        <h2 class="text-2xl font-bold mb-6">飞书 API 配置</h2>

        <!-- 配置列表 -->
        <div class="mb-6 bg-white rounded-lg shadow p-4">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">配置列表</h3>
            <button
              @click="createNewConfig"
              class="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
            >
              新增配置
            </button>
          </div>

          <div class="space-y-2">
            <div v-if="feishuConfigs.length === 0" class="text-gray-500 italic">
              暂无配置，请点击"新增配置"按钮创建
            </div>

            <div
              v-for="config in feishuConfigs"
              :key="config.id"
              class="flex items-center justify-between p-3 border rounded"
              :class="
                config.id === activeConfigId
                  ? 'border-primary bg-blue-50'
                  : 'border-gray-200'
              "
            >
              <div class="flex items-center">
                <div
                  v-if="config.id === activeConfigId"
                  class="w-2 h-2 bg-primary rounded-full mr-2"
                ></div>
                <span>{{ config.name }}</span>
              </div>

              <div class="flex space-x-2">
                <button
                  v-if="config.id !== activeConfigId"
                  @click="setActiveConfig(config.id)"
                  class="px-2 py-1 bg-primary text-white text-sm rounded hover:bg-[#66b1ff]"
                >
                  启用
                </button>
                <button
                  @click="editConfig(config)"
                  class="px-2 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                >
                  编辑
                </button>
                <button
                  @click="deleteConfig(config.id)"
                  class="px-2 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 配置表单 -->
        <div v-if="showConfigForm" class="bg-white rounded-lg shadow p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">
              {{ formData.id ? "编辑配置" : "新增配置" }}
            </h3>
            <button
              @click="showConfigForm = false"
              class="text-gray-500 hover:text-gray-700"
            >
              <span class="text-xl">×</span>
            </button>
          </div>

          <form @submit.prevent="saveConfig" class="space-y-4">
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700">
                配置名称 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="formData.name"
                type="text"
                class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                :class="errors.name ? 'border-red-500' : 'border-gray-300'"
                placeholder="请输入配置名称"
              />
              <p v-if="errors.name" class="text-red-500 text-sm">
                {{ errors.name }}
              </p>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700">
                APP ID <span class="text-red-500">*</span>
              </label>
              <input
                v-model="formData.appId"
                type="text"
                class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                :class="errors.appId ? 'border-red-500' : 'border-gray-300'"
                placeholder="请输入飞书 APP ID"
              />
              <p v-if="errors.appId" class="text-red-500 text-sm">
                {{ errors.appId }}
              </p>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700">
                App Secret <span class="text-red-500">*</span>
              </label>
              <input
                v-model="formData.appSecret"
                type="password"
                class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                :class="errors.appSecret ? 'border-red-500' : 'border-gray-300'"
                placeholder="请输入飞书 App Secret"
              />
              <p v-if="errors.appSecret" class="text-red-500 text-sm">
                {{ errors.appSecret }}
              </p>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700">
                Base ID（多维表格 ID）<span class="text-red-500">*</span>
              </label>
              <input
                v-model="formData.baseId"
                type="text"
                class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                :class="errors.baseId ? 'border-red-500' : 'border-gray-300'"
                placeholder="请输入多维表格 ID"
              />
              <p v-if="errors.baseId" class="text-red-500 text-sm">
                {{ errors.baseId }}
              </p>
            </div>

            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700">
                Table ID（表格 ID）<span class="text-red-500">*</span>
              </label>
              <input
                v-model="formData.tableId"
                type="text"
                class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                :class="errors.tableId ? 'border-red-500' : 'border-gray-300'"
                placeholder="请输入表格 ID"
              />
              <p v-if="errors.tableId" class="text-red-500 text-sm">
                {{ errors.tableId }}
              </p>
            </div>

            <div class="flex items-center gap-4 pt-4">
              <button
                type="submit"
                class="px-4 py-2 bg-primary text-white rounded hover:bg-[#66b1ff] disabled:opacity-50"
                :disabled="isSaving || isTesting"
              >
                {{ isSaving ? "保存中..." : "保存" }}
              </button>
              <button
                type="button"
                class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                :disabled="isSaving || isTesting"
                @click="testConnection"
              >
                {{ isTesting ? "测试中..." : "测试连接" }}
              </button>
              <!-- 移除这部分 -->
              <!-- <span
                v-if="saveMessage"
                :class="
                  saveMessage.includes('失败') || saveMessage.includes('请')
                    ? 'text-red-500'
                    : 'text-green-500'
                "
              >
                {{ saveMessage }}
              </span> -->
            </div>
          </form>
        </div>
      </section>

      <!-- 其他设置部分 -->
      <section id="other-settings" class="mb-10">
        <h2 class="text-2xl font-bold mb-6">其他设置</h2>

        <div class="bg-white rounded-lg shadow p-6">
          <form @submit.prevent="saveOtherSettings" class="space-y-4">
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700">
                推荐书签条数
              </label>
              <input
                v-model.number="recommendCount"
                type="number"
                min="1"
                max="50"
                class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="请输入推荐书签条数"
              />
              <p class="text-sm text-gray-500">
                设置首页显示的推荐书签数量，建议设置为 12 条
              </p>
            </div>

            <div class="flex items-center gap-4 pt-4">
              <button
                type="submit"
                class="px-4 py-2 bg-primary text-white rounded hover:bg-[#66b1ff]"
              >
                保存
              </button>
              <!-- 移除这部分 -->
              <!-- <span
                v-if="saveMessage"
                :class="
                  saveMessage.includes('失败') || saveMessage.includes('请')
                    ? 'text-red-500'
                    : 'text-green-500'
                "
              >
                {{ saveMessage }}
              </span> -->
            </div>
          </form>
        </div>
      </section>

      <!-- 在其他设置部分下方添加导入导出部分 -->
      <section id="import-export" class="mb-10">
        <h2 class="text-2xl font-bold mb-6">导入导出</h2>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="space-y-6">
            <!-- 导出配置 -->
            <!-- 在导出配置部分添加浏览器书签导出按钮 -->
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
                  @click="exportBrowserBookmarks"
                  class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  导出为 JSON
                </button>
                <button
                  @click="exportBrowserBookmarksToXlsx"
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
      </section>
    </div>
  </main>
</template>
