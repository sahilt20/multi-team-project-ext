import { SprintInfo, TimeFrame } from "../services/dataService";
import { getField } from "./helpers";

export interface FilterState {
  selectedTeams: Set<string>;
  selectedMembers: Set<string>;
  timeframes: Set<TimeFrame>;
  workItemTypes: Set<string>;
  states: Set<string>;
  priorities: Set<string>;
  onlyMyItems: boolean;
  searchText: string;
  showBlockedOnly: boolean;
}

export function createDefaultFilter(): FilterState {
  return {
    selectedTeams: new Set(),
    selectedMembers: new Set(),
    timeframes: new Set(["current"]),
    workItemTypes: new Set(),
    states: new Set(),
    priorities: new Set(),
    onlyMyItems: true,
    searchText: "",
    showBlockedOnly: false,
  };
}

export function renderFilters(
  container: HTMLElement,
  sprints: SprintInfo[],
  filter: FilterState,
  onChange: () => void
): void {
  // Collect unique values
  const teamMap = new Map<string, string>();
  const membersMap = new Map<string, string>();
  const typesSet = new Set<string>();
  const statesSet = new Set<string>();
  const prioritiesSet = new Set<string>();

  for (const s of sprints) {
    teamMap.set(s.team.id, s.team.name);
    for (const wi of s.workItems) {
      const t = getField(wi, "System.WorkItemType") as string;
      const st = getField(wi, "System.State") as string;
      const p = getField(wi, "Microsoft.VSTS.Common.Priority") as number;
      if (t) typesSet.add(t);
      if (st) statesSet.add(st);
      if (p) prioritiesSet.add(String(p));

      // Collect unique members
      const assigned = getField(wi, "System.AssignedTo");
      if (assigned) {
        const memberId = typeof assigned === "object" ? (assigned.id || assigned.uniqueName || "") : String(assigned);
        const memberName = typeof assigned === "object" ? (assigned.displayName || assigned.uniqueName || "Unknown") : String(assigned);
        if (memberId) membersMap.set(memberId, memberName);
      }
    }
  }

  const bar = document.createElement("div");
  bar.className = "filter-bar";

  // ── Text search ───────────────────────────────────────────────────
  const searchGroup = document.createElement("div");
  searchGroup.className = "filter-group filter-group--search";
  searchGroup.innerHTML = `<label class="filter-label">Search</label>`;
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.className = "search-input";
  searchInput.placeholder = "Search by title, ID, or assigned…";
  searchInput.value = filter.searchText;
  let debounceTimer: any;
  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      filter.searchText = searchInput.value;
      onChange();
    }, 300);
  });
  searchGroup.appendChild(searchInput);
  bar.appendChild(searchGroup);

  // ── Timeframe toggles ────────────────────────────────────────────
  const tfGroup = document.createElement("div");
  tfGroup.className = "filter-group";
  tfGroup.innerHTML = `<label class="filter-label">Sprint Timeframe</label>`;
  const tfBtns = document.createElement("div");
  tfBtns.className = "toggle-group";
  for (const tf of ["past", "current", "future"] as TimeFrame[]) {
    const btn = document.createElement("button");
    btn.className = `toggle-btn ${filter.timeframes.has(tf) ? "active" : ""}`;
    btn.textContent = tf.charAt(0).toUpperCase() + tf.slice(1);
    btn.addEventListener("click", () => {
      if (filter.timeframes.has(tf)) filter.timeframes.delete(tf);
      else filter.timeframes.add(tf);
      btn.classList.toggle("active");
      onChange();
    });
    tfBtns.appendChild(btn);
  }
  tfGroup.appendChild(tfBtns);
  bar.appendChild(tfGroup);

  // ── Scope toggles ───────────────────────────────────────────────
  const scopeGroup = document.createElement("div");
  scopeGroup.className = "filter-group";
  scopeGroup.innerHTML = `<label class="filter-label">Scope</label>`;
  const scopeBtns = document.createElement("div");
  scopeBtns.className = "toggle-group";

  const myBtn = document.createElement("button");
  myBtn.className = `toggle-btn ${filter.onlyMyItems ? "active" : ""}`;
  myBtn.textContent = "My Items";
  myBtn.addEventListener("click", () => {
    filter.onlyMyItems = !filter.onlyMyItems;
    myBtn.classList.toggle("active");
    onChange();
  });
  scopeBtns.appendChild(myBtn);

  const blockedBtn = document.createElement("button");
  blockedBtn.className = `toggle-btn toggle-btn--danger ${filter.showBlockedOnly ? "active" : ""}`;
  blockedBtn.textContent = "🚫 Blocked";
  blockedBtn.addEventListener("click", () => {
    filter.showBlockedOnly = !filter.showBlockedOnly;
    blockedBtn.classList.toggle("active");
    onChange();
  });
  scopeBtns.appendChild(blockedBtn);

  scopeGroup.appendChild(scopeBtns);
  bar.appendChild(scopeGroup);

  // ── Team multi-select ────────────────────────────────────────────
  bar.appendChild(
    buildMultiSelect("Teams", teamMap, filter.selectedTeams, onChange)
  );

  // ── Members multi-select ─────────────────────────────────────────
  bar.appendChild(
    buildMultiSelect("Members", membersMap, filter.selectedMembers, onChange)
  );

  // ── Work item type multi-select ──────────────────────────────────
  const typeMap = new Map<string, string>();
  typesSet.forEach((t) => typeMap.set(t, t));
  bar.appendChild(
    buildMultiSelect("Type", typeMap, filter.workItemTypes, onChange)
  );

  // ── State multi-select ───────────────────────────────────────────
  const stateMap = new Map<string, string>();
  statesSet.forEach((s) => stateMap.set(s, s));
  bar.appendChild(
    buildMultiSelect("State", stateMap, filter.states, onChange)
  );

  // ── Priority multi-select ────────────────────────────────────────
  const priorityMap = new Map<string, string>();
  const pLabels: Record<string, string> = { "1": "🔴 P1 Critical", "2": "🟠 P2 High", "3": "🟡 P3 Medium", "4": "🟢 P4 Low" };
  Array.from(prioritiesSet).sort().forEach((p) => {
    priorityMap.set(p, pLabels[p] || `P${p}`);
  });
  bar.appendChild(
    buildMultiSelect("Priority", priorityMap, filter.priorities, onChange)
  );

  container.appendChild(bar);
}

function buildMultiSelect(
  label: string,
  options: Map<string, string>,
  selected: Set<string>,
  onChange: () => void
): HTMLElement {
  const group = document.createElement("div");
  group.className = "filter-group filter-dropdown-group";

  const lbl = document.createElement("label");
  lbl.className = "filter-label";
  lbl.textContent = label;
  group.appendChild(lbl);

  const trigger = document.createElement("button");
  trigger.className = "dropdown-trigger";
  const updateLabel = () => {
    trigger.textContent =
      selected.size === 0
        ? `All ${label}`
        : `${selected.size} selected`;
  };
  updateLabel();

  const dropdown = document.createElement("div");
  dropdown.className = "dropdown-menu hidden";

  // "All" option
  const allOpt = document.createElement("label");
  allOpt.className = "dropdown-option";
  const allCb = document.createElement("input");
  allCb.type = "checkbox";
  allCb.checked = selected.size === 0;
  allCb.addEventListener("change", () => {
    selected.clear();
    dropdown.querySelectorAll<HTMLInputElement>("input[data-key]").forEach(
      (cb) => (cb.checked = false)
    );
    allCb.checked = true;
    updateLabel();
    onChange();
  });
  allOpt.appendChild(allCb);
  allOpt.appendChild(document.createTextNode(` All`));
  dropdown.appendChild(allOpt);

  options.forEach((name, key) => {
    const opt = document.createElement("label");
    opt.className = "dropdown-option";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.dataset.key = key;
    cb.checked = selected.has(key);
    cb.addEventListener("change", () => {
      if (cb.checked) {
        selected.add(key);
        allCb.checked = false;
      } else {
        selected.delete(key);
        if (selected.size === 0) allCb.checked = true;
      }
      updateLabel();
      onChange();
    });
    opt.appendChild(cb);
    opt.appendChild(document.createTextNode(` ${name}`));
    dropdown.appendChild(opt);
  });

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    document.querySelectorAll(".dropdown-menu").forEach((m) => {
      if (m !== dropdown) m.classList.add("hidden");
    });
    dropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", () => dropdown.classList.add("hidden"));
  dropdown.addEventListener("click", (e) => e.stopPropagation());

  group.appendChild(trigger);
  group.appendChild(dropdown);
  return group;
}

/** Apply filters to the sprint data */
export function applyFilters(
  sprints: SprintInfo[],
  filter: FilterState,
  currentUserId: string
): SprintInfo[] {
  const searchLower = filter.searchText.toLowerCase().trim();

  return sprints
    .filter((s) => {
      if (filter.selectedTeams.size > 0 && !filter.selectedTeams.has(s.team.id))
        return false;
      return true;
    })
    .map((s) => {
      let items = s.workItems;

      if (filter.workItemTypes.size > 0) {
        items = items.filter((wi) =>
          filter.workItemTypes.has(getField(wi, "System.WorkItemType") as string)
        );
      }
      if (filter.states.size > 0) {
        items = items.filter((wi) =>
          filter.states.has(getField(wi, "System.State") as string)
        );
      }
      if (filter.priorities.size > 0) {
        items = items.filter((wi) => {
          const p = getField(wi, "Microsoft.VSTS.Common.Priority") as number;
          return filter.priorities.has(String(p));
        });
      }
      if (filter.selectedMembers.size > 0) {
        items = items.filter((wi) => {
          const assigned = getField(wi, "System.AssignedTo");
          if (!assigned) return false;
          const uid = typeof assigned === "object" ? (assigned.id || assigned.uniqueName) : String(assigned);
          return filter.selectedMembers.has(uid);
        });
      } else if (filter.onlyMyItems) {
        items = items.filter((wi) => {
          const assigned = getField(wi, "System.AssignedTo");
          if (!assigned) return false;
          const uid = typeof assigned === "object" ? assigned.id || assigned.uniqueName : assigned;
          return uid === currentUserId;
        });
      }
      if (filter.showBlockedOnly) {
        items = items.filter((wi) => {
          const tags = (getField(wi, "System.Tags") as string) || "";
          return tags.toLowerCase().includes("blocked");
        });
      }
      if (searchLower) {
        items = items.filter((wi) => {
          const title = ((getField(wi, "System.Title") as string) || "").toLowerCase();
          const id = String(getField(wi, "System.Id") || "");
          const assigned = getField(wi, "System.AssignedTo");
          const assignedName =
            assigned && typeof assigned === "object"
              ? (assigned.displayName || "").toLowerCase()
              : ((assigned as string) || "").toLowerCase();
          const tags = ((getField(wi, "System.Tags") as string) || "").toLowerCase();
          return (
            title.includes(searchLower) ||
            id.includes(searchLower) ||
            assignedName.includes(searchLower) ||
            tags.includes(searchLower)
          );
        });
      }

      return { ...s, workItems: items };
    })
    .filter((s) => s.workItems.length > 0);
}
