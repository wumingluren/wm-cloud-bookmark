<script setup lang="ts">
defineProps<{
  content: string;
  position?: "top" | "bottom" | "left" | "right";
}>();
</script>

<template>
  <div class="tooltip-container">
    <slot></slot>
    <div
      v-if="content"
      class="tooltip bg-black text-white p-3 rounded-md shadow-lg text-sm max-w-xs absolute z-10 pointer-events-none"
      :class="position || 'top'"
    >
      {{ content }}
      <div class="tooltip-arrow"></div>
    </div>
  </div>
</template>

<style scoped>
.tooltip-container {
  position: relative;
  display: inline-block;
}

.tooltip {
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s;
  white-space: normal;
  word-break: break-word;
  width: max-content;
}

.tooltip-container:hover .tooltip {
  opacity: 1;
  visibility: visible;
}

.tooltip.top {
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
}

.tooltip.bottom {
  top: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
}

.tooltip.left {
  right: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%);
}

.tooltip.right {
  left: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%);
}

.tooltip-arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: inherit;
  transform: rotate(45deg);
}

.tooltip.top .tooltip-arrow {
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
}

.tooltip.bottom .tooltip-arrow {
  top: -4px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
}

.tooltip.left .tooltip-arrow {
  right: -4px;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
}

.tooltip.right .tooltip-arrow {
  left: -4px;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
}
</style>
