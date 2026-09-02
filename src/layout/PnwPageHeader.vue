<script setup lang="ts">
import { computed, getCurrentInstance, onBeforeUnmount, onMounted } from "vue";
import type { PnwViewPresentationMode } from "../types/PnwViewPresentation.js";
import { usePnwLocale } from "../composables/usePnwLocale.js";
import { usePnwViewPresentationContext } from "../composables/usePnwViewPresentationContext.js";
import PnwIcon from "../components/PnwIcon.vue";

const props = defineProps<{
  title: string;
  subtitle?: string;
  /** @deprecated View Header 固定单行；分类信息请移入 main。 */
  eyebrow?: string;
  /** @deprecated View Header 固定单行；状态摘要请移入 main。 */
  summary?: string;
  /** @deprecated View Header 固定单行；说明文字请移入 main。 */
  description?: string;
  /** 默认 true：三栏网格（标题 · 居中工具条 · 帮助区） */
  toolbar?: boolean;
  /** Workbench 解析 contribution 后传入；true 时自动在最右侧提供统一浮出/收回动作。 */
  presentationDetachable?: boolean;
  presentationMode?: PnwViewPresentationMode;
}>();

const emit = defineEmits<{
  detachView: [];
  reattachView: [];
}>();

const { t: pnwT } = usePnwLocale();
const pnwPresentationContext = usePnwViewPresentationContext();
const pnwInstance = getCurrentInstance();
const pnwHasExplicitPresentationDetachable = computed(() => {
  const vnodeProps = pnwInstance?.vnode.props;
  return Boolean(vnodeProps && (
    Object.prototype.hasOwnProperty.call(vnodeProps, "presentationDetachable")
    || Object.prototype.hasOwnProperty.call(vnodeProps, "presentation-detachable")
  ));
});
const pnwUsesPresentationContext = computed(() => Boolean(
  pnwPresentationContext
  && !pnwHasExplicitPresentationDetachable.value
  && props.presentationMode === undefined,
));
const pnwPresentationMode = computed(() => (
  props.presentationMode ?? pnwPresentationContext?.mode.value ?? "embedded"
));
const pnwPresentationHeaderTarget = computed(() => (
  pnwUsesPresentationContext.value
    ? pnwPresentationContext?.headerChannel.target.value
    : undefined
));
const pnwPresentationHeaderTeleported = computed(() => Boolean(
  pnwPresentationHeaderTarget.value
  && pnwPresentationMode.value !== "embedded"
  && pnwPresentationMode.value !== "reattaching"
));
const pnwPresentationDetachable = computed(() => (
  pnwHasExplicitPresentationDetachable.value
    ? props.presentationDetachable
    : pnwUsesPresentationContext.value && pnwPresentationMode.value === "embedded"
));
const pnwPresentationTransitioning = computed(() => (
  pnwPresentationMode.value === "opening" || pnwPresentationMode.value === "reattaching"
));
const pnwPresentationAction = computed(() => (
  pnwPresentationMode.value === "embedded" ? "detach" : "reattach"
));
const pnwPresentationLabel = computed(() => (
  pnwPresentationAction.value === "detach"
    ? pnwT("viewPresentation.detach")
    : pnwT("viewPresentation.reattach")
));

function pnwRunPresentationAction(): void {
  if (pnwPresentationTransitioning.value) return;
  if (pnwUsesPresentationContext.value && pnwPresentationContext) {
    if (pnwPresentationAction.value === "detach") pnwPresentationContext.detach();
    else pnwPresentationContext.reattach();
    return;
  }
  if (pnwPresentationAction.value === "detach") emit("detachView");
  else emit("reattachView");
}

let pnwReleasePresentationHeader: (() => void) | undefined;
onMounted(() => {
  if (pnwUsesPresentationContext.value) {
    pnwReleasePresentationHeader = pnwPresentationContext?.registerHeader?.();
  }
});
onBeforeUnmount(() => pnwReleasePresentationHeader?.());
</script>

<template>
  <Teleport
    :to="pnwPresentationHeaderTarget ?? 'body'"
    :disabled="!pnwPresentationHeaderTeleported"
  >
    <header
      class="pnw-page-head"
      :class="{
        'pnw-page-head--floating': pnwPresentationHeaderTeleported,
      }"
      data-pnw-page-header
    >
      <div
        class="pnw-head-row"
        :class="{
          'pnw-head-row-toolbar': toolbar !== false,
          'pnw-head-row--presentation': pnwPresentationDetachable,
        }"
      >
        <div class="pnw-head-left">
          <div v-if="$slots.leading" class="pnw-head-leading">
            <slot name="leading" />
          </div>
          <div class="pnw-head-title-row">
            <h1 class="pnw-page-title">{{ title }}</h1>
            <span v-if="subtitle" class="pnw-head-subtitle">{{ subtitle }}</span>
          </div>
        </div>
        <div v-if="$slots.actions" class="pnw-head-actions">
          <slot name="actions" />
        </div>
        <div v-if="$slots.help" class="pnw-head-help">
          <slot name="help" />
        </div>
        <button
          v-if="pnwPresentationDetachable"
          type="button"
          class="pnw-head-presentation-action"
          :disabled="pnwPresentationTransitioning"
          :aria-label="pnwPresentationLabel"
          :title="pnwPresentationLabel"
          @click="pnwRunPresentationAction"
        >
          <PnwIcon
            :name="pnwPresentationAction === 'detach' ? 'window-float' : 'window-reattach'"
            :size="16"
          />
        </button>
      </div>
    </header>
  </Teleport>
</template>

<style>
.pnw-page-head {
  display: flex;
  align-items: center;
  /* 32px Host action + 6px block padding + 1px border stays inside 40px. */
  padding: var(--pnw-page-header-padding, 3px 12px);
  border-bottom: 1px solid var(
    --pnw-workbench-border,
    var(--pnw-workbench-default-border, var(--border, #e2e8f0))
  );
  background: var(--pnw-page-header-bg, var(--page-bg, transparent));
  flex-shrink: 0;
  min-height: var(--pnw-workbench-view-header-height, 40px);
  box-sizing: border-box;
  color: var(
    --pnw-page-header-text,
    var(--pnw-workbench-text, var(--pnw-workbench-default-text, var(--text, #0f172a)))
  );
}

.pnw-page-head--floating {
  width: 100%;
  min-width: 0;
  min-height: var(--pnw-view-presentation-header-min-height, 40px);
  padding: 0;
  border-bottom: 0;
  background: transparent;
}

.pnw-page-head::before {
  width: var(--pnw-workbench-view-header-leading-space, 0px);
  flex: 0 0 var(--pnw-workbench-view-header-leading-space, 0px);
  content: "";
}

.pnw-head-row {
  display: grid;
  grid-template-columns:
    minmax(var(--pnw-page-header-title-min-width, 112px), 1fr)
    minmax(0, auto)
    auto;
  align-items: center;
  gap: var(--pnw-page-header-gap, 8px);
  width: 100%;
  min-width: 0;
}

.pnw-head-row-toolbar {
  grid-template-columns:
    minmax(var(--pnw-page-header-title-min-width, 112px), 1fr)
    minmax(0, auto)
    auto;
}

.pnw-head-row.pnw-head-row--presentation {
  grid-template-columns:
    minmax(var(--pnw-page-header-title-min-width, 112px), 1fr)
    minmax(0, auto)
    auto
    auto;
}

.pnw-head-left {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.pnw-head-title-row {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.pnw-head-leading,
.pnw-head-subtitle {
  min-width: 0;
  flex: none;
}

.pnw-head-leading {
  display: inline-flex;
  align-items: center;
}

.pnw-head-subtitle {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pnw-page-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: inherit;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pnw-head-subtitle {
  font-size: 0.78rem;
  color: var(
    --pnw-workbench-muted,
    var(--pnw-workbench-default-muted, var(--muted, #64748b))
  );
}

.pnw-head-actions {
  min-width: 0;
  width: max-content;
  display: flex;
  align-items: center;
  gap: 6px;
  justify-self: end;
  max-width: min(
    calc(
      100% - var(--pnw-page-header-title-min-width, 112px)
      - var(--pnw-page-header-gap, 8px)
    ),
    720px
  );
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-inline: contain;
  scrollbar-width: thin;
  white-space: nowrap;
}

.pnw-head-help {
  display: flex;
  align-items: center;
}

.pnw-head-presentation-action {
  width: 28px;
  height: 28px;
  display: inline-grid;
  place-items: center;
  flex: 0 0 28px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 5px;
  background: transparent;
  color: var(
    --pnw-workbench-muted,
    var(--pnw-workbench-default-muted, var(--muted, #64748b))
  );
  cursor: pointer;
}

.pnw-head-presentation-action:hover:not(:disabled) {
  background: var(--pnw-control-hover-bg, rgb(148 163 184 / 16%));
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
}

.pnw-head-presentation-action:focus-visible {
  outline: 2px solid var(--pnw-control-active-text, #2563eb);
  outline-offset: 1px;
}

.pnw-head-presentation-action:disabled {
  cursor: default;
  opacity: 0.45;
}

@container pnw-workbench (max-width: 840px) {
  .pnw-head-row { gap: 6px; }
  .pnw-head-subtitle { display: none; }
}
</style>
