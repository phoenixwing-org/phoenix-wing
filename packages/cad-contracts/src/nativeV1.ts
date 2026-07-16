export const PNW_CAD_NATIVE_PROTOCOL = "phoenix-cad-native" as const;

export const PNW_CAD_NATIVE_PROTOCOL_VERSION = Object.freeze({
  major: 1,
  minor: 0,
} as const);

export const PNW_CAD_NATIVE_SUPPORTED_PROTOCOL_MAJORS = Object.freeze([1] as const);

export const PNW_CAD_NATIVE_V1_CAPABILITIES = Object.freeze({
  "fcstd-read": Object.freeze(["read"] as const),
  "fcstd-xlink": Object.freeze(["scan"] as const),
});

export const PNW_CAD_NATIVE_V1_ERROR_CODES = Object.freeze({
  invalidArguments: "invalid_arguments",
  unsupportedProtocol: "unsupported_protocol",
  unsupportedOperation: "unsupported_operation",
  ioError: "io_error",
  invalidFcstdArchive: "invalid_fcstd_archive",
  missingDocumentXml: "missing_document_xml",
  invalidDocumentXml: "invalid_document_xml",
  invalidNumericValue: "invalid_numeric_value",
  internalError: "internal_error",
} as const);

export type PnwCadNativeV1Tool = keyof typeof PNW_CAD_NATIVE_V1_CAPABILITIES;
export type PnwCadNativeV1Capability =
  (typeof PNW_CAD_NATIVE_V1_CAPABILITIES)[PnwCadNativeV1Tool][number];
export type PnwCadNativeV1KnownErrorCode =
  (typeof PNW_CAD_NATIVE_V1_ERROR_CODES)[keyof typeof PNW_CAD_NATIVE_V1_ERROR_CODES];

export interface PnwCadNativeProtocolVersion {
  readonly major: number;
  readonly minor: number;
}

export interface PnwCadNativeProtocolInfo {
  readonly protocol: typeof PNW_CAD_NATIVE_PROTOCOL;
  readonly protocol_version: PnwCadNativeProtocolVersion;
  readonly tool: string;
  readonly tool_version: string;
  readonly capabilities: readonly string[];
  readonly supported_protocol_majors: readonly number[];
  readonly legacy_compatible: boolean;
}

export interface PnwCadNativeV1EnvelopeBase {
  readonly protocol: typeof PNW_CAD_NATIVE_PROTOCOL;
  readonly protocol_version: PnwCadNativeProtocolVersion;
  readonly tool: string;
  readonly operation: string;
}

export interface PnwCadNativeV1Success<T> extends PnwCadNativeV1EnvelopeBase {
  readonly ok: true;
  readonly result: T;
}

export interface PnwCadNativeV1Error {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
}

export interface PnwCadNativeV1Failure extends PnwCadNativeV1EnvelopeBase {
  readonly ok: false;
  readonly error: PnwCadNativeV1Error;
}

export type PnwCadNativeV1Envelope<T> =
  | PnwCadNativeV1Success<T>
  | PnwCadNativeV1Failure;

export type PnwCadNativeV1PropertyValue = string | number;

export interface PnwCadNativeV1Placement {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly q0: number;
  readonly q1: number;
  readonly q2: number;
  readonly q3: number;
}

export interface PnwCadNativeV1XlinkRef {
  readonly file: string;
  readonly label: string | null;
}

export interface PnwCadNativeV1FcstdObject {
  readonly name: string;
  readonly label: string;
  readonly type_id: string;
  readonly children: readonly string[];
  readonly properties: Readonly<Record<string, PnwCadNativeV1PropertyValue>>;
  readonly material: string | null;
  readonly placement: PnwCadNativeV1Placement | null;
  readonly is_valid_bom_item: boolean;
  readonly level: number;
}

export interface PnwCadNativeV1FcstdDocument {
  readonly objects: readonly PnwCadNativeV1FcstdObject[];
  readonly xlinks: readonly PnwCadNativeV1XlinkRef[];
  readonly root_names: readonly string[];
}

export interface PnwCadNativeV1XlinkHit {
  readonly file: string;
  readonly label: string | null;
}

export interface PnwCadNativeV1XlinkScanResult {
  readonly hits: readonly PnwCadNativeV1XlinkHit[];
}

export type PnwCadNativeV1ReadResponse =
  PnwCadNativeV1Envelope<PnwCadNativeV1FcstdDocument>;
export type PnwCadNativeV1XlinkScanResponse =
  PnwCadNativeV1Envelope<PnwCadNativeV1XlinkScanResult>;

export function pnwIsCadNativeV1Compatible(value: unknown): value is PnwCadNativeProtocolInfo {
  return pnwIsCadNativeProtocolInfo(value)
    && PNW_CAD_NATIVE_SUPPORTED_PROTOCOL_MAJORS.some((major) => (
      value.supported_protocol_majors.includes(major)
    ));
}

export function pnwIsCadNativeProtocolInfo(value: unknown): value is PnwCadNativeProtocolInfo {
  if (!pnwIsRecord(value)) return false;
  return value.protocol === PNW_CAD_NATIVE_PROTOCOL
    && pnwIsProtocolVersion(value.protocol_version)
    && pnwIsNonEmptyString(value.tool)
    && pnwIsNonEmptyString(value.tool_version)
    && Array.isArray(value.capabilities)
    && value.capabilities.every(pnwIsNonEmptyString)
    && new Set(value.capabilities).size === value.capabilities.length
    && Array.isArray(value.supported_protocol_majors)
    && value.supported_protocol_majors.length > 0
    && value.supported_protocol_majors.every(pnwIsU16)
    && new Set(value.supported_protocol_majors).size === value.supported_protocol_majors.length
    && typeof value.legacy_compatible === "boolean";
}

export function pnwIsCadNativeV1Envelope(
  value: unknown,
): value is PnwCadNativeV1Envelope<unknown> {
  if (!pnwIsEnvelopeBase(value) || typeof value.ok !== "boolean") return false;
  if (value.ok) return Object.hasOwn(value, "result");
  if (!pnwIsRecord(value.error)) return false;
  return pnwIsNonEmptyString(value.error.code)
    && typeof value.error.message === "string"
    && typeof value.error.retryable === "boolean";
}

export function pnwIsCadNativeV1ReadSuccess(
  value: unknown,
): value is PnwCadNativeV1Success<PnwCadNativeV1FcstdDocument> {
  return pnwIsCadNativeV1Envelope(value)
    && value.ok
    && value.tool === "fcstd-read"
    && value.operation === "read"
    && pnwIsCadNativeV1FcstdDocument(value.result);
}

export function pnwIsCadNativeV1XlinkScanSuccess(
  value: unknown,
): value is PnwCadNativeV1Success<PnwCadNativeV1XlinkScanResult> {
  return pnwIsCadNativeV1Envelope(value)
    && value.ok
    && value.tool === "fcstd-xlink"
    && value.operation === "scan"
    && pnwIsRecord(value.result)
    && Array.isArray(value.result.hits)
    && value.result.hits.every(pnwIsXlinkRef);
}

export function pnwIsCadNativeV1FcstdDocument(
  value: unknown,
): value is PnwCadNativeV1FcstdDocument {
  if (!pnwIsRecord(value)) return false;
  return Array.isArray(value.objects)
    && value.objects.every(pnwIsFcstdObject)
    && Array.isArray(value.xlinks)
    && value.xlinks.every(pnwIsXlinkRef)
    && Array.isArray(value.root_names)
    && value.root_names.every((name) => typeof name === "string");
}

function pnwIsEnvelopeBase(value: unknown): value is Record<string, unknown> & PnwCadNativeV1EnvelopeBase {
  if (!pnwIsRecord(value)) return false;
  return value.protocol === PNW_CAD_NATIVE_PROTOCOL
    && pnwIsProtocolVersion(value.protocol_version)
    && value.protocol_version.major === PNW_CAD_NATIVE_PROTOCOL_VERSION.major
    && pnwIsNonEmptyString(value.tool)
    && pnwIsNonEmptyString(value.operation);
}

function pnwIsProtocolVersion(value: unknown): value is PnwCadNativeProtocolVersion {
  if (!pnwIsRecord(value)) return false;
  return pnwIsU16(value.major) && pnwIsU16(value.minor);
}

function pnwIsFcstdObject(value: unknown): value is PnwCadNativeV1FcstdObject {
  if (!pnwIsRecord(value)) return false;
  return typeof value.name === "string"
    && typeof value.label === "string"
    && typeof value.type_id === "string"
    && Array.isArray(value.children)
    && value.children.every((child) => typeof child === "string")
    && pnwIsProperties(value.properties)
    && (typeof value.material === "string" || value.material === null)
    && (value.placement === null || pnwIsPlacement(value.placement))
    && typeof value.is_valid_bom_item === "boolean"
    && pnwIsU32(value.level);
}

function pnwIsProperties(value: unknown): value is Readonly<Record<string, PnwCadNativeV1PropertyValue>> {
  return pnwIsRecord(value)
    && Object.values(value).every((property) => typeof property === "string"
      || (typeof property === "number" && Number.isFinite(property)));
}

function pnwIsPlacement(value: unknown): value is PnwCadNativeV1Placement {
  if (!pnwIsRecord(value)) return false;
  return ["x", "y", "z", "q0", "q1", "q2", "q3"].every((key) => (
    typeof value[key] === "number" && Number.isFinite(value[key])
  ));
}

function pnwIsXlinkRef(value: unknown): value is PnwCadNativeV1XlinkRef {
  if (!pnwIsRecord(value)) return false;
  return typeof value.file === "string"
    && (typeof value.label === "string" || value.label === null);
}

function pnwIsU16(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 0xffff;
}

function pnwIsU32(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 0xffff_ffff;
}

function pnwIsNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function pnwIsRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
