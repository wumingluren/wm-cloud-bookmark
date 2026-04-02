<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { OMNI_SHORTCUT_LABEL } from '../constants'
import { useOmni } from '../composables/useOmni'
import type { OmniTheme } from '../types'
import OmniResultGroup from './OmniResultGroup.vue'
import { omniTheme as omniThemePreference } from '~/composables/useSettings'

const props = defineProps<{
  initialQuery?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const supportedCommands = [
  { key: '/tab', label: '标签页' },
  { key: '/bm', label: '书签' },
  { key: '/fs', label: '云书签' },
  { key: '/his', label: '历史' },
  { key: '/act', label: '动作' },
] as const

const sourceOverview = '标签页 / 书签 / 历史 / 云书签 / 动作'
const themeOptions: OmniTheme[] = ['light', 'dark']

const inputRef = ref<HTMLInputElement | null>(null)

const {
  query,
  parsedQuery,
  groupedResults,
  hasResults,
  isSearching,
  isHydratingRemote,
  selectedIndex,
  status,
  confirmingActionKey,
  selectNext,
  selectPrev,
  selectIndex,
  executeIndex,
} = useOmni({
  initialQuery: props.initialQuery,
  onClose: () => emit('close'),
})

const modeLabel = computed(() => {
  switch (parsedQuery.value.mode) {
    case 'tabs':
      return '仅搜索标签页'
    case 'bookmarks':
      return '仅搜索浏览器书签'
    case 'feishu':
      return '仅搜索云书签'
    case 'history':
      return '仅搜索浏览历史'
    case 'actions':
      return '仅搜索动作命令'
    default:
      return '聚合搜索'
  }
})

const emptyStateTitle = computed(() =>
  query.value.trim()
    ? '没有命中结果'
    : '输入关键词开始搜索',
)

const emptyStateText = computed(() =>
  query.value.trim()
    ? '试试更短的关键词，或者改用 /tab /bm /fs /his /act 缩小搜索范围。'
    : '直接输入即可聚合搜索，也可以先输入命令前缀切换到指定数据源。',
)

const themeMode = computed(() => omniThemePreference.value)
const themeLabel = computed(() =>
  themeMode.value === 'dark' ? '深色' : '浅色',
)

function setTheme(theme: OmniTheme) {
  omniThemePreference.value = theme
}

async function focusInput() {
  await nextTick()
  inputRef.value?.focus()
  inputRef.value?.select()
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    selectNext()
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    selectPrev()
    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    void executeIndex()
  }
}

onMounted(() => {
  void focusInput()
})
</script>

<template>
  <div class="omni-backdrop" :class="`is-${themeMode}`" @click.self="emit('close')">
    <section
      class="omni-panel"
      :class="`is-${themeMode}`"
      role="dialog"
      aria-modal="true"
      aria-label="无名云书签 Omni 命令面板"
      @keydown="handleKeydown"
    >
      <header class="omni-panel__header">
        <div class="omni-panel__brand-lockup">
          <span class="omni-panel__brand-mark">OMNI</span>
          <div class="omni-panel__brand-copy">
            <p class="omni-panel__eyebrow">
              无名云书签
            </p>
            <p class="omni-panel__source-overview">
              {{ sourceOverview }}
            </p>
          </div>
        </div>

        <div class="omni-panel__header-actions">
          <div class="omni-panel__theme-toggle" role="group" :aria-label="`当前主题：${themeLabel}`">
            <button
              v-for="theme in themeOptions"
              :key="theme"
              type="button"
              class="omni-panel__theme-button"
              :aria-pressed="themeMode === theme"
              :class="{ 'is-active': themeMode === theme }"
              @click="setTheme(theme)"
            >
              {{ theme === 'light' ? '浅色' : '深色' }}
            </button>
          </div>

          <span class="omni-panel__shortcut">{{ OMNI_SHORTCUT_LABEL }}</span>

          <button
            type="button"
            class="omni-panel__close"
            @click="emit('close')"
          >
            Esc
          </button>
        </div>
      </header>

      <div class="omni-panel__input-shell">
        <div class="omni-panel__search-card">
          <div class="omni-panel__search-topline">
            <span class="omni-panel__mode-pill">{{ modeLabel }}</span>
            <span class="omni-panel__search-copy">
              {{ isHydratingRemote ? '正在补充云书签结果...' : '输入关键词，回车直接打开或执行' }}
            </span>
          </div>

          <div class="omni-panel__input-frame">
            <span class="omni-panel__input-prefix">&gt;</span>

            <input
              ref="inputRef"
              v-model="query"
              class="omni-panel__input"
              type="text"
              placeholder="搜索全部内容，或输入 /tab /bm /fs /his /act"
              spellcheck="false"
            >
          </div>

          <div class="omni-panel__command-strip">
            <span
              v-for="command in supportedCommands"
              :key="command.key"
              class="omni-panel__command-chip"
            >
              <span class="omni-panel__command-key">{{ command.key }}</span>
              <span class="omni-panel__command-name">{{ command.label }}</span>
            </span>
          </div>
        </div>
      </div>

      <div
        v-if="status"
        class="omni-panel__status"
        :class="`is-${status.tone}`"
      >
        {{ status.text }}
      </div>

      <div class="omni-panel__content">
        <div v-if="isSearching && !hasResults" class="omni-panel__loading">
          正在搜索中...
        </div>

        <div v-else-if="!hasResults" class="omni-panel__empty">
          <h3 class="omni-panel__empty-title">
            {{ emptyStateTitle }}
          </h3>
          <p class="omni-panel__empty-text">
            {{ emptyStateText }}
          </p>
        </div>

        <div v-else class="omni-panel__results">
          <OmniResultGroup
            v-for="group in groupedResults"
            :key="group.id"
            :label="group.label"
            :items="group.items"
            :selected-index="selectedIndex"
            :confirming-action-key="confirmingActionKey"
            @select="selectIndex"
            @activate="(index) => executeIndex(index)"
          />
        </div>
      </div>

      <footer class="omni-panel__footer">
        <div class="omni-panel__footer-keys">
          <span class="omni-panel__footer-key">
            <span class="omni-panel__footer-kbd">↑</span>
            <span class="omni-panel__footer-kbd">↓</span>
            选择
          </span>
          <span class="omni-panel__footer-key">
            <span class="omni-panel__footer-kbd">Enter</span>
            执行
          </span>
          <span class="omni-panel__footer-key">
            <span class="omni-panel__footer-kbd">Esc</span>
            关闭
          </span>
        </div>

        <span class="omni-panel__footer-prefixes">
          支持前缀：/tab /bm /fs /his /act
        </span>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.omni-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background:
    radial-gradient(circle at top, rgba(27, 132, 255, 0.08), transparent 34%),
    rgba(244, 247, 250, 0.74);
  padding: min(8vh, 4.5rem) 1rem 1.5rem;
  backdrop-filter: blur(14px);
}

.omni-backdrop.is-dark {
  background:
    radial-gradient(circle at top, rgba(74, 168, 255, 0.1), transparent 30%),
    rgba(2, 4, 7, 0.78);
}

.omni-panel {
  --omni-accent: #1b84ff;
  --omni-accent-strong: #0f6fe0;
  --omni-accent-soft: rgba(27, 132, 255, 0.11);
  --omni-accent-softer: rgba(27, 132, 255, 0.06);
  --omni-accent-outline: rgba(27, 132, 255, 0.22);
  --omni-border: rgba(17, 45, 78, 0.08);
  --omni-border-subtle: rgba(17, 45, 78, 0.06);
  --omni-panel-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.985), rgba(250, 252, 255, 0.975));
  --omni-surface: rgba(255, 255, 255, 0.88);
  --omni-surface-strong: rgba(248, 251, 255, 0.96);
  --omni-surface-soft: rgba(244, 248, 252, 0.86);
  --omni-chip-bg: rgba(243, 247, 251, 0.94);
  --omni-text: #18324d;
  --omni-text-strong: #102a43;
  --omni-text-muted: #64809a;
  --omni-text-soft: #7b95ac;
  --omni-shadow: 0 26px 70px rgba(16, 34, 56, 0.14);
  --omni-panel-overlay:
    radial-gradient(circle at top right, rgba(27, 132, 255, 0.09), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), transparent 22%);
  --omni-brand-bg: linear-gradient(135deg, rgba(27, 132, 255, 0.12), rgba(27, 132, 255, 0.04));
  --omni-brand-text: var(--omni-accent-strong);
  --omni-brand-shadow:
    inset 0 0 0 1px rgba(27, 132, 255, 0.12),
    0 8px 20px rgba(27, 132, 255, 0.08);
  --omni-control-bg: rgba(244, 248, 252, 0.96);
  --omni-control-hover-bg: rgba(248, 251, 255, 1);
  --omni-control-border: inset 0 0 0 1px rgba(17, 45, 78, 0.08);
  --omni-card-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(249, 251, 255, 0.88));
  --omni-card-border: rgba(17, 45, 78, 0.07);
  --omni-card-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    0 12px 28px rgba(16, 34, 56, 0.06);
  --omni-input-bg: rgba(255, 255, 255, 0.98);
  --omni-input-border: rgba(17, 45, 78, 0.09);
  --omni-input-focus-shadow:
    0 0 0 4px rgba(27, 132, 255, 0.08),
    0 12px 24px rgba(27, 132, 255, 0.08);
  --omni-empty-border: rgba(17, 45, 78, 0.08);
  --omni-empty-bg: rgba(248, 251, 255, 0.76);
  --omni-footer-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.42), rgba(249, 251, 255, 0.92));
  --omni-kbd-bg: rgba(255, 255, 255, 0.98);
  --omni-kbd-border: inset 0 0 0 1px rgba(17, 45, 78, 0.08);
  --omni-scrollbar-thumb: rgba(27, 132, 255, 0.2);
  --omni-group-header-bg: linear-gradient(180deg, rgba(252, 254, 255, 0.98), rgba(248, 251, 255, 0.9));
  --omni-result-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 251, 255, 0.9));
  --omni-result-hover-bg: linear-gradient(180deg, rgba(255, 255, 255, 1), rgba(244, 249, 255, 0.98));
  --omni-result-hover-shadow:
    0 0 0 1px rgba(56, 182, 255, 0.12),
    0 14px 32px rgba(16, 34, 56, 0.08),
    0 0 22px rgba(19, 151, 255, 0.08);
  --omni-result-icon-bg: linear-gradient(135deg, rgba(231, 243, 255, 1), rgba(242, 248, 255, 0.96));
  --omni-result-icon-shadow:
    inset 0 0 0 1px rgba(27, 132, 255, 0.1),
    0 8px 18px rgba(27, 132, 255, 0.06);
  --omni-result-icon-tabs-bg: linear-gradient(135deg, rgba(226, 241, 255, 1), rgba(241, 247, 255, 0.98));
  --omni-result-icon-bookmarks-bg: linear-gradient(135deg, rgba(232, 245, 255, 1), rgba(242, 249, 255, 0.98));
  --omni-result-icon-feishu-bg: linear-gradient(135deg, rgba(229, 244, 255, 1), rgba(241, 248, 255, 0.98));
  --omni-result-icon-history-bg: linear-gradient(135deg, rgba(233, 244, 255, 1), rgba(244, 249, 255, 0.98));
  --omni-result-icon-actions-bg: linear-gradient(135deg, rgba(230, 242, 255, 1), rgba(242, 248, 255, 0.98));
  --omni-result-icon-search-bg: linear-gradient(135deg, rgba(231, 243, 255, 1), rgba(242, 248, 255, 0.98));
  --omni-result-confirm-border: rgba(196, 76, 23, 0.28);
  --omni-result-confirm-bg: linear-gradient(180deg, rgba(255, 247, 242, 0.98), rgba(255, 243, 236, 0.94));
  --omni-result-chip-bg: rgba(244, 247, 251, 0.98);
  --omni-result-chip-border: rgba(17, 45, 78, 0.05);
  --omni-result-source-chip-bg: rgba(27, 132, 255, 0.12);
  --omni-result-source-chip-text: var(--omni-accent-strong);
  --omni-result-highlight-chip-bg: rgba(27, 183, 138, 0.12);
  --omni-result-highlight-chip-text: #177e61;
  --omni-result-warning-chip-bg: rgba(255, 118, 88, 0.12);
  --omni-result-warning-chip-text: #c14b2f;
  --omni-result-kbd-bg: rgba(246, 249, 252, 0.98);
  --omni-result-kbd-border: rgba(17, 45, 78, 0.06);
  --omni-status-info-bg: rgba(56, 182, 255, 0.12);
  --omni-status-info-text: var(--omni-accent-strong);
  --omni-status-info-border: rgba(27, 132, 255, 0.1);
  --omni-status-success-bg: rgba(27, 183, 138, 0.1);
  --omni-status-success-text: #177e61;
  --omni-status-success-border: rgba(27, 183, 138, 0.08);
  --omni-status-error-bg: rgba(255, 107, 76, 0.1);
  --omni-status-error-text: #c14b2f;
  --omni-status-error-border: rgba(255, 123, 94, 0.08);
  --omni-close-hover-color: var(--omni-accent-strong);
  --omni-toggle-bg: rgba(244, 247, 251, 0.98);
  --omni-toggle-border: rgba(17, 45, 78, 0.06);
  --omni-toggle-active-bg: linear-gradient(180deg, rgba(27, 132, 255, 0.12), rgba(27, 132, 255, 0.06));
  --omni-toggle-active-color: var(--omni-accent-strong);
  --omni-placeholder: rgba(100, 128, 154, 0.64);
  position: relative;
  display: flex;
  width: min(920px, 100%);
  max-height: min(82vh, 760px);
  flex-direction: column;
  gap: 0;
  overflow: hidden;
  border: 1px solid var(--omni-border);
  border-radius: 26px;
  background: var(--omni-panel-bg);
  box-shadow: var(--omni-shadow);
  color: var(--omni-text);
  font-family: 'Avenir Next', 'PingFang SC', 'Helvetica Neue', sans-serif;
}

.omni-panel.is-dark {
  --omni-accent: #4aa8ff;
  --omni-accent-strong: #0f6fe0;
  --omni-accent-soft: rgba(241, 247, 255, 0.9);
  --omni-accent-softer: rgba(236, 244, 255, 0.88);
  --omni-accent-outline: rgba(74, 168, 255, 0.34);
  --omni-border: rgba(255, 255, 255, 0.08);
  --omni-border-subtle: rgba(255, 255, 255, 0.06);
  --omni-panel-bg: linear-gradient(180deg, rgba(11, 13, 16, 0.985), rgba(8, 10, 12, 0.985));
  --omni-surface: rgba(18, 20, 24, 0.92);
  --omni-surface-strong: rgba(22, 25, 29, 0.96);
  --omni-surface-soft: rgba(24, 28, 33, 0.84);
  --omni-chip-bg: rgba(255, 255, 255, 0.05);
  --omni-text: #e8edf3;
  --omni-text-strong: #f8fafc;
  --omni-text-muted: #99a3b2;
  --omni-text-soft: #727b8a;
  --omni-shadow: 0 32px 90px rgba(0, 0, 0, 0.58);
  --omni-panel-overlay:
    radial-gradient(circle at top right, rgba(74, 168, 255, 0.1), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 20%);
  --omni-brand-bg: linear-gradient(135deg, rgba(245, 249, 255, 0.96), rgba(231, 240, 255, 0.92));
  --omni-brand-text: #0f6fe0;
  --omni-brand-shadow:
    inset 0 0 0 1px rgba(15, 111, 224, 0.12),
    0 0 20px rgba(36, 115, 255, 0.08);
  --omni-control-bg: rgba(255, 255, 255, 0.04);
  --omni-control-hover-bg: rgba(255, 255, 255, 0.08);
  --omni-control-border: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  --omni-card-bg: linear-gradient(180deg, rgba(18, 20, 24, 0.95), rgba(14, 16, 20, 0.95));
  --omni-card-border: rgba(255, 255, 255, 0.08);
  --omni-card-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 16px 36px rgba(0, 0, 0, 0.24);
  --omni-input-bg: rgba(6, 8, 11, 0.88);
  --omni-input-border: rgba(255, 255, 255, 0.1);
  --omni-input-focus-shadow:
    0 0 0 4px rgba(74, 168, 255, 0.14),
    0 0 30px rgba(74, 168, 255, 0.12);
  --omni-empty-border: rgba(255, 255, 255, 0.1);
  --omni-empty-bg: rgba(255, 255, 255, 0.02);
  --omni-footer-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(8, 10, 13, 0.92));
  --omni-kbd-bg: rgba(255, 255, 255, 0.06);
  --omni-kbd-border: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  --omni-scrollbar-thumb: rgba(74, 168, 255, 0.28);
  --omni-group-header-bg: linear-gradient(180deg, rgba(11, 13, 16, 0.96), rgba(11, 13, 16, 0.86));
  --omni-result-bg: linear-gradient(180deg, rgba(18, 20, 24, 0.96), rgba(15, 17, 21, 0.94));
  --omni-result-hover-bg: linear-gradient(180deg, rgba(22, 25, 30, 0.98), rgba(18, 21, 26, 0.96));
  --omni-result-hover-shadow:
    0 0 0 1px rgba(74, 168, 255, 0.16),
    0 16px 32px rgba(0, 0, 0, 0.28),
    0 0 24px rgba(74, 168, 255, 0.08);
  --omni-result-icon-bg: linear-gradient(135deg, rgba(32, 35, 40, 0.96), rgba(20, 23, 27, 0.96));
  --omni-result-icon-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.06),
    0 8px 18px rgba(0, 0, 0, 0.24);
  --omni-result-icon-tabs-bg: linear-gradient(135deg, rgba(32, 38, 46, 0.96), rgba(21, 24, 29, 0.98));
  --omni-result-icon-bookmarks-bg: linear-gradient(135deg, rgba(34, 38, 42, 0.96), rgba(22, 25, 28, 0.98));
  --omni-result-icon-feishu-bg: linear-gradient(135deg, rgba(28, 39, 50, 0.96), rgba(20, 25, 31, 0.98));
  --omni-result-icon-history-bg: linear-gradient(135deg, rgba(36, 38, 44, 0.96), rgba(24, 26, 30, 0.98));
  --omni-result-icon-actions-bg: linear-gradient(135deg, rgba(30, 35, 44, 0.96), rgba(20, 23, 28, 0.98));
  --omni-result-icon-search-bg: linear-gradient(135deg, rgba(31, 36, 40, 0.96), rgba(20, 23, 27, 0.98));
  --omni-result-confirm-border: rgba(249, 115, 22, 0.24);
  --omni-result-confirm-bg: linear-gradient(180deg, rgba(69, 31, 18, 0.72), rgba(46, 22, 14, 0.8));
  --omni-result-chip-bg: rgba(255, 255, 255, 0.05);
  --omni-result-chip-border: rgba(255, 255, 255, 0.06);
  --omni-result-source-chip-bg: rgba(241, 247, 255, 0.9);
  --omni-result-source-chip-text: #0f6fe0;
  --omni-result-highlight-chip-bg: rgba(34, 197, 94, 0.16);
  --omni-result-highlight-chip-text: #86efac;
  --omni-result-warning-chip-bg: rgba(249, 115, 22, 0.16);
  --omni-result-warning-chip-text: #fdba74;
  --omni-result-kbd-bg: rgba(255, 255, 255, 0.07);
  --omni-result-kbd-border: rgba(255, 255, 255, 0.08);
  --omni-status-info-bg: rgba(241, 247, 255, 0.92);
  --omni-status-info-text: #0f6fe0;
  --omni-status-info-border: rgba(15, 111, 224, 0.12);
  --omni-status-success-bg: rgba(34, 197, 94, 0.12);
  --omni-status-success-text: #86efac;
  --omni-status-success-border: rgba(34, 197, 94, 0.16);
  --omni-status-error-bg: rgba(249, 115, 22, 0.12);
  --omni-status-error-text: #fdba74;
  --omni-status-error-border: rgba(249, 115, 22, 0.16);
  --omni-close-hover-color: #f8fafc;
  --omni-toggle-bg: rgba(255, 255, 255, 0.04);
  --omni-toggle-border: rgba(255, 255, 255, 0.08);
  --omni-toggle-active-bg: linear-gradient(180deg, rgba(245, 249, 255, 0.96), rgba(231, 240, 255, 0.92));
  --omni-toggle-active-color: #0f6fe0;
  --omni-placeholder: rgba(153, 163, 178, 0.58);
}

.omni-panel::before {
  position: absolute;
  inset: 0;
  background: var(--omni-panel-overlay);
  content: '';
  pointer-events: none;
}

.omni-panel__header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.15rem 0.7rem;
}

.omni-panel__brand-lockup {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.omni-panel__brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 4rem;
  height: 2.1rem;
  border-radius: 999px;
  background: var(--omni-brand-bg);
  color: var(--omni-brand-text);
  font-size: 0.88rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  box-shadow: var(--omni-brand-shadow);
}

.omni-panel__brand-copy {
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  gap: 0.16rem;
}

.omni-panel__eyebrow {
  margin: 0;
  color: var(--omni-text-strong);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.omni-panel__source-overview {
  margin: 0;
  color: var(--omni-text-soft);
  font-size: 0.75rem;
}

.omni-panel__header-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.65rem;
}

.omni-panel__theme-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  border-radius: 999px;
  background: var(--omni-toggle-bg);
  padding: 0.2rem;
  box-shadow: inset 0 0 0 1px var(--omni-toggle-border);
}

.omni-panel__theme-button {
  border: 0;
  border-radius: 999px;
  background: transparent;
  padding: 0.26rem 0.62rem;
  color: var(--omni-text-muted);
  font: inherit;
  font-size: 0.72rem;
  cursor: pointer;
  transition:
    background 150ms ease,
    color 150ms ease,
    box-shadow 150ms ease;
}

.omni-panel__theme-button.is-active {
  background: var(--omni-toggle-active-bg);
  color: var(--omni-toggle-active-color);
  box-shadow: inset 0 0 0 1px rgba(27, 132, 255, 0.1);
}

.omni-panel__theme-button:hover {
  color: var(--omni-text-strong);
}

.omni-panel__shortcut {
  color: var(--omni-text-muted);
  font-size: 0.76rem;
}

.omni-panel__close {
  flex-shrink: 0;
  border: 0;
  border-radius: 999px;
  background: var(--omni-control-bg);
  padding: 0.42rem 0.82rem;
  color: var(--omni-text-muted);
  font: inherit;
  cursor: pointer;
  box-shadow: var(--omni-control-border);
  transition:
    background 150ms ease,
    color 150ms ease,
    box-shadow 150ms ease;
}

.omni-panel__close:hover {
  background: var(--omni-control-hover-bg);
  color: var(--omni-close-hover-color);
  box-shadow:
    inset 0 0 0 1px rgba(27, 132, 255, 0.14),
    0 10px 18px rgba(27, 132, 255, 0.08);
}

.omni-panel__input-shell {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  padding: 0 1.15rem 0.75rem;
}

.omni-panel__search-card {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  border: 1px solid var(--omni-card-border);
  border-radius: 20px;
  background: var(--omni-card-bg);
  padding: 0.8rem 0.9rem 0.75rem;
  box-shadow: var(--omni-card-shadow);
}

.omni-panel__search-topline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.55rem 0.75rem;
}

.omni-panel__mode-pill {
  border-radius: 999px;
  background: var(--omni-accent-soft);
  padding: 0.28rem 0.72rem;
  color: var(--omni-accent-strong);
  font-size: 0.74rem;
  font-weight: 700;
  box-shadow: inset 0 0 0 1px rgba(27, 132, 255, 0.1);
}

.omni-panel__search-copy {
  color: var(--omni-text-muted);
  font-size: 0.76rem;
}

.omni-panel__input-frame {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.65rem;
  border: 1px solid var(--omni-input-border);
  border-radius: 18px;
  background: var(--omni-input-bg);
  padding: 0.1rem 0.3rem 0.1rem 0.3rem;
}

.omni-panel__input-frame:focus-within {
  border-color: var(--omni-accent-outline);
  box-shadow: var(--omni-input-focus-shadow);
}

.omni-panel__input-prefix {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 14px;
  background: var(--omni-accent-softer);
  color: var(--omni-accent-strong);
  font-size: 1rem;
  font-weight: 800;
  box-shadow: inset 0 0 0 1px rgba(27, 132, 255, 0.08);
}

.omni-panel__command-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.omni-panel__command-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  border-radius: 999px;
  background: var(--omni-chip-bg);
  padding: 0.24rem 0.56rem;
  color: var(--omni-text-muted);
  font-size: 0.69rem;
  box-shadow: inset 0 0 0 1px rgba(17, 45, 78, 0.05);
}

.omni-panel__command-key {
  color: var(--omni-text-strong);
  font-weight: 700;
}

.omni-panel__command-name {
  color: var(--omni-text-soft);
}

.omni-panel__input {
  width: 100%;
  border: 0;
  background: transparent;
  padding: 0.86rem 0.8rem 0.86rem 0;
  color: var(--omni-text-strong);
  font-size: 1rem;
  outline: none;
}

.omni-panel__input::placeholder {
  color: var(--omni-placeholder);
}

.omni-panel__status {
  position: relative;
  z-index: 1;
  margin: 0 1.15rem 0.6rem;
  border-radius: 14px;
  padding: 0.68rem 0.82rem;
  font-size: 0.82rem;
}

.omni-panel__status.is-info {
  background: var(--omni-status-info-bg);
  color: var(--omni-status-info-text);
  box-shadow: inset 0 0 0 1px var(--omni-status-info-border);
}

.omni-panel__status.is-success {
  background: var(--omni-status-success-bg);
  color: var(--omni-status-success-text);
  box-shadow: inset 0 0 0 1px var(--omni-status-success-border);
}

.omni-panel__status.is-error {
  background: var(--omni-status-error-bg);
  color: var(--omni-status-error-text);
  box-shadow: inset 0 0 0 1px var(--omni-status-error-border);
}

.omni-panel__content {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 0;
  flex: 1;
  overflow: hidden;
  padding: 0 0.85rem 0.6rem;
}

.omni-panel__results {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 0.8rem;
  overflow-y: auto;
  padding: 0 0.3rem 0.25rem;
  scrollbar-gutter: stable;
}

.omni-panel__loading,
.omni-panel__empty {
  display: flex;
  min-height: 100%;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--omni-empty-border);
  border-radius: 24px;
  background: var(--omni-empty-bg);
  padding: 2rem 1.5rem;
  text-align: center;
}

.omni-panel__loading {
  color: var(--omni-text-muted);
}

.omni-panel__empty-title {
  margin: 0;
  color: var(--omni-text-strong);
  font-size: 1.08rem;
}

.omni-panel__empty-text {
  max-width: 34rem;
  margin: 0.65rem 0 0;
  color: var(--omni-text-muted);
  line-height: 1.6;
}

.omni-panel__footer {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  flex-shrink: 0;
  border-top: 1px solid var(--omni-border-subtle);
  background: var(--omni-footer-bg);
  padding: 0.72rem 1.15rem 0.8rem;
  color: var(--omni-text-muted);
  font-size: 0.74rem;
}

.omni-panel__footer-keys {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.omni-panel__footer-key {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  border-radius: 999px;
  background: var(--omni-control-bg);
  padding: 0.26rem 0.52rem;
  box-shadow: inset 0 0 0 1px rgba(17, 45, 78, 0.05);
}

.omni-panel__footer-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.35rem;
  border-radius: 8px;
  background: var(--omni-kbd-bg);
  padding: 0.16rem 0.34rem;
  color: var(--omni-text-strong);
  font-size: 0.68rem;
  font-weight: 700;
  box-shadow: var(--omni-kbd-border);
}

.omni-panel__footer-prefixes {
  color: var(--omni-text-soft);
}

.omni-panel__results::-webkit-scrollbar {
  width: 10px;
}

.omni-panel__results::-webkit-scrollbar-track {
  background: transparent;
}

.omni-panel__results::-webkit-scrollbar-thumb {
  border: 3px solid transparent;
  border-radius: 999px;
  background: var(--omni-scrollbar-thumb);
  background-clip: padding-box;
}

@media (max-width: 720px) {
  .omni-backdrop {
    padding-top: 1rem;
  }

  .omni-panel {
    max-height: calc(100vh - 2rem);
    border-radius: 24px;
  }

  .omni-panel__header,
  .omni-panel__input-shell,
  .omni-panel__status,
  .omni-panel__footer {
    margin-left: 0;
    margin-right: 0;
  }

  .omni-panel__header {
    align-items: flex-start;
    padding: 0.95rem 1rem 0.7rem;
  }

  .omni-panel__input-shell {
    padding: 0 1rem 0.7rem;
  }

  .omni-panel__status {
    margin: 0 1rem 0.55rem;
  }

  .omni-panel__content {
    padding: 0 0.75rem 0.6rem;
  }

  .omni-panel__footer {
    justify-content: flex-start;
    padding: 0.75rem 1rem 0.9rem;
  }

  .omni-panel__footer-prefixes {
    width: 100%;
  }

  .omni-panel__header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .omni-panel__shortcut {
    order: 1;
  }

  .omni-panel__theme-toggle {
    order: 0;
  }
}
</style>
