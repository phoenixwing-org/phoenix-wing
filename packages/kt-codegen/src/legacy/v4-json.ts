// SPDX-License-Identifier: Apache-2.0

import {
  ktCodegenHasDiagnosticErrors,
  type KtCodegenDataResult,
  type KtCodegenDiagnosticPath,
  type KtCodegenDiagnostic,
} from "../model/diagnostic.js";
import { KtCodegenItem } from "../KtCodegenItem.js";
import {
  KtCodegenParam,
  type KtCodegenSourceFormat,
} from "../KtCodegenParam.js";
import {
  KT_CODEGEN_LEGACY_V4_JSON_HEADERS,
  KT_CODEGEN_LEGACY_V4_ROOT_KEYS,
  ktCodegenNormalizeLegacyV4Header,
  type KtCodegenLegacyV4Column,
  type KtCodegenLegacyV4JsonObject,
} from "./v4-schema.js";

function ktCodegenDiagnostic(
  code: string,
  severity: "error" | "warning" | "info",
  message: string,
  path?: KtCodegenDiagnosticPath,
): KtCodegenDiagnostic {
  return path ? { code, severity, message, path } : { code, severity, message };
}

function ktCodegenIsRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ktCodegenReadString(
  value: unknown,
  field: string,
  diagnostics: KtCodegenDiagnostic[],
  path: KtCodegenDiagnosticPath,
): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    diagnostics.push(
      ktCodegenDiagnostic(
        "legacy.value-coerced-to-string",
        "warning",
        `${field} was converted from ${typeof value} to string.`,
        path,
      ),
    );
    return String(value);
  }
  diagnostics.push(
    ktCodegenDiagnostic("legacy.invalid-string", "error", `${field} must be a scalar value.`, path),
  );
  return "";
}

function ktCodegenReadInteger(
  value: unknown,
  field: string,
  diagnostics: KtCodegenDiagnostic[],
  path: KtCodegenDiagnosticPath,
): number {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^[-+]?\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }
  if (value === undefined || value === null || value === "") return 0;
  diagnostics.push(
    ktCodegenDiagnostic("legacy.invalid-integer", "error", `${field} must be an integer.`, path),
  );
  return 0;
}

function ktCodegenReadBoolean(
  value: unknown,
  field: string,
  diagnostics: KtCodegenDiagnostic[],
  path: KtCodegenDiagnosticPath,
): boolean {
  if (typeof value === "boolean") return value;
  if (value === 1) return true;
  if (value === 0 || value === undefined || value === null) return false;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "1" || normalized === "true" || normalized === "是") return true;
    if (
      normalized === "" ||
      normalized === "0" ||
      normalized === "false" ||
      normalized === "否"
    ) {
      return false;
    }
  }
  diagnostics.push(
    ktCodegenDiagnostic(
      "legacy.unknown-boolean",
      "warning",
      `${field} is not a recognized legacy boolean and was treated as false.`,
      path,
    ),
  );
  return false;
}

function ktCodegenValueAt(
  values: Partial<Record<KtCodegenLegacyV4Column, unknown>>,
  field: KtCodegenLegacyV4Column,
): unknown {
  return values[field];
}

function ktCodegenParseParameterRow(
  row: readonly unknown[],
  rowIndex: number,
  columns: readonly (KtCodegenLegacyV4Column | null)[],
  diagnostics: KtCodegenDiagnostic[],
): KtCodegenItem {
  const values: Partial<Record<KtCodegenLegacyV4Column, unknown>> = {};
  for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
    const column = columns[columnIndex];
    if (column) values[column] = row[columnIndex];
  }

  const path = (field: KtCodegenLegacyV4Column): KtCodegenDiagnosticPath => ({
    source: "json",
    row: rowIndex,
    field,
  });

  const parameter = new KtCodegenItem({
    nameSuffix: ktCodegenReadString(
      ktCodegenValueAt(values, "NameSuffix"),
      "NameSuffix",
      diagnostics,
      path("NameSuffix"),
    ),
    id: ktCodegenReadInteger(ktCodegenValueAt(values, "ID"), "ID", diagnostics, path("ID")),
    name: ktCodegenReadString(
      ktCodegenValueAt(values, "Name"),
      "Name",
      diagnostics,
      path("Name"),
    ),
    paramString: ktCodegenReadString(
      ktCodegenValueAt(values, "ParamString"),
      "ParamString",
      diagnostics,
      path("ParamString"),
    ),
    dataType: ktCodegenReadString(
        ktCodegenValueAt(values, "DataType"),
        "DataType",
        diagnostics,
        path("DataType"),
      ),
    defaultValue: ktCodegenReadString(
        ktCodegenValueAt(values, "DefaultValue"),
        "DefaultValue",
        diagnostics,
        path("DefaultValue"),
      ),
    unit: ktCodegenReadString(
        ktCodegenValueAt(values, "Unit"),
        "Unit",
        diagnostics,
        path("Unit"),
      ),
    isList: ktCodegenReadBoolean(
        ktCodegenValueAt(values, "IsList"),
        "IsList",
        diagnostics,
        path("IsList"),
      ),
    tcKind: ktCodegenReadString(
        ktCodegenValueAt(values, "TCKind"),
        "TCKind",
        diagnostics,
        path("TCKind"),
      ),
    catAttrInOut: ktCodegenReadString(
        ktCodegenValueAt(values, "CATAttrInOut"),
        "CATAttrInOut",
        diagnostics,
        path("CATAttrInOut"),
      ),
    isOnTree: ktCodegenReadBoolean(
        ktCodegenValueAt(values, "IsOnTree"),
        "IsOnTree",
        diagnostics,
        path("IsOnTree"),
      ),
    component: ktCodegenReadString(
        ktCodegenValueAt(values, "Component"),
        "Component",
        diagnostics,
        path("Component"),
      ),
    componentCount: ktCodegenReadInteger(
        ktCodegenValueAt(values, "ComponentCount"),
        "ComponentCount",
        diagnostics,
        path("ComponentCount"),
      ),
    isParamDlg: ktCodegenReadBoolean(
        ktCodegenValueAt(values, "IsParamDlg"),
        "IsParamDlg",
        diagnostics,
        path("IsParamDlg"),
      ),
    author: ktCodegenReadString(
        ktCodegenValueAt(values, "Author"),
        "Author",
        diagnostics,
        path("Author"),
      ),
    createDate: ktCodegenReadString(
        ktCodegenValueAt(values, "CreateDate"),
        "CreateDate",
        diagnostics,
        path("CreateDate"),
      ),
    notes: ktCodegenReadString(
        ktCodegenValueAt(values, "Notes"),
        "Notes",
        diagnostics,
        path("Notes"),
      ),
  });

  if (!parameter.nameSuffix) {
    diagnostics.push(
      ktCodegenDiagnostic("model.missing-name-suffix", "error", "NameSuffix is required.", path("NameSuffix")),
    );
  }
  if (!parameter.paramString) {
    diagnostics.push(
      ktCodegenDiagnostic("model.missing-symbol", "error", "ParamString is required.", path("ParamString")),
    );
  }
  if (!parameter.dataType) {
    diagnostics.push(
      ktCodegenDiagnostic("model.missing-data-type", "error", "DataType is required.", path("DataType")),
    );
  }

  return parameter;
}

/** 把已解析对象按旧 v4 协议转换为统一参数数据。 */
export function ktCodegenParseLegacyV4Object(
  input: unknown,
  sourceFormat: KtCodegenSourceFormat = "legacy-v4-json",
): KtCodegenDataResult<KtCodegenParam> {
  const diagnostics: KtCodegenDiagnostic[] = [];
  if (!ktCodegenIsRecord(input)) {
    return {
      ok: false,
      value: null,
      diagnostics: [
        ktCodegenDiagnostic("legacy.invalid-root", "error", "Legacy v4 JSON root must be an object.", {
          source: "json",
        }),
      ],
    };
  }

  const legacyType = ktCodegenReadString(input.type, "type", diagnostics, {
    source: "json",
    field: "type",
  });
  const legacyVersion = ktCodegenReadString(input.version, "version", diagnostics, {
    source: "json",
    field: "version",
  });
  if (legacyType !== "100106") {
    diagnostics.push(
      ktCodegenDiagnostic("legacy.unsupported-type", "error", `Expected type 100106, got ${legacyType}.`, {
        source: "json",
        field: "type",
      }),
    );
  }
  if (legacyVersion !== "4.0") {
    diagnostics.push(
      ktCodegenDiagnostic(
        "legacy.unsupported-version",
        "error",
        `Expected version 4.0, got ${legacyVersion}.`,
        { source: "json", field: "version" },
      ),
    );
  }

  const rawHeaders = Array.isArray(input.headers) ? input.headers : [];
  if (!Array.isArray(input.headers)) {
    diagnostics.push(
      ktCodegenDiagnostic("legacy.missing-headers", "error", "headers must be an array.", {
        source: "json",
        field: "headers",
      }),
    );
  }
  const headers = rawHeaders.map((header, index) =>
    ktCodegenReadString(header, `headers[${index}]`, diagnostics, {
      source: "json",
      column: index,
      field: "headers",
    }),
  );
  const columns = headers.map((header, index) => {
    const column = ktCodegenNormalizeLegacyV4Header(header);
    if (!column) {
      diagnostics.push(
        ktCodegenDiagnostic("legacy.unknown-header", "warning", `Unknown header ${header} was ignored.`, {
          source: "json",
          column: index,
          field: "headers",
        }),
      );
    }
    return column;
  });

  const seenColumns = new Set<KtCodegenLegacyV4Column>();
  for (const column of columns) {
    if (!column) continue;
    if (seenColumns.has(column)) {
      diagnostics.push(
        ktCodegenDiagnostic("legacy.duplicate-header", "error", `Header ${column} appears more than once.`, {
          source: "json",
          field: column,
        }),
      );
    }
    seenColumns.add(column);
  }
  for (const required of ["NameSuffix", "ID", "ParamString", "DataType"] as const) {
    if (!seenColumns.has(required)) {
      diagnostics.push(
        ktCodegenDiagnostic("legacy.required-header-missing", "error", `Required header ${required} is missing.`, {
          source: "json",
          field: required,
        }),
      );
    }
  }

  const rawData = Array.isArray(input.data) ? input.data : [];
  if (!Array.isArray(input.data)) {
    diagnostics.push(
      ktCodegenDiagnostic("legacy.missing-data", "error", "data must be an array.", {
        source: "json",
        field: "data",
      }),
    );
  }
  const items: KtCodegenItem[] = [];
  rawData.forEach((row, rowIndex) => {
    if (!Array.isArray(row)) {
      diagnostics.push(
        ktCodegenDiagnostic("legacy.invalid-row", "error", "Each data row must be an array.", {
          source: "json",
          row: rowIndex,
          field: "data",
        }),
      );
      return;
    }
    items.push(ktCodegenParseParameterRow(row, rowIndex, columns, diagnostics));
  });

  const symbols = new Set<string>();
  items.forEach((parameter, rowIndex) => {
    const identity = `${parameter.nameSuffix}\u0000${parameter.paramString}`;
    if (symbols.has(identity)) {
      diagnostics.push(
        ktCodegenDiagnostic(
          "model.duplicate-symbol",
          "error",
          `Duplicate parameter ${parameter.nameSuffix}.${parameter.paramString}.`,
          { source: "model", row: rowIndex, field: "symbol" },
        ),
      );
    }
    symbols.add(identity);
  });

  const extensions = Object.fromEntries(
    Object.entries(input).filter(([key]) => !KT_CODEGEN_LEGACY_V4_ROOT_KEYS.has(key)),
  );
  const spec = new KtCodegenParam({
    kind: "kt.codegen",
    schemaVersion: 1,
    source: {
      format: sourceFormat,
      legacyType,
      legacyVersion,
      headers,
      extensions,
    },
    namePrefix: ktCodegenReadString(input.NamePrefix, "NamePrefix", diagnostics, {
        source: "json",
        field: "NamePrefix",
      }),
    nameMiddle: ktCodegenReadString(input.NameMiddle, "NameMiddle", diagnostics, {
        source: "json",
        field: "NameMiddle",
      }),
    nameSpace: ktCodegenReadString(input.NameSpace, "NameSpace", diagnostics, {
        source: "json",
        field: "NameSpace",
      }),
    appendFunction: ktCodegenReadString(input.AppendFunction, "AppendFunction", diagnostics, {
        source: "json",
        field: "AppendFunction",
      }),
    items,
  });

  if (!spec.namePrefix) {
    diagnostics.push(
      ktCodegenDiagnostic("model.missing-prefix", "error", "NamePrefix is required.", {
        source: "model",
        field: "naming.prefix",
      }),
    );
  }
  if (!spec.nameMiddle) {
    diagnostics.push(
      ktCodegenDiagnostic("model.missing-middle", "error", "NameMiddle is required.", {
        source: "model",
        field: "naming.middle",
      }),
    );
  }

  return {
    ok: !ktCodegenHasDiagnosticErrors(diagnostics),
    value: spec,
    diagnostics: Object.freeze(diagnostics),
  };
}

/** 读取旧 v4 JSON 文本或对象，并返回统一参数数据和诊断。 */
export function ktCodegenParseLegacyV4Json(input: string | unknown): KtCodegenDataResult<KtCodegenParam> {
  if (typeof input !== "string") return ktCodegenParseLegacyV4Object(input);
  try {
    return ktCodegenParseLegacyV4Object(JSON.parse(input) as unknown);
  } catch (error) {
    return {
      ok: false,
      value: null,
      diagnostics: [
        ktCodegenDiagnostic(
          "legacy.invalid-json",
          "error",
          error instanceof Error ? error.message : "Invalid JSON text.",
          { source: "json" },
        ),
      ],
    };
  }
}

function ktCodegenParamValueForColumn(
  parameter: KtCodegenItem,
  column: KtCodegenLegacyV4Column | null,
): unknown {
  switch (column) {
    case "NameSuffix": return parameter.nameSuffix;
    case "ID": return parameter.id;
    case "Name": return parameter.name;
    case "ParamString": return parameter.paramString;
    case "DataType": return parameter.dataType;
    case "TCKind": return parameter.tcKind;
    case "DefaultValue": return parameter.defaultValue;
    case "CATAttrInOut": return parameter.catAttrInOut;
    case "IsList": return parameter.isList ? 1 : 0;
    case "IsOnTree": return parameter.isOnTree ? 1 : 0;
    case "Component": return parameter.component;
    case "ComponentCount": return parameter.componentCount;
    case "IsParamDlg": return parameter.isParamDlg ? 1 : 0;
    case "Unit": return parameter.unit;
    case "Author": return parameter.author;
    case "CreateDate": return parameter.createDate;
    case "Notes": return parameter.notes;
    default: return null;
  }
}

/** 保留既有表头的名称与顺序，仅把缺少的新列插到 schema 邻近位置。 */
function ktCodegenHeadersForWrite(spec: KtCodegenParam): string[] {
  if (spec.source.format !== "legacy-v4-json" || spec.source.headers.length === 0) {
    return [...KT_CODEGEN_LEGACY_V4_JSON_HEADERS];
  }

  const headers = [...spec.source.headers];
  const present = new Set(headers.map(ktCodegenNormalizeLegacyV4Header).filter(
    (column): column is KtCodegenLegacyV4Column => column !== null,
  ));
  for (let schemaIndex = 0; schemaIndex < KT_CODEGEN_LEGACY_V4_JSON_HEADERS.length; schemaIndex += 1) {
    const column = KT_CODEGEN_LEGACY_V4_JSON_HEADERS[schemaIndex]!;
    if (present.has(column)) continue;
    const nextIndex = headers.findIndex((header) => {
      const normalized = ktCodegenNormalizeLegacyV4Header(header);
      return normalized !== null
        && KT_CODEGEN_LEGACY_V4_JSON_HEADERS.indexOf(normalized) > schemaIndex;
    });
    headers.splice(nextIndex < 0 ? headers.length : nextIndex, 0, column);
    present.add(column);
  }
  return headers;
}

function ktCodegenParamToLegacyRow(
  parameter: KtCodegenItem,
  headers: readonly string[],
): readonly unknown[] {
  return headers.map((header) => ktCodegenParamValueForColumn(
    parameter,
    ktCodegenNormalizeLegacyV4Header(header),
  ));
}

const KT_CODEGEN_LEGACY_V4_ROOT_ORDER = [
  "type",
  "version",
  "NamePrefix",
  "NameMiddle",
  "NameSpace",
  "AppendFunction",
  "headers",
  "data",
] as const;

function ktCodegenOrderedRootKeys(
  values: Readonly<Record<string, unknown>>,
  preferredKeys: readonly string[],
  extensionKeys: readonly string[],
): string[] {
  const keys = [...new Set(preferredKeys.filter((key) => Object.hasOwn(values, key)))];
  for (let schemaIndex = 0; schemaIndex < KT_CODEGEN_LEGACY_V4_ROOT_ORDER.length; schemaIndex += 1) {
    const key = KT_CODEGEN_LEGACY_V4_ROOT_ORDER[schemaIndex]!;
    if (keys.includes(key)) continue;
    const nextIndex = keys.findIndex((candidate) => {
      const candidateIndex = KT_CODEGEN_LEGACY_V4_ROOT_ORDER.indexOf(
        candidate as (typeof KT_CODEGEN_LEGACY_V4_ROOT_ORDER)[number],
      );
      return candidateIndex > schemaIndex;
    });
    keys.splice(nextIndex < 0 ? keys.length : nextIndex, 0, key);
  }
  for (const key of extensionKeys) {
    if (keys.includes(key) || !Object.hasOwn(values, key)) continue;
    const structuralIndex = keys.findIndex((candidate) => candidate === "headers" || candidate === "data");
    keys.splice(structuralIndex < 0 ? keys.length : structuralIndex, 0, key);
  }
  return keys;
}

/** 把统一参数数据转换为旧 v4 JSON 的结构化对象。 */
export function ktCodegenToLegacyV4JsonObject(
  spec: KtCodegenParam,
  rootKeys: readonly string[] = [],
): KtCodegenLegacyV4JsonObject {
  const headers = ktCodegenHeadersForWrite(spec);
  const values: Record<string, unknown> = {
    ...spec.source.extensions,
    type: "100106",
    version: "4.0",
    NamePrefix: spec.namePrefix,
    NameMiddle: spec.nameMiddle,
    NameSpace: spec.nameSpace,
    AppendFunction: spec.appendFunction,
    headers,
    data: spec.items.map((parameter) => ktCodegenParamToLegacyRow(parameter, headers)),
  };
  const keys = ktCodegenOrderedRootKeys(values, rootKeys, Object.keys(spec.source.extensions));
  return Object.fromEntries(keys.map((key) => [key, values[key]])) as KtCodegenLegacyV4JsonObject;
}

/** 把统一参数数据序列化为旧 C++/Qt 可读取的 v4 JSON 文本。 */
export function ktCodegenWriteLegacyV4Json(
  spec: KtCodegenParam,
  space = 4,
  rootKeys: readonly string[] = [],
): string {
  return `${JSON.stringify(ktCodegenToLegacyV4JsonObject(spec, rootKeys), null, space)}\n`;
}
