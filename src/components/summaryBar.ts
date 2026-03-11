import { calcGlobalSummary } from "./helpers";
import { SprintInfo } from "../services/dataService";

export function renderSummaryBar(
  container: HTMLElement,
  sprints: SprintInfo[],
  userName: string
): void {
  const stats = calcGlobalSummary(sprints);

  const bar = document.createElement("div");
  bar.className = "summary-bar";
  bar.innerHTML = `
    <div class="summary-greeting">
      <h1 class="summary-title">Multi-Team Sprint View</h1>
      <p class="summary-subtitle">Welcome back, <strong>${escapeHtml(userName)}</strong> · Daily Standup Dashboard</p>
    </div>
    <div class="summary-stats">
      <div class="stat-card">
        <span class="stat-value">${stats.teamCount}</span>
        <span class="stat-label">Teams</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${stats.sprintCount}</span>
        <span class="stat-label">Sprints</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${stats.totalItems}</span>
        <span class="stat-label">Work Items</span>
      </div>
      <div class="stat-card stat-card--active">
        <span class="stat-value">${stats.activeItems}</span>
        <span class="stat-label">In Progress</span>
      </div>
      ${
        stats.blockedItems > 0
          ? `<div class="stat-card stat-card--danger">
               <span class="stat-value">${stats.blockedItems}</span>
               <span class="stat-label">Blocked</span>
             </div>`
          : ""
      }
      ${
        stats.criticalCount > 0
          ? `<div class="stat-card stat-card--critical">
               <span class="stat-value">${stats.criticalCount}</span>
               <span class="stat-label">P1 Critical</span>
             </div>`
          : ""
      }
      <div class="stat-card stat-card--accent">
        <span class="stat-value">${stats.completionPct}%</span>
        <span class="stat-label">Done</span>
      </div>
    </div>
  `;

  // Theme toggle button (top-right area)
  const themeBtn = document.createElement("button");
  themeBtn.className = "theme-toggle";
  themeBtn.id = "theme-toggle";
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  themeBtn.innerHTML = `<span class="theme-toggle__icon">${isDark ? "☀️" : "🌙"}</span> ${isDark ? "Light" : "Dark"}`;
  themeBtn.addEventListener("click", () => {
    toggleTheme();
    // Update button text
    const nowDark = document.documentElement.getAttribute("data-theme") === "dark";
    themeBtn.innerHTML = `<span class="theme-toggle__icon">${nowDark ? "☀️" : "🌙"}</span> ${nowDark ? "Light" : "Dark"}`;
  });

  // Insert toggle into greeting area
  const greeting = bar.querySelector(".summary-greeting");
  if (greeting) {
    greeting.appendChild(themeBtn);
  }

  // Standup metrics row
  const metricsRow = document.createElement("div");
  metricsRow.className = "standup-metrics";
  metricsRow.innerHTML = `
    <div class="metric-item">
      <span class="metric-icon">⏱️</span>
      <span class="metric-text"><strong>${stats.completedEffort}h</strong> completed / <strong>${stats.totalEffort}h</strong> estimated</span>
    </div>
    <div class="metric-item">
      <span class="metric-icon">📊</span>
      <span class="metric-text"><strong>${stats.remainingEffort}h</strong> remaining effort</span>
    </div>
    <div class="metric-item">
      <span class="metric-icon">🔥</span>
      <span class="metric-text">Capacity: <strong>${stats.totalEffort > 0 ? Math.round((stats.completedEffort / stats.totalEffort) * 100) : 0}%</strong> utilized</span>
    </div>
  `;
  bar.appendChild(metricsRow);

  container.appendChild(bar);
}

/** Initialize theme from localStorage (call once on boot) */
export function initTheme(): void {
  const saved = localStorage.getItem("mtsv-theme") || "light";
  if (saved === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

/** Toggle between light and dark */
function toggleTheme(): void {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  if (isDark) {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("mtsv-theme", "light");
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("mtsv-theme", "dark");
  }
}

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
