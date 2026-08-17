<script setup lang="ts">
import { computed, getCurrentInstance, ref } from "vue";
import type { PnwLocale } from "../types/PnwLocale.js";
import type { PnwColorScheme } from "../utils/pnwColorScheme.js";
import type {
  PnwRecentWorkspaceEntry,
  PnwWorkspaceState,
} from "../types/PnwWorkspace.js";
import { usePnwLocale } from "../composables/usePnwLocale.js";
import { usePnwOverlayTheme } from "../composables/usePnwOverlayTheme.js";
import PnwPhoenixWingMark from "../components/PnwPhoenixWingMark.vue";
import PnwIcon from "../components/PnwIcon.vue";
import PnwRecentWorkspaceList from "../components/PnwRecentWorkspaceList.vue";
import PnwWelcomeShell from "./PnwWelcomeShell.vue";

const props = withDefaults(defineProps<{
  state: PnwWorkspaceState;
  appTitle?: string;
  productSubtitle?: string;
  heading?: string;
  description?: string;
  openLabel?: string;
  recentTitle?: string;
  busyWorkspaceId?: string;
  disabled?: boolean;
  removable?: boolean;
  showRootPath?: boolean;
  showCurrentWorkspace?: boolean;
  showRail?: boolean;
  recentCollapsible?: boolean;
  recentDefaultOpen?: boolean;
  recentOpen?: boolean;
  colorScheme?: PnwColorScheme;
  locale?: PnwLocale;
}>(), {
  appTitle: "Phoenix",
  productSubtitle: "",
  heading: "",
  description: "",
  openLabel: "",
  recentTitle: "",
  busyWorkspaceId: undefined,
  disabled: false,
  removable: true,
  showRootPath: true,
  showCurrentWorkspace: true,
  showRail: true,
  recentCollapsible: false,
  recentDefaultOpen: true,
  recentOpen: undefined,
  colorScheme: undefined,
  locale: undefined,
});

const emit = defineEmits<{
  openWorkspace: [];
  openRecent: [entry: PnwRecentWorkspaceEntry];
  removeRecent: [entry: PnwRecentWorkspaceEntry];
  "update:recentOpen": [open: boolean];
}>();

const { t: pnwT } = usePnwLocale(() => props.locale);
const pnwResolvedColorScheme = usePnwOverlayTheme(() => props.colorScheme);
const pnwInternalRecentOpen = ref(props.recentDefaultOpen);
const pnwRecentOpen = computed(() => (
  props.recentCollapsible ? (props.recentOpen ?? pnwInternalRecentOpen.value) : true
));
const pnwRecentContentId = `pnw-workspace-recent-${getCurrentInstance()?.uid ?? 0}`;
const pnwIsTransitioning = computed(() => props.state.phase !== "closed" && props.state.phase !== "open");
const pnwIsOpening = computed(() => (
  props.state.phase === "opening"
  || props.state.phase === "opening-target"
  || props.state.phase === "preparing-switch"
));
const pnwActionsDisabled = computed(() => props.disabled || pnwIsTransitioning.value);
const pnwHeading = computed(() => props.heading || pnwT("workspace.welcome.title", {
  app: props.appTitle,
}));
const pnwDescription = computed(() => props.description || pnwT("workspace.welcome.description"));
const pnwOpenLabel = computed(() => {
  if (pnwIsOpening.value) return pnwT("workspace.welcome.opening");
  return props.openLabel || pnwT("workspace.welcome.open");
});
const pnwRecentTitle = computed(() => props.recentTitle || pnwT("workspace.welcome.recent"));

function pnwEmitOpenWorkspace(): void {
  emit("openWorkspace");
}

function pnwEmitOpenRecent(entry: PnwRecentWorkspaceEntry): void {
  emit("openRecent", entry);
}

function pnwEmitRemoveRecent(entry: PnwRecentWorkspaceEntry): void {
  emit("removeRecent", entry);
}

function pnwToggleRecent(): void {
  if (!props.recentCollapsible) return;
  const next = !pnwRecentOpen.value;
  if (props.recentOpen === undefined) pnwInternalRecentOpen.value = next;
  emit("update:recentOpen", next);
}
</script>

<template>
  <PnwWelcomeShell
    class="pnw-workspace-welcome pnw-workbench-theme-root"
    data-pnw-workspace-welcome
    :data-pnw-color-scheme="pnwResolvedColorScheme"
    :app-title="appTitle"
    :show-rail="showRail"
  >
    <template #brand>
      <slot name="brand">
        <div class="pnw-workspace-welcome-brand">
          <slot name="brand-mark">
            <span class="pnw-workspace-welcome-mark">
              <PnwPhoenixWingMark decorative />
            </span>
          </slot>
          <span class="pnw-workspace-welcome-brand-copy">
            <strong :title="appTitle">{{ appTitle }}</strong>
            <small v-if="productSubtitle" :title="productSubtitle">{{ productSubtitle }}</small>
          </span>
        </div>
      </slot>
    </template>

    <template #actions>
      <div class="pnw-workspace-welcome-action-stack">
        <slot
          name="open-action"
          :disabled="pnwActionsDisabled"
          :opening="pnwIsOpening"
          :open="() => emit('openWorkspace')"
        >
          <button
            class="pnw-workspace-entry-action pnw-workspace-welcome-open"
            type="button"
            :disabled="pnwActionsDisabled"
            @click="emit('openWorkspace')"
          >
            {{ pnwOpenLabel }}
          </button>
        </slot>
        <div
          v-if="$slots['secondary-actions']"
          class="pnw-workspace-welcome-secondary-actions"
          data-pnw-workspace-secondary-actions
        >
          <slot name="secondary-actions" />
        </div>
        <div
          v-if="$slots['rail-actions']"
          class="pnw-workspace-welcome-legacy-actions"
          data-pnw-workspace-legacy-actions
        >
          <slot name="rail-actions" />
        </div>
      </div>
    </template>

    <template #links>
      <slot name="links" />
    </template>

    <template #title>
      <slot name="title">{{ pnwHeading }}</slot>
    </template>

    <template #headActions>
      <slot name="head-actions" />
    </template>

    <template #main>
      <slot
        name="main"
        :state="state"
        :disabled="pnwActionsDisabled"
        :open-workspace="pnwEmitOpenWorkspace"
        :open-recent="pnwEmitOpenRecent"
        :remove-recent="pnwEmitRemoveRecent"
      >
        <div class="pnw-workspace-welcome-copy">
          <slot name="description">
            <p class="pnw-workspace-welcome-description">{{ pnwDescription }}</p>
          </slot>
          <slot name="current" :workspace="state.current">
            <p v-if="showCurrentWorkspace" class="pnw-workspace-welcome-current">
              <strong v-if="state.current">{{ pnwT("workspace.welcome.current") }}</strong>
              <span :title="state.current?.rootPath" dir="auto">
                {{ state.current?.rootPath ?? pnwT("workspace.welcome.noCurrent") }}
              </span>
            </p>
          </slot>
        </div>

        <slot name="before-recent" />

        <section
          class="pnw-workspace-welcome-recent"
          :class="{ 'pnw-workspace-welcome-recent--collapsible': recentCollapsible }"
          :aria-label="pnwRecentTitle"
        >
          <h2 v-if="!recentCollapsible" class="pnw-workspace-welcome-recent-title">
            <slot name="recent-title">{{ pnwRecentTitle }}</slot>
          </h2>
          <button
            v-else
            class="pnw-workspace-welcome-recent-toggle"
            type="button"
            :aria-expanded="pnwRecentOpen"
            :aria-controls="pnwRecentContentId"
            @click="pnwToggleRecent"
          >
            <span><slot name="recent-title">{{ pnwRecentTitle }}</slot></span>
            <PnwIcon
              class="pnw-workspace-welcome-recent-caret"
              :class="{ 'pnw-workspace-welcome-recent-caret--open': pnwRecentOpen }"
              name="chevron-right"
              :size="18"
            />
          </button>
          <PnwRecentWorkspaceList
            v-show="pnwRecentOpen"
            :id="pnwRecentContentId"
            :class="{ 'pnw-recent-workspace-list--block': recentCollapsible }"
            :entries="state.recent"
            :current-workspace-id="state.current?.workspaceId"
            :busy-workspace-id="busyWorkspaceId"
            :disabled="pnwActionsDisabled"
            :removable="removable"
            :show-root-path="showRootPath"
            :locale="locale"
            @open="emit('openRecent', $event)"
            @remove="emit('removeRecent', $event)"
          >
            <template v-if="$slots['entry-name']" #name="slotProps">
              <slot name="entry-name" v-bind="slotProps" />
            </template>
            <template v-if="$slots['entry-path']" #path="slotProps">
              <slot name="entry-path" v-bind="slotProps" />
            </template>
            <template v-if="$slots['entry-badges']" #badges="slotProps">
              <slot name="entry-badges" v-bind="slotProps" />
            </template>
            <template v-if="$slots['entry-meta']" #meta="slotProps">
              <slot name="entry-meta" v-bind="slotProps" />
            </template>
            <template v-if="$slots['entry-actions']" #actions="slotProps">
              <slot name="entry-actions" v-bind="slotProps" />
            </template>
            <template v-if="$slots.empty" #empty>
              <slot name="empty" />
            </template>
          </PnwRecentWorkspaceList>
        </section>

        <slot name="after-recent" />
      </slot>
    </template>
  </PnwWelcomeShell>
</template>

<style src="../styles/pnwWorkbenchTheme.css"></style>

<style scoped>
.pnw-workspace-welcome-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.pnw-workspace-welcome-mark {
  --pnw-phoenix-wing-mark-size: 52px;
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  flex: none;
  border-radius: 14px;
  background: var(--pnw-control-active-bg, var(--pnw-workbench-default-active-bg, rgb(37 99 235 / 10%)));
}

.pnw-workspace-welcome-brand-copy {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.pnw-workspace-welcome-brand-copy strong,
.pnw-workspace-welcome-brand-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pnw-workspace-welcome-brand-copy strong {
  font-size: 1.35rem;
}

.pnw-workspace-welcome-brand-copy small {
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  font-size: 0.82rem;
}

.pnw-workspace-welcome-action-stack,
.pnw-workspace-welcome-secondary-actions,
.pnw-workspace-welcome-legacy-actions {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  gap: var(--pnw-workspace-rail-action-gap, 8px);
}

.pnw-workspace-welcome-action-stack {
  gap: 0;
}

.pnw-workspace-welcome-secondary-actions,
.pnw-workspace-welcome-legacy-actions {
  margin-top: var(--pnw-workspace-rail-action-gap, 8px);
}

.pnw-workspace-welcome-copy {
  display: grid;
  gap: 10px;
  margin-bottom: 28px;
}

.pnw-workspace-welcome-description,
.pnw-workspace-welcome-current {
  margin: 0;
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  line-height: 1.6;
}

.pnw-workspace-welcome-description {
  max-width: 72ch;
}

.pnw-workspace-welcome-current {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 10px;
  min-width: 0;
}

.pnw-workspace-welcome-current span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.pnw-workspace-welcome-recent {
  min-width: 0;
}

.pnw-workspace-welcome-recent--collapsible {
  display: flex;
  width: 100%;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  border-radius: var(--pnw-information-block-radius, 8px);
  background: var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff));
}

.pnw-workspace-welcome-recent-title {
  margin: 0 0 12px;
  font-size: 1rem;
  font-weight: 650;
}

.pnw-workspace-welcome-recent-toggle {
  display: flex;
  width: 100%;
  min-height: 38px;
  margin: 0;
  padding: 8px 12px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--pnw-workbench-text, var(--pnw-workbench-default-text, #0f172a));
  font: inherit;
  font-size: 1rem;
  font-weight: 650;
  text-align: left;
  cursor: pointer;
}

.pnw-workspace-welcome-recent-toggle:hover {
  background: var(--pnw-control-hover-bg, var(--pnw-workbench-default-hover-bg, rgb(59 130 246 / 9%)));
}

.pnw-workspace-welcome-recent-toggle:focus-visible {
  position: relative;
  z-index: 1;
  outline: 2px solid var(--pnw-focus-ring, var(--pnw-workbench-default-focus, #3b82f6));
  outline-offset: -2px;
}

.pnw-workspace-welcome-recent-caret {
  flex: none;
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  transition: transform 120ms ease;
}

.pnw-workspace-welcome-recent-caret--open {
  transform: rotate(90deg);
}
</style>
