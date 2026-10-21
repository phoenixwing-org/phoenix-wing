import { computed, inject, onBeforeUnmount, provide, shallowReactive, type InjectionKey, type Ref } from "vue";
import type { PnwViewPresentationMode } from "../types/PnwViewPresentation.js";

export const PNW_VIEW_DETACH_ACTION_ID = "pnw.view.detach";
export const PNW_VIEW_REATTACH_ACTION_ID = "pnw.view.reattach";
type PnwActionId = typeof PNW_VIEW_DETACH_ACTION_ID | typeof PNW_VIEW_REATTACH_ACTION_ID;
interface PnwActionClaim { id: Readonly<Ref<PnwActionId>>; active: Readonly<Ref<boolean>>; priority: number }
interface PnwActionScope {
  claims: Map<symbol, PnwActionClaim>;
  mode: Readonly<Ref<PnwViewPresentationMode>>;
  detach(): void;
  reattach(): void;
}
const pnwActionScopeKey: InjectionKey<PnwActionScope> = Symbol("pnw-view-action-scope");

/** Internal, per-Portal registry; never shared across independent Views. */
export function pnwProvidePresentationActions(commands: Omit<PnwActionScope, "claims">): PnwActionScope {
  const scope = { ...commands, claims: shallowReactive(new Map<symbol, PnwActionClaim>()) };
  provide(pnwActionScopeKey, scope);
  return scope;
}
export function usePnwPresentationActions(): PnwActionScope | undefined {
  return inject(pnwActionScopeKey, undefined);
}
export function usePnwPresentationActionClaim(scope: PnwActionScope | undefined, claim: PnwActionClaim): Readonly<Ref<boolean>> {
  const owner = Symbol("pnw-action-owner");
  scope?.claims.set(owner, claim);
  onBeforeUnmount(() => scope?.claims.delete(owner));
  return computed(() => {
    if (!claim.active.value) return false;
    if (!scope) return true;
    let winner: symbol | undefined;
    let priority = -Infinity;
    for (const [token, candidate] of scope.claims) {
      if (candidate.active.value && candidate.id.value === claim.id.value && candidate.priority > priority) {
        winner = token;
        priority = candidate.priority;
      }
    }
    return winner === owner;
  });
}
