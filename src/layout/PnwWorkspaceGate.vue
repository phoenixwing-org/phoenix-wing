<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { PnwLocale } from "../types/PnwLocale.js";
import type { PnwColorScheme } from "../utils/pnwColorScheme.js";
import type {
  PnwRecentWorkspaceEntry,
  PnwWorkspaceEntryPolicy,
  PnwWorkspaceGateActionPlacement,
  PnwWorkspaceGateMode,
  PnwWorkspaceState,
} from "../types/PnwWorkspace.js";
import { usePnwLocale } from "../composables/usePnwLocale.js";
import { pnwResolveWorkspaceGate } from "../utils/pnwWorkspaceGate.js";
import PnwWorkspaceWelcome from "./PnwWorkspaceWelcome.vue";

const props = withDefaults(defineProps<{
  state: PnwWorkspaceState;
  policy?: PnwWorkspaceEntryPolicy;
  mode?: PnwWorkspaceGateMode;
  defaultMode?: PnwWorkspaceGateMode;
  appTitle?: string;
  productSubtitle?: string;
  heading?: string;
  description?: string;
  openLabel?: string;
  recentTitle?: string;
  returnLabel?: string;
  closeWorkspaceLabel?: string;
  continueWithoutWorkspaceLabel?: string;
  busyWorkspaceId?: string;
  disabled?: boolean;
  removable?: boolean;
  showRootPath?: boolean;
  showCurrentWorkspace?: boolean;
  showRail?: boolean;
  showCloseWorkspaceAction?: boolean;
  actionPlacement?: PnwWorkspaceGateActionPlacement;
  recentCollapsible?: boolean;
  recentDefaultOpen?: boolean;
  recentOpen?: boolean;
  colorScheme?: PnwColorScheme;
  locale?: PnwLocale;
}>(), {
  policy: "required",
  mode: undefined,
  defaultMode: "welcome",
  appTitle: "Phoenix",
  productSubtitle: "",
  heading: "",
  description: "",
  openLabel: "",
  recentTitle: "",
  returnLabel: "",
  closeWorkspaceLabel: "",
  continueWithoutWorkspaceLabel: "",
  busyWorkspaceId: undefined,
  disabled: false,
  removable: true,
  showRootPath: true,
  showCurrentWorkspace: true,
  showRail: true,
  showCloseWorkspaceAction: true,
  actionPlacement: "auto",
  recentCollapsible: false,
  recentDefaultOpen: true,
  recentOpen: undefined,
  colorScheme: undefined,
  locale: undefined,
});

const emit = defineEmits<{
  "update:mode": [mode: PnwWorkspaceGateMode];
  openWorkspace: [];
  openRecent: [entry: PnwRecentWorkspaceEntry];
  removeRecent: [entry: PnwRecentWorkspaceEntry];
  closeWorkspace: [];
  returnWorkbench: [];
  continueWithoutWorkspace: [];
  "update:recentOpen": [open: boolean];
}>();

const { t: pnwT } = usePnwLocale(() => props.locale);
const pnwInternalMode = ref<PnwWorkspaceGateMode>(props.defaultMode);
const pnwPendingEnterAfterOpen = ref(false);
const pnwPreviousWorkspaceId = ref(props.state.current?.workspaceId);

const pnwRequestedMode = computed(() => props.mode ?? pnwInternalMode.value);
const pnwResolution = computed(() => pnwResolveWorkspaceGate({
  state: props.state,
  policy: props.policy,
  requestedMode: pnwRequestedMode.value,
}));
const pnwReturnLabel = computed(() => props.returnLabel || pnwT("workspace.gate.return"));
const pnwCloseWorkspaceLabel = computed(() => (
  props.closeWorkspaceLabel || pnwT("workspace.gate.closeWorkspace")
));
const pnwContinueLabel = computed(() => (
  props.continueWithoutWorkspaceLabel || pnwT("workspace.gate.continueWithoutWorkspace")
));
const pnwEffectiveActionPlacement = computed<Exclude<PnwWorkspaceGateActionPlacement, "auto">>(() => {
  if (props.actionPlacement === "none") return "none";
  if (props.actionPlacement === "head") return "head";
  if (props.actionPlacement === "rail" && props.showRail) return "rail";
  return props.showRail ? "rail" : "head";
});

function pnwSetMode(mode: PnwWorkspaceGateMode): void {
  if (props.mode === undefined) pnwInternalMode.value = mode;
  emit("update:mode", mode);
}

function pnwShowWelcome(): void {
  pnwPendingEnterAfterOpen.value = false;
  pnwSetMode("welcome");
}

function pnwEnterWorkbench(): void {
  if (!pnwResolution.value.canEnterWorkbench) return;
  pnwPendingEnterAfterOpen.value = false;
  pnwSetMode("workbench");
  emit("returnWorkbench");
}

function pnwContinueWithoutWorkspace(): void {
  if (props.policy !== "optional" || props.state.current) return;
  pnwSetMode("workbench");
  emit("continueWithoutWorkspace");
}

function pnwRequestOpenWorkspace(): void {
  pnwPendingEnterAfterOpen.value = true;
  emit("openWorkspace");
}

function pnwRequestOpenRecent(entry: PnwRecentWorkspaceEntry): void {
  emit("openRecent", entry);
  if (entry.workspaceId === props.state.current?.workspaceId && props.state.phase === "open") {
    pnwEnterWorkbench();
    return;
  }
  pnwPendingEnterAfterOpen.value = true;
}

function pnwRequestRemoveRecent(entry: PnwRecentWorkspaceEntry): void {
  emit("removeRecent", entry);
}

function pnwRequestCloseWorkspace(): void {
  emit("closeWorkspace");
}

watch(
  () => [props.state.current?.workspaceId, props.state.phase] as const,
  ([workspaceId, phase]) => {
    if (pnwPreviousWorkspaceId.value && !workspaceId) {
      pnwPendingEnterAfterOpen.value = false;
      pnwSetMode("welcome");
    }

    if (pnwPendingEnterAfterOpen.value && workspaceId && phase === "open") {
      pnwPendingEnterAfterOpen.value = false;
      pnwSetMode("workbench");
    }

    pnwPreviousWorkspaceId.value = workspaceId;
  },
);

defineExpose({
  showWelcome: pnwShowWelcome,
  showWorkbench: pnwEnterWorkbench,
});
</script>

<template>
  <div
    class="pnw-workspace-gate"
    :class="`pnw-workspace-gate--${pnwResolution.mode}`"
    data-pnw-workspace-gate
    :data-pnw-workspace-gate-mode="pnwResolution.mode"
    :data-pnw-workspace-policy="policy"
  >
    <PnwWorkspaceWelcome
      v-if="pnwResolution.mode === 'welcome'"
      :state="state"
      :app-title="appTitle"
      :product-subtitle="productSubtitle"
      :heading="heading"
      :description="description"
      :open-label="openLabel"
      :recent-title="recentTitle"
      :busy-workspace-id="busyWorkspaceId"
      :disabled="disabled"
      :removable="removable"
      :show-root-path="showRootPath"
      :show-current-workspace="showCurrentWorkspace"
      :show-rail="showRail"
      :recent-collapsible="recentCollapsible"
      :recent-default-open="recentDefaultOpen"
      :recent-open="recentOpen"
      :color-scheme="colorScheme"
      :locale="locale"
      @open-workspace="pnwRequestOpenWorkspace"
      @open-recent="pnwRequestOpenRecent"
      @remove-recent="pnwRequestRemoveRecent"
      @update:recent-open="emit('update:recentOpen', $event)"
    >
      <template v-if="$slots.brand" #brand>
        <slot name="brand" />
      </template>
      <template v-if="$slots['brand-mark']" #brand-mark>
        <slot name="brand-mark" />
      </template>
      <template v-if="$slots['open-action']" #open-action="slotProps">
        <slot name="open-action" v-bind="slotProps" />
      </template>
      <template v-if="$slots['secondary-actions']" #secondary-actions>
        <slot
          name="secondary-actions"
          :state="state"
          :gate="pnwResolution"
          :show-welcome="pnwShowWelcome"
          :enter-workbench="pnwEnterWorkbench"
          :close-workspace="pnwRequestCloseWorkspace"
          :continue-without-workspace="pnwContinueWithoutWorkspace"
        />
      </template>
      <template #rail-actions>
        <slot
          name="rail-actions"
          :state="state"
          :gate="pnwResolution"
          :show-welcome="pnwShowWelcome"
          :enter-workbench="pnwEnterWorkbench"
          :close-workspace="pnwRequestCloseWorkspace"
          :continue-without-workspace="pnwContinueWithoutWorkspace"
        />
        <div
          v-if="pnwEffectiveActionPlacement === 'rail'"
          class="pnw-workspace-gate-actions pnw-workspace-gate-actions--rail"
          data-pnw-workspace-gate-actions="rail"
        >
          <button
            v-if="pnwResolution.canReturnToWorkbench"
            class="pnw-workspace-entry-action pnw-workspace-gate-entry-action"
            type="button"
            :disabled="disabled"
            @click="pnwEnterWorkbench"
          >
            {{ pnwReturnLabel }}
          </button>
          <button
            v-if="pnwResolution.hasWorkspace && showCloseWorkspaceAction"
            class="pnw-workspace-entry-action pnw-workspace-gate-entry-action pnw-workspace-gate-entry-action--close"
            type="button"
            :disabled="disabled || state.phase !== 'open'"
            @click="pnwRequestCloseWorkspace"
          >
            {{ pnwCloseWorkspaceLabel }}
          </button>
          <button
            v-else-if="policy === 'optional'"
            class="pnw-workspace-entry-action pnw-workspace-gate-entry-action"
            type="button"
            :disabled="disabled"
            @click="pnwContinueWithoutWorkspace"
          >
            {{ pnwContinueLabel }}
          </button>
        </div>
      </template>
      <template v-if="$slots.links" #links>
        <slot name="links" />
      </template>
      <template v-if="$slots.title" #title>
        <slot name="title" />
      </template>
      <template #head-actions>
        <slot
          name="head-actions"
          :state="state"
          :gate="pnwResolution"
          :show-welcome="pnwShowWelcome"
          :enter-workbench="pnwEnterWorkbench"
          :close-workspace="pnwRequestCloseWorkspace"
          :continue-without-workspace="pnwContinueWithoutWorkspace"
        />
        <div
          v-if="pnwEffectiveActionPlacement === 'head'"
          class="pnw-workspace-gate-actions pnw-workspace-gate-actions--head"
          data-pnw-workspace-gate-actions="head"
        >
          <button
            v-if="pnwResolution.canReturnToWorkbench"
            class="pnw-workspace-entry-action pnw-workspace-gate-entry-action"
            type="button"
            :disabled="disabled"
            @click="pnwEnterWorkbench"
          >
            {{ pnwReturnLabel }}
          </button>
          <button
            v-if="pnwResolution.hasWorkspace && showCloseWorkspaceAction"
            class="pnw-workspace-entry-action pnw-workspace-gate-entry-action pnw-workspace-gate-entry-action--close"
            type="button"
            :disabled="disabled || state.phase !== 'open'"
            @click="pnwRequestCloseWorkspace"
          >
            {{ pnwCloseWorkspaceLabel }}
          </button>
          <button
            v-else-if="policy === 'optional'"
            class="pnw-workspace-entry-action pnw-workspace-gate-entry-action"
            type="button"
            :disabled="disabled"
            @click="pnwContinueWithoutWorkspace"
          >
            {{ pnwContinueLabel }}
          </button>
        </div>
      </template>
      <template v-if="$slots['welcome-main']" #main="slotProps">
        <slot
          name="welcome-main"
          v-bind="slotProps"
          :gate="pnwResolution"
          :enter-workbench="pnwEnterWorkbench"
          :close-workspace="pnwRequestCloseWorkspace"
          :continue-without-workspace="pnwContinueWithoutWorkspace"
        />
      </template>
      <template v-if="$slots.description" #description>
        <slot name="description" />
      </template>
      <template v-if="$slots.current" #current="slotProps">
        <slot name="current" v-bind="slotProps" />
      </template>
      <template v-if="$slots['before-recent']" #before-recent>
        <slot name="before-recent" />
      </template>
      <template v-if="$slots['recent-title']" #recent-title>
        <slot name="recent-title" />
      </template>
      <template v-if="$slots['entry-name']" #entry-name="slotProps">
        <slot name="entry-name" v-bind="slotProps" />
      </template>
      <template v-if="$slots['entry-path']" #entry-path="slotProps">
        <slot name="entry-path" v-bind="slotProps" />
      </template>
      <template v-if="$slots['entry-badges']" #entry-badges="slotProps">
        <slot name="entry-badges" v-bind="slotProps" />
      </template>
      <template v-if="$slots['entry-meta']" #entry-meta="slotProps">
        <slot name="entry-meta" v-bind="slotProps" />
      </template>
      <template v-if="$slots['entry-actions']" #entry-actions="slotProps">
        <slot name="entry-actions" v-bind="slotProps" />
      </template>
      <template v-if="$slots.empty" #empty>
        <slot name="empty" />
      </template>
      <template v-if="$slots['after-recent']" #after-recent>
        <slot name="after-recent" />
      </template>
    </PnwWorkspaceWelcome>

    <slot
      v-else
      name="workbench"
      :state="state"
      :gate="pnwResolution"
      :show-welcome="pnwShowWelcome"
      :close-workspace="pnwRequestCloseWorkspace"
    >
      <slot
        :state="state"
        :gate="pnwResolution"
        :show-welcome="pnwShowWelcome"
        :close-workspace="pnwRequestCloseWorkspace"
      />
    </slot>
  </div>
</template>

<style scoped>
.pnw-workspace-gate {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.pnw-workspace-gate--welcome {
  overflow: hidden;
}

.pnw-workspace-gate-entry-action {
  flex: none;
}

.pnw-workspace-gate-actions {
  display: flex;
  gap: 8px;
}

.pnw-workspace-gate-actions--rail {
  width: 100%;
  flex-direction: column;
  margin-top: max(
    0px,
    calc(
      var(--pnw-workspace-gate-lifecycle-separation, 18px)
      - var(--pnw-workspace-rail-action-gap, 8px)
    )
  );
}

.pnw-workspace-gate-actions--head {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.pnw-workspace-gate-actions--head .pnw-workspace-gate-entry-action {
  width: auto;
  min-height: 34px;
  padding-inline: 10px;
}

.pnw-workspace-gate-entry-action--close {
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  font-weight: 500;
}

.pnw-workspace-gate-entry-action--close:hover:not(:disabled) {
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
}

</style>
