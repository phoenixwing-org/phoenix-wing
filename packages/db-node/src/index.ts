import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { Database } = require("node-sqlite3-wasm");

export interface PnwDbAdapter {
  get<T = Record<string, unknown>>(sql: string, params?: unknown): T | undefined;
  all<T = Record<string, unknown>>(sql: string, params?: unknown): T[];
  run(sql: string, params?: unknown): { changes: number };
  exec(sql: string): void;
  readonly inTransaction: boolean;
  close(): void;
}

class PnwSqliteWasmAdapter implements PnwDbAdapter {
  private readonly db: InstanceType<typeof Database>;

  constructor(databasePath: string) {
    const directory = path.dirname(databasePath);
    if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });
    this.db = new Database(databasePath);
  }

  get<T = Record<string, unknown>>(sql: string, params?: unknown): T | undefined {
    const result = this.db.get(sql, params);
    return result != null ? (result as T) : undefined;
  }

  all<T = Record<string, unknown>>(sql: string, params?: unknown): T[] {
    return this.db.all(sql, params) as T[];
  }

  run(sql: string, params?: unknown): { changes: number } {
    return this.db.run(sql, params) as { changes: number };
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  get inTransaction(): boolean {
    return this.db.inTransaction;
  }

  close(): void {
    try {
      this.db.close();
    } catch {
      // Closing an already closed adapter is intentionally idempotent.
    }
  }
}

export function pnwCreateDb(databasePath: string): PnwDbAdapter {
  return new PnwSqliteWasmAdapter(databasePath);
}
