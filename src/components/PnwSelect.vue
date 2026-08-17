<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import type { PnwSelectOption, PnwSelectSize } from "../types/PnwSelect.js";
import type { PnwColorScheme } from "../utils/pnwColorScheme.js";
import { pnwResolveWorkbenchOverlayZIndex } from "../utils/pnwOverlayStacking.js";
import { usePnwOverlayTheme } from "../composables/usePnwOverlayTheme.js";
import { usePnwLocale } from "../composables/usePnwLocale.js";
import PnwIcon from "./PnwIcon.vue";
import PnwOverlayThemeProvider from "./PnwOverlayThemeProvider.vue";

const props = withDefaults(defineProps<{
  options: readonly PnwSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  size?: PnwSelectSize;
  ariaLabel?: string;
  colorScheme?: PnwColorScheme;
}>(), {
  disabled: false,
  size: "default",
});

const pnwModel = defineModel<string>({ default: "" });
const pnwResolvedColorScheme = usePnwOverlayTheme(() => props.colorScheme);
const { t: pnwT } = usePnwLocale();
const pnwResolvedPlaceholder = computed(() => props.placeholder ?? pnwT("select.placeholder"));
const pnwInstance = getCurrentInstance();
const pnwTrigger = ref<HTMLButtonElement>();
const pnwMenu = ref<HTMLElement>();
const pnwOpen = ref(false);
const pnwActiveIndex = ref(-1);
const pnwMenuStyle = ref<Record<string, string>>({});
const pnwListboxId = `pnw-select-listbox-${pnwInstance?.uid ?? 0}`;
let pnwTypeahead = "";
let pnwTypeaheadTimer: ReturnType<typeof setTimeout> | undefined;

const pnwSelectedIndex = computed(() => (
  props.options.findIndex((option) => option.value === pnwModel.value)
));
const pnwSelectedOption = computed(() => props.options[pnwSelectedIndex.value]);
const pnwActiveOptionId = computed(() => (
  pnwOpen.value && pnwActiveIndex.value >= 0
    ? `${pnwListboxId}-option-${pnwActiveIndex.value}`
    : undefined
));

function pnwIsEnabled(index: number): boolean {
  return index >= 0 && index < props.options.length && !props.options[index]?.disabled;
}

function pnwFindEnabled(start: number, direction: 1 | -1): number {
  if (props.options.length === 0) return -1;
  for (let step = 0; step < props.options.length; step += 1) {
    const index = (start + step * direction + props.options.length) % props.options.length;
    if (pnwIsEnabled(index)) return index;
  }
  return -1;
}

function pnwInitialActive(direction: 1 | -1 = 1): number {
  return pnwIsEnabled(pnwSelectedIndex.value)
    ? pnwSelectedIndex.value
    : pnwFindEnabled(direction === 1 ? 0 : props.options.length - 1, direction);
}

function pnwMoveActive(direction: 1 | -1): void {
  const start = pnwActiveIndex.value < 0
    ? (direction === 1 ? 0 : props.options.length - 1)
    : (pnwActiveIndex.value + direction + props.options.length) % props.options.length;
  pnwActiveIndex.value = pnwFindEnabled(start, direction);
}

function pnwUpdateMenuPosition(): void {
  const trigger = pnwTrigger.value;
  if (!trigger || typeof window === "undefined") return;
  const triggerRect = trigger.getBoundingClientRect();
  const viewportMargin = 8;
  const gap = 4;
  const width = Math.min(
    Math.max(triggerRect.width, 120),
    Math.max(120, window.innerWidth - viewportMargin * 2),
  );
  const left = Math.min(
    Math.max(viewportMargin, triggerRect.left),
    Math.max(viewportMargin, window.innerWidth - width - viewportMargin),
  );
  const below = Math.max(80, window.innerHeight - triggerRect.bottom - viewportMargin - gap);
  const above = Math.max(80, triggerRect.top - viewportMargin - gap);
  const measuredHeight = pnwMenu.value?.getBoundingClientRect().height ?? 0;
  const openAbove = below < Math.min(160, measuredHeight || 160) && above > below;
  const maxHeight = Math.min(240, openAbove ? above : below);
  const top = openAbove
    ? Math.max(viewportMargin, triggerRect.top - Math.min(measuredHeight || maxHeight, maxHeight) - gap)
    : triggerRect.bottom + gap;
  pnwMenuStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    maxHeight: `${maxHeight}px`,
    zIndex: String(pnwResolveWorkbenchOverlayZIndex("hostTools")),
  };
}

async function pnwSetOpen(next: boolean, direction: 1 | -1 = 1): Promise<void> {
  if (!next || props.disabled || props.options.length === 0) {
    pnwOpen.value = false;
    pnwActiveIndex.value = -1;
    return;
  }
  pnwActiveIndex.value = pnwInitialActive(direction);
  pnwOpen.value = true;
  await nextTick();
  pnwUpdateMenuPosition();
  await nextTick();
  pnwUpdateMenuPosition();
}

function pnwSelectOption(index: number): void {
  const option = props.options[index];
  if (!option || option.disabled) return;
  pnwModel.value = option.value;
  void pnwSetOpen(false);
}

function pnwHandleTypeahead(key: string): void {
  if (pnwTypeaheadTimer) clearTimeout(pnwTypeaheadTimer);
  pnwTypeahead += key.toLocaleLowerCase();
  const start = Math.max(0, pnwActiveIndex.value + 1);
  const candidates = [...props.options.keys()];
  const ordered = [...candidates.slice(start), ...candidates.slice(0, start)];
  const match = ordered.find((index) => {
    const option = props.options[index];
    return !option?.disabled && option.label.toLocaleLowerCase().startsWith(pnwTypeahead);
  });
  if (match !== undefined) pnwActiveIndex.value = match;
  pnwTypeaheadTimer = setTimeout(() => { pnwTypeahead = ""; }, 700);
}

function pnwHandleKeydown(event: KeyboardEvent): void {
  if (props.disabled) return;
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    if (!pnwOpen.value) void pnwSetOpen(true, event.key === "ArrowDown" ? 1 : -1);
    else pnwMoveActive(event.key === "ArrowDown" ? 1 : -1);
    return;
  }
  if (event.key === "Home" || event.key === "End") {
    if (!pnwOpen.value) return;
    event.preventDefault();
    pnwActiveIndex.value = pnwFindEnabled(event.key === "Home" ? 0 : props.options.length - 1, event.key === "Home" ? 1 : -1);
    return;
  }
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    if (pnwOpen.value && pnwActiveIndex.value >= 0) pnwSelectOption(pnwActiveIndex.value);
    else void pnwSetOpen(true);
    return;
  }
  if (event.key === "Escape" && pnwOpen.value) {
    event.preventDefault();
    void pnwSetOpen(false);
    return;
  }
  if (event.key === "Tab") {
    void pnwSetOpen(false);
    return;
  }
  if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
    if (!pnwOpen.value) void pnwSetOpen(true);
    pnwHandleTypeahead(event.key);
  }
}

function pnwHandleDocumentPointer(event: PointerEvent): void {
  const target = event.target as Node;
  if (pnwTrigger.value?.contains(target) || pnwMenu.value?.contains(target)) return;
  void pnwSetOpen(false);
}

watch(
  () => [props.disabled, props.options, pnwModel.value] as const,
  () => {
    if (props.disabled) void pnwSetOpen(false);
    else if (pnwOpen.value) pnwActiveIndex.value = pnwInitialActive();
  },
  { deep: true },
);

onMounted(() => {
  document.addEventListener("pointerdown", pnwHandleDocumentPointer, true);
  window.addEventListener("resize", pnwUpdateMenuPosition);
  window.addEventListener("scroll", pnwUpdateMenuPosition, true);
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", pnwHandleDocumentPointer, true);
  window.removeEventListener("resize", pnwUpdateMenuPosition);
  window.removeEventListener("scroll", pnwUpdateMenuPosition, true);
  if (pnwTypeaheadTimer) clearTimeout(pnwTypeaheadTimer);
});
</script>

<template>
  <div
    class="pnw-select pnw-workbench-theme-root"
    :class="[`pnw-select--${size}`, { 'pnw-select--disabled': disabled }]"
    :data-pnw-color-scheme="pnwResolvedColorScheme"
  >
    <button
      ref="pnwTrigger"
      type="button"
      class="pnw-select-trigger"
      role="combobox"
      aria-haspopup="listbox"
      :aria-label="ariaLabel || undefined"
      :aria-expanded="pnwOpen"
      :aria-controls="pnwListboxId"
      :aria-activedescendant="pnwActiveOptionId"
      :disabled="disabled"
      @click="pnwSetOpen(!pnwOpen)"
      @keydown="pnwHandleKeydown"
    >
      <span
        class="pnw-select-value"
        :class="{ 'pnw-select-placeholder': !pnwSelectedOption }"
        :title="pnwSelectedOption?.label || pnwResolvedPlaceholder"
      >
        {{ pnwSelectedOption?.label || pnwResolvedPlaceholder }}
      </span>
      <PnwIcon
        name="chevron-down"
        :size="14"
        class="pnw-select-chevron"
        :class="{ 'pnw-select-chevron--open': pnwOpen }"
        aria-hidden="true"
      />
    </button>

    <Teleport to="body">
      <PnwOverlayThemeProvider
        v-if="pnwOpen"
        class="pnw-select-menu-host"
        :color-scheme="pnwResolvedColorScheme"
        :style="pnwMenuStyle"
      >
        <ul
          :id="pnwListboxId"
          ref="pnwMenu"
          class="pnw-select-menu"
          role="listbox"
          :aria-label="ariaLabel || pnwResolvedPlaceholder"
        >
          <li
            v-for="(option, index) in options"
            :id="`${pnwListboxId}-option-${index}`"
            :key="option.value"
            class="pnw-select-option"
            :class="{
              'pnw-select-option--active': index === pnwActiveIndex,
              'pnw-select-option--selected': option.value === pnwModel,
              'pnw-select-option--disabled': option.disabled,
            }"
            role="option"
            :aria-selected="option.value === pnwModel"
            :aria-disabled="option.disabled || undefined"
            :title="option.label"
            @pointermove="!option.disabled && (pnwActiveIndex = index)"
            @pointerdown.prevent
            @click="pnwSelectOption(index)"
          >
            <span class="pnw-select-option-label">{{ option.label }}</span>
            <span
              v-if="option.value === pnwModel"
              class="pnw-select-option-check"
              aria-hidden="true"
            >✓</span>
          </li>
        </ul>
      </PnwOverlayThemeProvider>
    </Teleport>
  </div>
</template>

<style scoped>
.pnw-select {
  position: relative;
  display: inline-flex;
  min-width: 0;
  width: var(--pnw-select-width, 100%);
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
  font: inherit;
}

.pnw-select--default {
  --pnw-select-height: 32px;
  --pnw-select-padding-inline: 9px;
  --pnw-select-font-size: 13px;
}

.pnw-select--compact {
  --pnw-select-height: 24px;
  --pnw-select-padding-inline: 6px;
  --pnw-select-font-size: 12px;
}

.pnw-select-trigger {
  display: flex;
  align-items: center;
  gap: 5px;
  width: 100%;
  min-width: 0;
  height: var(--pnw-select-height);
  margin: 0;
  padding: 0 var(--pnw-select-padding-inline);
  box-sizing: border-box;
  border: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  border-radius: var(--pnw-select-radius, 5px);
  background: var(--pnw-control-bg, var(--pnw-workbench-default-control-bg, #fff));
  color: inherit;
  font: inherit;
  font-size: var(--pnw-select-font-size);
  line-height: 1;
  text-align: left;
  cursor: pointer;
}

.pnw-select-trigger:hover:not(:disabled) {
  border-color: var(--pnw-focus-ring, var(--pnw-workbench-default-focus, #3b82f6));
  background: var(--pnw-control-hover-bg, var(--pnw-workbench-default-control-hover-bg, #f1f5f9));
}

.pnw-select-trigger:focus-visible {
  outline: 2px solid var(--pnw-focus-ring, var(--pnw-workbench-default-focus, #3b82f6));
  outline-offset: 1px;
}

.pnw-select-trigger:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.pnw-select-value {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pnw-select-placeholder,
.pnw-select-chevron {
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
}

.pnw-select-chevron {
  flex: none;
  transition: transform 120ms ease;
}

.pnw-select-chevron--open {
  transform: rotate(180deg);
}

.pnw-select-menu-host {
  position: fixed;
  min-width: 0;
  max-width: calc(100vw - 16px);
}

.pnw-select-menu {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: inherit;
  margin: 0;
  padding: 3px;
  box-sizing: border-box;
  overflow-y: auto;
  overscroll-behavior: contain;
  list-style: none;
  border: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  border-radius: var(--pnw-select-menu-radius, 6px);
  background: var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff));
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
  box-shadow: var(--pnw-overlay-shadow, var(--pnw-workbench-default-overlay-shadow, 0 12px 28px rgba(15, 23, 42, 0.18)));
}

.pnw-select-option {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  padding: 4px 8px;
  box-sizing: border-box;
  border-radius: 4px;
  font-size: 13px;
  line-height: 20px;
  cursor: pointer;
}

.pnw-select-option--active:not(.pnw-select-option--disabled) {
  background: var(--pnw-control-hover-bg, var(--pnw-workbench-default-hover-bg, rgba(59, 130, 246, 0.09)));
}

.pnw-select-option--selected:not(.pnw-select-option--disabled) {
  background: var(--pnw-control-active-bg, var(--pnw-workbench-default-active-bg, rgba(37, 99, 235, 0.13)));
  color: var(--pnw-control-active-text, var(--pnw-workbench-default-active-text, #1d4ed8));
  font-weight: 650;
}

.pnw-select-option--active.pnw-select-option--selected:not(.pnw-select-option--disabled) {
  background: color-mix(
    in srgb,
    var(--pnw-control-active-bg, var(--pnw-workbench-default-active-bg, rgba(37, 99, 235, 0.13))) 74%,
    var(--pnw-control-hover-bg, var(--pnw-workbench-default-hover-bg, rgba(59, 130, 246, 0.09))) 26%
  );
}

.pnw-select-option--disabled {
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  opacity: 0.52;
  cursor: not-allowed;
}

.pnw-select-option-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pnw-select-option-check {
  flex: none;
  width: 14px;
  text-align: center;
}
</style>
