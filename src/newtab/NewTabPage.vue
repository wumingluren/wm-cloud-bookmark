<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { sendMessage } from 'webext-bridge/content-script'
import BookmarkList from './components/BookmarkList.vue'
import SearchBar from './components/SearchBar.vue'
import ThemeSwitcher from './components/ThemeSwitcher.vue'
import { useNewTabTheme } from './composables/useNewTabTheme'
import type { Bookmark } from './types'

const randomBookmarks = ref<Bookmark[]>([])
const searchResults = ref<Bookmark[]>([])
const searchQuery = ref('')
const isLoading = ref(false)
const isSearching = ref(false)
const errorMessage = ref('')

const todayLabel = new Intl.DateTimeFormat('zh-CN', {
  month: 'long',
  day: 'numeric',
  weekday: 'long',
}).format(new Date())

const hasSearchQuery = computed(() => searchQuery.value.trim().length > 0)

const displayedBookmarks = computed(() =>
  hasSearchQuery.value ? searchResults.value : randomBookmarks.value,
)

const sectionTitle = computed(() =>
  hasSearchQuery.value ? '搜索结果' : '推荐收藏',
)

const sectionCountText = computed(() =>
  hasSearchQuery.value
    ? `${searchResults.value.length} 条命中`
    : `${randomBookmarks.value.length} 条可直达`,
)

const showSkeleton = computed(
  () =>
    (!hasSearchQuery.value && isLoading.value)
    || (hasSearchQuery.value && isSearching.value),
)

const showSearchEmpty = computed(
  () =>
    hasSearchQuery.value
    && !isSearching.value
    && searchResults.value.length === 0,
)

const showRecommendationEmpty = computed(
  () =>
    !hasSearchQuery.value
    && !isLoading.value
    && randomBookmarks.value.length === 0,
)

const { activeTheme, selectedThemeId, themePresets, setTheme }
  = useNewTabTheme()

async function fetchRecommendedBookmarks() {
  try {
    isLoading.value = true
    errorMessage.value = ''

    const response = await sendMessage('getRecommendedBookmarks', {})
    const typedResponse = response as unknown as {
      success: boolean
      data: Bookmark[]
      error?: string
    }

    if (!typedResponse.success) {
      throw new Error(typedResponse.error || '获取推荐书签失败')
    }

    randomBookmarks.value = typedResponse.data
  }
  catch (error) {
    errorMessage.value = (error as Error).message
    console.error('获取推荐书签失败:', error)
  }
  finally {
    isLoading.value = false
  }
}

async function searchBookmarks(query: string) {
  if (!query.trim()) {
    searchResults.value = []
    return
  }

  try {
    isSearching.value = true
    errorMessage.value = ''
    searchResults.value = []

    const response = await sendMessage('searchBookmarks', { query })
    const typedResponse = response as unknown as {
      success: boolean
      data: Bookmark[]
      error?: string
    }

    if (!typedResponse.success) {
      throw new Error(typedResponse.error || '搜索书签失败')
    }

    searchResults.value = typedResponse.data
  }
  catch (error) {
    errorMessage.value = (error as Error).message
    console.error('搜索书签失败:', error)
  }
  finally {
    isSearching.value = false
  }
}

async function handleSearch(query: string) {
  searchQuery.value = query.trim()
  await searchBookmarks(searchQuery.value)
}

onMounted(async () => {
  await fetchRecommendedBookmarks()
})
</script>

<template>
  <div class="newtab-page" :style="activeTheme.cssVars">
    <div class="newtab-page__halo newtab-page__halo--left" />
    <div class="newtab-page__halo newtab-page__halo--right" />

    <main class="newtab-shell">
      <header class="hero">
        <div class="hero__topline">
          <div class="hero__brand">
            <span class="hero__brand-mark" />
            <span>无名云书签</span>
          </div>

          <div class="hero__actions">
            <span class="hero__date">{{ todayLabel }}</span>
            <ThemeSwitcher
              :active-theme-id="selectedThemeId"
              :theme-presets="themePresets"
              @select-theme="setTheme"
            />
          </div>
        </div>

        <div class="hero__copy">
          <h1 class="hero__title">
            书签上云，存于飞书
          </h1>
          <p class="hero__summary">
            用飞书做你的云端书签库，让书签在每个设备上都能快速直达。
          </p>
        </div>

        <SearchBar :is-loading="isSearching" @search="handleSearch" />
      </header>

      <div v-if="errorMessage" class="status-banner" role="alert">
        {{ errorMessage }}
      </div>

      <section class="library-panel">
        <div class="library-panel__header">
          <div class="library-panel__headline">
            <h2 class="library-panel__title">
              {{ sectionTitle }}
            </h2>
            <span class="library-panel__count">{{ sectionCountText }}</span>
          </div>

          <button
            v-if="!hasSearchQuery"
            type="button"
            class="library-panel__action"
            :disabled="isLoading"
            @click="fetchRecommendedBookmarks"
          >
            {{ isLoading ? "刷新中..." : "换一组推荐" }}
          </button>
        </div>

        <div v-if="showSkeleton" class="skeleton-grid" aria-hidden="true">
          <div v-for="item in 6" :key="item" class="skeleton-card" />
        </div>

        <div v-else-if="showSearchEmpty" class="empty-state">
          <h3 class="empty-state__title">
            没有命中结果
          </h3>
          <p class="empty-state__text">
            试试更短一点的关键词，或者直接搜标签与域名。清空输入后，会回到推荐收藏。
          </p>
        </div>

        <div v-else-if="showRecommendationEmpty" class="empty-state">
          <h3 class="empty-state__title">
            还没有可展示的收藏
          </h3>
          <p class="empty-state__text">
            先从网页右键保存一些网址，或者在配置页导入已有书签，这里就会变成你的导航页。
          </p>
        </div>

        <BookmarkList v-else :bookmarks="displayedBookmarks" />
      </section>
    </main>
  </div>
</template>

<style scoped>
.newtab-page {
  --newtab-font-display:
    "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif;
  --newtab-font-ui:
    "Avenir Next", "Segoe UI", "PingFang SC", "Hiragino Sans GB",
    "Microsoft YaHei", sans-serif;

  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background:
    linear-gradient(
      180deg,
      var(--newtab-surface-start) 0%,
      var(--newtab-surface-end) 100%
    );
  padding: clamp(14px, 2vw, 24px) clamp(16px, 2vw, 28px) 22px;
  color: var(--newtab-ink-strong);
  font-family: var(--newtab-font-ui);
}

.newtab-page::before {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(var(--newtab-grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--newtab-grid-line) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.55), transparent 86%);
  content: "";
}

.newtab-page__halo {
  position: fixed;
  width: 34rem;
  height: 34rem;
  border-radius: 999px;
  filter: blur(64px);
  pointer-events: none;
  opacity: 0.82;
}

.newtab-page__halo--left {
  top: -13rem;
  left: -10rem;
  background: var(--newtab-halo-left);
}

.newtab-page__halo--right {
  right: -12rem;
  bottom: -16rem;
  background: var(--newtab-halo-right);
}

.newtab-shell {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 0.95rem;
  max-width: 1360px;
  margin: 0 auto;
}

.hero {
  display: grid;
  gap: 0.75rem;
}

.hero__topline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.hero__actions {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.55rem;
}

.hero__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  color: var(--newtab-ink-soft);
  font-size: 0.84rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.hero__brand-mark {
  width: 0.72rem;
  height: 0.72rem;
  border-radius: 999px;
  background:
    linear-gradient(
      180deg,
      var(--newtab-brand-gradient-start),
      var(--newtab-brand-gradient-end)
    );
  box-shadow: 0 0 0 5px var(--newtab-brand-shadow);
}

.hero__date {
  border: 1px solid var(--newtab-line);
  border-radius: 999px;
  background: var(--newtab-chip-surface);
  padding: 0.4rem 0.74rem;
  color: var(--newtab-ink-soft);
  font-size: 0.78rem;
  backdrop-filter: blur(12px);
}

.hero__copy {
  display: grid;
  gap: 0.3rem;
  width: 100%;
  max-width: none;
}

.hero__title {
  margin: 0;
  color: var(--newtab-ink-strong);
  font-family: var(--newtab-font-display);
  font-size: clamp(2rem, 4vw, 2.95rem);
  line-height: 1.02;
  letter-spacing: -0.045em;
  max-width: none;
}

.hero__summary {
  margin: 0;
  color: var(--newtab-ink-soft);
  font-size: 0.9rem;
  line-height: 1.6;
  max-width: none;
}

.status-banner {
  border: 1px solid rgba(176, 86, 53, 0.16);
  border-radius: 18px;
  background: rgba(255, 246, 241, 0.86);
  padding: 0.85rem 1rem;
  color: #9b4b2a;
  box-shadow: 0 12px 24px rgba(123, 75, 49, 0.06);
}

.library-panel {
  border: 1px solid var(--newtab-line);
  border-radius: 24px;
  background:
    linear-gradient(
      180deg,
      var(--newtab-panel-start),
      var(--newtab-panel-end)
    );
  padding: clamp(14px, 2vw, 22px);
  box-shadow: 0 20px 44px var(--newtab-panel-shadow);
  backdrop-filter: blur(16px);
}

.library-panel__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  margin-bottom: 1rem;
}

.library-panel__headline {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.65rem;
}

.library-panel__title {
  margin: 0;
  color: var(--newtab-ink-strong);
  font-family: var(--newtab-font-display);
  font-size: clamp(1.3rem, 2.8vw, 1.8rem);
  line-height: 1;
}

.library-panel__count {
  color: var(--newtab-accent-strong);
  font-size: 0.82rem;
  font-weight: 600;
}

.library-panel__action {
  border: 0;
  border-radius: 999px;
  background: var(--newtab-accent);
  padding: 0.62rem 0.92rem;
  color: #fff;
  font: inherit;
  font-size: 0.84rem;
  cursor: pointer;
  box-shadow: 0 10px 24px var(--newtab-action-shadow);
}

.library-panel__action:disabled {
  cursor: not-allowed;
  opacity: 0.58;
  box-shadow: none;
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.8rem;
}

.skeleton-card {
  height: 132px;
  border: 1px solid color-mix(in srgb, var(--newtab-ink-strong) 8%, transparent);
  border-radius: 18px;
  background:
    linear-gradient(
      110deg,
      var(--newtab-skeleton-base) 12%,
      var(--newtab-skeleton-shine) 32%,
      var(--newtab-skeleton-base) 52%
    );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.3s ease-in-out infinite;
}

.empty-state {
  border: 1px dashed color-mix(in srgb, var(--newtab-ink-strong) 14%, transparent);
  border-radius: 22px;
  background: var(--newtab-empty-surface);
  padding: 2.2rem 1rem;
  text-align: center;
}

.empty-state__title {
  margin: 0 0 0.65rem;
  color: var(--newtab-ink-strong);
  font-family: var(--newtab-font-display);
  font-size: 1.8rem;
}

.empty-state__text {
  max-width: 31rem;
  margin: 0 auto;
  color: var(--newtab-ink-soft);
  line-height: 1.6;
}

@keyframes skeleton-shimmer {
  from {
    background-position: 100% 50%;
  }

  to {
    background-position: 0 50%;
  }
}

@media (max-width: 1080px) {
  .skeleton-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .newtab-page {
    padding: 14px;
  }

  .hero__title {
    font-size: clamp(1.85rem, 10vw, 2.45rem);
  }

  .library-panel {
    border-radius: 20px;
    padding: 14px;
  }

  .skeleton-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .hero__topline {
    align-items: flex-start;
  }

  .hero__actions {
    justify-content: flex-start;
  }

  .skeleton-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
