import { WorkItem } from "azure-devops-extension-api/WorkItemTracking";
import {
  getField,
  getStateBadgeClass,
  getTypeIcon,
  getRelations,
  getPriorityClass,
  getPriorityLabel,
  isBlocked,
  formatRelativeDate,
} from "./helpers";

export function renderWorkItemRow(wi: WorkItem): HTMLElement {
  const row = document.createElement("tr");
  row.className = "wi-row";

  const id = getField(wi, "System.Id") as number;
  const title = getField(wi, "System.Title") as string;
  const state = getField(wi, "System.State") as string;
  const type = getField(wi, "System.WorkItemType") as string;
  const assignedTo = getField(wi, "System.AssignedTo");
  const priority = getField(wi, "Microsoft.VSTS.Common.Priority") as number | null;
  const remaining = getField(wi, "Microsoft.VSTS.Scheduling.RemainingWork") as number | null;
  const original = getField(wi, "Microsoft.VSTS.Scheduling.OriginalEstimate") as number | null;
  const completed = getField(wi, "Microsoft.VSTS.Scheduling.CompletedWork") as number | null;
  const tags = (getField(wi, "System.Tags") as string) || "";
  const changedDate = getField(wi, "System.ChangedDate") as string;
  const relations = getRelations(wi);
  const blocked = isBlocked(wi);

  const assignedName =
    assignedTo && typeof assignedTo === "object"
      ? assignedTo.displayName || assignedTo.uniqueName || "Unassigned"
      : assignedTo || "Unassigned";

  const assignedInitials = (assignedName as string)
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  // Effort bar
  const effortTotal = original || 0;
  const effortDone = completed || 0;
  const effortPct = effortTotal > 0 ? Math.min(100, Math.round((effortDone / effortTotal) * 100)) : 0;

  // Blocked row highlight
  if (blocked) row.classList.add("wi-row--blocked");

  // Format tags
  const tagBadges = tags
    .split(";")
    .map((t) => t.trim())
    .filter((t) => t)
    .map((t) => {
      const cls = t.toLowerCase() === "blocked" ? "tag-badge tag-badge--blocked" : "tag-badge";
      return `<span class="${cls}">${escapeHtml(t)}</span>`;
    })
    .join(" ");

  row.innerHTML = `
    <td class="wi-cell wi-cell--type" title="${escapeAttr(type)}">
      <span class="type-icon">${getTypeIcon(type)}</span>
    </td>
    <td class="wi-cell wi-cell--id">
      <a class="wi-link" href="#" data-id="${id}">${id}</a>
    </td>
    <td class="wi-cell wi-cell--title" title="${escapeAttr(title)}">
      ${blocked ? '<span class="blocked-indicator" title="Blocked">🚫</span> ' : ""}
      ${escapeHtml(title)}
    </td>
    <td class="wi-cell wi-cell--state">
      <span class="state-badge ${getStateBadgeClass(state)}">${escapeHtml(state)}</span>
    </td>
    <td class="wi-cell wi-cell--priority">
      <span class="priority-badge ${getPriorityClass(priority)}">${getPriorityLabel(priority)}</span>
    </td>
    <td class="wi-cell wi-cell--assigned">
      <span class="avatar" title="${escapeAttr(assignedName as string)}">${assignedInitials}</span>
      <span class="assigned-name">${escapeHtml(assignedName as string)}</span>
    </td>
    <td class="wi-cell wi-cell--effort">
      ${
        effortTotal > 0
          ? `<div class="effort-bar-container">
               <div class="effort-bar" style="width:${effortPct}%"></div>
             </div>
             <span class="effort-text">${effortDone}/${effortTotal}h</span>`
          : remaining != null
          ? `<span class="effort-text">${remaining}h rem</span>`
          : `<span class="effort-text muted">—</span>`
      }
    </td>
    <td class="wi-cell wi-cell--tags">
      ${tagBadges || '<span class="muted">—</span>'}
    </td>
    <td class="wi-cell wi-cell--activity" title="${changedDate || ""}">
      ${formatRelativeDate(changedDate)}
    </td>
    <td class="wi-cell wi-cell--deps">
      ${
        relations.length > 0
          ? relations
              .map(
                (r) =>
                  `<span class="dep-badge dep-badge--${r.type.toLowerCase()}" title="${r.type} #${r.id}">${r.type[0]}#${r.id}</span>`
              )
              .join(" ")
          : `<span class="muted">—</span>`
      }
    </td>
  `;

  // Make the ID link open the work item
  const link = row.querySelector(".wi-link") as HTMLAnchorElement;
  if (link) {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      try {
        const base = window.location.origin;
        const project = encodeURIComponent(
          document.body.dataset.project || ""
        );
        window.open(`${base}/${project}/_workitems/edit/${id}`, "_blank");
      } catch {
        alert(`Work Item #${id}`);
      }
    });
  }

  return row;
}

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str: string): string {
  return str.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
