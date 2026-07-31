<script setup lang="ts">
withDefaults(
  defineProps<{
    /** 非装饰用途的可访问名称。 */
    title?: string;
    /** 邻近已有品牌文字时设为 true，避免重复朗读。 */
    decorative?: boolean;
  }>(),
  {
    title: "Phoenix Wing",
    decorative: false,
  },
);
</script>

<template>
  <svg
    class="pnw-phoenix-wing-mark"
    viewBox="0 0 128 128"
    xmlns="http://www.w3.org/2000/svg"
    :role="decorative ? undefined : 'img'"
    :aria-label="decorative ? undefined : title"
    :aria-hidden="decorative ? 'true' : undefined"
    focusable="false"
  >
    <title v-if="!decorative">{{ title }}</title>
    <defs>
      <linearGradient
        id="pnw-phoenix-wing-mark-left-wing"
        x1="20"
        y1="28"
        x2="68"
        y2="112"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#ffb21a" />
        <stop offset=".48" stop-color="#ff5b21" />
        <stop offset="1" stop-color="#e91e4d" />
      </linearGradient>
      <linearGradient
        id="pnw-phoenix-wing-mark-right-wing"
        x1="108"
        y1="28"
        x2="60"
        y2="112"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#15d8dc" />
        <stop offset=".5" stop-color="#178be8" />
        <stop offset="1" stop-color="#6b4bd8" />
      </linearGradient>
      <linearGradient
        id="pnw-phoenix-wing-mark-flame"
        x1="64"
        y1="45"
        x2="64"
        y2="108"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#fff0a6" />
        <stop offset=".38" stop-color="#ffc126" />
        <stop offset="1" stop-color="#ff6b18" />
      </linearGradient>
    </defs>
    <path
      fill="url(#pnw-phoenix-wing-mark-left-wing)"
      d="M62 111C45 101 30 90 19 75c11 5 20 8 29 9C32 74 21 61 15 45c14 11 26 18 38 21C39 53 31 39 29 21c14 20 28 32 41 38l-8 52Z"
    />
    <path
      fill="url(#pnw-phoenix-wing-mark-right-wing)"
      d="M66 111c17-10 32-21 43-36-11 5-20 8-29 9 16-10 27-23 33-39-14 11-26 18-38 21 14-13 22-27 24-45-14 20-28 32-41 38l8 52Z"
    />
    <path
      fill="url(#pnw-phoenix-wing-mark-flame)"
      d="M64 112c-9-14-19-25-14-40 2 8 6 12 10 14-2-12 2-23 12-34-2 12 7 17 7 29 0 12-8 22-15 31Z"
    />
    <path
      fill="#fff"
      fill-opacity=".88"
      d="M64 101c-5-8-8-14-4-22 1 5 4 7 7 9-1-6 1-11 5-16 0 7 4 10 3 16-1 6-6 10-11 13Z"
    />
  </svg>
</template>

<style scoped>
.pnw-phoenix-wing-mark {
  width: var(--pnw-phoenix-wing-mark-size, 32px);
  height: var(--pnw-phoenix-wing-mark-size, 32px);
  display: block;
  flex: none;
  overflow: visible;
}
</style>
