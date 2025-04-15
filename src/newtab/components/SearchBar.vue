<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { sendMessage } from "webext-bridge/content-script";

const props = defineProps<{
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  search: [query: string, isBookmarkSearch: boolean];
}>();

const searchInput = ref("");
const isBookmarkSearch = ref(true); // 默认为书签搜索模式
const showTip = ref(true); // 控制提示信息的显示

// 计算当前搜索模式的图标和提示文本
const searchModeInfo = computed(() => {
  return isBookmarkSearch.value
    ? {
        icon: "bookmark",
        placeholder: "搜索书签标题，网址，标签... 按Tab切换搜索",
        title: "书签搜索模式 (按Tab切换)",
      }
    : {
        icon: "search",
        placeholder: "使用浏览器搜索... 按Tab切换搜索",
        title: "浏览器搜索模式 (按Tab切换)",
      };
});

// 在组件挂载时检查本地存储中是否已经关闭过提示
onMounted(() => {
  const tipClosed = localStorage.getItem("searchModeTipClosed");
  if (tipClosed === "true") {
    showTip.value = false;
  }
});

async function handleSubmit() {
  if (isBookmarkSearch.value) {
    // 书签搜索模式，发送搜索事件
    emit("search", searchInput.value, true);
  } else {
    // 浏览器搜索模式，使用浏览器默认搜索引擎
    try {
      // 通过background脚本调用chrome.search.query API
      await sendMessage("executeSearch", { query: searchInput.value });
    } catch (error) {
      console.error("搜索执行失败:", error);
      const searchQuery = encodeURIComponent(searchInput.value);
      window.location.href = `https://www.baidu.com/s?q=${searchQuery}`;
    }
  }
}

function toggleSearchMode() {
  isBookmarkSearch.value = !isBookmarkSearch.value;
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === "Tab") {
    event.preventDefault(); // 阻止默认的Tab行为
    toggleSearchMode();
  }
}

function hideTip() {
  showTip.value = false;
  // 将关闭状态保存到本地存储
  localStorage.setItem("searchModeTipClosed", "true");
}
</script>

<template>
  <div class="w-full">
    <form @submit.prevent="handleSubmit" class="relative">
      <!-- 搜索模式图标 -->
      <div
        class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
        :title="searchModeInfo.title"
        @click="toggleSearchMode"
      >
        <!-- 现有的SVG图标代码保持不变 -->
        <svg
          v-if="searchModeInfo.icon === 'bookmark'"
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 cursor-pointer hover:text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 cursor-pointer hover:text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      <input
        v-model="searchInput"
        type="text"
        :placeholder="searchModeInfo.placeholder"
        class="w-full h-12 pl-10 pr-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        :disabled="isLoading"
        @keydown="handleKeyDown"
      />
      <button
        type="submit"
        class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-primary"
        :disabled="isLoading"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </button>
    </form>

    <!-- 搜索模式切换提示 -->
    <div
      v-if="showTip"
      class="mt-2 text-sm text-gray-600 flex items-center justify-between bg-blue-50 p-2 rounded-md"
    >
      <div class="flex items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 text-blue-500 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span
          >提示: 点击左侧图标或按
          <kbd class="px-2 py-1 bg-gray-200 rounded">Tab</kbd>
          键可以切换书签搜索和浏览器搜索模式</span
        >
      </div>
      <button @click="hideTip" class="text-gray-500 hover:text-gray-700">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  </div>
</template>
