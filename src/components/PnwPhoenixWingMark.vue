<script setup lang="ts">
import pnwPhoenixWingMarkSvg from "../../assets/phoenix-wing-mark.svg?raw";

const pnwPhoenixWingMarkContent = pnwPhoenixWingMarkSvg
  .replace(/^<svg[^>]*>/u, "")
  .replace(/\s*<title[^>]*>[\s\S]*?<\/title>/u, "")
  .replace(/\s*<desc[^>]*>[\s\S]*?<\/desc>/u, "")
  .replace(/<\/svg>\s*$/u, "");

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
    <!-- v-html 只渲染 Wing 仓内的权威静态资产，不接收消费者内容。 -->
    <g v-html="pnwPhoenixWingMarkContent" />
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
