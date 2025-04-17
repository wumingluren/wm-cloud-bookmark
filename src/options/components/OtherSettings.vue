<script setup lang="ts">
import { ref, watch } from "vue";
import { useWebExtensionStorage } from "~/composables/useWebExtensionStorage";
import { ElMessage } from "element-plus";

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

// 保存其他设置
function saveOtherSettings() {
  otherSettings.value = {
    ...otherSettings.value,
    recommendCount: recommendCount.value,
  };

  ElMessage.success("保存成功");
}
</script>

<template>
  <div>
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
        </div>
      </form>
    </div>
  </div>
</template>
