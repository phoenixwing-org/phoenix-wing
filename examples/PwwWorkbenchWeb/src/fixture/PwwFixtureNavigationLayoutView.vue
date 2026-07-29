<script setup lang="ts">
import { computed, ref } from "vue";
import {
  PnwPageHeader,
  pnwNavigationLeaves,
  pnwVisibleNavigationNodes,
  type PnwNavigationNode,
} from "phoenix-wing";
import { pwwNavigationModulePlacements } from "./PwwFixtureNavigationLayout.js";

const props = defineProps<{
  nodes: readonly PnwNavigationNode[];
  defaultNodes: readonly PnwNavigationNode[];
}>();

const emit = defineEmits<{
  move: [nodeId: string, targetRootId: string];
  createRoot: [label: string, shortLabel?: string];
  updateRoot: [rootId: string, label: string, shortLabel: string | undefined, order: number];
  restoreRoot: [rootId: string];
  deleteRoot: [rootId: string];
  restore: [];
}>();

const pwwCreateRootOpen = ref(false);
const pwwNewRootLabel = ref("");
const pwwNewRootShortLabel = ref("");
const pwwCollapsedRootIds = ref<readonly string[]>([]);
const pwwEditingRootId = ref<string>();
const pwwEditingRootLabel = ref("");
const pwwEditingRootShortLabel = ref("");
const pwwEditingRootOrder = ref(0);

const pwwLayoutRoots = computed(() => [...props.nodes].sort(
  (left, right) => (left.order ?? 0) - (right.order ?? 0),
));
const pwwModulePlacements = computed(() => pwwNavigationModulePlacements(props.nodes));
const pwwDefaultModulePlacements = computed(() => pwwNavigationModulePlacements(
  props.defaultNodes,
));
const pwwDefaultRootByModuleId = computed(() => new Map(
  pwwDefaultModulePlacements.value.map(({ root, module }) => [module.id, root]),
));
const pwwDefaultRootIds = computed(() => new Set(props.defaultNodes.map((root) => root.id)));
const pwwDefaultRootById = computed(() => new Map(
  props.defaultNodes.map((root) => [root.id, root]),
));
const pwwEmptyRoots = computed(() => pwwLayoutRoots.value.filter(
  (root) => root.hidden || pnwVisibleNavigationNodes(root.children ?? []).length === 0,
));
const pwwChangedModuleCount = computed(() => pwwModulePlacements.value.filter(
  ({ root, module }) => pwwDefaultRootByModuleId.value.get(module.id)?.id !== root.id,
).length);
const pwwCustomRootCount = computed(() => pwwLayoutRoots.value.filter(
  (root) => !pwwDefaultRootIds.value.has(root.id),
).length);

function pwwModuleItems(node: PnwNavigationNode): readonly PnwNavigationNode[] {
  const children = pnwVisibleNavigationNodes(node.children ?? []);
  return children.length > 0 ? pnwNavigationLeaves(children) : [node];
}

function pwwMoveModule(moduleId: string, event: Event): void {
  const targetRootId = (event.target as HTMLSelectElement).value;
  if (targetRootId) emit("move", moduleId, targetRootId);
}

function pwwRestoreModule(moduleId: string): void {
  const defaultRootId = pwwDefaultRootByModuleId.value.get(moduleId)?.id;
  if (defaultRootId) emit("move", moduleId, defaultRootId);
}

function pwwCreateRoot(): void {
  const label = pwwNewRootLabel.value.trim();
  if (!label) return;
  emit("createRoot", label, pwwNewRootShortLabel.value.trim() || undefined);
  pwwNewRootLabel.value = "";
  pwwNewRootShortLabel.value = "";
  pwwCreateRootOpen.value = false;
}

function pwwStartEditingRoot(root: PnwNavigationNode): void {
  pwwEditingRootId.value = root.id;
  pwwEditingRootLabel.value = root.label;
  pwwEditingRootShortLabel.value = root.shortLabel ?? "";
  pwwEditingRootOrder.value = root.order ?? 0;
}

function pwwCancelEditingRoot(): void {
  pwwEditingRootId.value = undefined;
}

function pwwSaveRoot(rootId: string): void {
  const label = pwwEditingRootLabel.value.trim();
  if (!label || !Number.isFinite(pwwEditingRootOrder.value)) return;
  emit(
    "updateRoot",
    rootId,
    label,
    pwwEditingRootShortLabel.value.trim() || undefined,
    pwwEditingRootOrder.value,
  );
  pwwCancelEditingRoot();
}

function pwwRootDefinitionChanged(root: PnwNavigationNode): boolean {
  const defaultRoot = pwwDefaultRootById.value.get(root.id);
  return Boolean(defaultRoot) && (
    root.label !== defaultRoot!.label
    || root.shortLabel !== defaultRoot!.shortLabel
    || (root.order ?? 0) !== (defaultRoot!.order ?? 0)
  );
}

function pwwRootModuleCount(root: PnwNavigationNode): number {
  return pnwVisibleNavigationNodes(root.children ?? []).length;
}

function pwwPlacementsForRoot(rootId: string) {
  return pwwModulePlacements.value.filter(({ root }) => root.id === rootId);
}

function pwwRootCollapsed(rootId: string): boolean {
  return pwwCollapsedRootIds.value.includes(rootId);
}

function pwwToggleRoot(rootId: string): void {
  pwwCollapsedRootIds.value = pwwRootCollapsed(rootId)
    ? pwwCollapsedRootIds.value.filter((candidate) => candidate !== rootId)
    : [...pwwCollapsedRootIds.value, rootId];
}

function pwwToggleAllRoots(): void {
  pwwCollapsedRootIds.value = pwwCollapsedRootIds.value.length === pwwLayoutRoots.value.length
    ? []
    : pwwLayoutRoots.value.map((root) => root.id);
}
</script>

<template>
  <article class="pww-navigation-layout-view">
    <PnwPageHeader
      eyebrow="HOST-CONTROLLED FIXTURE VIEW"
      title="导航分组布局"
      description="每行是一级大分组下的一个小模块；选择“移动到”后，模块内工具与 View 整体移动。"
      summary="NAVIGATION LAYOUT"
    >
      <template #actions>
        <div class="pww-navigation-layout-head-actions">
        <button type="button" @click="pwwCreateRootOpen = !pwwCreateRootOpen">
          新建大分组
        </button>
        <button type="button" @click="emit('restore')">全部恢复默认</button>
        </div>
      </template>
    </PnwPageHeader>

    <form
      v-if="pwwCreateRootOpen"
      class="pww-navigation-layout-create"
      @submit.prevent="pwwCreateRoot"
    >
      <label>
        <span>大分组名称</span>
        <input v-model="pwwNewRootLabel" required placeholder="例如：质量管理">
      </label>
      <label>
        <span>Header 简称（可选）</span>
        <input v-model="pwwNewRootShortLabel" maxlength="6" placeholder="例如：质量">
      </label>
      <button type="submit" :disabled="!pwwNewRootLabel.trim()">创建空大分组</button>
      <small>只定义一级大分组；小模块通过下表“移动到”加入。</small>
    </form>

    <dl class="pww-navigation-layout-summary">
      <div><dt>大分组</dt><dd>{{ pwwLayoutRoots.length }}</dd></div>
      <div><dt>自定义分组</dt><dd>{{ pwwCustomRootCount }}</dd></div>
      <div><dt>可调小模块</dt><dd>{{ pwwModulePlacements.length }}</dd></div>
      <div><dt>已调整</dt><dd>{{ pwwChangedModuleCount }}</dd></div>
      <div><dt>当前空组</dt><dd>{{ pwwEmptyRoots.length }}</dd></div>
    </dl>

    <section class="pww-navigation-layout-section" aria-labelledby="pww-group-definitions-title">
      <h2 id="pww-group-definitions-title">大分组定义</h2>
      <div class="pww-navigation-layout-group-table-wrap">
        <table class="pww-navigation-layout-table pww-navigation-layout-group-table">
          <thead>
            <tr>
              <th scope="col">全名</th>
              <th scope="col">Header 简称</th>
              <th scope="col">顺序</th>
              <th scope="col">类型</th>
              <th scope="col">状态</th>
              <th scope="col">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="root in pwwLayoutRoots" :key="root.id">
              <td>
                <template v-if="pwwEditingRootId === root.id">
                  <input
                    v-model="pwwEditingRootLabel"
                    required
                    :aria-label="`${root.label}大分组全名`"
                  >
                </template>
                <strong v-else>{{ root.label }}</strong>
                <small>{{ root.id }}</small>
              </td>
              <td>
                <input
                  v-if="pwwEditingRootId === root.id"
                  v-model="pwwEditingRootShortLabel"
                  maxlength="6"
                  :aria-label="`${root.label}Header 简称`"
                >
                <template v-else>{{ root.shortLabel ?? '—' }}</template>
              </td>
              <td>
                <input
                  v-if="pwwEditingRootId === root.id"
                  v-model.number="pwwEditingRootOrder"
                  type="number"
                  step="10"
                  :aria-label="`${root.label}显示顺序`"
                >
                <template v-else>{{ root.order ?? 0 }}</template>
              </td>
              <td>{{ pwwDefaultRootIds.has(root.id) ? '内置分组' : '自定义分组' }}</td>
              <td>{{ root.hidden ? '空组 · Ribbon/Tree 已隐藏' : `${pwwRootModuleCount(root)} 个小模块` }}</td>
              <td class="pww-navigation-layout-actions">
                <template v-if="pwwEditingRootId === root.id">
                  <button
                    type="button"
                    :disabled="!pwwEditingRootLabel.trim()"
                    @click="pwwSaveRoot(root.id)"
                  >
                    保存
                  </button>
                  <button type="button" @click="pwwCancelEditingRoot">取消</button>
                </template>
                <template v-else>
                  <button type="button" @click="pwwStartEditingRoot(root)">编辑</button>
                  <button
                    v-if="pwwDefaultRootIds.has(root.id)"
                    type="button"
                    :disabled="!pwwRootDefinitionChanged(root)"
                    title="只恢复名称、简称与顺序，不改变小模块归属"
                    :aria-label="`恢复${root.label}内置分组定义`"
                    @click="emit('restoreRoot', root.id)"
                  >
                    恢复定义
                  </button>
                <button
                  v-if="!pwwDefaultRootIds.has(root.id)"
                  type="button"
                  class="pww-navigation-layout-delete"
                  :disabled="pwwRootModuleCount(root) > 0"
                  :title="pwwRootModuleCount(root) > 0 ? '请先将小模块移出此分组' : '删除自定义大分组'"
                  :aria-label="`删除自定义大分组${root.label}`"
                  @click="emit('deleteRoot', root.id)"
                >
                  删除
                </button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="pww-navigation-layout-section" aria-labelledby="pww-module-placement-title">
      <div class="pww-navigation-layout-section-head">
        <h2 id="pww-module-placement-title">当前分组树与小模块归属</h2>
        <button type="button" @click="pwwToggleAllRoots">
          {{ pwwCollapsedRootIds.length === pwwLayoutRoots.length ? '全部展开' : '全部折叠' }}
        </button>
      </div>
      <div class="pww-navigation-layout-table-wrap">
      <table class="pww-navigation-layout-table">
        <thead>
          <tr>
            <th scope="col">小模块</th>
            <th scope="col">包含的工具 / View</th>
            <th scope="col">默认大分组</th>
            <th scope="col">当前大分组</th>
            <th scope="col">移动到</th>
          </tr>
        </thead>
        <tbody v-for="root in pwwLayoutRoots" :key="root.id">
          <tr class="pww-navigation-layout-tree-root">
            <th colspan="5" scope="rowgroup">
              <button
                type="button"
                :aria-expanded="!pwwRootCollapsed(root.id)"
                @click="pwwToggleRoot(root.id)"
              >
                <span aria-hidden="true">{{ pwwRootCollapsed(root.id) ? '▸' : '▾' }}</span>
                <strong>{{ root.label }}</strong>
                <small>{{ root.shortLabel ?? root.label }} · {{ pwwRootModuleCount(root) }} 个小模块</small>
                <em v-if="root.hidden">Ribbon / Tree 已隐藏</em>
              </button>
            </th>
          </tr>
          <tr v-if="!pwwRootCollapsed(root.id) && pwwPlacementsForRoot(root.id).length === 0">
            <td colspan="5" class="pww-navigation-layout-tree-empty">
              当前没有小模块；仍可从其他行的“移动到”下拉选择此分组。
            </td>
          </tr>
          <tr
            v-for="placement in pwwRootCollapsed(root.id) ? [] : pwwPlacementsForRoot(root.id)"
            :key="placement.module.id"
            :class="{
              'pww-navigation-layout-row--changed': pwwDefaultRootByModuleId.get(placement.module.id)?.id !== placement.root.id,
            }"
          >
            <td>
              <strong>{{ placement.module.label }}</strong>
              <small>{{ placement.module.id }}</small>
            </td>
            <td>
              <div class="pww-navigation-layout-items">
                <span
                  v-for="item in pwwModuleItems(placement.module)"
                  :key="item.id"
                >
                  {{ item.label }}
                </span>
              </div>
            </td>
            <td>{{ pwwDefaultRootByModuleId.get(placement.module.id)?.label ?? '新增模块' }}</td>
            <td>{{ placement.root.label }}</td>
            <td>
              <select
                :value="placement.root.id"
                :aria-label="`${placement.module.label}移动到`"
                @change="pwwMoveModule(placement.module.id, $event)"
              >
                <option v-for="root in pwwLayoutRoots" :key="root.id" :value="root.id">
                  {{ root.label }}{{ pwwDefaultRootByModuleId.get(placement.module.id)?.id === root.id ? '（默认）' : root.hidden ? '（当前为空）' : '' }}
                </option>
              </select>
              <button
                v-if="pwwDefaultRootByModuleId.get(placement.module.id)?.id !== placement.root.id"
                type="button"
                class="pww-navigation-layout-row-restore"
                @click="pwwRestoreModule(placement.module.id)"
              >
                恢复本模块
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </section>

    <p v-if="pwwEmptyRoots.length" class="pww-navigation-layout-empty-note">
      空大分组已从 Ribbon / Tree 隐藏，但仍可在“移动到”下拉中选择：
      {{ pwwEmptyRoots.map((root) => root.label).join('、') }}。
    </p>
    <p class="pww-navigation-layout-note">
      本 View 只调整一级大分组下面的小模块，并修改 fixture 宿主持有的同一棵树；Wing 不保存默认布局、不决定跨组权限或产品配置结构。
    </p>
  </article>
</template>

<style scoped>
.pww-navigation-layout-view {
  width: min(1160px, 100%);
  margin: 0 auto;
  padding: clamp(14px, 2vw, 24px);
  color: var(--pnw-workbench-text, #0f172a);
}

.pww-navigation-layout-note,
.pww-navigation-layout-empty-note {
  margin: 0;
  color: var(--pnw-workbench-muted, #64748b);
  font-size: 12px;
  line-height: 1.55;
}

.pww-navigation-layout-head-actions {
  display: flex;
  gap: 6px;
}

.pww-navigation-layout-head-actions button,
.pww-navigation-layout-create button {
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid var(--pnw-workbench-border, #dbe3ed);
  border-radius: 6px;
  background: var(--pnw-workbench-surface, #fff);
  color: var(--pnw-workbench-text, #0f172a);
  cursor: pointer;
  font-size: 11px;
}

.pww-navigation-layout-head-actions button:hover,
.pww-navigation-layout-head-actions button:focus-visible,
.pww-navigation-layout-create button:hover:not(:disabled),
.pww-navigation-layout-create button:focus-visible:not(:disabled) {
  outline: none;
  background: var(--pnw-control-hover-bg, rgba(59, 130, 246, 0.09));
}

.pww-navigation-layout-create {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(160px, 0.7fr) auto;
  align-items: end;
  gap: 8px;
  margin-top: 14px;
  padding: 10px;
  border: 1px solid var(--pnw-workbench-border, #dbe3ed);
  border-radius: 8px;
  background: var(--pnw-workbench-surface, #fff);
}

.pww-navigation-layout-create label {
  display: grid;
  gap: 4px;
  color: var(--pnw-workbench-muted, #64748b);
  font-size: 10px;
}

.pww-navigation-layout-create input {
  min-width: 0;
  height: 30px;
  box-sizing: border-box;
  padding: 0 8px;
  border: 1px solid var(--pnw-workbench-border, #dbe3ed);
  border-radius: 5px;
  background: var(--pnw-workbench-surface, #fff);
  color: var(--pnw-workbench-text, #0f172a);
  font: inherit;
}

.pww-navigation-layout-create small {
  grid-column: 1 / -1;
  color: var(--pnw-workbench-muted, #64748b);
  font-size: 9px;
}

.pww-navigation-layout-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  margin: 20px 0 12px;
  padding: 10px 12px;
  border: 1px solid var(--pnw-workbench-border, #dbe3ed);
  border-radius: 8px;
  background: var(--pnw-workbench-surface, #fff);
}

.pww-navigation-layout-summary div {
  display: flex;
  gap: 6px;
}

.pww-navigation-layout-summary dt {
  color: var(--pnw-workbench-muted, #64748b);
  font-size: 11px;
}

.pww-navigation-layout-summary dd {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
}

.pww-navigation-layout-section {
  margin-top: 12px;
}

.pww-navigation-layout-section h2 {
  margin: 0 0 6px;
  font-size: 13px;
}

.pww-navigation-layout-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pww-navigation-layout-section-head button {
  padding: 2px 7px;
  border: 1px solid var(--pnw-workbench-border, #dbe3ed);
  border-radius: 4px;
  background: transparent;
  color: var(--pnw-workbench-text, #0f172a);
  cursor: pointer;
  font: inherit;
}

.pww-navigation-layout-group-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--pnw-workbench-border, #dbe3ed);
  border-radius: 8px;
  background: var(--pnw-workbench-surface, #fff);
}

.pww-navigation-layout-table-wrap {
  max-height: min(58vh, 600px);
  overflow: auto;
  border: 1px solid var(--pnw-workbench-border, #dbe3ed);
  border-radius: 8px;
  background: var(--pnw-workbench-surface, #fff);
  scrollbar-width: thin;
}

.pww-navigation-layout-table {
  width: 100%;
  min-width: 860px;
  border-collapse: collapse;
  font-size: 11px;
}

.pww-navigation-layout-table th,
.pww-navigation-layout-table td {
  padding: 9px 10px;
  border-bottom: 1px solid var(--pnw-workbench-border, #dbe3ed);
  text-align: left;
  vertical-align: middle;
}

.pww-navigation-layout-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--pnw-workbench-bg, #f8fafc);
  color: var(--pnw-workbench-muted, #64748b);
  font-weight: 700;
}

.pww-navigation-layout-table tbody tr:last-child td {
  border-bottom: 0;
}

.pww-navigation-layout-row--changed {
  background: var(--pnw-control-active-bg, rgba(37, 99, 235, 0.08));
}

.pww-navigation-layout-tree-root th {
  padding: 0;
  background: var(--pnw-workbench-bg, #f8fafc);
}

.pww-navigation-layout-tree-root button {
  width: 100%;
  min-height: 34px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  border: 0;
  background: transparent;
  color: var(--pnw-workbench-text, #0f172a);
  cursor: pointer;
  text-align: left;
}

.pww-navigation-layout-tree-root button:hover,
.pww-navigation-layout-tree-root button:focus-visible {
  outline: none;
  background: var(--pnw-control-hover-bg, rgba(59, 130, 246, 0.09));
}

.pww-navigation-layout-tree-root small {
  color: var(--pnw-workbench-muted, #64748b);
  font-weight: 400;
}

.pww-navigation-layout-tree-root em {
  margin-left: auto;
  color: var(--pnw-control-active-text, #1d4ed8);
  font-size: 9px;
  font-style: normal;
}

.pww-navigation-layout-tree-empty {
  color: var(--pnw-workbench-muted, #64748b);
  font-style: italic;
}

.pww-navigation-layout-table td:first-child strong,
.pww-navigation-layout-table td:first-child small {
  display: block;
}

.pww-navigation-layout-group-table input {
  width: 100%;
  min-width: 72px;
  height: 26px;
  box-sizing: border-box;
  padding: 0 6px;
  border: 1px solid var(--pnw-workbench-border, #dbe3ed);
  border-radius: 4px;
  background: var(--pnw-workbench-surface, #fff);
  color: var(--pnw-workbench-text, #0f172a);
  font: inherit;
}

.pww-navigation-layout-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pww-navigation-layout-actions button {
  padding: 2px 7px;
  border: 1px solid var(--pnw-workbench-border, #dbe3ed);
  border-radius: 4px;
  background: transparent;
  color: var(--pnw-workbench-text, #0f172a);
  cursor: pointer;
  font: inherit;
}

.pww-navigation-layout-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.pww-navigation-layout-table td:first-child small {
  margin-top: 2px;
  color: var(--pnw-workbench-muted, #64748b);
  font-size: 9px;
}

.pww-navigation-layout-items {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pww-navigation-layout-items span {
  padding: 2px 6px;
  border: 1px solid var(--pnw-workbench-border, #dbe3ed);
  border-radius: 999px;
  color: var(--pnw-workbench-muted, #64748b);
  white-space: nowrap;
}

.pww-navigation-layout-table select {
  width: 100%;
  min-width: 130px;
  height: 28px;
  padding: 0 24px 0 7px;
  border: 1px solid var(--pnw-workbench-border, #dbe3ed);
  border-radius: 5px;
  background: var(--pnw-workbench-surface, #fff);
  color: var(--pnw-workbench-text, #0f172a);
  font: inherit;
}

.pww-navigation-layout-table select:focus-visible {
  outline: 2px solid var(--pnw-focus-ring, #3b82f6);
  outline-offset: 1px;
}

.pww-navigation-layout-row-restore {
  margin-top: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--pnw-control-active-text, #1d4ed8);
  cursor: pointer;
  font: inherit;
}

.pww-navigation-layout-row-restore:hover,
.pww-navigation-layout-row-restore:focus-visible {
  outline: none;
  text-decoration: underline;
}

.pww-navigation-layout-empty-note {
  margin-top: 10px;
  color: var(--pnw-control-active-text, #1d4ed8);
}

.pww-navigation-layout-note {
  margin-top: 8px;
}

@media (max-width: 680px) {
  .pww-navigation-layout-head {
    align-items: stretch;
    flex-direction: column;
  }

  .pww-navigation-layout-head-actions {
    flex-direction: column;
  }

  .pww-navigation-layout-create {
    grid-template-columns: 1fr;
  }
}
</style>
