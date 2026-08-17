<script setup lang="ts">
import { computed } from "vue";
import type { PnwLocale } from "../types/PnwLocale.js";
import type { PnwSelectSize } from "../types/PnwSelect.js";
import type { PnwWorkspaceTypeDefinition } from "../types/PnwWorkspace.js";
import type { PnwColorScheme } from "../utils/pnwColorScheme.js";
import { usePnwLocale } from "../composables/usePnwLocale.js";
import { pnwNormalizeWorkspaceTypes } from "../utils/pnwWorkspaceTypes.js";
import PnwSelect from "./PnwSelect.vue";

const props = withDefaults(defineProps<{
  types?: readonly PnwWorkspaceTypeDefinition[];
  includeDefaults?: boolean;
  placeholder?: string;
  disabled?: boolean;
  size?: PnwSelectSize;
  ariaLabel?: string;
  locale?: PnwLocale;
  colorScheme?: PnwColorScheme;
}>(), {
  types: () => [],
  includeDefaults: true,
  placeholder: undefined,
  disabled: false,
  size: "default",
  ariaLabel: undefined,
  locale: undefined,
  colorScheme: undefined,
});

const pnwModel = defineModel<string>({ default: "mixed" });
const { t: pnwT } = usePnwLocale(() => props.locale);
const pnwDefinitions = computed(() => pnwNormalizeWorkspaceTypes(props.types, {
  includeDefaults: props.includeDefaults,
  locale: props.locale,
}));
const pnwOptions = computed(() => pnwDefinitions.value.map((definition) => ({
  value: definition.typeId,
  label: definition.label,
})));
</script>

<template>
  <PnwSelect
    v-model="pnwModel"
    class="pnw-workspace-type-select"
    :options="pnwOptions"
    :placeholder="placeholder"
    :disabled="disabled"
    :size="size"
    :aria-label="ariaLabel || pnwT('workspace.type.select')"
    :color-scheme="colorScheme"
  />
</template>
