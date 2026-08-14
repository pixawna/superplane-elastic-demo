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

  latest(): Incident | undefined {
    return [...this.incidents.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  }

  latestUnresolved(): Incident | undefined {
    return [...this.incidents.values()]
      .filter((incident) => incident.status === "awaiting_approval")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  }

  findByFixBranch(branch: string): Incident | undefined {
    return [...this.incidents.values()].find((incident) => incident.fixBranch === branch);
  }
}
