import { CrossTeamData, SprintInfo, TimeFrame } from "./dataService";

/**
 * Mock data service for local development.
 * Provides realistic dummy data to preview the UI without Azure DevOps.
 */

const TEAMS = [
  { id: "team-1", name: "Platform Engineering", description: "Core platform services", url: "", projectId: "proj-1", projectName: "Enterprise Portal", identity: undefined as any, identityUrl: "" },
  { id: "team-2", name: "Integration Team", description: "API integrations & middleware", url: "", projectId: "proj-1", projectName: "Enterprise Portal", identity: undefined as any, identityUrl: "" },
  { id: "team-3", name: "BI & Analytics Team", description: "Business intelligence & reporting", url: "", projectId: "proj-1", projectName: "Enterprise Portal", identity: undefined as any, identityUrl: "" },
  { id: "team-4", name: "DevOps & SRE", description: "Infrastructure and reliability", url: "", projectId: "proj-1", projectName: "Enterprise Portal", identity: undefined as any, identityUrl: "" },
];

const PEOPLE = [
  { displayName: "Sahil Tanwar", id: "user-current", uniqueName: "sahil@company.com" },
  { displayName: "Priya Sharma", id: "user-2", uniqueName: "priya@company.com" },
  { displayName: "Alex Chen", id: "user-3", uniqueName: "alex@company.com" },
  { displayName: "Maria Garcia", id: "user-4", uniqueName: "maria@company.com" },
  { displayName: "James Wilson", id: "user-5", uniqueName: "james@company.com" },
  { displayName: "Aisha Patel", id: "user-6", uniqueName: "aisha@company.com" },
  { displayName: "Ravi Kumar", id: "user-7", uniqueName: "ravi@company.com" },
  { displayName: "Emma Johnson", id: "user-8", uniqueName: "emma@company.com" },
];

// Platform team members (Sahil + others from his team who serve other teams)
const PLATFORM_MEMBERS = [PEOPLE[0], PEOPLE[1], PEOPLE[6]]; // Sahil, Priya, Ravi

const STATES = ["New", "Active", "Resolved", "Closed"];
const TYPES = ["Product Backlog Item", "Task", "Bug", "User Story"];
const PRIORITIES = [1, 2, 3, 4];
const TAG_SETS = [
  "", "", "", // many items with no tags
  "DevOps", "Infrastructure", "API",
  "Blocked", "Blocked;High-Impact",
  "Migration", "Security", "Performance",
  "CI/CD", "Monitoring", "Documentation",
];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hoursAgo(h: number): string {
  const d = new Date();
  d.setHours(d.getHours() - h);
  return d.toISOString();
}

function daysAgo(d: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  return dt.toISOString();
}

function makeWorkItem(id: number, overrides: Partial<any> = {}): any {
  const type = overrides.type || randomPick(TYPES);
  const state = overrides.state || randomPick(STATES);
  const assigned = overrides.assigned || randomPick(PEOPLE);
  const priority = overrides.priority || randomPick(PRIORITIES);
  const tags = overrides.tags !== undefined ? overrides.tags : randomPick(TAG_SETS);
  const original = overrides.original || Math.floor(Math.random() * 16) + 2;
  const completed = state === "Closed" || state === "Resolved"
    ? original
    : state === "Active"
    ? Math.floor(Math.random() * original)
    : 0;
  const remaining = original - completed;
  const changedDate = overrides.changedDate || (
    state === "Active" ? hoursAgo(Math.floor(Math.random() * 8) + 1) :
    state === "New" ? daysAgo(Math.floor(Math.random() * 3)) :
    daysAgo(Math.floor(Math.random() * 5))
  );

  const relations: any[] = [];
  if (Math.random() > 0.7) {
    relations.push({
      rel: "System.LinkTypes.Related",
      url: `https://dev.azure.com/_apis/wit/workItems/${id + 10}`,
      attributes: {},
    });
  }
  if (Math.random() > 0.85) {
    relations.push({
      rel: "System.LinkTypes.Dependency-Forward",
      url: `https://dev.azure.com/_apis/wit/workItems/${id + 20}`,
      attributes: {},
    });
  }
  if (Math.random() > 0.9) {
    relations.push({
      rel: "System.LinkTypes.Dependency-Reverse",
      url: `https://dev.azure.com/_apis/wit/workItems/${id + 30}`,
      attributes: {},
    });
  }

  return {
    id,
    fields: {
      "System.Id": id,
      "System.Title": overrides.title || generateTitle(type),
      "System.State": state,
      "System.WorkItemType": type,
      "System.AssignedTo": assigned,
      "System.IterationPath": "Sprint",
      "System.AreaPath": "Project",
      "System.Tags": tags,
      "System.ChangedDate": changedDate,
      "Microsoft.VSTS.Common.Priority": priority,
      "Microsoft.VSTS.Scheduling.OriginalEstimate": original,
      "Microsoft.VSTS.Scheduling.CompletedWork": completed,
      "Microsoft.VSTS.Scheduling.RemainingWork": remaining,
    },
    relations,
    url: "",
    _links: {},
    rev: 1,
  };
}

function generateTitle(type: string): string {
  const titles: Record<string, string[]> = {
    "Product Backlog Item": [
      "Implement SSO integration with Azure AD",
      "Add multi-tenant support for API gateway",
      "Create shared component library for micro-frontends",
      "Design event-driven notification system",
      "Build centralized configuration management",
      "Implement feature flag service",
      "Create self-service onboarding portal",
      "Add GraphQL federation layer",
      "Set up SAP HANA connector for BI pipeline",
      "Implement MuleSoft API proxy layer",
    ],
    "Task": [
      "Set up Terraform modules for AKS cluster",
      "Write unit tests for auth middleware",
      "Configure GitHub Actions CI pipeline",
      "Update Swagger docs for v2 endpoints",
      "Migrate secrets to Azure Key Vault",
      "Add structured logging with correlation IDs",
      "Set up Prometheus alerting rules",
      "Create database migration scripts",
      "Deploy SSIS packages to integration server",
      "Configure Power BI gateway connection",
      "Set up Datadog monitoring for APIs",
      "Create ARM templates for environment provisioning",
    ],
    "Bug": [
      "Token refresh fails after 24h session",
      "Memory leak in WebSocket connection pool",
      "CORS headers missing on /health endpoint",
      "Race condition in distributed cache invalidation",
      "Wrong timezone offset in audit logs",
      "Deadlock in concurrent batch processing",
      "BI report shows stale data after ETL refresh",
      "Integration API returns 500 on large payloads",
    ],
    "User Story": [
      "As a developer, I want to deploy via CLI",
      "As an admin, I want to manage team permissions",
      "As a user, I want real-time sync across devices",
      "As an ops engineer, I want automated rollback",
      "As a BI analyst, I want self-service report builder",
      "As an integration admin, I want API health dashboard",
    ],
  };
  const list = titles[type] || titles["Task"];
  return randomPick(list);
}

function makeIteration(
  name: string,
  startOffset: number,
  durationDays: number
): any {
  const start = new Date();
  start.setDate(start.getDate() + startOffset);
  const finish = new Date(start);
  finish.setDate(finish.getDate() + durationDays);
  return {
    id: `iter-${name.replace(/\s/g, "-").toLowerCase()}`,
    name,
    path: `\\Project\\${name}`,
    attributes: {
      startDate: start.toISOString(),
      finishDate: finish.toISOString(),
    },
    url: "",
    _links: {},
  };
}

export function getMockData(): CrossTeamData {
  let wiId = 1001;

  const currentUser = PEOPLE[0]; // Sahil Tanwar

  const sprints: SprintInfo[] = [
    // Platform Engineering — own sprint (Sahil's home team)
    {
      team: TEAMS[0] as any,
      iteration: makeIteration("Sprint 24.3 - Platform", -7, 14),
      workItems: [
        makeWorkItem(wiId++, { title: "Implement SSO integration with Azure AD", type: "Product Backlog Item", state: "Active", assigned: currentUser, priority: 1, tags: "Security;Infrastructure", changedDate: hoursAgo(2) }),
        makeWorkItem(wiId++, { title: "Set up Terraform modules for AKS cluster", type: "Task", state: "Active", assigned: currentUser, priority: 2, tags: "DevOps;Infrastructure", changedDate: hoursAgo(1) }),
        makeWorkItem(wiId++, { title: "Token refresh fails after 24h session", type: "Bug", state: "New", assigned: currentUser, priority: 1, tags: "Blocked;Security", changedDate: hoursAgo(5) }),
        makeWorkItem(wiId++, { title: "Write unit tests for auth middleware", type: "Task", state: "Resolved", assigned: PEOPLE[1], priority: 3, tags: "", changedDate: daysAgo(1) }),
        makeWorkItem(wiId++, { title: "Add structured logging with correlation IDs", type: "Task", state: "Closed", assigned: PEOPLE[6], priority: 3, tags: "Monitoring", changedDate: daysAgo(2) }),
        makeWorkItem(wiId++, { title: "Configure GitHub Actions CI pipeline", type: "Task", state: "Active", assigned: PEOPLE[3], priority: 2, tags: "CI/CD", changedDate: hoursAgo(3) }),
        makeWorkItem(wiId++, { title: "Implement feature flag service", type: "Product Backlog Item", state: "New", assigned: PEOPLE[4], priority: 3, tags: "", changedDate: daysAgo(3) }),
        makeWorkItem(wiId++, { title: "Create ARM templates for environment provisioning", type: "Task", state: "Active", assigned: PEOPLE[1], priority: 2, tags: "DevOps;Infrastructure", changedDate: hoursAgo(4) }),
      ],
    },

    // Integration Team — Sahil & Priya serve this team
    {
      team: TEAMS[1] as any,
      iteration: makeIteration("Sprint 24.3 - Integration", -5, 14),
      workItems: [
        makeWorkItem(wiId++, { title: "Implement MuleSoft API proxy layer", type: "Product Backlog Item", state: "Active", assigned: currentUser, priority: 1, tags: "API;MuleSoft", changedDate: hoursAgo(3) }),
        makeWorkItem(wiId++, { title: "Deploy SSIS packages to integration server", type: "Task", state: "Active", assigned: currentUser, priority: 2, tags: "Integration;Deployment", changedDate: hoursAgo(1) }),
        makeWorkItem(wiId++, { title: "Integration API returns 500 on large payloads", type: "Bug", state: "New", assigned: PEOPLE[1], priority: 1, tags: "Blocked;API", changedDate: hoursAgo(6) }),
        makeWorkItem(wiId++, { title: "CORS headers missing on /health endpoint", type: "Bug", state: "Resolved", assigned: PEOPLE[2], priority: 2, tags: "API", changedDate: daysAgo(1) }),
        makeWorkItem(wiId++, { title: "Update Swagger docs for v2 endpoints", type: "Task", state: "Closed", assigned: PEOPLE[5], priority: 4, tags: "Documentation", changedDate: daysAgo(2) }),
        makeWorkItem(wiId++, { title: "As an integration admin, I want API health dashboard", type: "User Story", state: "Active", assigned: PEOPLE[7], priority: 2, tags: "Monitoring", changedDate: hoursAgo(8) }),
        makeWorkItem(wiId++, { title: "Set up Datadog monitoring for APIs", type: "Task", state: "New", assigned: PEOPLE[6], priority: 3, tags: "Monitoring;DevOps", changedDate: daysAgo(1) }),
      ],
    },

    // BI & Analytics Team — Sahil & Ravi serve this team
    {
      team: TEAMS[2] as any,
      iteration: makeIteration("Sprint 24.3 - BI", -3, 14),
      workItems: [
        makeWorkItem(wiId++, { title: "Set up SAP HANA connector for BI pipeline", type: "Product Backlog Item", state: "Active", assigned: currentUser, priority: 1, tags: "SAP;BI", changedDate: hoursAgo(2) }),
        makeWorkItem(wiId++, { title: "Configure Power BI gateway connection", type: "Task", state: "Active", assigned: currentUser, priority: 2, tags: "BI;Power BI", changedDate: hoursAgo(4) }),
        makeWorkItem(wiId++, { title: "BI report shows stale data after ETL refresh", type: "Bug", state: "New", assigned: PEOPLE[6], priority: 1, tags: "Blocked;BI", changedDate: hoursAgo(1) }),
        makeWorkItem(wiId++, { title: "As a BI analyst, I want self-service report builder", type: "User Story", state: "New", assigned: PEOPLE[4], priority: 2, tags: "BI", changedDate: daysAgo(2) }),
        makeWorkItem(wiId++, { title: "Create database migration scripts", type: "Task", state: "Resolved", assigned: PEOPLE[6], priority: 3, tags: "Migration", changedDate: daysAgo(1) }),
        makeWorkItem(wiId++, { title: "Build centralized configuration management", type: "Product Backlog Item", state: "Closed", assigned: PEOPLE[5], priority: 3, tags: "", changedDate: daysAgo(3) }),
      ],
    },

    // DevOps & SRE — Sahil is part of this team too
    {
      team: TEAMS[3] as any,
      iteration: makeIteration("Sprint 24.3 - SRE", -10, 14),
      workItems: [
        makeWorkItem(wiId++, { title: "Set up Prometheus alerting rules", type: "Task", state: "Active", assigned: currentUser, priority: 2, tags: "Monitoring;SRE", changedDate: hoursAgo(1) }),
        makeWorkItem(wiId++, { title: "As an ops engineer, I want automated rollback", type: "User Story", state: "New", assigned: currentUser, priority: 1, tags: "SRE;Blocked", changedDate: hoursAgo(10) }),
        makeWorkItem(wiId++, { title: "Memory leak in WebSocket connection pool", type: "Bug", state: "Resolved", assigned: PEOPLE[2], priority: 2, tags: "Performance", changedDate: daysAgo(1) }),
        makeWorkItem(wiId++, { title: "Wrong timezone offset in audit logs", type: "Bug", state: "Closed", assigned: PEOPLE[3], priority: 4, tags: "", changedDate: daysAgo(3) }),
        makeWorkItem(wiId++, { title: "Create self-service onboarding portal", type: "Product Backlog Item", state: "Active", assigned: PEOPLE[5], priority: 3, tags: "DevOps", changedDate: hoursAgo(5) }),
        makeWorkItem(wiId++, { title: "Migrate secrets to Azure Key Vault", type: "Task", state: "Active", assigned: PEOPLE[6], priority: 1, tags: "Security;DevOps", changedDate: hoursAgo(2) }),
      ],
    },

    // Platform Engineering — past sprint
    {
      team: TEAMS[0] as any,
      iteration: makeIteration("Sprint 24.2 - Platform", -28, 14),
      workItems: [
        makeWorkItem(wiId++, { title: "As a developer, I want to deploy via CLI", type: "User Story", state: "Closed", assigned: currentUser, priority: 2, tags: "DevOps", changedDate: daysAgo(15) }),
        makeWorkItem(wiId++, { title: "As an admin, I want to manage team permissions", type: "User Story", state: "Closed", assigned: PEOPLE[1], priority: 2, tags: "Security", changedDate: daysAgo(16) }),
        makeWorkItem(wiId++, { title: "Add multi-tenant support for API gateway", type: "Product Backlog Item", state: "Resolved", assigned: PEOPLE[6], priority: 1, tags: "API;Infrastructure", changedDate: daysAgo(14) }),
      ],
    },
  ];

  return {
    projectName: "Enterprise Portal",
    currentUserId: currentUser.id,
    currentUserName: currentUser.displayName,
    sprints,
  };
}
