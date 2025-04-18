<script setup lang="ts">
import { ref } from "vue";
import { sendMessage } from "webext-bridge/content-script";

interface Props {
  title: string;
  url: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  save: [bookmark: { title: string; url: string; tags: string }];
  cancel: [];
}>();

const formData = ref({
  title: props.title,
  url: props.url,
  tags: "", // 新增标签字段
});

const isSaving = ref(false);
const errorMessage = ref("");
const isChecking = ref(false);

async function checkUrl() {
  try {
    isChecking.value = true;
    errorMessage.value = "";

    const response = (await sendMessage("checkUrl", {
      url: formData.value.url,
    })) as {
      success: boolean;
      exists: boolean;
      error?: string;
    };

    if (response.exists) {
      errorMessage.value = "该网址已经收藏过了";
    } else {
      errorMessage.value = "该网址尚未收藏";
    }
  } catch (error) {
    errorMessage.value = (error as Error).message;
  } finally {
    isChecking.value = false;
  }
}

async function handleSave() {
  try {
    errorMessage.value = ""; // 重置错误信息
    console.log("开始保存书签");
    isSaving.value = true;

    // 将 Proxy 对象转换为普通对象
    const bookmarkData = {
      title: formData.value.title,
      url: formData.value.url,
      tags: formData.value.tags, // 添加标签
    };

    const response = (await sendMessage("saveBookmark", bookmarkData)) as {
      success: boolean;
      error?: string;
    };

    if (response?.success) {
      emit("save", bookmarkData);
    } else {
      throw new Error(response?.error || "保存失败");
    }
  } catch (error) {
    errorMessage.value = (error as Error).message;
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div
    class="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]"
    @click.self="emit('cancel')"
  >
    <div class="bg-white rounded-lg shadow p-6 w-[500px]">
      <h2 class="text-xl font-semibold mb-6 mt-0 text-center">
        保存书签到飞书
      </h2>

      <form @submit.prevent="handleSave" class="space-y-4 text-left">
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            标题 <span class="text-red-500">*</span>
          </label>
          <input
            v-model="formData.title"
            type="text"
            class="w-full h-10 px-3 py-2 border border-solid border-gray-300 rounded-md box-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="请输入标题"
            required
          />
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            网址 <span class="text-red-500">*</span>
          </label>
          <input
            v-model="formData.url"
            type="text"
            class="w-full h-10 px-3 py-2 border border-solid border-gray-300 rounded-md box-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="请输入链接地址"
            required
          />
        </div>

        <!-- 新增标签输入框 -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700"> 标签 </label>
          <input
            v-model="formData.tags"
            type="text"
            class="w-full h-10 px-3 py-2 border border-solid border-gray-300 rounded-md box-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="使用#分隔多个标签，例如：#工作#学习#参考"
          />
        </div>

        <div class="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-solid border-gray-300 rounded-md hover:bg-gray-50 whitespace-nowrap"
            @click="checkUrl"
            :disabled="isChecking"
          >
            {{ isChecking ? "检测中..." : "检测是否收藏" }}
          </button>

          <button
            type="button"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-solid border-gray-300 rounded-md hover:bg-gray-50 whitespace-nowrap"
            @click="emit('cancel')"
          >
            取消
          </button>

          <button
            type="submit"
            class="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary/90 whitespace-nowrap"
            :disabled="isSaving"
          >
            {{ isSaving ? "保存中..." : "保存" }}
          </button>
        </div>

        <div
          v-if="errorMessage"
          class="mt-4 p-4 text-base text-center bg-red-50 border border-red-200 rounded text-red-500"
        >
          {{ errorMessage }}
        </div>
      </form>
    </div>
  </div>
</template>
