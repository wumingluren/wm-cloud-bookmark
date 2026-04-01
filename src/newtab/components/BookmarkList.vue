<script setup lang="ts">
import type { Bookmark } from '../types'
import BookmarkItem from './BookmarkItem.vue'

defineProps<{
  bookmarks: Bookmark[]
}>()
</script>

<template>
  <ul class="bookmark-list">
    <li
      v-for="(bookmark, index) in bookmarks"
      :key="bookmark.id"
      class="bookmark-list__item"
    >
      <BookmarkItem :bookmark="bookmark" :index="index" />
    </li>
  </ul>
</template>

<style scoped>
.bookmark-list {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.8rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.bookmark-list__item {
  min-width: 0;
}

@media (max-width: 1280px) {
  .bookmark-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .bookmark-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .bookmark-list {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
