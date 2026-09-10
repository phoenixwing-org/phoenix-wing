// SPDX-License-Identifier: Apache-2.0

/**
 * Independent generated-code rules revision, not an application/package version
 * or the legacy JSON / Analyze Plan schema. Increment when parsing/rendering
 * semantics change so consumers can reject previously generated cached plans.
 * 1.0.0 starts the independent series, including the corrected CAA Combo
 * selection notification; the historical 5.0.0 (2024) app stamp is not its base.
 */
// 1.0.1 fixes constructor closing-marker indentation using the following source line.
// 1.0.2 adds each supported CAA Combo's own notes before UPDATE DIALOG value assignment.
export const KT_CODEGEN_GENERATOR_VERSION = "1.0.2" as const;
