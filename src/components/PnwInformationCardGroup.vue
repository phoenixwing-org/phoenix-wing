<script setup lang="ts">
import { computed } from "vue";
import type {
  PnwInformationCardDefinition,
  PnwInformationCardGroupDefinition,
} from "../types/PnwInformationCardGroup.js";
import PnwInformationBlock from "./PnwInformationBlock.vue";

const props = withDefaults(defineProps<{
  definition: PnwInformationCardGroupDefinition;
  /** 可选受控状态；只记录显式允许折叠的卡片。 */
  expandedCardIds?: readonly string[];
}>(), {
  expandedCardIds: undefined,
});

const emit = defineEmits<{
  "update:expandedCardIds": [cardIds: readonly string[]];
  toggle: [payload: { cardId: string; expanded: boolean }];
}>();

const pnwExpandedCardIdSet = computed(() => new Set(props.expandedCardIds));

function pnwResolveCardExpanded(card: PnwInformationCardDefinition): boolean | undefined {
  if (!card.collapsible || props.expandedCardIds === undefined) return undefined;
  return pnwExpandedCardIdSet.value.has(card.id);
}

function pnwUpdateCardExpanded(card: PnwInformationCardDefinition, expanded: boolean): void {
  if (!card.collapsible) return;
  if (props.expandedCardIds !== undefined) {
    const next = new Set(props.expandedCardIds);
    if (expanded) next.add(card.id);
    else next.delete(card.id);
    emit("update:expandedCardIds", [...next]);
  }
  emit("toggle", { cardId: card.id, expanded });
}
</script>

<template>
  <section
    class="pnw-information-card-group"
    role="region"
    :aria-label="definition.ariaLabel"
    :data-pnw-information-card-group-id="definition.id"
  >
    <slot
      v-for="(card, index) in definition.cards"
      :key="card.id"
      name="card"
      :card="card"
      :index="index"
      :expanded="pnwResolveCardExpanded(card) ?? card.defaultExpanded ?? true"
    >
      <PnwInformationBlock
        class="pnw-information-card-group-card"
        :definition="card"
        :collapsible="card.collapsible ?? false"
        :expanded="pnwResolveCardExpanded(card)"
        @update:expanded="pnwUpdateCardExpanded(card, $event)"
      >
        <template v-if="$slots['card-header']" #header="slotProps">
          <slot
            name="card-header"
            :card="card"
            :index="index"
            :expanded="slotProps.expanded"
          />
        </template>
        <template v-if="$slots['card-item']" #item="slotProps">
          <slot
            name="card-item"
            :card="card"
            :card-index="index"
            :item="slotProps.item"
            :item-index="slotProps.index"
          />
        </template>
        <template v-if="$slots['card-footer']" #footer>
          <slot name="card-footer" :card="card" :index="index" />
        </template>
      </PnwInformationBlock>
    </slot>
  </section>
</template>

<style scoped>
.pnw-information-card-group {
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(min(100%, var(--pnw-information-card-min-width, 240px)), 1fr)
  );
  width: 100%;
  min-width: 0;
  padding: var(--pnw-information-card-group-padding, 8px 12px);
  gap: var(--pnw-information-card-group-gap, 8px);
  box-sizing: border-box;
}

.pnw-information-card-group-card {
  min-width: 0;
  height: 100%;
}
</style>
