import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";

import { scan, type ScanOperation, type ScanPlan } from "@a11y-page-checker/core";

import type { CreateScanRequest, ScanProgress, StoredScan } from "../shared/contracts.js";
import { ScanStore } from "./store.js";
import { toScanPlan } from "./validation.js";

export interface QueueEvent {
  id: number;
  event: "state" | "progress";
  data: StoredScan;
}

interface QueueDependencies {
  runScan?: (plan: ScanPlan) => ScanOperation;
}

export class ScanQueue {
  private readonly pending: string[] = [];
  private active = false;
  private eventId = 0;
  readonly events = new EventEmitter();

  constructor(private readonly store: ScanStore, private readonly dependencies: QueueDependencies = {}) {}

  start(): void {
    this.store.recoverInterrupted();
    this.pending.push(...this.store.queuedIds());
    void this.drain();
  }

  enqueue(input: CreateScanRequest): StoredScan {
    if (this.pending.length >= 100) throw new Error("The scan queue is full.");
    const stored = this.store.create(randomUUID(), input, toScanPlan(input));
    this.pending.push(stored.id);
    this.publish("state", stored);
    void this.drain();
    return stored;
  }

  subscribe(scanId: string, listener: (event: QueueEvent) => void): () => void {
    const eventName = `scan:${scanId}`;
    this.events.on(eventName, listener);
    return () => this.events.off(eventName, listener);
  }

  private async drain(): Promise<void> {
    if (this.active) return;
    const id = this.pending.shift();
    if (!id) return;
    this.active = true;

    try {
      await this.execute(id);
    } finally {
      this.active = false;
      void this.drain();
    }
  }

  private async execute(id: string): Promise<void> {
    const stored = this.store.get(id);
    if (!stored) return;
    this.store.updateStatus(id, "running");
    this.publishStored("state", id);

    const progress: ScanProgress = { completedPages: 0, findings: 0 };
    try {
      const operation = (this.dependencies.runScan ?? scan)(stored.plan);
      this.subscribeToOperation(id, operation, progress);
      const result = await operation;
      this.store.complete(id, result);
      this.publishStored("state", id);
    } catch (error) {
      this.store.updateStatus(id, "failed", toPublicError(error));
      this.publishStored("state", id);
    }
  }

  private subscribeToOperation(id: string, operation: ScanOperation, progress: ScanProgress): void {
    operation.on("progress", ({ step, url }) => {
      progress.currentStep = step;
      progress.currentUrl = url;
      this.store.updateProgress(id, progress);
      this.publishStored("progress", id);
    });
    operation.on("page:done", ({ findingsCount }) => {
      progress.completedPages += 1;
      progress.findings += findingsCount;
      this.store.updateProgress(id, progress);
      this.publishStored("progress", id);
    });
  }

  private publishStored(event: QueueEvent["event"], id: string): void {
    const stored = this.store.get(id);
    if (stored) this.publish(event, stored);
  }

  private publish(event: QueueEvent["event"], data: StoredScan): void {
    this.eventId += 1;
    this.events.emit(`scan:${data.id}`, { id: this.eventId, event, data } satisfies QueueEvent);
  }
}

function toPublicError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message.slice(0, 500);
  return "The scan could not be completed.";
}
