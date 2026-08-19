import Database from "better-sqlite3";

import type { CreateScanRequest, ScanListResponse, ScanProgress, ScanStatus, StoredScan } from "../shared/contracts.js";
import type { ScanPlan, ScanResult } from "@a11y-page-checker/core";

interface ScanRow {
  id: string;
  schema_version: number;
  status: ScanStatus;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  input_json: string;
  plan_json: string;
  progress_json: string;
  result_json: string | null;
  error: string | null;
}

export class ScanStore {
  private readonly database: Database.Database;

  constructor(filePath: string) {
    this.database = new Database(filePath);
    this.database.pragma("journal_mode = WAL");
    this.database.pragma("foreign_keys = ON");
    this.migrate();
  }

  close(): void {
    this.database.pragma("optimize");
    this.database.close();
  }

  recoverInterrupted(): void {
    const now = new Date().toISOString();
    this.database.prepare(
      "UPDATE scans SET status = 'failed', completed_at = ?, error = ? WHERE status = 'running'",
    ).run(now, "Scan interrupted because the local application stopped.");
  }

  create(id: string, input: CreateScanRequest, plan: ScanPlan): StoredScan {
    const createdAt = new Date().toISOString();
    const progress: ScanProgress = { completedPages: 0, findings: 0 };
    this.database.prepare(`
      INSERT INTO scans (
        id, schema_version, status, created_at, input_json, plan_json, progress_json
      ) VALUES (?, 1, 'queued', ?, ?, ?, ?)
    `).run(id, createdAt, JSON.stringify(input), JSON.stringify(plan), JSON.stringify(progress));
    return this.get(id)!;
  }

  get(id: string): StoredScan | undefined {
    const row = this.database.prepare("SELECT * FROM scans WHERE id = ?").get(id) as ScanRow | undefined;
    return row ? this.fromRow(row) : undefined;
  }

  list(page: number, pageSize: number, status?: ScanStatus): ScanListResponse {
    const offset = (page - 1) * pageSize;
    const where = status ? " WHERE status = ?" : "";
    const parameters = status ? [status] : [];
    const total = (this.database.prepare(`SELECT COUNT(*) AS count FROM scans${where}`).get(...parameters) as { count: number }).count;
    const rows = this.database.prepare(
      `SELECT * FROM scans${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    ).all(...parameters, pageSize, offset) as ScanRow[];
    return { items: rows.map((row) => this.fromRow(row)), page, pageSize, total };
  }

  queuedIds(): string[] {
    return (this.database.prepare(
      "SELECT id FROM scans WHERE status = 'queued' ORDER BY created_at ASC",
    ).all() as Array<{ id: string }>).map(({ id }) => id);
  }

  updateStatus(id: string, status: ScanStatus, error?: string): void {
    const now = new Date().toISOString();
    if (status === "running") {
      this.database.prepare("UPDATE scans SET status = ?, started_at = ?, error = NULL WHERE id = ?")
        .run(status, now, id);
      return;
    }
    this.database.prepare("UPDATE scans SET status = ?, completed_at = ?, error = ? WHERE id = ?")
      .run(status, now, error ?? null, id);
  }

  updateProgress(id: string, progress: ScanProgress): void {
    this.database.prepare("UPDATE scans SET progress_json = ? WHERE id = ?").run(JSON.stringify(progress), id);
  }

  complete(id: string, result: ScanResult): void {
    this.database.prepare(
      "UPDATE scans SET status = 'completed', completed_at = ?, result_json = ?, error = NULL WHERE id = ?",
    ).run(new Date().toISOString(), JSON.stringify(result), id);
  }

  delete(id: string): boolean {
    return this.database.prepare(
      "DELETE FROM scans WHERE id = ? AND status NOT IN ('queued', 'running')",
    ).run(id).changes > 0;
  }

  private migrate(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS scans (
        id TEXT PRIMARY KEY,
        schema_version INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('queued', 'running', 'completed', 'failed')),
        created_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT,
        input_json TEXT NOT NULL,
        plan_json TEXT NOT NULL,
        progress_json TEXT NOT NULL,
        result_json TEXT,
        error TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_scans_status_created_at
        ON scans(status, created_at);
      CREATE INDEX IF NOT EXISTS idx_scans_created_at
        ON scans(created_at DESC);
    `);
    this.database.pragma("optimize");
  }

  private fromRow(row: ScanRow): StoredScan {
    return {
      id: row.id,
      schemaVersion: 1,
      status: row.status,
      createdAt: row.created_at,
      ...(row.started_at ? { startedAt: row.started_at } : {}),
      ...(row.completed_at ? { completedAt: row.completed_at } : {}),
      input: JSON.parse(row.input_json) as CreateScanRequest,
      plan: JSON.parse(row.plan_json) as ScanPlan,
      progress: JSON.parse(row.progress_json) as ScanProgress,
      ...(row.result_json ? { result: JSON.parse(row.result_json) as ScanResult } : {}),
      ...(row.error ? { error: row.error } : {}),
    };
  }
}
