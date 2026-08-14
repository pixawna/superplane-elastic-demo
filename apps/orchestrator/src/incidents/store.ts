import type { Incident } from "./types.js";

export class IncidentStore {
  private readonly incidents = new Map<number, Incident>();
  private readonly processing = new Set<number>();

  begin(workflowRunId: number): boolean {
    if (this.processing.has(workflowRunId) || this.incidents.has(workflowRunId)) return false;
    this.processing.add(workflowRunId);
    return true;
  }

  save(incident: Incident) {
    this.processing.delete(incident.failure.workflowRunId);
    this.incidents.set(incident.failure.workflowRunId, incident);
  }

  failProcessing(workflowRunId: number) {
    this.processing.delete(workflowRunId);
  }

  isProcessing(): boolean {
    return this.processing.size > 0;
  }

  latest(): Incident | undefined {
    return [...this.incidents.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  }

  latestUnresolved(): Incident | undefined {
    return [...this.incidents.values()]
      .filter((incident) => incident.status === "awaiting_approval")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  }

  findById(id: string): Incident | undefined {
    return [...this.incidents.values()].find((incident) => incident.id === id);
  }

  stop(id: string): Incident {
    const incident = this.findById(id);
    if (!incident || incident.status !== "awaiting_approval") {
      throw new Error("This remediation plan is no longer awaiting approval.");
    }
    incident.status = "stopped";
    this.save(incident);
    return incident;
  }

  findByFixBranch(branch: string): Incident | undefined {
    return [...this.incidents.values()].find((incident) => incident.fixBranch === branch);
  }
}
