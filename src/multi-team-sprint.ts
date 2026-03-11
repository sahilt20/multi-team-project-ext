import * as SDK from "azure-devops-extension-sdk";
import { DataService } from "./services/dataService";
import { Dashboard } from "./components/dashboard";
import "./styles/main.css";

async function main(): Promise<void> {
  // Initialize the Azure DevOps Extension SDK
  await SDK.init({ loaded: false });

  const root = document.getElementById("app");
  if (!root) {
    console.error("Multi-Team Sprint View: #app element not found");
    return;
  }

  try {
    const dataService = new DataService();
    await dataService.init();

    const dashboard = new Dashboard(root, dataService);
    await dashboard.load();
  } catch (err: any) {
    console.error("Multi-Team Sprint View init error:", err);
    root.innerHTML = `
      <div class="error-screen">
        <div class="error-icon">⚠️</div>
        <h2 class="error-title">Extension Initialization Failed</h2>
        <p class="error-message">${err.message || err}</p>
      </div>
    `;
  }

  // Notify the host that we're done loading
  await SDK.notifyLoadSucceeded();
}

main();
