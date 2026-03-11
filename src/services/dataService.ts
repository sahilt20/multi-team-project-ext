import * as SDK from "azure-devops-extension-sdk";
import {
  CommonServiceIds,
  IProjectPageService,
  getClient,
} from "azure-devops-extension-api";
import { CoreRestClient, WebApiTeam } from "azure-devops-extension-api/Core";
import {
  WorkRestClient,
  TeamSettingsIteration,
  IterationWorkItems,
} from "azure-devops-extension-api/Work";
import {
  WorkItemTrackingRestClient,
  WorkItem,
  WorkItemExpand,
} from "azure-devops-extension-api/WorkItemTracking";

// ── Types ──────────────────────────────────────────────────────────────

export interface SprintInfo {
  team: WebApiTeam;
  iteration: TeamSettingsIteration;
  workItems: WorkItem[];
}

export interface CrossTeamData {
  projectName: string;
  currentUserId: string;
  currentUserName: string;
  sprints: SprintInfo[];
}

export type TimeFrame = "past" | "current" | "future";

// ── Data Service ───────────────────────────────────────────────────────

export class DataService {
  private coreClient!: CoreRestClient;
  private workClient!: WorkRestClient;
  private witClient!: WorkItemTrackingRestClient;
  private projectName!: string;

  async init(): Promise<void> {
    const projectService = await SDK.getService<IProjectPageService>(
      CommonServiceIds.ProjectPageService
    );
    const project = await projectService.getProject();
    if (!project) throw new Error("Could not determine the current project.");
    this.projectName = project.name;

    this.coreClient = getClient(CoreRestClient);
    this.workClient = getClient(WorkRestClient);
    this.witClient = getClient(WorkItemTrackingRestClient);
  }

  /** Fetch all teams in the project */
  async getAllTeams(): Promise<WebApiTeam[]> {
    const teams: WebApiTeam[] = [];
    let top = 100;
    let skip = 0;
    let batch: WebApiTeam[];
    do {
      batch = await this.coreClient.getTeams(this.projectName, false, top, skip);
      teams.push(...batch);
      skip += top;
    } while (batch.length === top);
    return teams;
  }

  /** Fetch iterations for a team, optionally filtered by timeframe */
  async getTeamIterations(
    teamId: string,
    timeframe?: TimeFrame
  ): Promise<TeamSettingsIteration[]> {
    const teamContext = { projectId: this.projectName, teamId, project: "", team: "" };
    return this.workClient.getTeamIterations(teamContext, timeframe);
  }

  /** Fetch work-item references in an iteration */
  async getIterationWorkItems(
    teamId: string,
    iterationId: string
  ): Promise<IterationWorkItems> {
    const teamContext = { projectId: this.projectName, teamId, project: "", team: "" };
    return this.workClient.getIterationWorkItems(teamContext, iterationId);
  }

  /** Batch-fetch full work-item details */
  async getWorkItemDetails(ids: number[]): Promise<WorkItem[]> {
    if (ids.length === 0) return [];
    const fields = [
      "System.Id",
      "System.Title",
      "System.State",
      "System.WorkItemType",
      "System.AssignedTo",
      "System.IterationPath",
      "System.AreaPath",
      "System.Tags",
      "System.ChangedDate",
      "Microsoft.VSTS.Common.Priority",
      "Microsoft.VSTS.Scheduling.RemainingWork",
      "Microsoft.VSTS.Scheduling.OriginalEstimate",
      "Microsoft.VSTS.Scheduling.CompletedWork",
      "Microsoft.VSTS.CMMI.BlockedReason",
    ];

    // API limits batch to 200 IDs
    const allItems: WorkItem[] = [];
    for (let i = 0; i < ids.length; i += 200) {
      const batch = ids.slice(i, i + 200);
      const items = await this.witClient.getWorkItems(
        batch,
        this.projectName,
        fields,
        undefined,
        WorkItemExpand.Relations
      );
      allItems.push(...items);
    }
    return allItems;
  }

  /** Main orchestrator — builds the full cross-team dataset */
  async buildCrossTeamView(
    timeframes: TimeFrame[] = ["current"]
  ): Promise<CrossTeamData> {
    const currentUser = SDK.getUser();
    const teams = await this.getAllTeams();

    const sprints: SprintInfo[] = [];

    for (const team of teams) {
      for (const tf of timeframes) {
        let iterations: TeamSettingsIteration[];
        try {
          iterations = await this.getTeamIterations(team.id, tf);
        } catch {
          continue; // team might not have iterations configured
        }

        for (const iteration of iterations) {
          let iterWorkItems: IterationWorkItems;
          try {
            iterWorkItems = await this.getIterationWorkItems(
              team.id,
              iteration.id
            );
          } catch {
            continue;
          }

          const targetIds = (iterWorkItems.workItemRelations || [])
            .filter((r) => r.target)
            .map((r) => r.target.id);

          const uniqueIds = [...new Set(targetIds)];
          const workItems = await this.getWorkItemDetails(uniqueIds);

          sprints.push({ team, iteration, workItems });
        }
      }
    }

    return {
      projectName: this.projectName,
      currentUserId: currentUser.id,
      currentUserName: currentUser.displayName,
      sprints,
    };
  }
}
