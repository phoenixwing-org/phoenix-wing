/** pnwDbAdapter — vitest 单测。测试 PnwDbAdapter 接口完整行为。 */
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { pnwCreateDb, type PnwDbAdapter } from "./pnwDbAdapter.js"
import fs from "fs"
import path from "path"
import os from "os"

const DB_PATH = path.join(os.tmpdir(), "pnw-db-adapter-test.sqlite")

function cleanup() {
  try { fs.unlinkSync(DB_PATH) } catch { /* ok */ }
  try { fs.unlinkSync(DB_PATH + "-wal") } catch { /* ok */ }
  try { fs.unlinkSync(DB_PATH + "-shm") } catch { /* ok */ }
}

let db: PnwDbAdapter

beforeEach(() => {
  cleanup()
  db = pnwCreateDb(DB_PATH)
})

afterEach(() => {
  try { db.close() } catch { /* ok */ }
  cleanup()
})

// ── 工厂函数 ──

describe("pnwCreateDb", () => {
  it("创建 PnwDbAdapter 实例", () => {
    expect(db).toBeDefined()
    expect(typeof db.exec).toBe("function")
    expect(typeof db.run).toBe("function")
    expect(typeof db.get).toBe("function")
    expect(typeof db.all).toBe("function")
    expect(typeof db.inTransaction).toBe("boolean")
  })

  it("自动创建不存在的目录", () => {
    const tmpDir = path.join(os.tmpdir(), "pnw-db-deep/nested/dir")
    const tmpPath = path.join(tmpDir, "test.sqlite")
    const tmpDb = pnwCreateDb(tmpPath)
    expect(fs.existsSync(tmpDir)).toBe(true)
    tmpDb.close()
    fs.rmSync(path.join(os.tmpdir(), "pnw-db-deep"), { recursive: true, force: true })
  })
})

// ── exec ──

describe("exec", () => {
  it("执行建表语句", () => {
    db.exec("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)")
    const row = db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    expect(row).toBeDefined()
    expect((row as any).name).toBe("users")
  })

  it("执行多条语句", () => {
    db.exec("CREATE TABLE a (id INTEGER); CREATE TABLE b (id INTEGER)")
    const count = db.get("SELECT COUNT(*) as n FROM sqlite_master WHERE type='table' AND name IN ('a','b')")
    expect((count as any).n).toBe(2)
  })
})

// ── run ──

describe("run", () => {
  beforeEach(() => {
    db.exec("CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT, count INTEGER)")
  })

  it("插入数据并返回 changes", () => {
    const result = db.run("INSERT INTO items (name, count) VALUES (?, ?)", ["apple", 5])
    expect(result.changes).toBe(1)
  })

  it("更新数据并返回 changes", () => {
    db.run("INSERT INTO items (name, count) VALUES (?, ?)", ["apple", 5])
    const result = db.run("UPDATE items SET count = ? WHERE name = ?", [10, "apple"])
    expect(result.changes).toBe(1)
  })

  it("数组参数绑定多个值", () => {
    const r1 = db.run("INSERT INTO items (name, count) VALUES (?, ?)", ["a", 1])
    const r2 = db.run("INSERT INTO items (name, count) VALUES (?, ?)", ["b", 2])
    expect(r1.changes).toBe(1)
    expect(r2.changes).toBe(1)
  })
})

// ── get ──

describe("get", () => {
  beforeEach(() => {
    db.exec("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)")
    db.run("INSERT INTO users (name, age) VALUES (?, ?)", ["Alice", 30])
    db.run("INSERT INTO users (name, age) VALUES (?, ?)", ["Bob", 25])
  })

  it("返回第一行", () => {
    const row = db.get("SELECT * FROM users ORDER BY id")
    expect(row).toBeDefined()
    expect((row as any).name).toBe("Alice")
    expect((row as any).age).toBe(30)
  })

  it("无匹配时返回 undefined", () => {
    const row = db.get("SELECT * FROM users WHERE name = ?", "Nobody")
    expect(row).toBeUndefined()
  })

  it("泛型推断字段类型", () => {
    const row = db.get<{ age: number }>("SELECT age FROM users WHERE name = ?", "Alice")
    expect(row?.age).toBe(30)
  })
})

// ── all ──

describe("all", () => {
  beforeEach(() => {
    db.exec("CREATE TABLE items (id INTEGER PRIMARY KEY, label TEXT)")
    db.run("INSERT INTO items (label) VALUES (?)", ["x"])
    db.run("INSERT INTO items (label) VALUES (?)", ["y"])
    db.run("INSERT INTO items (label) VALUES (?)", ["z"])
  })

  it("返回所有行", () => {
    const rows = db.all("SELECT * FROM items ORDER BY id")
    expect(rows).toHaveLength(3)
    expect((rows[0] as any).label).toBe("x")
    expect((rows[2] as any).label).toBe("z")
  })

  it("空表返回空数组", () => {
    db.run("DELETE FROM items")
    const rows = db.all("SELECT * FROM items")
    expect(rows).toEqual([])
  })

  it("带参数过滤", () => {
    const rows = db.all("SELECT * FROM items WHERE label = ?", "y")
    expect(rows).toHaveLength(1)
    expect((rows[0] as any).label).toBe("y")
  })
})

// ── 事务 ──

describe("事务 (manual)", () => {
  beforeEach(() => {
    db.exec("CREATE TABLE t (id INTEGER PRIMARY KEY, val TEXT)")
  })

  it("提交事务后数据可见", () => {
    db.exec("BEGIN TRANSACTION")
    db.run("INSERT INTO t (val) VALUES (?)", ["committed"])
    db.exec("COMMIT")
    const row = db.get("SELECT val FROM t WHERE val = ?", "committed")
    expect(row).toBeDefined()
  })

  it("回滚撤销变更", () => {
    db.exec("BEGIN TRANSACTION")
    db.run("INSERT INTO t (val) VALUES (?)", ["rolled_back"])
    db.exec("ROLLBACK")
    const row = db.get("SELECT val FROM t WHERE val = ?", "rolled_back")
    expect(row).toBeUndefined()
  })

  it("inTransaction 反映事务状态", () => {
    expect(db.inTransaction).toBe(false)
    db.exec("BEGIN TRANSACTION")
    expect(db.inTransaction).toBe(true)
    db.exec("ROLLBACK")
    expect(db.inTransaction).toBe(false)
  })
})

// ── close ──

describe("close", () => {
  it("关闭后操作抛错", () => {
    db.exec("CREATE TABLE t (id INTEGER)")
    db.close()
    expect(() => db.exec("CREATE TABLE t2 (id INTEGER)")).toThrow()
  })

  it("重复关闭不抛错", () => {
    db.close()
    expect(() => db.close()).not.toThrow()
  })
})
