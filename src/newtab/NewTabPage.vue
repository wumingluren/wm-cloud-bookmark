<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { sendMessage } from "webext-bridge/content-script";
import BookmarkList from "./components/BookmarkList.vue";
import SearchBar from "./components/SearchBar.vue";

interface Bookmark {
  id: string;
  title: string;
  url: string;
  tags?: string[];
  createdTime?: string;
}

const bookmarks = ref<Bookmark[]>([]);
const randomBookmarks = ref<Bookmark[]>([]);
const searchQuery = ref("");
const isLoading = ref(false);
const errorMessage = ref("");
const isSearching = ref(false);

// 搜索结果
const searchResults = ref<Bookmark[]>([]);

// 获取推荐书签
async function fetchRecommendedBookmarks() {
  try {
    isLoading.value = true;
    errorMessage.value = "";

    const response = await sendMessage("getRecommendedBookmarks", {});
    const typedResponse = response as unknown as {
      success: boolean;
      data: Bookmark[];
      error?: string;
    };

    if (typedResponse.success) {
      randomBookmarks.value = typedResponse.data;
    } else {
      throw new Error(typedResponse.error || "获取推荐书签失败");
    }
  } catch (error) {
    errorMessage.value = (error as Error).message;
    console.error("获取推荐书签失败:", error);
  } finally {
    isLoading.value = false;
  }
}

// 搜索书签
async function searchBookmarks(query: string) {
  try {
    if (!query.trim()) {
      searchResults.value = [];
      return;
    }

    isSearching.value = true;
    errorMessage.value = "";

    const response = await sendMessage("searchBookmarks", { query });
    const typedResponse = response as unknown as {
      success: boolean;
      data: Bookmark[];
      error?: string;
    };

    if (typedResponse.success) {
      searchResults.value = typedResponse.data;
    } else {
      throw new Error(typedResponse.error || "搜索书签失败");
    }
  } catch (error) {
    errorMessage.value = (error as Error).message;
    console.error("搜索书签失败:", error);
  } finally {
    isSearching.value = false;
  }
}

// 处理搜索
async function handleSearch(query: string) {
  searchQuery.value = query;
  await searchBookmarks(query);
}

onMounted(async () => {
  await fetchRecommendedBookmarks();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="max-w-4xl mx-auto">
      <header class="mb-8 text-center">
        <h1 class="text-3xl font-bold text-gray-800 mb-2">无名书签导航</h1>
        <p class="text-gray-600">快速访问您收藏的网址</p>
      </header>

      <SearchBar @search="handleSearch" :is-loading="isSearching" />

      <div
        v-if="errorMessage"
        class="mt-4 p-4 bg-red-50 text-red-500 rounded-lg"
      >
        {{ errorMessage }}
      </div>

      <!-- 搜索结果 -->
      <div v-if="searchQuery && searchResults.length > 0" class="mt-8">
        <h2 class="text-xl font-semibold mb-4">搜索结果</h2>
        <BookmarkList :bookmarks="searchResults" />
      </div>

      <div
        v-if="searchQuery && searchResults.length === 0 && !isSearching"
        class="mt-8 text-center text-gray-500"
      >
        未找到匹配的书签
      </div>

      <!-- 随机推荐 -->
      <div class="mt-8">
        <h2 class="text-xl font-semibold mb-4">推荐书签</h2>
        <BookmarkList :bookmarks="randomBookmarks" />

        <div
          v-if="randomBookmarks.length === 0 && !isLoading"
          class="text-center text-gray-500 mt-4"
        >
          暂无书签推荐
        </div>

        <div v-if="isLoading" class="text-center text-gray-500 mt-4">
          加载中...
        </div>
      </div>
    </div>
  </div>
</template>
