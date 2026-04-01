<script setup lang="ts">
import { computed } from 'vue'
import type { Bookmark } from '../types'

const props = defineProps<{
  bookmark: Bookmark
  index: number
}>()

const tagPalettes = [
  {
    bg: 'rgba(45, 140, 255, 0.1)',
    text: '#176de0',
    border: 'rgba(45, 140, 255, 0.18)',
  },
  {
    bg: 'rgba(39, 125, 161, 0.1)',
    text: '#1f6885',
    border: 'rgba(39, 125, 161, 0.16)',
  },
  {
    bg: 'rgba(91, 102, 120, 0.12)',
    text: '#445064',
    border: 'rgba(91, 102, 120, 0.18)',
  },
  {
    bg: 'rgba(66, 204, 191, 0.1)',
    text: '#228d83',
    border: 'rgba(66, 204, 191, 0.16)',
  },
  {
    bg: 'rgba(72, 149, 239, 0.1)',
    text: '#2b73be',
    border: 'rgba(72, 149, 239, 0.16)',
  },
]

function getDisplayTitle(bookmark: Bookmark): string {
  if (!bookmark.title || bookmark.title === '无标题') {
    return bookmark.url.replace(/^https?:\/\//, '').split('/')[0] || '未命名链接'
  }

  return bookmark.title
}

function hashString(value: string) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }

  return Math.abs(hash)
}

function getTagPalette(tag: string) {
  return tagPalettes[hashString(tag) % tagPalettes.length]
}

const displayTitle = computed(() => getDisplayTitle(props.bookmark))
const description = computed(() => props.bookmark.description?.trim() ?? '')

const urlMeta = computed(() => {
  try {
    const parsedUrl = new URL(props.bookmark.url)
    const host = parsedUrl.hostname.replace(/^www\./, '')
    const rawPath = decodeURIComponent(parsedUrl.pathname.replace(/\/$/, ''))

    return {
      host,
      path: rawPath.length > 0 ? rawPath : '根路径',
    }
  }
  catch {
    return {
      host: props.bookmark.url,
      path: '直达链接',
    }
  }
})

const displaySummary = computed(() =>
  description.value || `收藏于 ${urlMeta.value.host}，点击即可直达。`,
)

const visibleTags = computed(() =>
  (props.bookmark.tags ?? []).filter(Boolean).slice(0, 3).map(tag => ({
    label: tag,
    palette: getTagPalette(tag),
  })),
)

const animationDelay = computed(
  () => `${Math.min(props.index, 10) * 70}ms`,
)
</script>

<template>
  <a
    class="bookmark-item"
    :href="bookmark.url"
    target="_blank"
    rel="noopener noreferrer"
    :style="{ '--bookmark-delay': animationDelay }"
    :title="displayTitle"
  >
    <div class="bookmark-item__header">
      <span class="bookmark-item__host">{{ urlMeta.host }}</span>
      <span class="bookmark-item__arrow" aria-hidden="true">↗</span>
    </div>

    <div class="bookmark-item__body">
      <h3 class="bookmark-item__title">
        {{ displayTitle }}
      </h3>

      <p class="bookmark-item__summary">
        {{ displaySummary }}
      </p>
    </div>

    <div v-if="visibleTags.length > 0" class="bookmark-item__footer">
      <div v-if="visibleTags.length > 0" class="bookmark-item__tags">
        <span
          v-for="tag in visibleTags"
          :key="tag.label"
          class="bookmark-item__tag"
          :style="{
            '--tag-bg': tag.palette.bg,
            '--tag-text': tag.palette.text,
            '--tag-border': tag.palette.border,
          }"
        >
          {{ tag.label }}
        </span>
      </div>
    </div>
  </a>
</template>

<style scoped>
.bookmark-item {
  position: relative;
  display: flex;
  min-height: 124px;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.7rem;
  overflow: hidden;
  border: 1px solid var(--newtab-line);
  border-radius: 18px;
  background:
    linear-gradient(
      180deg,
      var(--newtab-card-start),
      var(--newtab-card-end)
    );
  padding: 0.8rem 0.85rem;
  color: inherit;
  text-decoration: none;
  box-shadow: 0 10px 22px var(--newtab-card-shadow);
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease,
    background 180ms ease;
  animation: bookmark-rise 560ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: var(--bookmark-delay);
}

.bookmark-item::before {
  position: absolute;
  inset: 0 0 auto;
  height: 1px;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--newtab-accent) 0%, transparent),
    color-mix(in srgb, var(--newtab-accent) 40%, transparent),
    color-mix(in srgb, var(--newtab-accent) 0%, transparent)
  );
  content: "";
}

.bookmark-item:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--newtab-accent) 18%, transparent);
  background:
    linear-gradient(
      180deg,
      var(--newtab-card-hover-start),
      var(--newtab-card-hover-end)
    );
  box-shadow: 0 14px 28px var(--newtab-card-hover-shadow);
}

.bookmark-item__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  color: var(--newtab-ink-soft);
  font-size: 0.72rem;
}

.bookmark-item__host {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-radius: 999px;
  background: var(--newtab-accent-soft);
  padding: 0.24rem 0.5rem;
  color: var(--newtab-accent-strong);
}

.bookmark-item__arrow {
  font-size: 0.88rem;
  color: var(--newtab-accent-strong);
  transition: transform 180ms ease;
}

.bookmark-item:hover .bookmark-item__arrow {
  transform: translate(1px, -1px);
}

.bookmark-item__body {
  display: grid;
  gap: 0.38rem;
}

.bookmark-item__title {
  margin: 0;
  color: var(--newtab-ink-strong);
  font-size: 0.98rem;
  line-height: 1.28;
  font-weight: 700;
  word-break: break-word;
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.bookmark-item__summary {
  margin: 0;
  color: var(--newtab-ink-soft);
  font-size: 0.78rem;
  line-height: 1.45;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.bookmark-item__footer {
  display: flex;
  align-items: flex-end;
  gap: 0.55rem;
}

.bookmark-item__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.bookmark-item__tag {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--tag-border);
  border-radius: 999px;
  background: var(--tag-bg);
  padding: 0.2rem 0.48rem;
  color: var(--tag-text);
  font-size: 0.7rem;
  line-height: 1;
}

@keyframes bookmark-rise {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
