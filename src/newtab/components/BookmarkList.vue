<script setup lang="ts">
import Tooltip from "~/components/Tooltip.vue";
import { computed } from "vue";

interface Bookmark {
  id: string;
  title: string;
  url: string;
  description?: string; // 添加简介字段
  tags?: string[];
  createdTime?: string;
}

const props = defineProps<{
  bookmarks: Bookmark[];
}>();

// 确保标题和URL显示正确
function getTitle(bookmark: Bookmark): string {
  if (!bookmark.title || bookmark.title === "无标题") {
    return bookmark.url.replace(/^https?:\/\//, "").split("/")[0];
  }
  return bookmark.title;
}

// 为标签生成随机颜色
const tagColors = computed(() => {
  const colors = new Map();

  // 预定义一些柔和的颜色
  const colorPalette = [
    { bg: "bg-blue-100", text: "text-blue-600" },
    { bg: "bg-green-100", text: "text-green-600" },
    { bg: "bg-red-100", text: "text-red-600" },
    { bg: "bg-yellow-100", text: "text-yellow-600" },
    { bg: "bg-purple-100", text: "text-purple-600" },
    { bg: "bg-pink-100", text: "text-pink-600" },
    { bg: "bg-indigo-100", text: "text-indigo-600" },
    { bg: "bg-teal-100", text: "text-teal-600" },
    { bg: "bg-orange-100", text: "text-orange-600" },
    { bg: "bg-cyan-100", text: "text-cyan-600" },
  ];

  // 为每个标签分配一个颜色
  props.bookmarks.forEach((bookmark) => {
    if (bookmark.tags) {
      bookmark.tags.forEach((tag) => {
        if (!colors.has(tag)) {
          const randomColor =
            colorPalette[Math.floor(Math.random() * colorPalette.length)];
          colors.set(tag, randomColor);
        }
      });
    }
  });

  return colors;
});

// 获取标签的颜色
function getTagColor(tag: string) {
  return (
    tagColors.value.get(tag) || { bg: "bg-gray-100", text: "text-gray-600" }
  );
}
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <!-- 对于有描述的书签，使用 Tooltip 包装 -->
    <template v-for="bookmark in bookmarks" :key="bookmark.id">
      <Tooltip
        v-if="bookmark.description"
        :content="bookmark.description || ''"
        position="top"
      >
        <div
          class="bg-white p-4 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border border-gray-200"
        >
          <a
            :href="bookmark.url"
            target="_blank"
            rel="noopener noreferrer"
            class="block"
          >
            <h4
              class="text-lg font-medium text-primary mb-2 hover:underline truncate"
            >
              {{ getTitle(bookmark) }}
            </h4>
            <p class="text-sm text-gray-500 truncate mb-2">
              {{ bookmark.url }}
            </p>

            <div
              v-if="bookmark.tags && bookmark.tags.length > 0"
              class="flex flex-wrap gap-1 mt-2"
            >
              <span
                v-for="tag in bookmark.tags"
                :key="tag"
                class="px-2 py-0.5 text-xs rounded-full"
                :class="[getTagColor(tag).bg, getTagColor(tag).text]"
              >
                {{ tag }}
              </span>
            </div>
          </a>
        </div>
      </Tooltip>

      <!-- 如果没有描述，则不使用 Tooltip 组件 -->
      <div
        v-else
        class="bg-white p-4 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border border-gray-200"
      >
        <a
          :href="bookmark.url"
          target="_blank"
          rel="noopener noreferrer"
          class="block"
        >
          <h4
            class="text-lg font-medium text-primary mb-2 hover:underline truncate"
          >
            {{ getTitle(bookmark) }}
          </h4>
          <p class="text-sm text-gray-500 truncate mb-2">{{ bookmark.url }}</p>

          <div
            v-if="bookmark.tags && bookmark.tags.length > 0"
            class="flex flex-wrap gap-1 mt-2"
          >
            <span
              v-for="tag in bookmark.tags"
              :key="tag"
              class="px-2 py-0.5 text-xs rounded-full"
              :class="[getTagColor(tag).bg, getTagColor(tag).text]"
            >
              {{ tag }}
            </span>
          </div>
        </a>
      </div>
    </template>
  </div>
</template>
