// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function ktCodegenReadFixture(relativePath: string): string {
  return readFileSync(
    fileURLToPath(new URL(`./fixtures/${relativePath}`, import.meta.url)),
    "utf8",
  ).replace(/\r\n/g, "\n");
}

export function ktCodegenReadJsonFixture<T = unknown>(relativePath: string): T {
  return JSON.parse(ktCodegenReadFixture(relativePath)) as T;
}
