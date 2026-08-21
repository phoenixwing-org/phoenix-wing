// SPDX-License-Identifier: Apache-2.0

import { realpath } from "node:fs/promises";
import type { PnwGitIdentity } from "@phoenix-wing/git-core";
import { type PnwGitCommandOptions } from "./git-runner.js";
import { pnwFindGitRepositoryRoot } from "./repository.js";

export async function pnwCanonicalGitRoot(
  startPath: string,
  gitExecutable: string | undefined,
  signal: AbortSignal | undefined,
): Promise<string> {
  const root = await pnwFindGitRepositoryRoot(startPath, gitExecutable, signal);
  return await realpath(root);
}

export function pnwParseGitLogIdentity(
  name: string,
  email: string,
  epoch: string,
  date: string,
): PnwGitIdentity {
  if (!/^\d+$/u.test(epoch)) throw new Error(`Unsupported Git identity timestamp: ${epoch}`);
  const timezone = /([+-]\d{4})$/u.exec(date)?.[1];
  if (!timezone) throw new Error(`Unsupported Git identity date: ${date}`);
  return { name, email, date: `${epoch} ${timezone}` };
}

export function pnwNormalizeFullGitOid(value: string, field: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(normalized)) {
    throw new Error(`Invalid ${field}: ${value}`);
  }
  return normalized;
}

export function pnwValidateGitReadLimit(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > 1_000) {
    throw new Error(`${field} must be an integer between 1 and 1000`);
  }
  return value;
}

export function pnwGitReadCommandOptions(
  cwd: string,
  gitExecutable: string | undefined,
  signal: AbortSignal | undefined,
): PnwGitCommandOptions {
  return {
    cwd,
    ...(gitExecutable ? { gitExecutable } : {}),
    ...(signal ? { signal } : {}),
  };
}
