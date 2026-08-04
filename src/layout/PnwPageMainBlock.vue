<template>
  <div class="pnw-page-main-block">
    <slot />
  </div>
</template>

<style scoped>
.pnw-page-main-block {
  position: relative;
  width: 100%;
  min-width: 0;
  min-height: 100%;
  margin: 0;
  padding: var(--pnw-page-main-block-padding, var(--pnw-page-body-padding, 10px));
  box-sizing: border-box;
  color: inherit;
  background: var(--pnw-page-main-block-bg, transparent);
}
</style>
