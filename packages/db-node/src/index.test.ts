import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { pnwCreateDb } from "./index.js";

const roots: string[] = [];

function databasePath(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "phoenix-db-node-"));
  roots.push(root);
  return path.join(root, "nested", "workspace.sqlite");
}

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("@phoenix-wing/db-node", () => {
  it("creates parent directories and adapts get/all/run", () => {
    const filename = databasePath();
    const db = pnwCreateDb(filename);
    db.exec("CREATE TABLE item (id INTEGER PRIMARY KEY, label TEXT)");
    expect(db.run("INSERT INTO item(label) VALUES (?)", ["A"]).changes).toBe(1);
    expect(db.get<{ label: string }>("SELECT label FROM item WHERE id = 1")?.label).toBe("A");
    expect(db.get("SELECT * FROM item WHERE id = 99")).toBeUndefined();
    expect(db.all("SELECT * FROM item")).toHaveLength(1);
    expect(fs.existsSync(path.dirname(filename))).toBe(true);
    db.close();
  });

  it("reports manual transaction state and rollback", () => {
    const db = pnwCreateDb(databasePath());
    db.exec("CREATE TABLE item (id INTEGER PRIMARY KEY)");
    db.exec("BEGIN TRANSACTION");
    expect(db.inTransaction).toBe(true);
    db.run("INSERT INTO item DEFAULT VALUES");
    db.exec("ROLLBACK");
    expect(db.inTransaction).toBe(false);
    expect(db.get<{ count: number }>("SELECT COUNT(*) AS count FROM item")?.count).toBe(0);
    db.close();
    expect(() => db.close()).not.toThrow();
  });
});
