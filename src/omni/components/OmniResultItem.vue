<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { OmniResult } from '../types'

const props = defineProps<{
  result: OmniResult
  selected: boolean
  confirming: boolean
}>()

const emit = defineEmits<{
  select: []
  activate: []
}>()

const genericSourceLabels = new Set([
  '标签页',
  '浏览器书签',
  '浏览历史',
  '快捷动作',
  '默认搜索',
])

const itemRef = ref<HTMLButtonElement | null>(null)
const imageFailed = ref(false)

const fallbackIconLabel = computed(() =>
  props.result.title.trim().charAt(0).toUpperCase() || '?',
)

const metaChips = computed(() => {
  const chips: Array<{
    label: string
    tone: 'source' | 'highlight' | 'warning' | 'neutral'
  }> = []

  if (!genericSourceLabels.has(props.result.sourceLabel)) {
    chips.push({
      label: props.result.sourceLabel,
      tone: 'source',
    })
  }

  for (const badge of props.result.badges ?? []) {
    chips.push({
      label: badge,
      tone: badge === '当前'
        ? 'highlight'
        : badge === '需确认'
          ? 'warning'
          : 'neutral',
    })
  }

  return chips
})

const actionLabel = computed(() =>
  props.confirming ? '再次回车确认' : props.result.primaryAction.label,
)

function scrollSelectedItemIntoView() {
  const itemEl = itemRef.value

  if (!itemEl) {
    return
  }

  const scrollContainer = itemEl.closest('.omni-panel__results') as HTMLElement | null

  if (!scrollContainer) {
    itemEl.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    })
    return
  }

  const groupEl = itemEl.closest('.omni-result-group') as HTMLElement | null
  const headerEl = groupEl?.querySelector('.omni-result-group__header') as HTMLElement | null
  const containerRect = scrollContainer.getBoundingClientRect()
  const itemRect = itemEl.getBoundingClientRect()
  const headerRect = headerEl?.getBoundingClientRect()
  const stickyHeaderOffset = headerRect && headerRect.top <= containerRect.top + 1
    ? headerRect.height
    : 0
  const topBuffer = stickyHeaderOffset + 8
  const bottomBuffer = 8

  if (itemRect.top < containerRect.top + topBuffer) {
    scrollContainer.scrollTop -= containerRect.top + topBuffer - itemRect.top
    return
  }

  if (itemRect.bottom > containerRect.bottom - bottomBuffer) {
    scrollContainer.scrollTop += itemRect.bottom - (containerRect.bottom - bottomBuffer)
  }
}

function handleImageError() {
  imageFailed.value = true
}

watch(
  () => props.selected,
  (selected) => {
    if (!selected) {
      return
    }

    scrollSelectedItemIntoView()
  },
  { flush: 'post' },
)

watch(
  () => props.result.icon,
  () => {
    imageFailed.value = false
  },
  { immediate: true },
)
</script>

<template>
  <button
    ref="itemRef"
    type="button"
    class="omni-result-item"
    :class="{
      'is-selected': selected,
      'is-confirming': confirming,
      [`is-${result.group}`]: true,
    }"
    @mouseenter="emit('select')"
    @focus="emit('select')"
    @click="emit('activate')"
  >
    <span class="omni-result-item__icon">
      <img
        v-if="result.icon && !imageFailed"
        :src="result.icon"
        :alt="result.sourceLabel"
        class="omni-result-item__icon-image"
        @error="handleImageError"
      >
      <span v-else class="omni-result-item__icon-fallback">
        {{ fallbackIconLabel }}
      </span>
    </span>

    <span class="omni-result-item__content">
      <span class="omni-result-item__title-row">
        <span class="omni-result-item__title">{{ result.title }}</span>
      </span>

      <span v-if="result.subtitle" class="omni-result-item__subtitle">
        {{ result.subtitle }}
      </span>

      <span
        v-if="metaChips.length"
        class="omni-result-item__meta"
      >
        <span
          v-for="chip in metaChips"
          :key="chip.label"
          class="omni-result-item__chip"
          :class="`is-${chip.tone}`"
        >
          {{ chip.label }}
        </span>
      </span>
    </span>

    <span
      v-if="selected || confirming"
      class="omni-result-item__action"
    >
      <span class="omni-result-item__action-label">{{ actionLabel }}</span>
      <span class="omni-result-item__action-kbd">Enter</span>
    </span>
  </button>
</template>

<style scoped>
.omni-result-item {
  display: grid;
  grid-template-columns: 2.7rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.8rem;
  width: 100%;
  border: 1px solid var(--omni-border-subtle, rgba(17, 45, 78, 0.06));
  border-radius: 16px;
  background: var(--omni-result-bg, linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 251, 255, 0.9)));
  padding: 0.72rem 0.82rem;
  color: var(--omni-text, #d9efff);
  text-align: left;
  outline: none;
  scroll-margin-top: 2.8rem;
  scroll-margin-bottom: 0.75rem;
  transition:
    transform 150ms ease,
    border-color 150ms ease,
    background 150ms ease,
    box-shadow 150ms ease;
}

.omni-result-item:hover,
.omni-result-item.is-selected {
  border-color: var(--omni-accent-outline, rgba(74, 183, 255, 0.34));
  background: var(--omni-result-hover-bg, linear-gradient(180deg, rgba(255, 255, 255, 1), rgba(244, 249, 255, 0.98)));
  box-shadow: var(--omni-result-hover-shadow,
    0 0 0 1px rgba(56, 182, 255, 0.12),
    0 14px 32px rgba(16, 34, 56, 0.08),
    0 0 22px rgba(19, 151, 255, 0.08));
}

.omni-result-item.is-confirming {
  border-color: var(--omni-result-confirm-border, rgba(196, 76, 23, 0.28));
  background: var(--omni-result-confirm-bg, linear-gradient(180deg, rgba(255, 247, 242, 0.98), rgba(255, 243, 236, 0.94)));
}

.omni-result-item__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.7rem;
  height: 2.7rem;
  border-radius: 13px;
  background: var(--omni-result-icon-bg, linear-gradient(135deg, rgba(231, 243, 255, 1), rgba(242, 248, 255, 0.96)));
  box-shadow: var(--omni-result-icon-shadow,
    inset 0 0 0 1px rgba(27, 132, 255, 0.1),
    0 8px 18px rgba(27, 132, 255, 0.06));
}

.omni-result-item__icon-image {
  width: 1.3rem;
  height: 1.3rem;
  object-fit: contain;
}

.omni-result-item__icon-fallback {
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--omni-accent-strong, #1b84ff);
}

.omni-result-item__content {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.2rem;
}

.omni-result-item__title-row {
  display: flex;
  min-width: 0;
  align-items: center;
}

.omni-result-item__title {
  min-width: 0;
  overflow: hidden;
  color: var(--omni-text-strong, #f4fbff);
  font-size: 0.94rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.omni-result-item__subtitle {
  overflow: hidden;
  color: var(--omni-text-muted, #8eaac2);
  font-size: 0.8rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.omni-result-item__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.omni-result-item__chip {
  border-radius: 999px;
  background: var(--omni-result-chip-bg, rgba(244, 247, 251, 0.98));
  padding: 0.16rem 0.46rem;
  color: var(--omni-text-muted, #8eaac2);
  font-size: 0.65rem;
  box-shadow: inset 0 0 0 1px var(--omni-result-chip-border, rgba(17, 45, 78, 0.05));
}

.omni-result-item__chip.is-source {
  background: var(--omni-result-source-chip-bg, rgba(27, 132, 255, 0.12));
  color: var(--omni-result-source-chip-text, var(--omni-accent-strong, #1b84ff));
}

.omni-result-item__chip.is-highlight {
  background: var(--omni-result-highlight-chip-bg, rgba(27, 183, 138, 0.16));
  color: var(--omni-result-highlight-chip-text, #177e61);
}

.omni-result-item__chip.is-warning {
  background: var(--omni-result-warning-chip-bg, rgba(255, 118, 88, 0.16));
  color: var(--omni-result-warning-chip-text, #c14b2f);
}

.omni-result-item__action {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  justify-self: end;
  color: var(--omni-text-soft, #6c89a4);
  font-size: 0.7rem;
  white-space: nowrap;
  animation: omni-action-fade 120ms ease;
}

.omni-result-item__action-label {
  max-width: 10rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

.omni-result-item__action-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.8rem;
  border-radius: 999px;
  background: var(--omni-result-kbd-bg, rgba(246, 249, 252, 0.98));
  padding: 0.28rem 0.5rem;
  color: var(--omni-text-strong, #102a43);
  font-size: 0.68rem;
  font-weight: 700;
  box-shadow: inset 0 0 0 1px var(--omni-result-kbd-border, rgba(17, 45, 78, 0.06));
}

@keyframes omni-action-fade {
  from {
    opacity: 0;
    transform: translateX(4px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.omni-result-item.is-tabs .omni-result-item__icon {
  background: var(--omni-result-icon-tabs-bg, linear-gradient(135deg, rgba(226, 241, 255, 1), rgba(241, 247, 255, 0.98)));
}

.omni-result-item.is-bookmarks .omni-result-item__icon {
  background: var(--omni-result-icon-bookmarks-bg, linear-gradient(135deg, rgba(232, 245, 255, 1), rgba(242, 249, 255, 0.98)));
}

.omni-result-item.is-feishu .omni-result-item__icon {
  background: var(--omni-result-icon-feishu-bg, linear-gradient(135deg, rgba(229, 244, 255, 1), rgba(241, 248, 255, 0.98)));
}

.omni-result-item.is-history .omni-result-item__icon {
  background: var(--omni-result-icon-history-bg, linear-gradient(135deg, rgba(233, 244, 255, 1), rgba(244, 249, 255, 0.98)));
}

.omni-result-item.is-actions .omni-result-item__icon {
  background: var(--omni-result-icon-actions-bg, linear-gradient(135deg, rgba(230, 242, 255, 1), rgba(242, 248, 255, 0.98)));
}

.omni-result-item.is-search .omni-result-item__icon,
.omni-result-item.is-recent .omni-result-item__icon {
  background: var(--omni-result-icon-search-bg, linear-gradient(135deg, rgba(231, 243, 255, 1), rgba(242, 248, 255, 0.98)));
}

@media (max-width: 860px) {
  .omni-result-item {
    grid-template-columns: 2.55rem minmax(0, 1fr);
    padding: 0.72rem 0.78rem;
  }

  .omni-result-item__action {
    justify-self: start;
    grid-column: 2;
    margin-top: 0.1rem;
  }

  .omni-result-item__action-label {
    display: none;
  }
}
</style>
