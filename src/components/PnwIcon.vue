<script setup lang="ts">
import type { PnwIconName } from "../icons/pnwIconCatalog.js";

withDefaults(defineProps<{
  name: PnwIconName;
  size?: number | string;
  title?: string;
  decorative?: boolean;
}>(), {
  size: 24,
  title: "",
  decorative: true,
});
</script>

<template>
  <svg
    class="pnw-icon"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    :width="size"
    :height="size"
    :role="decorative ? undefined : 'img'"
    :aria-label="decorative ? undefined : (title || name)"
    :aria-hidden="decorative ? 'true' : undefined"
    focusable="false"
  >
    <title v-if="!decorative">{{ title || name }}</title>

    <g v-if="name === 'settings'">
      <circle cx="12" cy="12" r="3.25" />
      <circle cx="12" cy="12" r="7.25" stroke-dasharray="2.2 2.2" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
    </g>
    <g v-else-if="name === 'more'" fill="currentColor" stroke="none">
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </g>
    <path v-else-if="name === 'close'" d="M5 5l14 14M19 5 5 19" />
    <path v-else-if="name === 'chevron-left'" d="m15 5-7 7 7 7" />
    <path v-else-if="name === 'chevron-right'" d="m9 5 7 7-7 7" />
    <path v-else-if="name === 'chevron-up'" d="m5 15 7-7 7 7" />
    <path v-else-if="name === 'chevron-down'" d="m5 9 7 7 7-7" />
    <g v-else-if="name === 'panel-left'">
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <path d="M8.5 3v18" />
    </g>
    <g v-else-if="name === 'panel-bottom'">
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <path d="M3 15.5h18" />
    </g>
    <g v-else-if="name === 'panel-right'">
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <path d="M15.5 3v18" />
    </g>
    <g v-else-if="name === 'navigation-tree'">
      <path d="M5 5h4M5 12h7M5 19h10" />
      <circle cx="4" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="19" r="1" fill="currentColor" stroke="none" />
      <path d="M9 5v7" />
    </g>
    <g v-else-if="name === 'compact-toolbar'">
      <rect x="3" y="7" width="18" height="10" rx="2" />
      <circle cx="7" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="17" cy="12" r="1.5" />
    </g>
    <g v-else-if="name === 'compact-toolbar-title'">
      <rect x="3" y="7" width="18" height="10" rx="2" />
      <circle cx="7" cy="12" r="1.5" />
      <path d="M11 10h7M11 14h5" />
    </g>
    <g v-else-if="name === 'ribbon'">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 15h18M9 4v11M15 4v11" />
      <circle cx="6" cy="9" r="1.5" />
      <circle cx="12" cy="9" r="1.5" />
      <circle cx="18" cy="9" r="1.5" />
    </g>
    <g v-else-if="name === 'home'">
      <path d="m3.5 11 8.5-7 8.5 7" />
      <path d="M5.5 10v10h13V10M9.5 20v-6h5v6" />
    </g>
    <g v-else-if="name === 'search'">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </g>
    <path v-else-if="name === 'add'" d="M12 4v16M4 12h16" />
    <g v-else-if="name === 'refresh'">
      <path d="M19.5 7.5V3.8l-2.3 2.3A8 8 0 0 0 4.4 9" />
      <path d="M4.5 16.5v3.7l2.3-2.3A8 8 0 0 0 19.6 15" />
    </g>
    <path v-else-if="name === 'folder'" d="M3 6.5h6l2-2h3.5a2 2 0 0 1 2 2V8H21v10.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    <g v-else>
      <path d="M6 2.75h8l4 4v14.5H6Z" />
      <path d="M14 2.75v4h4M9 12h6M9 16h6" />
    </g>
  </svg>
</template>

<style scoped>
.pnw-icon {
  display: block;
  flex: none;
  overflow: visible;
  color: inherit;
}
</style>
