/** Frozen identifier for the unversioned JSON emitted by the original Desk Tools Rust CLI. */
export const PNW_CAD_LEGACY_PROTOCOL = "desk-tools-v0" as const;

export * from "./nativeV1.js";
export * from "./providerV1.js";
export * from "./queryV1.js";

export const PNW_CAD_LEGACY_NATIVE_TOOLS = ["fcstd-read", "fcstd-xlink"] as const;

export type PnwCadLegacyNativeTool = (typeof PNW_CAD_LEGACY_NATIVE_TOOLS)[number];

export type PnwLegacyFcstdPropertyValue = string | number;

export interface PnwLegacyFcstdPlacement {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly q0: number;
  readonly q1: number;
  readonly q2: number;
  readonly q3: number;
}

export interface PnwLegacyFcstdXlinkRef {
  readonly file: string;
  readonly label: string | null;
}

/**
 * Exact legacy object shape. The two camelCase fields are intentional and must
 * remain until consumers opt into the future versioned snake_case envelope.
 */
export interface PnwLegacyFcstdObject {
  readonly name: string;
  readonly label: string;
  readonly typeId: string;
  readonly children: readonly string[];
  readonly properties: Readonly<Record<string, PnwLegacyFcstdPropertyValue>>;
  readonly material: string | null;
  readonly placement: PnwLegacyFcstdPlacement | null;
  readonly isValidBomItem: boolean;
  readonly level: number;
}

export interface PnwLegacyFcstdDocument {
  readonly objects: readonly PnwLegacyFcstdObject[];
  readonly xlinks: readonly PnwLegacyFcstdXlinkRef[];
  readonly root_names: readonly string[];
}

export function pnwIsLegacyFcstdDocument(value: unknown): value is PnwLegacyFcstdDocument {
  if (!pnwIsRecord(value)) return false;
  const candidate = value as Partial<PnwLegacyFcstdDocument>;
  return Array.isArray(candidate.objects)
    && candidate.objects.every(pnwIsLegacyFcstdObject)
    && Array.isArray(candidate.xlinks)
    && candidate.xlinks.every(pnwIsLegacyFcstdXlinkRef)
    && Array.isArray(candidate.root_names)
    && candidate.root_names.every((name) => typeof name === "string");
}

function pnwIsLegacyFcstdObject(value: unknown): value is PnwLegacyFcstdObject {
  if (!pnwIsRecord(value)) return false;
  const candidate = value as Partial<PnwLegacyFcstdObject>;
  return typeof candidate.name === "string"
    && typeof candidate.label === "string"
    && typeof candidate.typeId === "string"
    && Array.isArray(candidate.children)
    && candidate.children.every((child) => typeof child === "string")
    && pnwIsLegacyFcstdProperties(candidate.properties)
    && (typeof candidate.material === "string" || candidate.material === null)
    && (candidate.placement === null || pnwIsLegacyFcstdPlacement(candidate.placement))
    && typeof candidate.isValidBomItem === "boolean"
    && Number.isInteger(candidate.level)
    && candidate.level! >= 0
    && candidate.level! <= 0xffff_ffff;
}

function pnwIsLegacyFcstdProperties(
  value: unknown,
): value is Readonly<Record<string, PnwLegacyFcstdPropertyValue>> {
  return pnwIsRecord(value)
    && Object.values(value).every((property) => typeof property === "string"
      || (typeof property === "number" && Number.isFinite(property)));
}

function pnwIsLegacyFcstdPlacement(value: unknown): value is PnwLegacyFcstdPlacement {
  if (!pnwIsRecord(value)) return false;
  return ["x", "y", "z", "q0", "q1", "q2", "q3"].every((key) => (
    typeof value[key] === "number" && Number.isFinite(value[key])
  ));
}

function pnwIsLegacyFcstdXlinkRef(value: unknown): value is PnwLegacyFcstdXlinkRef {
  if (!pnwIsRecord(value)) return false;
  return typeof value.file === "string"
    && (typeof value.label === "string" || value.label === null);
}

function pnwIsRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value)
    && typeof value === "object"
    && !Array.isArray(value);
}
