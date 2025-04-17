<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useWebExtensionStorage } from "~/composables/useWebExtensionStorage";
import { FeishuService } from "~/services/feishu";
import { ElMessage, ElMessageBox } from "element-plus";

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

// 表单数据
const formData = ref<FeishuConfigItem>({
  id: "",
  name: "",
  appId: "",
  appSecret: "",
  baseId: "",
  tableId: "",
});

// 控制配置表单的显示/隐藏
const showConfigForm = ref(false);

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

  // 如果没有配置，直接创建
  resetForm();
  formData.value.id = generateId();
  showConfigForm.value = true; // 显示表单
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
</script>

<template>
  <div>
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
        </div>
      </form>
    </div>
  </div>
</template>
