<script setup lang="ts">
import "uno.css";
import { ref } from "vue";
import { useToggle } from "@vueuse/core";
import BookmarkEditor from "~/components/BookmarkEditor.vue";

const bookmarkInfo = ref<{
  title: string;
  url: string;
} | null>(null);

const [isVisible, toggleVisible] = useToggle(false);

// 监听来自 background 的消息
browser.runtime.onMessage.addListener((message: any) => {
  if (message.type === "openBookmarkEditor") {
    bookmarkInfo.value = message.data;
    toggleVisible(true);
  }
});

async function handleSave(data: any) {
  // 关闭弹窗并清空数据
  toggleVisible(false);
  bookmarkInfo.value = null;
}

function handleCancel() {
  // 关闭弹窗并清空数据
  toggleVisible(false);
  bookmarkInfo.value = null;
}
</script>

<template>
  <!-- class="fixed inset-0 bg-black/50 flex items-center justify-center z-999999 w-screen h-screen" -->
  <div v-if="isVisible && bookmarkInfo">
    <BookmarkEditor
      v-bind="bookmarkInfo"
      @save="handleSave"
      @cancel="handleCancel"
    />
  </div>
</template>
