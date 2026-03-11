/**
 * Local development entry point.
 * Uses mock data instead of the Azure DevOps SDK so you can preview
 * the full UI in any browser without an Azure DevOps organization.
 *
 * Run:  npm run dev:local   (starts webpack-dev-server on port 3000)
 */

import { getMockData } from "./services/mockData";
import { CrossTeamData, SprintInfo, TimeFrame } from "./services/dataService";
import { renderSummaryBar } from "./components/summaryBar";
import {
  renderFilters,
  createDefaultFilter,
  applyFilters,
  FilterState,
} from "./components/filters";
import { renderTeamSprintCard } from "./components/teamSprintCard";
import "./styles/main.css";

class LocalDashboard {
  private root: HTMLElement;
  private data: CrossTeamData;
  private filter: FilterState;

  constructor(root: HTMLElement) {
    this.root = root;
    this.data = getMockData();
    this.filter = createDefaultFilter();
    // In local mode, show all items (not just "my items") so we see full data
    this.filter.onlyMyItems = false;
  }

  render(): void {
    this.root.innerHTML = "";
    this.root.dataset.project = this.data.projectName;

    const filtered = applyFilters(
      this.data.sprints,
      this.filter,
      this.data.currentUserId
    );

    // Summary bar
    renderSummaryBar(this.root, filtered, this.data.currentUserName);

    // Filters
    renderFilters(this.root, this.data.sprints, this.filter, () =>
      this.render()
    );

    // Sprint cards
    const grid = document.createElement("div");
    grid.className = "sprint-grid";

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
}

// Boot
document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("app");
  if (!root) return;

  // Remove the loading screen
  const loading = document.getElementById("loading-screen");
  if (loading) loading.remove();

  const dashboard = new LocalDashboard(root);
  dashboard.render();
});
