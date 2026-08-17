<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { usePnwLocale } from "../composables/usePnwLocale.js";
import type { PnwLocale } from "../types/PnwLocale.js";
import {
  PNW_DEFAULT_COLOR_SCHEME_TRANSITION_DURATION,
  pnwResolveColorScheme,
  pnwToggleColorSchemeWithTransition,
  type PnwColorScheme,
  type PnwResolvedColorScheme,
} from "../utils/pnwColorScheme.js";
import PnwIcon from "./PnwIcon.vue";

const props = withDefaults(defineProps<{
  modelValue: PnwColorScheme;
  duration?: number;
  disabled?: boolean;
  locale?: PnwLocale;
  lightLabel?: string;
  darkLabel?: string;
}>(), {
  duration: PNW_DEFAULT_COLOR_SCHEME_TRANSITION_DURATION,
  disabled: false,
  locale: undefined,
  lightLabel: "",
  darkLabel: "",
});

const emit = defineEmits<{
  "update:modelValue": [value: PnwResolvedColorScheme];
  change: [value: PnwResolvedColorScheme];
}>();

const { t: pnwT } = usePnwLocale(() => props.locale);
const pnwBusy = ref(false);
const pnwResolvedValue = computed(() => pnwResolveColorScheme(props.modelValue));
const pnwNextValue = computed<PnwResolvedColorScheme>(() => (
  pnwResolvedValue.value === "dark" ? "light" : "dark"
));
const pnwLabel = computed(() => (
  pnwNextValue.value === "light"
    ? (props.lightLabel || pnwT("workbench.colorSchemeToggle.toLight"))
    : (props.darkLabel || pnwT("workbench.colorSchemeToggle.toDark"))
));
const pnwIconName = computed(() => (pnwNextValue.value === "light" ? "sun" : "moon"));

async function pnwToggleColorScheme(event: MouseEvent): Promise<void> {
  if (props.disabled || pnwBusy.value) return;
  const button = event.currentTarget as HTMLButtonElement;
  const rect = button.getBoundingClientRect();
  pnwBusy.value = true;
  try {
    await pnwToggleColorSchemeWithTransition({
      value: props.modelValue,
      duration: props.duration,
      ownerDocument: button.ownerDocument,
      origin: {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      },
      update: async (value) => {
        emit("update:modelValue", value);
        emit("change", value);
        await nextTick();
      },
    });
  } finally {
    pnwBusy.value = false;
  }
}
</script>

<template>
  <button
    class="pnw-color-scheme-toggle"
    type="button"
    :title="pnwLabel"
    :aria-label="pnwLabel"
    :aria-busy="pnwBusy ? 'true' : undefined"
    :disabled="disabled || pnwBusy"
    :data-pnw-color-scheme="pnwResolvedValue"
    :data-pnw-color-scheme-toggle-icon="pnwIconName"
    @click="pnwToggleColorScheme"
  >
    <PnwIcon :name="pnwIconName" :size="24" />
  </button>
</template>

<style scoped>
.pnw-color-scheme-toggle {
  display: inline-grid;
  width: var(--pnw-color-scheme-toggle-size, 34px);
  height: var(--pnw-color-scheme-toggle-size, 34px);
  padding: 5px;
  place-items: center;
  flex: none;
  border: 1px solid transparent;
  border-radius: var(--pnw-control-radius, 6px);
  background: transparent;
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  cursor: pointer;
}

.pnw-color-scheme-toggle:hover:not(:disabled) {
  background: var(--pnw-control-hover-bg, var(--pnw-workbench-default-hover-bg, rgb(59 130 246 / 9%)));
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
}

.pnw-color-scheme-toggle:focus-visible {
  outline: 2px solid var(--pnw-focus-ring, var(--pnw-workbench-default-focus, #3b82f6));
  outline-offset: 2px;
}

.pnw-color-scheme-toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
