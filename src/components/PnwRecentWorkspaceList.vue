<script setup lang="ts">
import type { PnwLocale } from "../types/PnwLocale.js";
import type {
  PnwRecentWorkspaceEntry,
  PnwWorkspaceAvailability,
} from "../types/PnwWorkspace.js";
import { usePnwLocale } from "../composables/usePnwLocale.js";
import PnwIcon from "./PnwIcon.vue";

const props = withDefaults(defineProps<{
  entries: readonly PnwRecentWorkspaceEntry[];
  currentWorkspaceId?: string;
  busyWorkspaceId?: string;
  disabled?: boolean;
  removable?: boolean;
  showRootPath?: boolean;
  locale?: PnwLocale;
}>(), {
  currentWorkspaceId: undefined,
  busyWorkspaceId: undefined,
  disabled: false,
  removable: true,
  showRootPath: true,
  locale: undefined,
});

const emit = defineEmits<{
  open: [entry: PnwRecentWorkspaceEntry];
  remove: [entry: PnwRecentWorkspaceEntry];
}>();

const { t: pnwT } = usePnwLocale(() => props.locale);

function pnwIsCurrentWorkspace(entry: PnwRecentWorkspaceEntry): boolean {
  return entry.workspaceId === props.currentWorkspaceId;
}

function pnwIsWorkspaceBusy(entry: PnwRecentWorkspaceEntry): boolean {
  return entry.workspaceId === props.busyWorkspaceId;
}

function pnwCanOpenWorkspace(entry: PnwRecentWorkspaceEntry): boolean {
  return !props.disabled
    && props.busyWorkspaceId === undefined
    && entry.availability !== "missing"
    && entry.availability !== "unauthorized";
}

function pnwAvailabilityLabel(availability: PnwWorkspaceAvailability): string | undefined {
  if (availability === "missing") return pnwT("workspace.welcome.missingBadge");
  if (availability === "unauthorized") return pnwT("workspace.welcome.unauthorizedBadge");
  if (availability === "unknown") return pnwT("workspace.welcome.unknownBadge");
  return undefined;
}
</script>

<template>
  <div class="pnw-recent-workspace-list">
    <slot v-if="entries.length === 0" name="empty">
      <p class="pnw-recent-workspace-empty" role="status">
        {{ pnwT("workspace.welcome.empty") }}
      </p>
    </slot>

    <article
      v-for="entry in entries"
      v-else
      :key="entry.workspaceId"
      class="pnw-recent-workspace-row"
      :class="{
        'pnw-recent-workspace-row--current': pnwIsCurrentWorkspace(entry),
        'pnw-recent-workspace-row--unavailable': !pnwCanOpenWorkspace(entry) && !pnwIsWorkspaceBusy(entry),
      }"
      :data-pnw-workspace-id="entry.workspaceId"
      :data-pnw-workspace-availability="entry.availability"
      :aria-busy="pnwIsWorkspaceBusy(entry) ? 'true' : undefined"
    >
      <button
        class="pnw-recent-workspace-open"
        type="button"
        :disabled="!pnwCanOpenWorkspace(entry)"
        :aria-current="pnwIsCurrentWorkspace(entry) ? 'true' : undefined"
        :aria-label="pnwT('workspace.welcome.openRecent', { name: entry.name })"
        @click="emit('open', entry)"
      >
        <span class="pnw-recent-workspace-copy">
          <span class="pnw-recent-workspace-heading">
            <strong class="pnw-recent-workspace-name" :title="entry.name">
              <slot name="name" :entry="entry">{{ entry.name }}</slot>
            </strong>
            <span
              v-if="pnwIsCurrentWorkspace(entry)"
              class="pnw-recent-workspace-badge pnw-recent-workspace-badge--current"
            >
              {{ pnwT("workspace.welcome.currentBadge") }}
            </span>
            <span
              v-if="pnwAvailabilityLabel(entry.availability)"
              class="pnw-recent-workspace-badge"
            >
              {{ pnwAvailabilityLabel(entry.availability) }}
            </span>
            <slot name="badges" :entry="entry" />
          </span>
          <span
            v-if="showRootPath"
            class="pnw-recent-workspace-path"
            :title="entry.rootPath"
            dir="auto"
          >
            <slot name="path" :entry="entry">{{ entry.rootPath }}</slot>
          </span>
          <slot name="meta" :entry="entry" />
        </span>
        <PnwIcon class="pnw-recent-workspace-open-icon" name="chevron-right" :size="18" />
      </button>

      <div v-if="$slots.actions" class="pnw-recent-workspace-actions">
        <slot name="actions" :entry="entry" />
      </div>

      <button
        v-if="removable"
        class="pnw-recent-workspace-remove"
        type="button"
        :disabled="disabled || busyWorkspaceId !== undefined"
        :aria-label="pnwT('workspace.welcome.removeRecent', { name: entry.name })"
        :title="pnwT('workspace.welcome.removeRecent', { name: entry.name })"
        @click="emit('remove', entry)"
      >
        <PnwIcon name="close" :size="16" />
      </button>
    </article>
  </div>
</template>

<style scoped>
.pnw-recent-workspace-list {
  display: grid;
  gap: var(--pnw-workspace-list-gap, 8px);
  min-width: 0;
}

.pnw-recent-workspace-list--block {
  gap: 0;
  border-top: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
}

.pnw-recent-workspace-list--block .pnw-recent-workspace-row {
  border: 0;
  border-radius: 0;
  background: transparent;
}

.pnw-recent-workspace-list--block .pnw-recent-workspace-row + .pnw-recent-workspace-row {
  border-top: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
}

.pnw-recent-workspace-list--block .pnw-recent-workspace-row--current {
  background: var(--pnw-control-active-bg, var(--pnw-workbench-default-active-bg, rgb(37 99 235 / 8%)));
}

.pnw-recent-workspace-list--block .pnw-recent-workspace-empty {
  border: 0;
  border-radius: 0;
}

.pnw-recent-workspace-empty {
  margin: 0;
  padding: 20px;
  border: 1px dashed var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  border-radius: var(--pnw-workspace-card-radius, 8px);
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  text-align: center;
}

.pnw-recent-workspace-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  min-width: 0;
  border: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  border-radius: var(--pnw-workspace-card-radius, 8px);
  background: var(--pnw-workbench-surface, var(--pnw-workbench-default-surface, #fff));
  overflow: hidden;
}

.pnw-recent-workspace-row--current {
  border-color: var(--pnw-control-active-text, var(--pnw-workbench-default-active-text, #2563eb));
  background: var(--pnw-control-active-bg, var(--pnw-workbench-default-active-bg, rgb(37 99 235 / 8%)));
}

.pnw-recent-workspace-open,
.pnw-recent-workspace-remove {
  border: 0;
  border-radius: 0;
  color: inherit;
  font: inherit;
}

.pnw-recent-workspace-open {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: var(--pnw-workspace-card-padding, 12px 14px);
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.pnw-recent-workspace-open:hover:not(:disabled),
.pnw-recent-workspace-remove:hover:not(:disabled) {
  background: var(--pnw-control-hover-bg, var(--pnw-workbench-default-hover-bg, rgb(59 130 246 / 9%)));
}

.pnw-recent-workspace-open:focus-visible,
.pnw-recent-workspace-remove:focus-visible {
  position: relative;
  z-index: 1;
  outline: 2px solid var(--pnw-control-active-text, var(--pnw-workbench-default-active-text, #2563eb));
  outline-offset: -3px;
}

.pnw-recent-workspace-open:disabled,
.pnw-recent-workspace-remove:disabled {
  cursor: not-allowed;
}

.pnw-recent-workspace-row--unavailable .pnw-recent-workspace-copy,
.pnw-recent-workspace-remove:disabled {
  opacity: 0.58;
}

.pnw-recent-workspace-copy,
.pnw-recent-workspace-heading {
  min-width: 0;
}

.pnw-recent-workspace-copy {
  display: grid;
  gap: 3px;
}

.pnw-recent-workspace-heading {
  display: flex;
  align-items: center;
  gap: 7px;
}

.pnw-recent-workspace-name,
.pnw-recent-workspace-path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pnw-recent-workspace-name {
  font-size: 0.96rem;
  font-weight: 650;
}

.pnw-recent-workspace-path {
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  font-size: 0.8rem;
}

.pnw-recent-workspace-badge {
  flex: none;
  padding: 1px 6px;
  border: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  border-radius: 4px;
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  font-size: 0.68rem;
  font-weight: 600;
}

.pnw-recent-workspace-badge--current {
  border-color: color-mix(
    in srgb,
    var(--pnw-control-active-text, var(--pnw-workbench-default-active-text, #2563eb)) 28%,
    transparent
  );
  color: var(--pnw-control-active-text, var(--pnw-workbench-default-active-text, #2563eb));
}

.pnw-recent-workspace-open-icon {
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
}

.pnw-recent-workspace-actions {
  display: flex;
  align-items: center;
  gap: var(--pnw-workspace-card-action-gap, 6px);
  min-width: 0;
  padding: var(--pnw-workspace-card-action-padding, 8px);
  border-left: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
}

.pnw-recent-workspace-actions :deep(.pnw-select) {
  width: var(--pnw-workspace-card-select-width, 112px);
  max-width: var(--pnw-workspace-card-select-max-width, 144px);
}

.pnw-recent-workspace-remove {
  display: grid;
  place-items: center;
  width: 38px;
  padding: 0;
  border-left: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  background: transparent;
  color: var(--pnw-workbench-muted, var(--pnw-workbench-default-muted, #64748b));
  cursor: pointer;
}

@media (max-width: 560px) {
  .pnw-recent-workspace-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .pnw-recent-workspace-open {
    grid-column: 1 / -1;
  }

  .pnw-recent-workspace-actions {
    min-height: 34px;
    border-top: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
    border-left: 0;
  }

  .pnw-recent-workspace-remove {
    min-height: 34px;
    border-top: 1px solid var(--pnw-workbench-border, var(--pnw-workbench-default-border, #dbe3ed));
  }
}
</style>
