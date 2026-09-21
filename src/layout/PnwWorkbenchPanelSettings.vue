<script setup lang="ts">
import type { PnwViewBlockContributions, PnwViewBlockId, PnwViewBlockVisibility } from "../types/PnwWorkbenchWeb.js";
import { usePnwLocale } from "../composables/usePnwLocale.js";

defineProps<{
  showFooter: boolean;
  contributions: PnwViewBlockContributions;
  visibility: PnwViewBlockVisibility;
}>();
const emit = defineEmits<{
  "update:showFooter": [visible: boolean];
  toggle: [blockId: PnwViewBlockId];
}>();
const { t: pnwT } = usePnwLocale();
const pnwBlocks = ["primary", "bottom", "secondary"] as const;
</script>

<template>
  <div class="pnw-workbench-panel-settings">
    <label>
      <input type="checkbox" :checked="showFooter" @change="emit('update:showFooter', !showFooter)">
      {{ pnwT('workbench.footer') }} (Footer)
    </label>
    <label v-for="block in pnwBlocks" :key="block">
      <input type="checkbox" :checked="!!contributions[block] && visibility[block]"
        :disabled="!contributions[block]" @change="emit('toggle', block)">
      {{ pnwT(`workbench.footer.${block}Toggle`) }}
    </label>
  </div>
</template>

<style scoped>
.pnw-workbench-panel-settings { display: grid; gap: 8px; padding: 8px; }
.pnw-workbench-panel-settings label { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.pnw-workbench-panel-settings input { accent-color: var(--pnw-control-active-text); }
</style>
