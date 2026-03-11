import * as SDK from "azure-devops-extension-sdk";
import { DataService } from "./services/dataService";
import { Dashboard } from "./components/dashboard";
import { initTheme } from "./components/summaryBar";
import "./styles/main.css";

// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", () => {
  // Apply saved theme preference before anything renders
  initTheme();

  // Initialize the Azure DevOps Extension SDK
  SDK.init({ loaded: false });

  SDK.ready().then(async () => {
    const root = document.getElementById("app");
    if (!root) {
      console.error("Multi-Team Sprint View: #app element not found");
      SDK.notifyLoadSucceeded();
      return;
    }

    // Remove loading screen
    const loading = document.getElementById("loading-screen");
    if (loading) loading.remove();

    try {
      const dataService = new DataService();
      await dataService.init();

      const dashboard = new Dashboard(root, dataService);
      await dashboard.load();

      // Notify the host that we loaded successfully
      SDK.notifyLoadSucceeded();
    } catch (err: any) {
      console.error("Multi-Team Sprint View init error:", err);
      root.innerHTML = `
        <div class="error-screen">
          <div class="error-icon">⚠️</div>
          <h2 class="error-title">Extension Initialization Failed</h2>
          <p class="error-message">${err.message || err}</p>
          <button class="retry-btn" onclick="window.location.reload()">Retry</button>
        </div>
      `;
      // Still notify load succeeded so the host doesn't timeout
      SDK.notifyLoadSucceeded();
    }
  });
});
