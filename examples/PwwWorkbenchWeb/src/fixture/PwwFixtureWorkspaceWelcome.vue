<script setup lang="ts">
import { reactive, ref } from "vue";
import {
  PnwColorSchemeToggle,
  PnwInformationCardGroup,
  PnwSelect,
  PnwWorkspaceGate,
  PnwWorkspaceRailAction,
  PnwWorkspaceTypeSelect,
  type PnwRecentWorkspaceEntry,
  type PnwColorScheme,
  type PnwInformationCardGroupDefinition,
  type PnwWorkspaceEntryPolicy,
  type PnwWorkspaceGateMode,
  type PnwWorkspaceState,
  type PnwWorkspaceTypeDefinition,
} from "phoenix-wing";

const pwwGateMode = ref<PnwWorkspaceGateMode>("welcome");
const pwwPolicy = ref<PnwWorkspaceEntryPolicy>("required");
const pwwShowRail = ref(true);
const pwwColorScheme = ref<PnwColorScheme>("light");
const pwwRecentOpen = ref(true);
const pwwInformationCards: PnwInformationCardGroupDefinition = {
  id: "fixture-runtime-cards",
  ariaLabel: "Host 信息卡片",
  cards: [
    {
      id: "fixture-runtime",
      title: "运行环境",
      status: "Ready",
      items: [
        { id: "version", label: "版本", value: "0.7.0" },
        { id: "adapter", label: "Adapter", value: "Local workspace", note: "值由消费者 DTO 提供" },
      ],
    },
    {
      id: "fixture-capabilities",
      title: "能力边界",
      status: "Host controlled",
      items: [
        { id: "workspace", label: "Workspace", value: "read / write" },
        { id: "persistence", label: "持久化", value: "Host adapter" },
      ],
    },
  ],
};

const pwwState = ref<PnwWorkspaceState>({
  current: {
    workspaceId: "workspace-engineering",
    workspaceTypeId: "mixed",
    name: "Engineering Workspace",
    rootPath: "/workspace/engineering",
    readonly: false,
    capabilities: ["read", "write", "watch"],
  },
  recent: [
    {
      workspaceId: "workspace-engineering",
      workspaceTypeId: "mixed",
      name: "Engineering Workspace",
      rootPath: "/workspace/engineering",
      availability: "available",
    },
    {
      workspaceId: "workspace-analysis",
      workspaceTypeId: "lighting",
      name: "Analysis Samples",
      rootPath: "/workspace/analysis-samples",
      availability: "available",
    },
    {
      workspaceId: "workspace-archived",
      workspaceTypeId: "cad",
      name: "Archived Prototype",
      rootPath: "/workspace/archived-prototype",
      availability: "missing",
    },
  ],
  phase: "open",
  revision: 1,
});

const pwwWorkspaceTypeIds = reactive<Record<string, string>>({
  "workspace-engineering": "mixed",
  "workspace-analysis": "lighting",
  "workspace-archived": "cad",
});
const pwwWorkspaceTypes: readonly PnwWorkspaceTypeDefinition[] = [
  { typeId: "simulation", label: "仿真", order: 25 },
];
const pwwPolicyOptions = [
  { value: "required", label: "必须先打开工作空间" },
  { value: "optional", label: "允许无工作空间进入" },
];

function pwwOpenWorkspace(): void {
  const entry: PnwRecentWorkspaceEntry = {
    workspaceId: "workspace-new",
    workspaceTypeId: "code",
    name: "New Workspace",
    rootPath: "/workspace/new-workspace",
    availability: "available",
  };
  pwwState.value = {
    current: {
      workspaceId: entry.workspaceId,
      workspaceTypeId: entry.workspaceTypeId,
      name: entry.name,
      rootPath: entry.rootPath,
      readonly: false,
      capabilities: ["read", "write"],
    },
    recent: [entry, ...pwwState.value.recent.filter((item) => item.workspaceId !== entry.workspaceId)],
    phase: "open",
    revision: pwwState.value.revision + 1,
  };
}

function pwwOpenRecent(entry: PnwRecentWorkspaceEntry): void {
  pwwState.value = {
    ...pwwState.value,
    current: {
      workspaceId: entry.workspaceId,
      workspaceTypeId: entry.workspaceTypeId,
      name: entry.name,
      rootPath: entry.rootPath,
      readonly: false,
      capabilities: ["read", "write"],
    },
    revision: pwwState.value.revision + 1,
  };
}

function pwwRemoveRecent(entry: PnwRecentWorkspaceEntry): void {
  pwwState.value = {
    ...pwwState.value,
    recent: pwwState.value.recent.filter((item) => item.workspaceId !== entry.workspaceId),
    revision: pwwState.value.revision + 1,
  };
}

function pwwCloseWorkspace(): void {
  pwwState.value = {
    recent: pwwState.value.recent,
    phase: "closed",
    revision: pwwState.value.revision + 1,
  };
}

function pwwSetWorkspaceType(workspaceId: string, workspaceTypeId: string): void {
  pwwWorkspaceTypeIds[workspaceId] = workspaceTypeId;
  pwwState.value = {
    ...pwwState.value,
    current: pwwState.value.current?.workspaceId === workspaceId
      ? { ...pwwState.value.current, workspaceTypeId }
      : pwwState.value.current,
    recent: pwwState.value.recent.map((entry) => (
      entry.workspaceId === workspaceId ? { ...entry, workspaceTypeId } : entry
    )),
    revision: pwwState.value.revision + 1,
  };
}
</script>

<template>
  <PnwWorkspaceGate
    v-model:mode="pwwGateMode"
    class="pww-workspace-welcome"
    :state="pwwState"
    :policy="pwwPolicy"
    :show-rail="pwwShowRail"
    recent-collapsible
    v-model:recent-open="pwwRecentOpen"
    :color-scheme="pwwColorScheme"
    app-title="Engineering Workbench"
    product-subtitle="Fixture / local workspace"
    description="由 Host 提供目录选择与读写；Wing 只呈现受控状态、最近列表和扩展插槽。"
    @open-workspace="pwwOpenWorkspace"
    @open-recent="pwwOpenRecent"
    @remove-recent="pwwRemoveRecent"
    @close-workspace="pwwCloseWorkspace"
  >
    <template #secondary-actions>
      <PnwWorkspaceRailAction label="界面巡游" icon="search" />
    </template>

    <template #rail-actions>
      <PnwSelect
        v-model="pwwPolicy"
        :options="pwwPolicyOptions"
        aria-label="工作空间进入策略"
      />
    </template>

    <template #links>
      <span>消费者链接与帮助入口</span>
    </template>

    <template #head-actions>
      <PnwColorSchemeToggle v-model="pwwColorScheme" />
      <button class="pww-welcome-settings" type="button" @click="pwwShowRail = !pwwShowRail">
        {{ pwwShowRail ? "隐藏左侧" : "显示左侧" }}
      </button>
      <button class="pww-welcome-settings" type="button">设置</button>
    </template>

    <template #entry-actions="{ entry }">
      <PnwWorkspaceTypeSelect
        :model-value="pwwWorkspaceTypeIds[entry.workspaceId] ?? entry.workspaceTypeId ?? 'mixed'"
        :types="pwwWorkspaceTypes"
        size="compact"
        :aria-label="`${entry.name} 工作空间类型`"
        @update:model-value="pwwSetWorkspaceType(entry.workspaceId, $event)"
      />
    </template>

    <template #after-recent>
      <PnwInformationCardGroup :definition="pwwInformationCards" />
    </template>

    <template #workbench="slotProps">
      <slot name="workbench" v-bind="slotProps">
        <section class="pww-gated-workbench">
        <header>
          <button type="button" @click="slotProps.showWelcome">Engineering Workbench</button>
          <span>{{ pwwState.current?.name ?? "无工作空间模式" }}</span>
          <button v-if="pwwState.current" type="button" @click="slotProps.closeWorkspace">关闭工作空间</button>
        </header>
        <main>
          <h2>受 Gate 保护的工作台</h2>
          <p>点击左上品牌返回 Welcome；关闭当前 Workspace 后自动回到 Welcome。</p>
        </main>
        </section>
      </slot>
    </template>
  </PnwWorkspaceGate>
</template>

<style scoped>
.pww-workspace-welcome {
  height: 100%;
}

.pww-welcome-settings {
  min-height: 34px;
  padding: 6px 12px;
  border: 1px solid var(--pnw-workbench-border, #dbe3ed);
  border-radius: var(--pnw-control-radius, 6px);
  background: var(--pnw-workbench-surface, #fff);
  color: var(--pnw-workbench-text, #0f172a);
  font: inherit;
  cursor: pointer;
}

.pww-welcome-settings:hover {
  background: var(--pnw-control-hover-bg, rgb(59 130 246 / 9%));
}

.pww-gated-workbench {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  width: 100%;
  height: 100%;
  color: var(--pnw-workbench-text, #0f172a);
  background: var(--pnw-workbench-surface, #fff);
}

.pww-gated-workbench header {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 0 12px;
  border-bottom: 1px solid var(--pnw-workbench-border, #dbe3ed);
}

.pww-gated-workbench header span {
  flex: 1;
  color: var(--pnw-workbench-muted, #64748b);
}

.pww-gated-workbench button {
  padding: 6px 10px;
  border: 1px solid var(--pnw-workbench-border, #dbe3ed);
  border-radius: 6px;
  background: var(--pnw-workbench-surface, #fff);
  color: inherit;
  font: inherit;
}

.pww-gated-workbench main {
  padding: 24px;
}
</style>
