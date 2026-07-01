<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'

export interface PnwDictItem {
  value: string
  label: string
  tags?: string
  groupName?: string
  enabled?: boolean
}

const props = withDefaults(
  defineProps<{
    items: PnwDictItem[]
    placeholder?: string
    clearable?: boolean
    /** localStorage key 用于记住每个 combo 的筛选标签 */
    storageKey?: string
  }>(),
  { placeholder: '请选择', clearable: true },
)

const model = defineModel<string>()

// Restore saved filter preference
function loadFilter(): string | null {
  if (!props.storageKey) return null
  try { return localStorage.getItem(`pnw-ds-${props.storageKey}`) } catch { return null }
}
function saveFilter(tag: string | null) {
  if (!props.storageKey) return
  try { tag ? localStorage.setItem(`pnw-ds-${props.storageKey}`, tag) : localStorage.removeItem(`pnw-ds-${props.storageKey}`) } catch { /* ignore */ }
}

const filterTag = ref<string | null>(loadFilter())
const searchText = ref('')

const tags = computed(() => {
  const set = new Set<string>()
  for (const item of props.items) {
    if (item.enabled === false) continue
    for (const t of (item.tags || '').split(',').map(s => s.trim()).filter(Boolean)) set.add(t)
  }
  return [...set]
})

function tagLabel(tag: string) {
  const m: Record<string, string> = { automotive: '汽车', software: '软件', custom: '自定义' }
  return m[tag] || tag
}

const groups = computed(() => {
  const map = new Map<string, { value: string; label: string }[]>()
  const untagged: { value: string; label: string }[] = []

  for (const item of props.items) {
    if (item.enabled === false) continue
    if (searchText.value && !item.label.includes(searchText.value) && !item.value.includes(searchText.value)) continue
    const itemTags = (item.tags || '').split(',').map(s => s.trim()).filter(Boolean)
    if (filterTag.value && !itemTags.includes(filterTag.value)) continue

    if (itemTags.length) {
      const target = filterTag.value ? [filterTag.value] : [itemTags[0]]
      for (const tag of target) {
        if (!map.has(tag)) map.set(tag, [])
        map.get(tag)!.push({ value: item.value, label: item.label })
      }
    } else {
      untagged.push({ value: item.value, label: item.label })
    }
  }

  const result = [...map.entries()].map(([tag, opts]) => ({ label: tag, options: opts }))
  if (untagged.length) result.unshift({ label: '', options: untagged })
  return result
})

const visible = ref(false)
const root = ref<HTMLElement | null>(null)

function onDocClick(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) visible.value = false
}
onMounted(() => document.addEventListener('click', onDocClick, true))
onUnmounted(() => document.removeEventListener('click', onDocClick, true))

function select(value: string) {
  model.value = value
  visible.value = false
  searchText.value = ''
  filterTag.value = null
}
</script>

<template>
  <div ref="root" class="pnw-dict-select">
    <!-- trigger -->
    <div class="pnw-ds-trigger" @click="visible = !visible">
      <span v-if="model" class="pnw-ds-value">{{ items.find(i => i.value === model)?.label || model }}</span>
      <span v-else class="pnw-ds-placeholder">{{ placeholder }}</span>
      <span v-if="clearable && model" class="pnw-ds-clear" @click.stop="model = ''; searchText = ''; filterTag = null">×</span>
      <span class="pnw-ds-arrow">▾</span>
    </div>

    <!-- dropdown -->
    <div v-if="visible" class="pnw-ds-drop">
      <!-- search -->
      <div class="pnw-ds-search">
        <input v-model="searchText" class="pnw-ds-input" placeholder="搜索…" @click.stop />
      </div>
      <!-- tag filter -->
      <div v-if="tags.length > 1" class="pnw-ds-tags">
        <button type="button"
          :class="['pnw-ds-tag', { active: !filterTag }]"
          @click="filterTag = null; saveFilter(null)"
        >全部</button>
        <button type="button"
          v-for="t in tags" :key="t"
          :class="['pnw-ds-tag', { active: filterTag === t }]"
          @click="filterTag = filterTag === t ? null : t; saveFilter(filterTag)"
        >{{ tagLabel(t) }}</button>
      </div>
      <!-- groups -->
      <div class="pnw-ds-list">
        <template v-for="g in groups" :key="g.label">
          <div v-if="g.label" class="pnw-ds-group-head">{{ tagLabel(g.label) }}</div>
          <div
            v-for="o in g.options" :key="o.value"
            :class="['pnw-ds-opt', { active: model === o.value }]"
            @click="select(o.value)"
          >{{ o.label }}</div>
        </template>
        <div v-if="!groups.length" class="pnw-ds-empty">无匹配项</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pnw-dict-select {
  position: relative;
  width: 100%;
  font-size: 14px;
}
.pnw-ds-trigger {
  display: flex; align-items: center; gap: 4px;
  height: 32px; padding: 0 8px;
  border: 1px solid var(--el-border-color, #dcdfe6); border-radius: 4px;
  background: #fff; cursor: pointer;
}
.pnw-ds-trigger:hover { border-color: var(--el-color-primary, #409eff); }
.pnw-ds-value { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--el-text-color-regular); }
.pnw-ds-placeholder { color: var(--el-text-color-placeholder, #c0c4cc); }
.pnw-ds-clear { color: #c0c4cc; cursor: pointer; font-size: 14px; line-height: 1; }
.pnw-ds-clear:hover { color: #909399; }
.pnw-ds-arrow { color: #c0c4cc; font-size: 12px; transition: transform .2s; }

.pnw-ds-drop {
  position: absolute; z-index: 2000; top: 100%; left: 0; right: 0; margin-top: 4px;
  max-height: 320px; overflow: hidden; display: flex; flex-direction: column;
  background: #fff; border: 1px solid #e4e7ed; border-radius: 6px;
  box-shadow: 0 6px 16px rgba(0,0,0,.1);
}
.pnw-ds-search { padding: 6px 8px; border-bottom: 1px solid #ebeef5; }
.pnw-ds-input { width: 100%; padding: 4px 8px; border: 1px solid #e4e7ed; border-radius: 4px; font-size: 13px; outline: none; box-sizing: border-box; }
.pnw-ds-input:focus { border-color: var(--el-color-primary, #409eff); }
.pnw-ds-tags { display: flex; gap: 4px; padding: 6px 8px; border-bottom: 1px solid #ebeef5; flex-wrap: wrap; }
.pnw-ds-tag { padding: 2px 10px; border: 1px solid #e4e7ed; border-radius: 12px; background: #f5f7fa; font-size: 12px; cursor: pointer; color: #606266; }
.pnw-ds-tag:hover { border-color: var(--el-color-primary, #409eff); color: var(--el-color-primary, #409eff); }
.pnw-ds-tag.active { background: var(--el-color-primary-light-9, #ecf5ff); border-color: var(--el-color-primary, #409eff); color: var(--el-color-primary, #409eff); }

.pnw-ds-list { flex: 1; overflow-y: auto; padding: 4px 0; }
.pnw-ds-group-head { padding: 6px 12px 2px; font-size: 11px; font-weight: 700; color: #909399; text-transform: uppercase; letter-spacing: .5px; }
.pnw-ds-opt { padding: 5px 12px 5px 20px; cursor: pointer; font-size: 13px; color: #303133; }
.pnw-ds-opt:hover { background: #f5f7fa; }
.pnw-ds-opt.active { color: var(--el-color-primary, #409eff); font-weight: 600; background: var(--el-color-primary-light-9, #ecf5ff); }
.pnw-ds-empty { padding: 16px; text-align: center; color: #909399; font-size: 13px; }
</style>
