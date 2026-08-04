<script setup lang="ts">
import { type Component } from "vue";
import { usePnwOverlayTheme } from "../composables/usePnwOverlayTheme.js";
import type { PnwColorScheme } from "../utils/pnwColorScheme.js";

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<{
  colorScheme?: PnwColorScheme;
  tag?: string | Component;
}>(), {
  tag: "div",
});

const pnwResolvedColorScheme = usePnwOverlayTheme(() => props.colorScheme);
</script>

<template>
  <component
    :is="tag"
    v-bind="$attrs"
    class="pnw-workbench-theme-root pnw-overlay-theme-root"
    :data-pnw-color-scheme="pnwResolvedColorScheme"
    data-pnw-overlay-theme-root
  >
    <slot />
  </component>
</template>

<style src="../styles/pnwWorkbenchTheme.css"></style>
