import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

interface UsageRecord {
  groupName: string
  value: string
  label: string
  count: number
  lastUsedAt: number  // timestamp
}

const STORAGE_KEY = 'pnw-dict-usage-v1'

/** 字典使用记录 Pinia store — localStorage 持久化 */
export const usePnwDictUsageStore = defineStore('pnwDictUsage', () => {
  const records = ref<UsageRecord[]>(load())

  function load(): UsageRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records.value)) } catch { /* ignore */ }
  }

  /** 记录一次使用 */
  function record(groupName: string, value: string, label: string) {
    const idx = records.value.findIndex(r => r.groupName === groupName && r.value === value)
    if (idx >= 0) {
      records.value[idx] = { ...records.value[idx], count: records.value[idx].count + 1, lastUsedAt: Date.now() }
    } else {
      records.value.push({ groupName, value, label, count: 1, lastUsedAt: Date.now() })
    }
    save()
  }

  /** 按使用次数降序排列 */
  const frequent = computed(() =>
    [...records.value].sort((a, b) => b.count - a.count)
  )

  /** 按最近使用时间降序排列 */
  const recent = computed(() =>
    [...records.value].sort((a, b) => b.lastUsedAt - a.lastUsedAt)
  )

  /** 获取某分组的频繁项（前 N） */
  function topForGroup(groupName: string, n = 5) {
    return records.value
      .filter(r => r.groupName === groupName)
      .sort((a, b) => b.count - a.count)
      .slice(0, n)
  }

  return { records, record, frequent, recent, topForGroup, load, save }
})

/** composable — 页面级封装 */
export function usePnwDictUsage() {
  const store = usePnwDictUsageStore()
  return store
}
