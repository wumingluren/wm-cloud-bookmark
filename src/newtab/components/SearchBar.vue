<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { sendMessage } from 'webext-bridge/content-script'

const props = defineProps<{
  isLoading?: boolean
}>()

const emit = defineEmits<{
  search: [query: string]
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const searchInput = ref('')
const isBookmarkSearch = ref(true)

const searchModeInfo = computed(() =>
  isBookmarkSearch.value
    ? {
        placeholder: '搜索标题、网址、标签，直接命中你的收藏',
        actionLabel: '搜索收藏',
      }
    : {
        placeholder: '输入关键词，使用浏览器默认搜索引擎',
        actionLabel: '网页搜索',
      },
)

const canSubmit = computed(
  () => searchInput.value.trim().length > 0 && !props.isLoading,
)

onMounted(() => {
  requestAnimationFrame(() => {
    inputRef.value?.focus()
  })
})

async function handleSubmit() {
  const query = searchInput.value.trim()

  if (!query) {
    emit('search', '')
    return
  }

  if (isBookmarkSearch.value) {
    emit('search', query)
    return
  }

  try {
    await sendMessage('executeSearch', { query })
  }
  catch (error) {
    console.error('搜索执行失败:', error)
    window.location.href = `https://www.baidu.com/s?q=${encodeURIComponent(
      query,
    )}`
  }
}

function setSearchMode(nextModeIsBookmark: boolean) {
  isBookmarkSearch.value = nextModeIsBookmark

  if (!nextModeIsBookmark) {
    emit('search', '')
  }
}

function toggleSearchMode() {
  isBookmarkSearch.value = !isBookmarkSearch.value
}

function clearSearch() {
  searchInput.value = ''
  emit('search', '')
  inputRef.value?.focus()
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Tab') {
    event.preventDefault()
    toggleSearchMode()
  }

  if (event.key === 'Escape' && searchInput.value.length > 0) {
    event.preventDefault()
    clearSearch()
  }
}
</script>

<template>
  <section class="search-panel">
    <div class="search-panel__mode-strip">
      <div class="search-panel__modes">
        <button
          type="button"
          class="search-panel__mode"
          :class="{ 'is-active': isBookmarkSearch }"
          :aria-pressed="isBookmarkSearch"
          @click="setSearchMode(true)"
        >
          书签搜索
        </button>
        <button
          type="button"
          class="search-panel__mode"
          :class="{ 'is-active': !isBookmarkSearch }"
          :aria-pressed="!isBookmarkSearch"
          @click="setSearchMode(false)"
        >
          浏览器搜索
        </button>
      </div>

      <span class="search-panel__shortcut">Tab 切换模式</span>
    </div>

    <form class="search-form" @submit.prevent="handleSubmit">
      <div class="search-form__lens" aria-hidden="true">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16L21 21" />
        </svg>
      </div>

      <input
        ref="inputRef"
        v-model="searchInput"
        class="search-form__input"
        type="text"
        :placeholder="searchModeInfo.placeholder"
        :disabled="isLoading"
        @keydown="handleKeyDown"
      >

      <button
        v-if="searchInput.length > 0"
        type="button"
        class="search-form__clear"
        @click="clearSearch"
      >
        清空
      </button>

      <button
        type="submit"
        class="search-form__submit"
        :disabled="!canSubmit"
      >
        {{ isLoading ? "搜索中..." : searchModeInfo.actionLabel }}
      </button>
    </form>
  </section>
</template>

<style scoped>
.search-panel {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--newtab-line);
  border-radius: 24px;
  background:
    linear-gradient(
      180deg,
      var(--newtab-search-panel-start),
      var(--newtab-search-panel-end)
    );
  padding: 0.7rem;
  box-shadow: 0 18px 34px var(--newtab-search-shadow);
  backdrop-filter: blur(16px);
}

.search-panel::before {
  position: absolute;
  inset: 0 auto auto 1.25rem;
  width: 8rem;
  height: 1px;
  background: linear-gradient(
    90deg,
    var(--newtab-search-highlight),
    color-mix(in srgb, var(--newtab-search-highlight) 0%, transparent)
  );
  content: "";
}

.search-panel__mode-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  margin-bottom: 0.7rem;
}

.search-panel__modes {
  display: inline-flex;
  gap: 0.22rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--newtab-ink-strong) 5%, transparent);
  padding: 0.2rem;
}

.search-panel__mode {
  border: 0;
  border-radius: 999px;
  background: transparent;
  padding: 0.48rem 0.82rem;
  color: var(--newtab-ink-soft);
  font: inherit;
  font-size: 0.84rem;
  cursor: pointer;
  transition:
    background 160ms ease,
    color 160ms ease,
    transform 160ms ease;
}

.search-panel__mode:hover {
  color: var(--newtab-ink-strong);
}

.search-panel__mode.is-active {
  background: var(--newtab-accent);
  color: #fff;
  box-shadow: 0 8px 18px var(--newtab-button-shadow);
}

.search-panel__shortcut {
  color: var(--newtab-ink-soft);
  font-size: 0.74rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.search-form {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 0.55rem;
  border: 1px solid var(--newtab-line);
  border-radius: 18px;
  background: var(--newtab-input-surface);
  padding: 0.55rem 0.7rem;
}

.search-form:focus-within {
  border-color: color-mix(in srgb, var(--newtab-accent) 22%, transparent);
  box-shadow: 0 0 0 4px var(--newtab-focus-ring);
}

.search-form__lens {
  display: inline-flex;
  width: 1.25rem;
  height: 1.25rem;
  color: var(--newtab-accent-strong);
}

.search-form__input {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--newtab-ink-strong);
  font: inherit;
  font-size: 0.96rem;
  line-height: 1.4;
  padding: 0.3rem 0;
}

.search-form__input::placeholder {
  color: color-mix(in srgb, var(--newtab-ink-strong) 48%, transparent);
}

.search-form__input:focus {
  outline: none;
}

.search-form__clear {
  border: 0;
  background: transparent;
  color: var(--newtab-ink-soft);
  font: inherit;
  font-size: 0.84rem;
  cursor: pointer;
}

.search-form__clear:hover {
  color: var(--newtab-ink-strong);
}

.search-form__submit {
  border: 0;
  border-radius: 999px;
  background: var(--newtab-accent);
  padding: 0.6rem 0.92rem;
  color: #fff;
  font: inherit;
  font-size: 0.84rem;
  cursor: pointer;
  box-shadow: 0 10px 20px var(--newtab-button-shadow);
  transition:
    transform 160ms ease,
    background 160ms ease,
    opacity 160ms ease;
}

.search-form__submit:hover:not(:disabled) {
  background: var(--newtab-accent-strong);
}

.search-form__submit:disabled {
  cursor: not-allowed;
  opacity: 0.56;
  box-shadow: none;
}

@media (max-width: 720px) {
  .search-panel {
    border-radius: 20px;
  }

  .search-form {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }

  .search-form__submit {
    grid-column: 1 / -1;
  }

  .search-form__clear {
    justify-self: end;
  }

  .search-panel__shortcut {
    display: none;
  }
}
</style>
