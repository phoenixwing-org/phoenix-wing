// DB 适配层 —— 抽象 SQL 操作，隔离具体实现。
//
// ## 为什么用 node-sqlite3-wasm，不用 better-sqlite3？
//
// better-sqlite3 在 pnpm install 时需要 C++ 编译器进行原生编译（node-gyp）。
// 这导致：
//   1. 跨平台问题 — Windows/macOS/Linux 各需对应编译工具链
//   2. CI/CD 复杂 — 需要预装 python3、make、C++ 编译器
//   3. 用户安装门槛高 — 非开发者环境可能缺编译工具
//
// node-sqlite3-wasm 是纯 WASM 实现：
//   - 零编译依赖，pnpm install 即用
//   - 跨平台一致行为
//   - 性能对 BOM/索引场景足够（WASM 比原生慢约 1.5–3×，但查询耗时远小于 I/O）
//
// 约束：不支持 db.transaction(fn)，事务用 BEGIN/COMMIT/ROLLBACK 手动管理。
//
// 当前实现：node-sqlite3-wasm；切换实现只需改本文件。
import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'

const require = createRequire(import.meta.url)
const { Database } = require('node-sqlite3-wasm')

// ── 接口 ──
export interface PnwDbAdapter {
  get<T = Record<string, unknown>>(sql: string, params?: unknown): T | undefined
  all<T = Record<string, unknown>>(sql: string, params?: unknown): T[]
  run(sql: string, params?: unknown): { changes: number }
  exec(sql: string): void
  readonly inTransaction: boolean
  close(): void
}

// ── node-sqlite3-wasm 实现 ──
class PnwSqliteWasmAdapter implements PnwDbAdapter {
  private db: InstanceType<typeof Database>

  constructor(dbPath: string) {
    // 确保目录存在
    const dir = path.dirname(dbPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    this.db = new Database(dbPath)
  }

  get<T = Record<string, unknown>>(sql: string, params?: unknown): T | undefined {
    // node-sqlite3-wasm 无匹配时返回 null，适配层统一转换为 undefined
    const result = this.db.get(sql, params)
    return result != null ? (result as unknown as T) : undefined
  }

  all<T = Record<string, unknown>>(sql: string, params?: unknown): T[] {
    return this.db.all(sql, params) as unknown as T[]
  }

  run(sql: string, params?: unknown): { changes: number } {
    return this.db.run(sql, params) as { changes: number }
  }

  exec(sql: string): void {
    this.db.exec(sql)
  }

  get inTransaction(): boolean {
    return this.db.inTransaction
  }

  close(): void {
    try { this.db.close() } catch { /* 可能已关闭 */ }
  }
}

// ── 工厂 ──
export function pnwCreateDb(dbPath: string): PnwDbAdapter {
  return new PnwSqliteWasmAdapter(dbPath)
}
