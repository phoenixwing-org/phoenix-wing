<script setup lang="ts">
import { ref } from "vue";
import {
  PnwLogBlock,
  PnwProblemsBlock,
  type PnwLogEntry,
  type PnwLogLevel,
  type PnwProblemItem,
  type PnwProblemSeverity,
} from "phoenix-wing";

defineProps<{
  title: string;
  activeNodeId: string;
  activeTabId: string;
  entries: readonly PnwLogEntry[];
  problems: readonly PnwProblemItem[];
  onClearLog: (channel?: string) => void;
  onOpenProblem: (item: PnwProblemItem) => void;
}>();

const pwwLogChannel = ref("");
const pwwLogLevels = ref<readonly PnwLogLevel[]>(["debug", "info", "warning", "error"]);
const pwwLogFilter = ref("");
const pwwProblemSeverities = ref<readonly PnwProblemSeverity[]>(["error", "warning", "info"]);
const pwwProblemSource = ref("");
const pwwProblemFilter = ref("");
</script>

<template>
  <PnwLogBlock
    v-if="activeTabId === 'output'"
    v-model:channel="pwwLogChannel"
    v-model:levels="pwwLogLevels"
    v-model:filter-text="pwwLogFilter"
    :entries="entries"
    @clear="onClearLog"
  />
  <PnwProblemsBlock
    v-else
    v-model:severities="pwwProblemSeverities"
    v-model:source="pwwProblemSource"
    v-model:filter-text="pwwProblemFilter"
    :items="problems"
    @open="onOpenProblem"
  />
</template>
