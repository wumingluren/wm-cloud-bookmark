<script setup lang="ts">
import 'uno.css'
import { ref } from 'vue'
import BookmarkEditor from '~/components/BookmarkEditor.vue'
import OmniPalette from '~/omni/components/OmniPalette.vue'

const bookmarkInfo = ref<{
  title: string
  url: string
} | null>(null)
const isBookmarkEditorVisible = ref(false)
const isOmniVisible = ref(false)
const omniInitialQuery = ref('')

function closeBookmarkEditor() {
  isBookmarkEditorVisible.value = false
  bookmarkInfo.value = null
}

function openOmniPalette(query = '') {
  isBookmarkEditorVisible.value = false
  bookmarkInfo.value = null
  omniInitialQuery.value = query
  isOmniVisible.value = true
}

function toggleOmniPalette(query = '') {
  if (isOmniVisible.value) {
    isOmniVisible.value = false
    omniInitialQuery.value = ''
    return
  }

  openOmniPalette(query)
}

function closeOmniPalette() {
  isOmniVisible.value = false
  omniInitialQuery.value = ''
}

browser.runtime.onMessage.addListener((message: any) => {
  if (message.type === 'openBookmarkEditor') {
    bookmarkInfo.value = message.data
    isOmniVisible.value = false
    isBookmarkEditorVisible.value = true
  }

  if (message.type === 'toggleOmniPalette') {
    toggleOmniPalette(message.query)
  }

  if (message.type === 'openOmniPalette') {
    openOmniPalette(message.query)
  }

  if (message.type === 'closeOmniPalette') {
    closeOmniPalette()
  }
})

async function handleSave() {
  closeBookmarkEditor()
}
</script>

<template>
  <div class="extension-overlay-root">
    <div v-if="isBookmarkEditorVisible && bookmarkInfo">
      <BookmarkEditor
        v-bind="bookmarkInfo"
        @save="handleSave"
        @cancel="closeBookmarkEditor"
      />
    </div>

    <OmniPalette
      v-if="isOmniVisible"
      :initial-query="omniInitialQuery"
      @close="closeOmniPalette"
    />
  </div>
</template>

<style scoped>
.extension-overlay-root {
  position: relative;
  z-index: 2147483645;
}
</style>
