<script setup lang="ts">
import type { OmniResult } from '../types'
import OmniResultItem from './OmniResultItem.vue'

defineProps<{
  label: string
  items: Array<{
    index: number
    result: OmniResult
  }>
  selectedIndex: number
  confirmingActionKey: string | null
}>()

const emit = defineEmits<{
  select: [index: number]
  activate: [index: number]
}>()

function getActionKey(result: OmniResult): string {
  return `${result.id}:${result.primaryAction.command}:${JSON.stringify(
    result.primaryAction.payload ?? {},
  )}`
}
</script>

<template>
  <section class="omni-result-group">
    <header class="omni-result-group__header">
      <span class="omni-result-group__label">{{ label }}</span>
      <span class="omni-result-group__count">{{ items.length }}</span>
    </header>

    <div class="omni-result-group__list">
      <OmniResultItem
        v-for="entry in items"
        :key="entry.result.id"
        :result="entry.result"
        :selected="selectedIndex === entry.index"
        :confirming="confirmingActionKey === getActionKey(entry.result)"
        @select="emit('select', entry.index)"
        @activate="emit('activate', entry.index)"
      />
    </div>
  </section>
</template>

<style scoped>
.omni-result-group {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.omni-result-group__header {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-bottom: 1px solid var(--omni-border-subtle, rgba(17, 45, 78, 0.06));
  background: var(--omni-group-header-bg, linear-gradient(180deg, rgba(252, 254, 255, 0.98), rgba(248, 251, 255, 0.9)));
  padding: 0.08rem 0.15rem 0.42rem;
  backdrop-filter: blur(10px);
}

.omni-result-group__label {
  color: var(--omni-text, #d9efff);
  font-size: 0.77rem;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.omni-result-group__count {
  color: var(--omni-text-soft, #6c89a4);
  font-size: 0.74rem;
  font-variant-numeric: tabular-nums;
}

.omni-result-group__list {
  display: flex;
  flex-direction: column;
  gap: 0.42rem;
}
</style>
