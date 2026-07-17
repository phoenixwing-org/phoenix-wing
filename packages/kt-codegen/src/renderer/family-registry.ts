// SPDX-License-Identifier: Apache-2.0

import { ktCodegenGetBlock, type KtCodegenBlockKey } from "../blocks/legacy-blocks.js";
import type { KtCodegenMarkerRegion } from "../KtCodegenMarker.js";
import type { KtCodegenItem } from "../KtCodegenItem.js";
import type {
  KtCodegenRendererContext,
  KtCodegenRendererResult,
} from "../KtCodegenRenderer.js";
import {
  ktCodegenAppendRegionArtifact,
  ktCodegenLegacyDeprecatedDiagnostic,
} from "./legacy-compatibility.js";

/** 一个 family 对单个安全 Marker 区域的纯渲染结果。 */
export interface KtCodegenRenderedRegion {
  readonly items: readonly KtCodegenItem[];
  readonly lines: readonly string[];
}

/**
 * Block family strategy：注册表只映射能力，模板实现留在各 family 模块。
 *
 * `services` 由 Core 注入并保持只读，避免 family 反向依赖 Core。
 */
export interface KtCodegenRendererFamily<TServices> {
  readonly id: string;
  readonly blockKeys: readonly KtCodegenBlockKey[];
  renderRegion(
    context: KtCodegenRendererContext,
    region: KtCodegenMarkerRegion,
    services: TServices,
  ): KtCodegenRenderedRegion;
}

export interface KtCodegenFamilyRegistryOptions {
  readonly supportedTargets: readonly KtCodegenRendererContext["target"][];
  readonly noFamilyMessage: (target: KtCodegenRendererContext["target"]) => string;
}

/** 建立不可重复的 block → family 能力映射；注册表本身不含模板。 */
export function ktCodegenCreateRendererFamilyRegistry<TServices>(
  families: readonly KtCodegenRendererFamily<TServices>[],
): ReadonlyMap<KtCodegenBlockKey, KtCodegenRendererFamily<TServices>> {
  const registry = new Map<KtCodegenBlockKey, KtCodegenRendererFamily<TServices>>();
  for (const family of families) {
    for (const blockKey of family.blockKeys) {
      const existing = registry.get(blockKey);
      if (existing) {
        throw new Error(
          `Renderer block ${blockKey} is registered by both ${existing.id} and ${family.id}.`,
        );
      }
      registry.set(blockKey, family);
    }
  }
  return registry;
}

/** 用 family 注册表生成一个目标，统一处理 artifact 绑定、兼容告警和待迁移诊断。 */
export function ktCodegenRenderRegisteredFamilies<TServices>(
  context: KtCodegenRendererContext,
  services: TServices,
  families: readonly KtCodegenRendererFamily<TServices>[],
  options: KtCodegenFamilyRegistryOptions,
): KtCodegenRendererResult {
  const registry = ktCodegenCreateRendererFamilyRegistry(families);
  const artifacts: KtCodegenRendererResult["artifacts"][number][] = [];
  const diagnostics: KtCodegenRendererResult["diagnostics"][number][] = [];
  const requestedBlocks = new Set(context.blockKeys);

  for (const region of context.markerRegions) {
    const family = registry.get(region.blockKey);
    if (
      !family ||
      !requestedBlocks.has(region.blockKey) ||
      ktCodegenGetBlock(region.blockKey).target !== context.target
    ) {
      continue;
    }
    const rendered = family.renderRegion(context, region, services);
    const artifactCount = artifacts.length;
    ktCodegenAppendRegionArtifact(
      context,
      region,
      rendered.items,
      rendered.lines,
      artifacts,
      diagnostics,
    );
    if (
      artifacts.length > artifactCount &&
      ktCodegenGetBlock(region.blockKey).legacyState === "legacy-deprecated"
    ) {
      diagnostics.push(ktCodegenLegacyDeprecatedDiagnostic(region));
    }
  }

  const targetBlocks = context.blockKeys.filter(
    (blockKey) => ktCodegenGetBlock(blockKey).target === context.target,
  );
  const pendingBlocks = targetBlocks.filter((blockKey) => !registry.has(blockKey));
  const targetSupported = options.supportedTargets.includes(context.target);
  const status = targetSupported && pendingBlocks.length === 0 ? "ready" : "scaffold";
  if (status === "scaffold") {
    diagnostics.push({
      code: "renderer.blocks-pending",
      severity: "info",
      message: pendingBlocks.length > 0
        ? `${context.target} still has pending blocks: ${pendingBlocks.join(", ")}.`
        : options.noFamilyMessage(context.target),
      path: { source: "renderer", field: context.target },
    });
  }

  return { status, artifacts, diagnostics };
}
