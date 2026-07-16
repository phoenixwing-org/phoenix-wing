import {
  PNW_CAD_NATIVE_PROTOCOL,
  PNW_CAD_NATIVE_V1_CAPABILITIES,
  type PnwCadNativeProtocolVersion,
} from "./nativeV1.js";
import {
  PNW_CAD_QUERY_V1_READ_COMMANDS,
  pnwIsCadQueryContractV1,
  type PnwCadQueryContractV1,
} from "./queryV1.js";

export const PNW_CAD_NATIVE_PROVIDER_SCHEMA_VERSION = 1 as const;

export interface PnwCadNativeProviderToolV1 {
  readonly relative_path: string;
  readonly sha256: string;
  readonly capabilities: readonly string[];
}

export interface PnwCadNativeProviderManifestV1 {
  readonly schema_version: typeof PNW_CAD_NATIVE_PROVIDER_SCHEMA_VERSION;
  readonly provider_id: string;
  readonly provider_version: string;
  readonly platform: string;
  readonly arch: string;
  readonly native_protocol: {
    readonly kind: typeof PNW_CAD_NATIVE_PROTOCOL;
    readonly version: PnwCadNativeProtocolVersion;
    readonly supported_protocol_majors: readonly number[];
    readonly version_query: true;
    readonly version_query_args: readonly ["--protocol-version"];
    readonly legacy_compatible: boolean;
  };
  readonly workspace_schema: {
    readonly schema_id: string;
    readonly schema_version: number;
    readonly ddl_sha256: string;
    readonly database_filename: string;
  };
  readonly database_query_protocol?: PnwCadQueryContractV1;
  readonly tools: Readonly<
    Record<"fcstd-read" | "fcstd-xlink", PnwCadNativeProviderToolV1>
    & Partial<Record<"fcstd-query", PnwCadNativeProviderToolV1>>
  >;
}

export function pnwIsCadNativeProviderManifestV1(
  value: unknown,
): value is PnwCadNativeProviderManifestV1 {
  if (!isRecord(value)) return false;
  if (value.schema_version !== PNW_CAD_NATIVE_PROVIDER_SCHEMA_VERSION
      || !isNonEmptyString(value.provider_id)
      || !isNonEmptyString(value.provider_version)
      || !isToken(value.platform)
      || !isToken(value.arch)) return false;

  const protocol = value.native_protocol;
  if (!isRecord(protocol)
      || protocol.kind !== PNW_CAD_NATIVE_PROTOCOL
      || !isVersion(protocol.version)
      || !isUniqueUnsigned16Array(protocol.supported_protocol_majors)
      || !protocol.supported_protocol_majors.includes(protocol.version.major)
      || protocol.version_query !== true
      || !Array.isArray(protocol.version_query_args)
      || protocol.version_query_args.length !== 1
      || protocol.version_query_args[0] !== "--protocol-version"
      || typeof protocol.legacy_compatible !== "boolean") return false;

  const schema = value.workspace_schema;
  if (!isRecord(schema)
      || !isNonEmptyString(schema.schema_id)
      || !Number.isInteger(schema.schema_version)
      || Number(schema.schema_version) < 1
      || !isSha256(schema.ddl_sha256)
      || !isPortableFilename(schema.database_filename)) return false;

  if (!isRecord(value.tools)) return false;
  for (const tool of ["fcstd-read", "fcstd-xlink"] as const) {
    const entry = value.tools[tool];
    if (!isProviderTool(entry)) return false;
    const capabilities = entry.capabilities;
    if (!PNW_CAD_NATIVE_V1_CAPABILITIES[tool].every(
          (capability) => capabilities.includes(capability),
        )) return false;
  }
  const queryProtocol = value.database_query_protocol;
  const queryTool = value.tools["fcstd-query"];
  if ((queryProtocol === undefined) !== (queryTool === undefined)) return false;
  if (queryProtocol !== undefined) {
    if (!pnwIsCadQueryContractV1(queryProtocol)
        || queryProtocol.schema.id !== schema.schema_id
        || queryProtocol.schema.version !== schema.schema_version
        || queryProtocol.schema.ddl_sha256 !== schema.ddl_sha256
        || !isProviderTool(queryTool)
        || !PNW_CAD_QUERY_V1_READ_COMMANDS.every(
          (capability) => queryTool.capabilities.includes(capability),
        )) return false;
  }
  return true;
}

function isProviderTool(value: unknown): value is PnwCadNativeProviderToolV1 {
  return isRecord(value)
    && isSafeRelativePath(value.relative_path)
    && isSha256(value.sha256)
    && isUniqueNonEmptyStringArray(value.capabilities);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isToken(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9_-]+$/u.test(value);
}

function isVersion(value: unknown): value is PnwCadNativeProtocolVersion {
  return isRecord(value) && isUnsigned16(value.major) && isUnsigned16(value.minor);
}

function isUnsigned16(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 0xffff;
}

function isUniqueUnsigned16Array(value: unknown): value is number[] {
  return Array.isArray(value)
    && value.length > 0
    && value.every(isUnsigned16)
    && new Set(value).size === value.length;
}

function isUniqueNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.length > 0
    && value.every(isNonEmptyString)
    && new Set(value).size === value.length;
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

function isPortableFilename(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9._-]+$/u.test(value) && value !== "." && value !== "..";
}

function isSafeRelativePath(value: unknown): value is string {
  if (typeof value !== "string" || !value || value.includes("\\") || value.startsWith("/")) return false;
  const segments = value.split("/");
  return segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}
