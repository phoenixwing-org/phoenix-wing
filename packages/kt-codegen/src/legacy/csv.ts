// SPDX-License-Identifier: Apache-2.0

import {
  ktCodegenHasDiagnosticErrors,
  type KtCodegenDataResult,
  type KtCodegenDiagnostic,
} from "../model/diagnostic.js";
import type { KtCodegenItem } from "../KtCodegenItem.js";
import type { KtCodegenParam } from "../KtCodegenParam.js";
import { ktCodegenParseLegacyV4Object, ktCodegenWriteLegacyV4Json } from "./v4-json.js";
import { KT_CODEGEN_LEGACY_17_COLUMN_CSV_HEADERS } from "./v4-schema.js";

/** 旧 Qt 简单 CSV 或标准 RFC 4180 写出方言。 */
export type KtCodegenLegacyCsvDialect = "qt-simple" | "rfc4180";

/** 旧17列 CSV 写出选项。 */
export interface KtCodegenLegacyCsvWriteOptions {
  /** CSV 方言；默认 `qt-simple`。 */
  readonly dialect?: KtCodegenLegacyCsvDialect;
  /** 输出换行符；默认 LF。 */
  readonly eol?: "\n" | "\r\n";
}

interface KtCodegenCsvMatrixResult {
  readonly rows: readonly (readonly string[])[];
  readonly diagnostics: readonly KtCodegenDiagnostic[];
}

function ktCodegenCsvDiagnostic(
  code: string,
  severity: "error" | "warning" | "info",
  message: string,
  row?: number,
  column?: number,
): KtCodegenDiagnostic {
  const path = {
    source: "csv" as const,
    ...(row === undefined ? {} : { row }),
    ...(column === undefined ? {} : { column }),
  };
  return { code, severity, message, path };
}

/** 读取 CSV 矩阵；兼容 RFC 4180 引号和旧 Qt 未加引号的 `split(',')` 文件。 */
export function ktCodegenParseCsvMatrix(text: string): KtCodegenCsvMatrixResult {
  const rows: string[][] = [];
  const diagnostics: KtCodegenDiagnostic[] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const finishCell = (): void => {
    row.push(cell);
    cell = "";
  };
  const finishRow = (): void => {
    finishCell();
    if (row.some((value) => value.length > 0)) rows.push(row);
    row = [];
  };

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (inQuotes) {
      if (character === '"') {
        if (input[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"' && cell.length === 0) {
      inQuotes = true;
    } else if (character === ",") {
      finishCell();
    } else if (character === "\n") {
      finishRow();
    } else if (character === "\r") {
      if (input[index + 1] === "\n") index += 1;
      finishRow();
    } else {
      cell += character;
    }
  }

  if (inQuotes) {
    diagnostics.push(
      ktCodegenCsvDiagnostic(
        "legacy.csv-unclosed-quote",
        "error",
        "CSV ended inside a quoted field.",
        rows.length,
      ),
    );
  }
  if (cell.length > 0 || row.length > 0) finishRow();

  return { rows, diagnostics };
}

/** 把旧17列 CSV 解析为统一的 `KtCodegenParam` 临时数据。 */
export function ktCodegenParseLegacyCsv(text: string): KtCodegenDataResult<KtCodegenParam> {
  const matrix = ktCodegenParseCsvMatrix(text);
  const diagnostics: KtCodegenDiagnostic[] = [...matrix.diagnostics];
  let headers: readonly string[] | null = null;
  const data: string[][] = [];
  const metadata: Record<string, string> = {
    NamePrefix: "",
    NameMiddle: "",
    NameSpace: "",
    AppendFunction: "",
  };

  matrix.rows.forEach((rawRow, rowIndex) => {
    const first = (rawRow[0] ?? "").trim();
    if (first === "NameSuffix") {
      headers = rawRow.map((entry) => entry.trim());
      return;
    }
    if (first.startsWith("$")) {
      const key = first.slice(1);
      if (key in metadata) metadata[key] = (rawRow[1] ?? "").trim();
      else {
        diagnostics.push(
          ktCodegenCsvDiagnostic(
            "legacy.csv-unknown-metadata",
            "warning",
            `Unknown CSV metadata row ${first} was ignored.`,
            rowIndex,
          ),
        );
      }
      return;
    }
    if (!headers) {
      diagnostics.push(
        ktCodegenCsvDiagnostic(
          "legacy.csv-row-before-header",
          "warning",
          "CSV row before the NameSuffix header was ignored.",
          rowIndex,
        ),
      );
      return;
    }
    if (rawRow.length < 17) {
      diagnostics.push(
        ktCodegenCsvDiagnostic(
          "legacy.csv-short-row",
          "error",
          `Expected 17 columns, got ${rawRow.length}.`,
          rowIndex,
        ),
      );
      return;
    }
    if (rawRow.length > 17) {
      diagnostics.push(
        ktCodegenCsvDiagnostic(
          "legacy.csv-extra-columns",
          "warning",
          `Only the first 17 of ${rawRow.length} columns were used.`,
          rowIndex,
        ),
      );
    }
    data.push(rawRow.slice(0, 17).map((entry) => entry.trim()));
  });

  if (!headers) {
    diagnostics.push(
      ktCodegenCsvDiagnostic(
        "legacy.csv-header-missing",
        "error",
        "The 17-column NameSuffix header was not found.",
      ),
    );
    return { ok: false, value: null, diagnostics };
  }

  const parsed = ktCodegenParseLegacyV4Object(
    {
      type: "100106",
      version: "4.0",
      headers,
      data,
      ...metadata,
    },
    "legacy-17-column-csv",
  );
  const remappedDiagnostics = parsed.diagnostics.map((diagnostic) =>
    diagnostic.path?.source === "json"
      ? { ...diagnostic, path: { ...diagnostic.path, source: "csv" as const } }
      : diagnostic,
  );
  diagnostics.push(...remappedDiagnostics);
  return {
    ok: !ktCodegenHasDiagnosticErrors(diagnostics),
    value: parsed.value,
    diagnostics,
  };
}

function ktCodegenParamToCsvRow(parameter: KtCodegenItem): string[] {
  return [
    parameter.nameSuffix,
    String(parameter.id),
    parameter.name,
    parameter.paramString,
    parameter.dataType,
    parameter.tcKind,
    parameter.defaultValue,
    parameter.catAttrInOut,
    parameter.isList ? "1" : "",
    parameter.isOnTree ? "1" : "",
    parameter.component,
    String(parameter.componentCount),
    parameter.isParamDlg ? "1" : "",
    parameter.unit,
    parameter.author,
    parameter.createDate,
    parameter.notes,
  ];
}

function ktCodegenEscapeRfc4180Cell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/** 把统一参数数据写成旧17列 CSV 文本。 */
export function ktCodegenWriteLegacyCsv(
  spec: KtCodegenParam,
  options: KtCodegenLegacyCsvWriteOptions = {},
): KtCodegenDataResult<string> {
  const dialect = options.dialect ?? "qt-simple";
  const eol = options.eol ?? "\n";
  const diagnostics: KtCodegenDiagnostic[] = [];
  const rows: string[][] = [
    [...KT_CODEGEN_LEGACY_17_COLUMN_CSV_HEADERS],
    ...spec.items.map(ktCodegenParamToCsvRow),
    ["$NamePrefix", spec.namePrefix, "the prefix"],
    ["$NameMiddle", spec.nameMiddle, "the middle name"],
    ["$NameSpace", spec.nameSpace, "$Name Space"],
    ["$AppendFunction", spec.appendFunction, "the append function name"],
  ];

  const output = rows
    .map((outputRow, rowIndex) =>
      outputRow
        .map((entry, columnIndex) => {
          if (dialect === "rfc4180") return ktCodegenEscapeRfc4180Cell(entry);
          if (/[\r\n,]/.test(entry)) {
            diagnostics.push(
              ktCodegenCsvDiagnostic(
                "legacy.csv-lossy-qt-simple-write",
                "warning",
                "Comma or newline was replaced for compatibility with the old Qt split(',') reader.",
                rowIndex,
                columnIndex,
              ),
            );
            return entry.replaceAll(",", ";").replaceAll(/\r?\n/g, " ");
          }
          return entry;
        })
        .join(","),
    )
    .join(eol);

  return { ok: true, value: `${output}${eol}`, diagnostics };
}

/** 直接把旧17列 CSV 转换为 C++/Qt v4 JSON 文本。 */
export function ktCodegenConvertLegacyCsvToV4Json(
  text: string,
  space = 2,
): KtCodegenDataResult<string> {
  const parsed = ktCodegenParseLegacyCsv(text);
  if (!parsed.value) return { ok: false, value: null, diagnostics: parsed.diagnostics };
  return {
    ok: parsed.ok,
    value: ktCodegenWriteLegacyV4Json(parsed.value, space),
    diagnostics: parsed.diagnostics,
  };
}
