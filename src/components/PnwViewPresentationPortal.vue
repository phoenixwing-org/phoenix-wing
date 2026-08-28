<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  watch,
  watchPostEffect,
} from "vue";
import type {
  PnwViewPresentationPortalHandle,
  PnwViewPresentationLeaseHandle,
  PnwViewPresentationLeaseRegistry,
  PnwViewPresentationRecord,
  PnwViewPresentationRuntimeTargets,
} from "../types/PnwViewPresentation.js";
import type { PnwPresentationFrameDefinition } from "../types/PnwPresentationFrame.js";
import type { PnwFloatingPanelPosition } from "../utils/pnwFloatingPanel.js";
import type { PnwFloatingPanelBounds, PnwFloatingPanelSize } from "../utils/pnwFloatingPanel.js";
import type { PnwColorScheme } from "../utils/pnwColorScheme.js";
import type { PnwWorkbenchOverlayLayer } from "../utils/pnwOverlayStacking.js";
import type { PnwFloatingWindowStackController } from "../utils/pnwFloatingWindowStack.js";
import { pnwReduceViewPresentationRecord } from "../utils/pnwViewPresentation.js";
import { pnwResolvePresentationFrameDefinition } from "../utils/pnwPresentationFrame.js";
import { pnwGetDocumentViewPresentationLeaseRegistry } from "../utils/pnwViewPresentationLease.js";
import { usePnwLocale } from "../composables/usePnwLocale.js";
import { usePnwViewPresentationContext } from "../composables/usePnwViewPresentationContext.js";
import PnwFloatingPanel from "./PnwFloatingPanel.vue";
import PnwIcon from "./PnwIcon.vue";

const props = withDefaults(defineProps<{
  record: PnwViewPresentationRecord;
  title: string;
  ariaLabel?: string;
  panelClass?: string;
  closeOnEscape?: boolean;
  /** 显示真正的关闭 View 动作；Host 必须处理 requestClose 与保存守卫。 */
  showCloseAction?: boolean;
  layer?: PnwWorkbenchOverlayLayer;
  zIndex?: number;
  colorScheme?: PnwColorScheme;
  frame?: PnwPresentationFrameDefinition;
  stack?: PnwFloatingWindowStackController;
  /** Host 可注入跨 Portal 的 lease registry；缺省使用当前 Document registry。 */
  leaseRegistry?: PnwViewPresentationLeaseRegistry;
}>(), {
  ariaLabel: "",
  panelClass: "",
  closeOnEscape: true,
  showCloseAction: false,
  layer: "presentation",
});

const emit = defineEmits<{
  "update:record": [record: PnwViewPresentationRecord];
  "update:dialogPosition": [position: PnwFloatingPanelPosition];
  "update:dialogSize": [size: PnwFloatingPanelSize];
  "update:dialogBounds": [bounds: PnwFloatingPanelBounds];
  targetsReady: [targets: PnwViewPresentationRuntimeTargets];
  detached: [viewInstanceId: string, revision: number];
  reattached: [viewInstanceId: string, revision: number];
  focus: [viewInstanceId: string];
  activate: [presentationId: string];
  resetToRecommendedSize: [size: PnwFloatingPanelSize];
  requestClose: [viewInstanceId: string];
}>();

const pnwFloatingPanel = ref<InstanceType<typeof PnwFloatingPanel>>();
const { t: pnwT } = usePnwLocale();
const pnwPresentationContext = usePnwViewPresentationContext();
const pnwHeaderAnchor = ref<HTMLElement>();
const pnwMainAnchor = ref<HTMLElement>();
const pnwHeaderTarget = ref<HTMLElement>();
const pnwMainTarget = ref<HTMLElement>();
const pnwHeaderFrame = ref<HTMLElement>();
const pnwMainFrame = ref<HTMLElement>();
const pnwLastReadyRevision = ref(-1);
const pnwLastReturnedRevision = ref(-1);
const pnwOpeningRevision = ref(-1);
const pnwCommittedRevision = ref(-1);
let pnwLease: PnwViewPresentationLeaseHandle | undefined;

const pnwPanelOpen = computed(() => props.record.mode !== "embedded");
const pnwHasContributedHeader = computed(() => (
  (pnwPresentationContext?.headerChannel.registeredCount.value ?? 0) > 0
));
const pnwTargetsReady = computed(() => Boolean(pnwHeaderTarget.value && pnwMainTarget.value));
const pnwTeleportEnabled = computed(() => (
  props.record.mode === "floating" && pnwTargetsReady.value
));
const pnwHeaderDestination = computed(() => pnwHeaderTarget.value ?? "body");
const pnwMainDestination = computed(() => pnwMainTarget.value ?? "body");
const pnwFrame = computed(() => pnwResolvePresentationFrameDefinition(props.frame, "view"));
const pnwPanelClass = computed(() => [
  "pnw-view-presentation-dialog",
  props.record.mode === "floating" && pnwCommittedRevision.value === props.record.revision
    ? "pnw-view-presentation-dialog--committed"
    : "pnw-view-presentation-dialog--preparing",
  props.panelClass,
].filter(Boolean).join(" "));

function pnwReleaseLease(): void {
  pnwLease?.release();
  pnwLease = undefined;
  pnwCommittedRevision.value = -1;
}

function pnwCommitLease(targets: PnwViewPresentationRuntimeTargets): boolean {
  if (pnwLease?.revision !== targets.revision) pnwReleaseLease();
  if (!pnwLease) {
    const registry = props.leaseRegistry
      ?? pnwGetDocumentViewPresentationLeaseRegistry(targets.headerTarget.ownerDocument);
    pnwLease = registry.acquire({
      viewInstanceId: targets.viewInstanceId,
      revision: targets.revision,
      ownerAlive: true,
    });
  }
  return pnwLease.commit(targets);
}

function pnwUpdate(next: PnwViewPresentationRecord): void {
  if (next !== props.record) emit("update:record", next);
}

function pnwDetach(): void {
  pnwUpdate(pnwReduceViewPresentationRecord(props.record, { type: "detach" }));
}

function pnwFocus(): void {
  pnwFloatingPanel.value?.focus();
  emit("focus", props.record.identity.viewInstanceId);
}

function pnwReattach(): void {
  pnwUpdate(pnwReduceViewPresentationRecord(props.record, { type: "reattach" }));
}

function pnwHandlePanelClose(): void {
  if (props.showCloseAction) {
    emit("requestClose", props.record.identity.viewInstanceId);
    return;
  }
  pnwReattach();
}

function pnwResetToRecommendedSize(): void {
  pnwFloatingPanel.value?.resetToRecommendedSize();
}

function pnwUpdateBounds(bounds: PnwFloatingPanelBounds): void {
  const positioned = pnwReduceViewPresentationRecord(props.record, {
    type: "set-dialog-position",
    position: bounds.position,
  });
  const sized = pnwReduceViewPresentationRecord(positioned, {
    type: "set-dialog-size",
    size: bounds.size,
  });
  pnwUpdate(sized);
  emit("update:dialogPosition", bounds.position);
  emit("update:dialogSize", bounds.size);
  emit("update:dialogBounds", bounds);
}

watchPostEffect(() => {
  const headerTarget = pnwHeaderTarget.value;
  const mainTarget = pnwMainTarget.value;
  if (
    props.record.mode !== "opening"
    || !headerTarget
    || !mainTarget
    || pnwLastReadyRevision.value === props.record.revision
  ) return;
  pnwLastReadyRevision.value = props.record.revision;
  const targets: PnwViewPresentationRuntimeTargets = {
    viewInstanceId: props.record.identity.viewInstanceId,
    revision: props.record.revision,
    headerTarget,
    mainTarget,
  };
  emit("targetsReady", targets);
  pnwOpeningRevision.value = props.record.revision;
  pnwUpdate(pnwReduceViewPresentationRecord(props.record, {
    type: "targets-ready",
    revision: props.record.revision,
  }));
});

watch(
  pnwHeaderTarget,
  (target) => pnwPresentationContext?.headerChannel.attachTarget(target),
  { flush: "post", immediate: true },
);

async function pnwCommitTransferredFrames(): Promise<void> {
  await nextTick();
  const headerTarget = pnwHeaderTarget.value;
  const mainTarget = pnwMainTarget.value;
  const headerFrame = pnwHeaderFrame.value;
  const mainFrame = pnwMainFrame.value;
  if (
    props.record.mode !== "floating"
    || !headerTarget
    || !mainTarget
    || !headerFrame
    || !mainFrame
    || !headerTarget.contains(headerFrame)
    || !mainTarget.contains(mainFrame)
    || pnwCommittedRevision.value === props.record.revision
  ) return;
  const targets: PnwViewPresentationRuntimeTargets = {
    viewInstanceId: props.record.identity.viewInstanceId,
    revision: props.record.revision,
    headerTarget,
    mainTarget,
  };
  // HMR/runtime 重建可能直接从 persisted floating record 开始；同样重新认领 generation。
  if (!pnwCommitLease(targets)) return;
  pnwCommittedRevision.value = props.record.revision;
  if (pnwLastReadyRevision.value !== props.record.revision) {
    pnwLastReadyRevision.value = props.record.revision;
    emit("targetsReady", targets);
  }
  if (pnwOpeningRevision.value === props.record.revision) {
    pnwOpeningRevision.value = -1;
    emit("detached", props.record.identity.viewInstanceId, props.record.revision);
  }
}

watch(
  () => [
    props.record.mode,
    props.record.revision,
    pnwHeaderTarget.value,
    pnwMainTarget.value,
    pnwHeaderFrame.value,
    pnwMainFrame.value,
  ],
  () => { void pnwCommitTransferredFrames(); },
  { flush: "post", immediate: true },
);

watchPostEffect(() => {
  const headerFrame = pnwHeaderFrame.value;
  const mainFrame = pnwMainFrame.value;
  if (
    props.record.mode !== "reattaching"
    || pnwLastReturnedRevision.value === props.record.revision
    || !headerFrame
    || !mainFrame
    || !pnwHeaderAnchor.value?.contains(headerFrame)
    || !pnwMainAnchor.value?.contains(mainFrame)
  ) return;
  pnwLastReturnedRevision.value = props.record.revision;
  pnwReleaseLease();
  pnwUpdate(pnwReduceViewPresentationRecord(props.record, {
    type: "frames-returned",
    revision: props.record.revision,
  }));
  emit("reattached", props.record.identity.viewInstanceId, props.record.revision);
  pnwHeaderAnchor.value?.focus({ preventScroll: true });
});

watchPostEffect(() => {
  if (props.record.mode === "embedded") pnwReleaseLease();
});

onBeforeUnmount(() => {
  pnwReleaseLease();
  const context = pnwPresentationContext;
  if (context && context.headerChannel.target.value === pnwHeaderTarget.value) {
    context.headerChannel.attachTarget(undefined);
  }
});

defineExpose<PnwViewPresentationPortalHandle>({
  detach: pnwDetach,
  focus: pnwFocus,
  reattach: pnwReattach,
  resetToRecommendedSize: pnwResetToRecommendedSize,
});
</script>

<template>
  <div
    class="pnw-view-presentation-portal"
    :data-pnw-view-instance-id="record.identity.viewInstanceId"
    :data-pnw-view-presentation-mode="record.mode"
  >
    <div
      ref="pnwHeaderAnchor"
      class="pnw-view-presentation-portal__header-anchor"
      tabindex="-1"
    >
      <Teleport :to="pnwHeaderDestination" :disabled="!pnwTeleportEnabled">
        <div
          ref="pnwHeaderFrame"
          class="pnw-view-presentation-portal__header-frame"
          :class="{
            'pnw-view-presentation-portal__header-frame--empty': pnwHasContributedHeader,
          }"
        >
          <slot
            v-if="!pnwHasContributedHeader"
            name="header"
            :mode="record.mode"
            :detach="pnwDetach"
            :focus="pnwFocus"
            :reattach="pnwReattach"
          >
            <strong
              v-if="pnwPanelOpen"
              class="pnw-view-presentation-dialog__title"
            >{{ title }}</strong>
          </slot>
        </div>
      </Teleport>
    </div>

    <div ref="pnwMainAnchor" class="pnw-view-presentation-portal__main-anchor">
      <Teleport :to="pnwMainDestination" :disabled="!pnwTeleportEnabled">
        <div ref="pnwMainFrame" class="pnw-view-presentation-portal__main-frame">
          <slot
            name="main"
            :mode="record.mode"
            :detach="pnwDetach"
            :focus="pnwFocus"
            :reattach="pnwReattach"
          >
            <slot />
          </slot>
        </div>
      </Teleport>
    </div>
  </div>

  <PnwFloatingPanel
    ref="pnwFloatingPanel"
    :open="pnwPanelOpen"
    :position="record.dialogPosition"
    :size="record.dialogSize"
    :movable="pnwFrame.movable"
    :resizable="pnwFrame.resizable"
    :recommended-size="pnwFrame.recommendedSize"
    :remember-bounds="pnwFrame.rememberBounds"
    :min-size="pnwFrame.minSize"
    :max-size="pnwFrame.maxSize"
    :presentation-id="record.identity.viewInstanceId"
    owner-kind="view"
    :request-reattach="pnwReattach"
    :stack="stack"
    :title="title"
    :aria-label="ariaLabel || title"
    :panel-class="pnwPanelClass"
    :close-on-escape="closeOnEscape"
    :show-close-action="showCloseAction"
    :close-label="pnwT('viewPresentation.close')"
    :layer="layer"
    :z-index="zIndex"
    :color-scheme="colorScheme"
    @update:bounds="pnwUpdateBounds"
    @activate="emit('activate', $event)"
    @reset-to-recommended-size="emit('resetToRecommendedSize', $event)"
    @close="pnwHandlePanelClose"
  >
    <template #header>
      <div
        ref="pnwHeaderTarget"
        class="pnw-view-presentation-dialog__header-target"
        data-pnw-view-presentation-header-target
      />
    </template>
    <template #actions>
      <button
        type="button"
        class="pnw-view-presentation-dialog__reattach"
        :title="pnwT('viewPresentation.reattach')"
        :aria-label="pnwT('viewPresentation.reattach')"
        @pointerdown.stop
        @click="pnwReattach"
      >
        <PnwIcon name="window-reattach" :size="16" />
      </button>
    </template>
    <div
      ref="pnwMainTarget"
      class="pnw-view-presentation-dialog__main-target"
      data-pnw-view-presentation-main-target
    />
  </PnwFloatingPanel>
</template>

<style scoped>
.pnw-view-presentation-portal,
.pnw-view-presentation-portal__header-frame,
.pnw-view-presentation-portal__main-frame {
  min-width: 0;
}

.pnw-view-presentation-portal {
  min-height: 0;
}

:global(.pnw-view-presentation-dialog .pnw-floating-panel__header) {
  min-height: var(--pnw-view-presentation-header-min-height, 40px);
  gap: var(--pnw-view-presentation-header-gap, 8px);
  padding: 0 var(--pnw-view-presentation-header-padding-inline, 8px);
}

.pnw-view-presentation-dialog__reattach {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.pnw-view-presentation-dialog__reattach:hover {
  background: var(--pnw-control-hover-bg, rgba(148, 163, 184, 0.16));
}

.pnw-view-presentation-dialog__reattach:focus-visible {
  outline: 2px solid var(--pnw-focus-ring, var(--pnw-workbench-default-focus, #3b82f6));
  outline-offset: -2px;
}

:global(.pnw-view-presentation-dialog--preparing) {
  visibility: hidden;
  pointer-events: none;
}

.pnw-view-presentation-dialog__header-target {
  flex: 1 1 0;
  width: 0;
  max-width: 100%;
  min-width: 0;
  min-height: var(--pnw-view-presentation-header-min-height, 40px);
  display: flex;
  align-items: center;
  overflow: hidden;
}

.pnw-view-presentation-dialog__title,
.pnw-view-presentation-portal__header-frame {
  min-width: 0;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pnw-view-presentation-portal__header-frame--empty {
  display: none;
}

.pnw-view-presentation-dialog__main-target {
  min-width: 0;
  min-height: 0;
  height: 100%;
}
</style>
