<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import type { PnwComboOption } from "../types/comboTypes";

const model = defineModel<string>({ default: "" });

const props = withDefaults(
  defineProps<{
    options?: PnwComboOption[];
    disabled?: boolean;
    readonly?: boolean;
    placeholder?: string;
  }>(),
  {
    options: () => [],
    disabled: false,
    readonly: false,
  },
);

const root = ref<HTMLElement | null>(null);
const open = ref(false);

function setOpen(next: boolean) {
  if (props.disabled || props.readonly) {
    open.value = false;
    return;
  }
  open.value = next && props.options.length > 0;
}

function toggleList() {
  setOpen(!open.value);
}

function onInputFocus() {
  setOpen(true);
}

function pick(opt: PnwComboOption) {
  model.value = opt.value;
  setOpen(false);
}

function onDocPointer(e: PointerEvent) {
  const el = root.value;
  if (!el || !open.value) return;
  if (!el.contains(e.target as Node)) setOpen(false);
}

function onDocKey(e: KeyboardEvent) {
  if (e.key === "Escape") setOpen(false);
}

onMounted(() => {
  document.addEventListener("pointerdown", onDocPointer, true);
  document.addEventListener("keydown", onDocKey);
});

onUnmounted(() => {
  document.removeEventListener("pointerdown", onDocPointer, true);
  document.removeEventListener("keydown", onDocKey);
});
</script>

<template>
  <div ref="root" class="pnw-combo-wrap">
    <div class="pnw-combo-field">
      <input
        v-model="model"
        class="pnw-combo-text-input"
        :class="{ readonly }"
        :disabled="disabled"
        :readonly="readonly"
        :placeholder="placeholder"
        spellcheck="false"
        @focus="onInputFocus"
      />
      <button
        v-if="options.length"
        type="button"
        class="pnw-combo-toggle"
        :disabled="disabled || readonly"
        :aria-expanded="open"
        aria-haspopup="listbox"
        title="展开全部选项"
        tabindex="-1"
        @mousedown.prevent
        @click="toggleList"
      >
        ▾
      </button>
    </div>
    <ul v-show="open" class="pnw-combo-menu" role="listbox">
      <li
        v-for="opt in options"
        :key="opt.value"
        role="option"
        :class="{ active: (model ?? '').trim().toUpperCase() === opt.value.toUpperCase() }"
        @mousedown.prevent="pick(opt)"
      >
        <span class="pnw-combo-opt-val">{{ opt.value }}</span>
        <span class="pnw-combo-opt-label">{{ opt.label }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.pnw-combo-wrap {
  position: relative;
  display: block;
  width: 100%;
  min-width: 0;
}

.pnw-combo-field {
  display: flex;
  align-items: stretch;
  width: 100%;
}

.pnw-combo-text-input {
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  padding: 6px 8px;
  border: 1px solid var(--border-strong);
  border-radius: 6px 0 0 6px;
  font-size: 0.82rem;
  color: inherit;
}

.pnw-combo-field:has(.pnw-combo-toggle) .pnw-combo-text-input {
  border-right: none;
  border-radius: 6px 0 0 6px;
}

.pnw-combo-field:not(:has(.pnw-combo-toggle)) .pnw-combo-text-input {
  border-radius: 6px;
}

.pnw-combo-toggle {
  flex-shrink: 0;
  width: 28px;
  padding: 0;
  border: 1px solid var(--border-strong);
  border-left: none;
  border-radius: 0 6px 6px 0;
  background: #f8fafc;
  color: var(--muted);
  font-size: 0.75rem;
  cursor: pointer;
  line-height: 1;
}

.pnw-combo-toggle:hover:not(:disabled) {
  background: #eef2ff;
  color: var(--text);
}

.pnw-combo-toggle:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.pnw-combo-text-input.readonly {
  background: #f3f4f6;
}

.pnw-combo-text-input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.pnw-combo-menu {
  position: absolute;
  z-index: 40;
  left: 0;
  right: 0;
  top: calc(100% + 2px);
  margin: 0;
  padding: 4px 0;
  list-style: none;
  border: 1px solid var(--border-strong);
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
  max-height: 160px;
  overflow-y: auto;
}

.pnw-combo-menu li {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 6px 10px;
  font-size: 0.82rem;
  cursor: pointer;
}

.pnw-combo-menu li:hover,
.pnw-combo-menu li.active {
  background: #eff6ff;
}

.pnw-combo-opt-val {
  font-weight: 600;
  font-family: ui-monospace, monospace;
  min-width: 1.2em;
}

.pnw-combo-opt-label {
  color: var(--muted);
}
</style>
