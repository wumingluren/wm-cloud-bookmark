<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import type { NewTabThemeId, NewTabThemePreset } from '../themes'

const props = defineProps<{
  activeThemeId: NewTabThemeId
  themePresets: readonly NewTabThemePreset[]
}>()

const emit = defineEmits<{
  selectTheme: [themeId: NewTabThemeId]
}>()

const rootRef = ref<HTMLElement | null>(null)
const isOpen = shallowRef(false)

const activeTheme = computed(
  () =>
    props.themePresets.find(theme => theme.id === props.activeThemeId)
    ?? props.themePresets[0],
)

const triggerPreviewStyle = computed(() => ({
  '--theme-preview-primary': activeTheme.value.preview[0],
  '--theme-preview-secondary': activeTheme.value.preview[1],
  '--theme-preview-surface': activeTheme.value.preview[2],
}))

function togglePanel() {
  isOpen.value = !isOpen.value
}

function selectTheme(themeId: NewTabThemeId) {
  emit('selectTheme', themeId)
  isOpen.value = false
}

function handlePointerDown(event: PointerEvent) {
  if (!isOpen.value) {
    return
  }

  const target = event.target

  if (
    rootRef.value
    && target instanceof Node
    && !rootRef.value.contains(target)
  ) {
    isOpen.value = false
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handlePointerDown)
  document.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handlePointerDown)
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div ref="rootRef" class="theme-switcher">
    <button
      type="button"
      class="theme-switcher__trigger"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      @click="togglePanel"
    >
      <span
        class="theme-switcher__trigger-preview"
        :style="triggerPreviewStyle"
        aria-hidden="true"
      >
        <span class="theme-switcher__trigger-orb theme-switcher__trigger-orb--primary" />
        <span class="theme-switcher__trigger-orb theme-switcher__trigger-orb--secondary" />
      </span>

      <span class="theme-switcher__trigger-label">换肤</span>

      <svg
        class="theme-switcher__trigger-caret"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
      >
        <path d="M5.5 7.75L10 12.25L14.5 7.75" />
      </svg>
    </button>

    <transition name="theme-switcher-pop">
      <div v-if="isOpen" class="theme-switcher__panel">
        <button
          v-for="theme in themePresets"
          :key="theme.id"
          type="button"
          class="theme-switcher__option"
          :class="{ 'is-active': theme.id === activeThemeId }"
          :style="{
            '--theme-preview-primary': theme.preview[0],
            '--theme-preview-secondary': theme.preview[1],
            '--theme-preview-surface': theme.preview[2],
          }"
          @click="selectTheme(theme.id)"
        >
          <span class="theme-switcher__option-preview" aria-hidden="true">
            <span class="theme-switcher__option-band theme-switcher__option-band--primary" />
            <span class="theme-switcher__option-band theme-switcher__option-band--secondary" />
            <span class="theme-switcher__option-band theme-switcher__option-band--surface" />
          </span>

          <span class="theme-switcher__option-copy">
            <span class="theme-switcher__option-name">{{ theme.label }}</span>
            <span class="theme-switcher__option-description">
              {{ theme.description }}
            </span>
          </span>

          <span
            v-if="theme.id === activeThemeId"
            class="theme-switcher__option-state"
          >
            当前
          </span>
        </button>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.theme-switcher {
  position: relative;
}

.theme-switcher__trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--newtab-line);
  border-radius: 999px;
  background: var(--newtab-chip-surface);
  padding: 0.4rem 0.7rem;
  color: var(--newtab-ink-soft);
  font: inherit;
  font-size: 0.78rem;
  cursor: pointer;
  backdrop-filter: blur(12px);
  transition:
    border-color 160ms ease,
    transform 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;
}

.theme-switcher__trigger:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--newtab-accent) 18%, transparent);
  color: var(--newtab-ink-strong);
  box-shadow: 0 10px 24px var(--newtab-button-shadow);
}

.theme-switcher__trigger-preview {
  position: relative;
  display: inline-flex;
  width: 1rem;
  height: 1rem;
  flex: none;
  border-radius: 999px;
  background:
    linear-gradient(
      135deg,
      var(--theme-preview-primary),
      var(--theme-preview-secondary)
    );
  box-shadow:
    inset 0 0 0 1px var(--newtab-switcher-preview-outline),
    0 6px 14px color-mix(
      in srgb,
      var(--theme-preview-primary) 18%,
      transparent
    );
}

.theme-switcher__trigger-orb {
  position: absolute;
  border-radius: 999px;
}

.theme-switcher__trigger-orb--primary {
  inset: -0.05rem auto auto -0.06rem;
  width: 0.58rem;
  height: 0.58rem;
  background: color-mix(
    in srgb,
    var(--theme-preview-primary) 90%,
    white
  );
}

.theme-switcher__trigger-orb--secondary {
  right: -0.06rem;
  bottom: -0.06rem;
  width: 0.5rem;
  height: 0.5rem;
  background: color-mix(
    in srgb,
    var(--theme-preview-secondary) 84%,
    white
  );
}

.theme-switcher__trigger-label {
  white-space: nowrap;
}

.theme-switcher__trigger-caret {
  width: 0.9rem;
  height: 0.9rem;
  flex: none;
  transition: transform 160ms ease;
}

.theme-switcher__trigger[aria-expanded="true"] .theme-switcher__trigger-caret {
  transform: rotate(180deg);
}

.theme-switcher__panel {
  position: absolute;
  top: calc(100% + 0.55rem);
  right: 0;
  z-index: 5;
  display: grid;
  gap: 0.42rem;
  width: min(18.5rem, calc(100vw - 2rem));
  border: 1px solid var(--newtab-line);
  border-radius: 20px;
  background:
    linear-gradient(
      180deg,
      var(--newtab-switcher-panel-start),
      var(--newtab-switcher-panel-end)
    );
  padding: 0.55rem;
  box-shadow: 0 24px 48px var(--newtab-switcher-shadow);
  backdrop-filter: blur(20px);
}

.theme-switcher__option {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.68rem;
  border: 1px solid var(--newtab-switcher-option-border);
  border-radius: 16px;
  background: var(--newtab-switcher-option-surface);
  padding: 0.62rem 0.68rem;
  text-align: left;
  color: inherit;
  font: inherit;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background 160ms ease,
    box-shadow 160ms ease;
}

.theme-switcher__option:hover {
  transform: translateY(-1px);
  border-color: color-mix(
    in srgb,
    var(--theme-preview-primary) 20%,
    transparent
  );
  box-shadow: 0 14px 26px var(--newtab-switcher-option-shadow);
}

.theme-switcher__option.is-active {
  border-color: var(--newtab-switcher-option-active-border);
  background: var(--newtab-switcher-option-active);
}

.theme-switcher__option-preview {
  display: grid;
  width: 2.35rem;
  overflow: hidden;
  border-radius: 13px;
  box-shadow: inset 0 0 0 1px var(--newtab-switcher-preview-outline);
}

.theme-switcher__option-band {
  height: 0.5rem;
}

.theme-switcher__option-band--primary {
  background: var(--theme-preview-primary);
}

.theme-switcher__option-band--secondary {
  background: var(--theme-preview-secondary);
}

.theme-switcher__option-band--surface {
  background: var(--theme-preview-surface);
}

.theme-switcher__option-copy {
  display: grid;
  gap: 0.12rem;
  min-width: 0;
}

.theme-switcher__option-name {
  color: var(--newtab-ink-strong);
  font-size: 0.84rem;
  font-weight: 700;
}

.theme-switcher__option-description {
  color: var(--newtab-ink-soft);
  font-size: 0.74rem;
  line-height: 1.38;
}

.theme-switcher__option-state {
  color: var(--newtab-accent-strong);
  font-size: 0.72rem;
  font-weight: 700;
}

.theme-switcher-pop-enter-active,
.theme-switcher-pop-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.theme-switcher-pop-enter-from,
.theme-switcher-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

@media (max-width: 560px) {
  .theme-switcher__panel {
    right: auto;
    left: 0;
  }
}
</style>
