import { SprintInfo } from "../services/dataService";
import { WorkItem } from "azure-devops-extension-api/WorkItemTracking";
import {
  formatDate,
  calcSprintSummary,
  getField,
} from "./helpers";
import { renderWorkItemRow } from "./workItemRow";

type SortField = "id" | "title" | "state" | "priority" | "assigned" | "effort" | "activity" | "type";
type SortDir = "asc" | "desc";

interface SortState {
  field: SortField;
  dir: SortDir;
}

const STATE_ORDER: Record<string, number> = {
  "new": 0, "to do": 0,
  "active": 1, "in progress": 1, "committed": 1,
  "resolved": 2, "done": 2,
  "closed": 3, "completed": 3, "removed": 3,
};

function sortWorkItems(items: WorkItem[], sort: SortState): WorkItem[] {
  const sorted = [...items];
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (sort.field) {
      case "id":
        cmp = (getField(a, "System.Id") as number) - (getField(b, "System.Id") as number);
        break;
      case "title":
        cmp = ((getField(a, "System.Title") as string) || "").localeCompare((getField(b, "System.Title") as string) || "");
        break;
      case "state": {
        const sa = STATE_ORDER[((getField(a, "System.State") as string) || "").toLowerCase()] ?? 9;
        const sb = STATE_ORDER[((getField(b, "System.State") as string) || "").toLowerCase()] ?? 9;
        cmp = sa - sb;
        break;
      }
      case "priority": {
        const pa = (getField(a, "Microsoft.VSTS.Common.Priority") as number) || 99;
        const pb = (getField(b, "Microsoft.VSTS.Common.Priority") as number) || 99;
        cmp = pa - pb;
        break;
      }
      case "assigned": {
        const aa = getField(a, "System.AssignedTo");
        const ab = getField(b, "System.AssignedTo");
        const na = aa && typeof aa === "object" ? aa.displayName || "" : String(aa || "");
        const nb = ab && typeof ab === "object" ? ab.displayName || "" : String(ab || "");
        cmp = na.localeCompare(nb);
        break;
      }
      case "effort": {
        const ra = (getField(a, "Microsoft.VSTS.Scheduling.RemainingWork") as number) || 0;
        const rb = (getField(b, "Microsoft.VSTS.Scheduling.RemainingWork") as number) || 0;
        cmp = rb - ra; // higher remaining first
        break;
      }
      case "activity": {
        const da = new Date((getField(a, "System.ChangedDate") as string) || 0).getTime();
        const db = new Date((getField(b, "System.ChangedDate") as string) || 0).getTime();
        cmp = db - da; // most recent first
        break;
      }
      case "type":
        cmp = ((getField(a, "System.WorkItemType") as string) || "").localeCompare((getField(b, "System.WorkItemType") as string) || "");
        break;
    }
    return sort.dir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

export function renderTeamSprintCard(sprint: SprintInfo): HTMLElement {
  const card = document.createElement("div");
  card.className = "sprint-card";

  const summary = calcSprintSummary(sprint.workItems);
  const startDate = (sprint.iteration.attributes as any)?.startDate;
  const finishDate = (sprint.iteration.attributes as any)?.finishDate;

  const now = new Date();
  const start = startDate ? new Date(startDate) : null;
  const finish = finishDate ? new Date(finishDate) : null;
  const isCurrent = start && finish && now >= start && now <= finish;
  const isPast = finish && now > finish;
  const dayLabel = finish
    ? isPast
      ? "Ended"
      : `${Math.ceil((finish.getTime() - now.getTime()) / 86400000)} days left`
    : "";

  card.innerHTML = `
    <div class="sprint-card__header">
      <div class="sprint-card__team-info">
        <span class="sprint-card__team-badge">${escapeHtml(sprint.team.name)}</span>
        <h3 class="sprint-card__title">${escapeHtml(sprint.iteration.name)}</h3>
      </div>
      <div class="sprint-card__dates">
        <span class="sprint-card__date-range">${formatDate(startDate)} → ${formatDate(finishDate)}</span>
        ${isCurrent ? `<span class="sprint-card__current-badge">● Current</span>` : ""}
        ${dayLabel ? `<span class="sprint-card__days-left ${isPast ? "past" : ""}">${dayLabel}</span>` : ""}
      </div>
    </div>
    <div class="sprint-card__progress">
      <div class="progress-bar">
        <div class="progress-bar__fill" style="width:${summary.completionPct}%"></div>
      </div>
      <div class="progress-stats">
        <span class="progress-stats__pct">${summary.completionPct}% complete</span>
        <span class="progress-stats__counts">
          <span class="mini-badge state-new" title="New">${summary.newCount}</span>
          <span class="mini-badge state-active" title="Active">${summary.activeCount}</span>
          <span class="mini-badge state-resolved" title="Resolved">${summary.resolvedCount}</span>
          <span class="mini-badge state-closed" title="Closed">${summary.closedCount}</span>
          ${summary.blockedCount > 0 ? `<span class="mini-badge state-blocked" title="Blocked">🚫 ${summary.blockedCount}</span>` : ""}
        </span>
      </div>
    </div>
    <div class="sprint-card__standup-strip">
      <div class="standup-chip">
        <span class="standup-chip__label">Effort</span>
        <span class="standup-chip__value">${summary.completedEffort}h / ${summary.totalEffort}h</span>
      </div>
      <div class="standup-chip">
        <span class="standup-chip__label">Remaining</span>
        <span class="standup-chip__value">${summary.remainingEffort}h</span>
      </div>
      <div class="standup-chip">
        <span class="standup-chip__label">Items</span>
        <span class="standup-chip__value">${summary.totalItems}</span>
      </div>
      ${summary.blockedCount > 0 ? `
      <div class="standup-chip standup-chip--danger">
        <span class="standup-chip__label">Blocked</span>
        <span class="standup-chip__value">${summary.blockedCount}</span>
      </div>` : ""}
    </div>
    <div class="sprint-card__table-wrap"></div>
  `;

  // Sort state for this card
  let currentSort: SortState = { field: "priority", dir: "asc" };

  const tableWrap = card.querySelector(".sprint-card__table-wrap")!;

  function renderTable() {
    tableWrap.innerHTML = "";

    if (sprint.workItems.length === 0) {
      tableWrap.innerHTML = `<p class="empty-msg">No work items match your filters.</p>`;
      return;
    }

    const sortedItems = sortWorkItems(sprint.workItems, currentSort);

    const table = document.createElement("table");
    table.className = "wi-table";

    const columns: { key: SortField; label: string }[] = [
      { key: "type", label: "" },
      { key: "id", label: "ID" },
      { key: "title", label: "Title" },
      { key: "state", label: "State" },
      { key: "priority", label: "Priority" },
      { key: "assigned", label: "Assigned To" },
      { key: "effort", label: "Effort" },
    ];

    // Non-sortable columns
    const extraHeaders = ["Tags", "Activity", "Dependencies"];

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    for (const col of columns) {
      const th = document.createElement("th");
      th.className = "sortable-th";
      const isActive = currentSort.field === col.key;
      const arrow = isActive ? (currentSort.dir === "asc" ? " ▲" : " ▼") : "";
      th.innerHTML = `${col.label}<span class="sort-arrow${isActive ? " active" : ""}">${arrow}</span>`;
      th.title = `Sort by ${col.label || "Type"}`;
      th.addEventListener("click", () => {
        if (currentSort.field === col.key) {
          currentSort.dir = currentSort.dir === "asc" ? "desc" : "asc";
        } else {
          currentSort = { field: col.key, dir: "asc" };
        }
        renderTable();
      });
      headerRow.appendChild(th);
    }

    for (const label of extraHeaders) {
      const th = document.createElement("th");
      th.textContent = label;
      headerRow.appendChild(th);
    }

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (const wi of sortedItems) {
      tbody.appendChild(renderWorkItemRow(wi));
    }
    table.appendChild(tbody);
    tableWrap.appendChild(table);
  }

  renderTable();

  return card;
}

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
