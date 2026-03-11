import { WorkItem } from "azure-devops-extension-api/WorkItemTracking";
import { SprintInfo } from "../services/dataService";

// ── Helpers ────────────────────────────────────────────────────────────

export function getField(wi: WorkItem, field: string): any {
  return wi.fields?.[field];
}

export function getStateBadgeClass(state: string): string {
  const s = (state || "").toLowerCase();
  if (s === "new" || s === "to do") return "state-new";
  if (s === "active" || s === "in progress" || s === "committed") return "state-active";
  if (s === "resolved" || s === "done") return "state-resolved";
  if (s === "closed" || s === "removed" || s === "completed") return "state-closed";
  return "state-other";
}

export function getPriorityClass(priority: number | null): string {
  if (!priority) return "priority-none";
  if (priority === 1) return "priority-critical";
  if (priority === 2) return "priority-high";
  if (priority === 3) return "priority-medium";
  return "priority-low";
}

export function getPriorityLabel(priority: number | null): string {
  if (!priority) return "—";
  if (priority === 1) return "🔴 Critical";
  if (priority === 2) return "🟠 High";
  if (priority === 3) return "🟡 Medium";
  if (priority === 4) return "🟢 Low";
  return `P${priority}`;
}

export function getTypeIcon(type: string): string {
  const t = (type || "").toLowerCase();
  if (t.includes("bug")) return "🐛";
  if (t.includes("task")) return "📋";
  if (t.includes("product backlog item") || t.includes("pbi")) return "📘";
  if (t.includes("user story")) return "📖";
  if (t.includes("feature")) return "🚀";
  if (t.includes("epic")) return "⚡";
  if (t.includes("issue")) return "⚠️";
  return "📄";
}

export function formatDate(d: Date | string | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatRelativeDate(d: Date | string | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

export function getRelations(wi: WorkItem): { type: string; id: number }[] {
  if (!wi.relations) return [];
  return wi.relations
    .filter(
      (r) =>
        r.rel === "System.LinkTypes.Related" ||
        r.rel === "System.LinkTypes.Dependency-Forward" ||
        r.rel === "System.LinkTypes.Dependency-Reverse"
    )
    .map((r) => {
      const urlParts = (r.url || "").split("/");
      const id = parseInt(urlParts[urlParts.length - 1], 10);
      let type = "Related";
      if (r.rel === "System.LinkTypes.Dependency-Forward") type = "Successor";
      if (r.rel === "System.LinkTypes.Dependency-Reverse") type = "Predecessor";
      return { type, id };
    })
    .filter((r) => !isNaN(r.id));
}

export function isBlocked(wi: WorkItem): boolean {
  const tags = (getField(wi, "System.Tags") as string) || "";
  const blockedReason = getField(wi, "Microsoft.VSTS.CMMI.BlockedReason") as string;
  return (
    tags.toLowerCase().includes("blocked") ||
    !!blockedReason
  );
}

// ── Summary calculations ──────────────────────────────────────────────

export interface SprintSummary {
  totalItems: number;
  newCount: number;
  activeCount: number;
  resolvedCount: number;
  closedCount: number;
  blockedCount: number;
  completionPct: number;
  totalEffort: number;
  completedEffort: number;
  remainingEffort: number;
}

export function calcSprintSummary(workItems: WorkItem[]): SprintSummary {
  let newCount = 0,
    activeCount = 0,
    resolvedCount = 0,
    closedCount = 0,
    blockedCount = 0,
    totalEffort = 0,
    completedEffort = 0,
    remainingEffort = 0;

  for (const wi of workItems) {
    const state = ((getField(wi, "System.State") as string) || "").toLowerCase();
    if (state === "new" || state === "to do") newCount++;
    else if (state === "active" || state === "in progress" || state === "committed") activeCount++;
    else if (state === "resolved" || state === "done") resolvedCount++;
    else if (state === "closed" || state === "removed" || state === "completed") closedCount++;

    if (isBlocked(wi)) blockedCount++;

    const orig = (getField(wi, "Microsoft.VSTS.Scheduling.OriginalEstimate") as number) || 0;
    const comp = (getField(wi, "Microsoft.VSTS.Scheduling.CompletedWork") as number) || 0;
    const rem = (getField(wi, "Microsoft.VSTS.Scheduling.RemainingWork") as number) || 0;
    totalEffort += orig;
    completedEffort += comp;
    remainingEffort += rem;
  }

  const total = workItems.length;
  const completionPct = total > 0 ? Math.round(((resolvedCount + closedCount) / total) * 100) : 0;

  return {
    totalItems: total,
    newCount,
    activeCount,
    resolvedCount,
    closedCount,
    blockedCount,
    completionPct,
    totalEffort,
    completedEffort,
    remainingEffort,
  };
}

export function calcGlobalSummary(sprints: SprintInfo[]) {
  const teamSet = new Set<string>();
  let totalItems = 0;
  let doneItems = 0;
  let blockedItems = 0;
  let activeItems = 0;
  let totalEffort = 0;
  let completedEffort = 0;
  let remainingEffort = 0;
  let criticalCount = 0;

  for (const s of sprints) {
    teamSet.add(s.team.id);
    totalItems += s.workItems.length;
    for (const wi of s.workItems) {
      const state = ((getField(wi, "System.State") as string) || "").toLowerCase();
      if (["resolved", "done", "closed", "completed", "removed"].includes(state)) doneItems++;
      if (["active", "in progress", "committed"].includes(state)) activeItems++;
      if (isBlocked(wi)) blockedItems++;

      const priority = getField(wi, "Microsoft.VSTS.Common.Priority") as number;
      if (priority === 1) criticalCount++;

      const orig = (getField(wi, "Microsoft.VSTS.Scheduling.OriginalEstimate") as number) || 0;
      const comp = (getField(wi, "Microsoft.VSTS.Scheduling.CompletedWork") as number) || 0;
      const rem = (getField(wi, "Microsoft.VSTS.Scheduling.RemainingWork") as number) || 0;
      totalEffort += orig;
      completedEffort += comp;
      remainingEffort += rem;
    }
  }

  return {
    teamCount: teamSet.size,
    sprintCount: sprints.length,
    totalItems,
    activeItems,
    blockedItems,
    criticalCount,
    completionPct: totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0,
    totalEffort,
    completedEffort,
    remainingEffort,
  };
}
