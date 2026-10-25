// SPDX-License-Identifier: Apache-2.0

import { pnwCreateContentBlockClass, PNW_CONTENT_BLOCK_TAG } from "./PnwContentBlockFactory.js";
export * from "./PnwContentBlockFactory.js";

export const PnwContentBlock = pnwCreateContentBlockClass();
export type PnwContentBlock = InstanceType<typeof PnwContentBlock>;

export function pnwDefineContentBlock(): typeof PnwContentBlock {
  const pnwRegistered = customElements.get(PNW_CONTENT_BLOCK_TAG);
  if (pnwRegistered) return pnwRegistered as typeof PnwContentBlock;
  customElements.define(PNW_CONTENT_BLOCK_TAG, PnwContentBlock); return PnwContentBlock;
}
declare global { interface HTMLElementTagNameMap { "pnw-content-block": PnwContentBlock } }
