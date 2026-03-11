import { CrossTeamData, SprintInfo, TimeFrame } from "../services/dataService";
import { DataService } from "../services/dataService";
import { renderSummaryBar } from "./summaryBar";
import {
  renderFilters,
  createDefaultFilter,
  applyFilters,
  FilterState,
} from "./filters";
import { renderTeamSprintCard } from "./teamSprintCard";

export class Dashboard {
  private root: HTMLElement;
  private dataService: DataService;
  private rawData: CrossTeamData | null = null;
  private filter: FilterState;

  constructor(root: HTMLElement, dataService: DataService) {
    this.root = root;
    this.dataService = dataService;
    this.filter = createDefaultFilter();
  }

  async load(): Promise<void> {
    this.showLoading();

    try {
      this.rawData = await this.dataService.buildCrossTeamView(
        Array.from(this.filter.timeframes) as TimeFrame[]
      );
      this.render();
    } catch (err: any) {
      this.showError(err.message || String(err));
    }
  }

  private render(): void {
    if (!this.rawData) return;
    this.root.innerHTML = "";
    this.root.dataset.project = this.rawData.projectName;

    // Summary bar
    const filtered = applyFilters(
      this.rawData.sprints,
      this.filter,
      this.rawData.currentUserId
    );
    renderSummaryBar(this.root, filtered, this.rawData.currentUserName);

    // Filters
    renderFilters(this.root, this.rawData.sprints, this.filter, () =>
      this.onFilterChange()
    );

    // Sprint cards container
    const grid = document.createElement("div");
    grid.className = "sprint-grid";
    grid.id = "sprint-grid";

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">📭</div>
          <h2 class="empty-state__title">No sprints found</h2>
          <p class="empty-state__desc">Try adjusting your filters or timeframe to see more results.</p>
        </div>
      `;
    } else {
      for (const sprint of filtered) {
        grid.appendChild(renderTeamSprintCard(sprint));
      }
    }

    this.root.appendChild(grid);
  }

  private async onFilterChange(): Promise<void> {
    if (!this.rawData) return;

    // If timeframes changed, we need to reload data
    const currentTfs = Array.from(this.filter.timeframes) as TimeFrame[];
    const dataTfs = ["current"]; // our initial timeframes

    const tfChanged =
      currentTfs.length !== dataTfs.length ||
      !currentTfs.every((tf) => dataTfs.includes(tf));

    if (tfChanged) {
      // Reload data with new timeframes
      await this.load();
    } else {
      this.render();
    }
  }

  private showLoading(): void {
    this.root.innerHTML = `
      <div class="loading-screen">
        <div class="loading-spinner"></div>
        <p class="loading-text">Fetching cross-team sprint data…</p>
        <p class="loading-subtext">Scanning teams, iterations, and work items</p>
      </div>
    `;
  }

  private showError(message: string): void {
    this.root.innerHTML = `
      <div class="error-screen">
        <div class="error-icon">⚠️</div>
        <h2 class="error-title">Something went wrong</h2>
        <p class="error-message">${escapeHtml(message)}</p>
        <button class="retry-btn" id="retry-btn">Retry</button>
      </div>
    `;
    document.getElementById("retry-btn")?.addEventListener("click", () => this.load());
  }
}

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
