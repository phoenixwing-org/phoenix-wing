<script setup lang="ts">
import { computed } from "vue";
import { pwwFixtureResourceQuery, pwwFixtureSelectedResource } from "./PwwFixtureResourceToolState.js";
const pwwResources = ["sample.dat", "inspection.json", "preview.svg"];
const pwwMatches = computed(() => pwwResources.filter((name) => name.includes(pwwFixtureResourceQuery.value.trim())));
</script>

<template>
  <section class="pww-resource-browser" aria-label="工程资源">
    <input v-model="pwwFixtureResourceQuery" type="search" aria-label="搜索工程资源" placeholder="搜索资源">
    <label v-for="name in pwwMatches" :key="name">
      <input v-model="pwwFixtureSelectedResource" type="radio" :value="name">
      <span>{{ name }}</span>
    </label>
    <p v-if="!pwwMatches.length">没有匹配的资源</p>
    <output>{{ pwwFixtureSelectedResource }}</output>
  </section>
</template>

<style scoped>
.pww-resource-browser { display: grid; gap: 12px; padding: 12px; min-width: 0; }
.pww-resource-browser > input { width: 100%; box-sizing: border-box; min-height: 32px; border: 1px solid var(--pnw-workbench-border); border-radius: 4px; background: var(--pnw-workbench-surface); color: inherit; padding: 4px 8px; }
.pww-resource-browser label { display: flex; gap: 8px; align-items: center; }
.pww-resource-browser output { overflow-wrap: anywhere; color: var(--pnw-workbench-muted); }
</style>
