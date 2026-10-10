import {
  parseAnyDesign,
  type AgentDesign,
  type AppDesign,
  type FlowDesign,
  type ReportDesign,
  type SecurityDesign,
  type SiteDesign,
  type TableDesign,
  type VisualKind,
} from "../designs";
import type { AgentOutcome } from "./agentRunner";
import type { AppOutcome } from "./appRunner";
import { shuffled } from "./shuffle";
import type { SiteOutcome } from "./siteRunner";
import type { BuildCaseDef, Incident, Outcome, PreparedCase, WorldData } from "./world";

/**
 * The authored "Fix it" cases. Each is a business problem, the right Power Platform
 * product, a few concrete scenarios drawn from the live data, and acceptance criteria.
 * Where a design can be exercised (flows, apps, sites, agents) criteria are evaluated from
 * what it actually did in a test run; configuration designers (tables, security, reports)
 * are evaluated on the design itself.
 */

export const PICK_POINTS = 30;
export const BUILD_POINTS = 100;
export const MISS_PENALTY = 10;
export const MAX_TESTS = 6;

const pickOne = <T,>(items: T[]): T | undefined => shuffled(items)[0];

/** For each category, the team that handles it, when one team clearly does. */
function owningTeams(incidents: Incident[]): Map<string, string> {
  const counts = new Map<string, Map<string, number>>();
  for (const i of incidents) {
    if (!i.assignmentGroup_name) continue;
    const byGroup = counts.get(i.category) ?? new Map<string, number>();
    byGroup.set(i.assignmentGroup_name, (byGroup.get(i.assignmentGroup_name) ?? 0) + 1);
    counts.set(i.category, byGroup);
  }
  const result = new Map<string, string>();
  for (const [category, byGroup] of counts) {
    const ranked = [...byGroup.entries()].sort((a, b) => b[1] - a[1]);
    if (ranked.length === 1 || ranked[0][1] > ranked[1][1]) result.set(category, ranked[0][0]);
  }
  return result;
}

/** A caller who has some incidents but not all of them, to show "only your own". */
function pickPartner(data: WorldData): string | undefined {
  const counts = new Map<string, number>();
  for (const i of data.incidents) if (i.caller_name) counts.set(i.caller_name, (counts.get(i.caller_name) ?? 0) + 1);
  const total = data.incidents.length;
  return pickOne([...counts.entries()].filter(([, n]) => n >= 1 && n < total).map(([name]) => name));
}

function reportCase(
  id: string,
  title: string,
  brief: string,
  field: ReportDesign["field"],
  visuals: VisualKind[],
  why: string,
  chartRequirement: string,
): BuildCaseDef {
  return {
    id,
    title,
    brief,
    productId: "power-bi",
    designer: "report",
    why,
    prepare(data): PreparedCase | null {
      if (data.incidents.length === 0) return null;
      return {
        scenarios: [],
        hint: "Which chart type makes the thing the brief asks about easy to see? Then which field does it break the incidents down by?",
        requirements: [chartRequirement, "Breaks the incidents down by the thing the brief is about"],
        evaluate: (design) => {
          const report = design as ReportDesign;
          return [visuals.includes(report.visual), report.field === field];
        },
      };
    },
  };
}

export const BUILD_CASES: BuildCaseDef[] = [
  // ---- Power Automate ----
  {
    id: "routing",
    title: "Hand-sorted queue",
    brief:
      "Dispatchers read every new ticket and drag it to a team by hand. It is slow, people miss tickets, and nobody enjoys it. The team that handles each category never changes, so a machine should do the sorting.",
    productId: "power-automate",
    designer: "flow",
    why: "The routing should start by itself the moment a ticket is created, with no person involved, and apply the same rule every time. That is an automated cloud flow in Power Automate.",
    prepare(data): PreparedCase | null {
      const owners = owningTeams(data.incidents);
      let a: string | undefined;
      let b: string | undefined;
      for (const category of shuffled([...owners.keys()])) {
        if (!a) a = category;
        else if (owners.get(category) !== owners.get(a)) {
          b = category;
          break;
        }
      }
      if (!a || !b) return null;
      const teamA = owners.get(a)!;
      const teamB = owners.get(b)!;
      const sampleA = pickOne(data.incidents.filter((i) => i.category === a));
      const sampleB = pickOne(data.incidents.filter((i) => i.category === b));
      if (!sampleA || !sampleB) return null;
      return {
        scenarios: [
          { name: `A new ${a} incident arrives`, trigger: "incident-created", incident: sampleA },
          { name: `A new ${b} incident arrives`, trigger: "incident-created", incident: sampleB },
        ],
        hint: "Add one Condition per category, and follow each with an Update incident step that sets the assignment group.",
        requirements: [
          "The flow starts by itself when an incident is created",
          `A new ${a} incident is assigned to ${teamA}`,
          `A new ${b} incident is assigned to ${teamB}`,
        ],
        evaluate: (design, outcomes) => {
          const flow = design as FlowDesign;
          const runs = outcomes as Outcome[];
          const routed = (index: number, team: string) => {
            const groups = runs[index].updates.filter((u) => u.property === "assignment_group");
            return groups.length > 0 && groups.every((u) => u.value === team);
          };
          return [flow.trigger === "incident-created", routed(0, teamA), routed(1, teamB)];
        },
      };
    },
  },
  {
    id: "approval",
    title: "Sign-off by email chain",
    brief:
      "Raising an urgent incident needs a manager's sign-off, which today means a chain of emails that gets lost. The business wants a clear yes or no, a record of who decided, and no delay on routine tickets.",
    productId: "power-automate",
    designer: "flow",
    why: "An approval flow sends the request to the right person, waits for approve or reject, and keeps the decision on record. A condition keeps routine tickets out of the approval path.",
    prepare(data): PreparedCase | null {
      const urgent = pickOne(data.incidents.filter((i) => i.priority === "1"));
      const routine = pickOne(data.incidents.filter((i) => i.priority !== "1"));
      if (!urgent || !routine) return null;
      return {
        scenarios: [
          { name: "A new priority 1 incident arrives", trigger: "incident-created", incident: urgent },
          { name: "A new lower-priority incident arrives", trigger: "incident-created", incident: routine },
        ],
        hint: "You need a Condition on priority, then an approval, then an update that only happens afterwards.",
        requirements: [
          "The flow starts by itself when an incident is created",
          "A new priority 1 incident asks for an approval",
          "Other incidents are left alone, with no approval requested",
          "The incident is only changed after the approval comes back",
        ],
        evaluate: (design, outcomes) => {
          const flow = design as FlowDesign;
          const runs = outcomes as Outcome[];
          const urgentRun = runs[0];
          const firstApproval = urgentRun.approvals[0]?.stepIndex;
          const afterApproval =
            firstApproval !== undefined &&
            urgentRun.updates.length > 0 &&
            urgentRun.updates.every((u) => u.stepIndex > firstApproval);
          return [
            flow.trigger === "incident-created",
            urgentRun.approvals.length > 0,
            runs[1].approvals.length === 0,
            afterApproval,
          ];
        },
      };
    },
  },
  {
    id: "digest",
    title: "The 7am status chase",
    brief:
      "Every morning someone compiles the list of new incidents nobody has picked up and emails it to the managers. It takes an hour and sometimes does not happen at all.",
    productId: "power-automate",
    designer: "flow",
    why: "The work should run on a timer with nobody pressing anything. That is a scheduled cloud flow, and it can read the incidents and send the email itself.",
    prepare(): PreparedCase | null {
      return {
        scenarios: [{ name: "7:00 AM comes round", trigger: "recurrence" }],
        hint: "Pick a schedule, gather the incidents that are still New, then email the managers.",
        requirements: [
          "The flow runs every day at 7:00 AM",
          "It gathers the incidents that are still New",
          "It emails the managers, after it has gathered them",
        ],
        evaluate: (design, outcomes) => {
          const flow = design as FlowDesign;
          const run = (outcomes as Outcome[])[0];
          const listed = run.listed;
          return [
            flow.trigger === "recurrence" && flow.triggerParams.frequency === "Every day at 7:00 AM",
            listed !== undefined && listed.state === "New",
            listed !== undefined && run.emails.some((e) => e.to === "Managers" && e.stepIndex > listed.stepIndex),
          ];
        },
      };
    },
  },

  // ---- Power BI ----
  reportCase(
    "concentration",
    "No big picture",
    "Leadership keeps asking which category of incident is generating the most work. The answer is in the system, but nobody can see it without asking for a report.",
    "category",
    ["column", "bar"],
    "Leaders want to compare totals at a glance. A Power BI column or bar chart of incidents by category shows where the work concentrates.",
    "Uses a chart that makes the biggest and smallest easy to compare",
  ),
  reportCase(
    "priority-share",
    "Too much marked urgent?",
    "The service desk suspects too many incidents are being marked urgent. The director wants to see each priority as a share of the whole.",
    "priority",
    ["donut"],
    "A share of the whole is exactly what a donut chart shows. Power BI lets leaders see the priority mix at a glance.",
    "Uses a chart that shows each part's share of the whole",
  ),
  reportCase(
    "team-load",
    "Who is carrying the load?",
    "Team leads think the work is not spread fairly across support teams. They want a picture of how many incidents each team is holding.",
    "group",
    ["column", "bar"],
    "A column or bar chart of incidents by assignment group makes uneven workloads obvious. That is a Power BI report.",
    "Uses a chart that makes teams easy to compare",
  ),

  // ---- Power Apps ----
  {
    id: "intake",
    title: "Problems arrive by email",
    brief:
      "People report issues by email or in the corridor, with details missing every time. The team wants a simple form on a phone that captures what is wrong and drops it straight into the service desk.",
    productId: "power-apps",
    designer: "app",
    why: "A short form on a phone is a canvas app: place the controls you want and wire the button to the service desk. Choosing the category from a list keeps the data clean.",
    prepare(data): PreparedCase | null {
      const category = pickOne([...new Set(data.incidents.map((i) => i.category))]);
      if (!category) return null;
      return {
        scenarios: [
          {
            name: "Someone reports a problem and presses the button",
            input: { shortDescription: "Projector in room 4 will not connect", category },
            press: true,
          },
        ],
        hint: "You need a text input for the description, a dropdown for the category, and a button whose action creates the incident.",
        requirements: [
          "People can type a short description of the problem",
          "People choose the category from a list, not by typing",
          "Pressing the button sends a new incident to the service desk",
          "The incident that arrives has both the description and the category",
        ],
        evaluate: (design, outcomes) => {
          const app = design as AppDesign;
          const run = (outcomes as AppOutcome[])[0];
          const hasField = (kind: string, field: string) =>
            app.controls.some((c) => c.kind === kind && c.params.field === field);
          return [
            hasField("text-input", "shortDescription"),
            hasField("dropdown", "category"),
            run.created?.ok === true,
            run.created?.ok === true && Boolean(run.created.sent.short_description) && Boolean(run.created.sent.category),
          ];
        },
      };
    },
  },
  {
    id: "tablet",
    title: "Technicians on the move",
    brief:
      "Depot technicians walk the floor with a tablet. They want to see the incidents that are in progress and close one off on the spot, instead of going back to a desk to update it.",
    productId: "power-apps",
    designer: "app",
    why: "A tablet screen with a list and a button is a canvas app. The gallery reads from the service desk and the button writes the change back.",
    prepare(data): PreparedCase | null {
      if (!data.incidents.some((i) => /^In Progress/.test(i.state))) return null;
      return {
        scenarios: [{ name: "A technician opens the app and taps the button on the first incident", press: true }],
        hint: "A gallery shows the list. A button can act on the selected row.",
        requirements: [
          "The screen lists the incidents that are In Progress",
          "A technician can mark the selected incident Resolved from the same screen",
        ],
        evaluate: (design, outcomes) => {
          const app = design as AppDesign;
          const run = (outcomes as AppOutcome[])[0];
          return [
            app.controls.some((c) => c.kind === "gallery" && c.params.source === "in-progress") &&
              run.listed?.source === "In Progress",
            run.resolved !== undefined,
          ];
        },
      };
    },
  },

  // ---- Power Pages ----
  {
    id: "partners",
    title: "Partners can't get in",
    brief:
      "Contractors and partners outside the company need to report problems and check on them, but the internal tool is staff-only and sharing logins is not acceptable. Each partner must only ever see their own incidents.",
    productId: "power-pages",
    designer: "site",
    why: "A Power Pages portal lets external people sign in securely. Table permissions limit each person to their own records, so a partner never sees anyone else's incidents.",
    prepare(data): PreparedCase | null {
      const partner = pickPartner(data);
      if (!partner) return null;
      return {
        scenarios: [
          { name: "A visitor who has not signed in opens the site", viewer: "visitor" },
          { name: `${partner} signs in and opens the incident list`, viewer: "partner", caller: partner },
        ],
        hint: "Require sign-in, limit the list to the signed-in person's own incidents, and allow only signed-in visitors to submit.",
        requirements: [
          "A visitor who has not signed in cannot see any incident data",
          "A signed-in partner sees only their own incidents, and at least one",
          "A signed-in partner can submit a new incident, but an anonymous visitor cannot",
        ],
        evaluate: (design, outcomes) => {
          const runs = outcomes as SiteOutcome[];
          const site = design as SiteDesign;
          return [
            runs[0].rows === 0,
            runs[1].rows > 0 && runs[1].foreignRows === 0,
            runs[1].canSubmit && site.form === "signed-in",
          ];
        },
      };
    },
  },

  // ---- Dataverse ----
  {
    id: "spreadsheets",
    title: "Four spreadsheets, four truths",
    brief:
      "Incidents, people and teams live in separate spreadsheets that disagree with each other. The business wants one incident table where the reporter and the owning team are real records, and where priority, state and category cannot be mistyped.",
    productId: "dataverse",
    designer: "table",
    why: "Dataverse tables give every app one shared data model. Lookups link to real people and teams, and choice columns stop typos creeping into fixed lists.",
    prepare(): PreparedCase | null {
      return {
        scenarios: [],
        hint: "Free text lets people type anything. Which columns should be links to other records, and which should be a fixed list?",
        requirements: [
          "The person who reported it is a link to a real person, not typed text",
          "The owning team is a link to a real team",
          "Priority, state and category can only be picked from a fixed list",
          "The short description stays free text",
        ],
        evaluate: (design) => {
          const c = (design as TableDesign).columns;
          return [
            c.caller === "lookup-user",
            c.group === "lookup-team",
            c.priority === "choice" && c.state === "choice" && c.category === "choice",
            c.description === "text",
          ];
        },
      };
    },
  },
  {
    id: "access",
    title: "Everyone can edit everything",
    brief:
      "Anyone with a login can currently change or delete any incident, including contractors who only need to look things up. Auditors are asking who is allowed to do what.",
    productId: "dataverse",
    designer: "security",
    why: "Security roles in Dataverse decide who can read, create, update and delete rows. Giving each group only what it needs is least privilege.",
    prepare(): PreparedCase | null {
      return {
        scenarios: [],
        hint: "Start from what each person actually needs to do. Be especially careful with delete.",
        requirements: [
          "Service desk agents can read, create and update incidents but cannot delete them",
          "Duty managers can do everything, including delete",
          "Contractors can read incidents and do nothing else",
        ],
        evaluate: (design) => {
          const r = (design as SecurityDesign).roles;
          return [
            r.agent.read && r.agent.create && r.agent.write && !r.agent.delete,
            r.manager.read && r.manager.create && r.manager.write && r.manager.delete,
            r.contractor.read && !r.contractor.create && !r.contractor.write && !r.contractor.delete,
          ];
        },
      };
    },
  },

  // ---- Copilot Studio ----
  {
    id: "faq",
    title: "Same question, every day",
    brief:
      "Staff keep raising tickets that are really 'how do I...' questions about passwords and the VPN, with the answers already written down. They would like an agent to answer instantly, using only the right guides.",
    productId: "copilot-studio",
    designer: "agent",
    why: "An agent grounded on your existing guides answers common questions instantly and keeps them out of the queue. Limiting its knowledge to relevant sources stops it giving wrong answers.",
    prepare(): PreparedCase | null {
      const unrelated = ["hr-handbook", "finance-policy", "facilities-guide"];
      return {
        scenarios: [
          { name: "Someone asks about a password", intent: "faq-password", message: "How do I reset my password?" },
          { name: "Someone asks about the VPN", intent: "faq-vpn", message: "My VPN keeps dropping. How do I set it up again?" },
        ],
        hint: "Enable the guides that cover passwords and the VPN, and leave out anything that is not about IT.",
        requirements: [
          "The agent can answer a question about resetting a password",
          "The agent can answer a question about setting up the VPN",
          "The agent does not use knowledge that has nothing to do with IT",
        ],
        evaluate: (design, outcomes) => {
          const agent = design as AgentDesign;
          const runs = outcomes as AgentOutcome[];
          return [runs[0].answered, runs[1].answered, !agent.knowledge.some((k) => unrelated.includes(k))];
        },
      };
    },
  },
  {
    id: "doer",
    title: "Please just open it for me",
    brief:
      "People are happy to chat with a bot, but when they say 'open a ticket for me' it can only point them to a web form. They want it to actually do the thing and tell them where their incident is up to, without being able to change anyone else's.",
    productId: "copilot-studio",
    designer: "agent",
    why: "To do things, an agent needs actions: it calls the service desk to create an incident or look one up. Leaving out the update action keeps it from changing incidents it should not touch.",
    prepare(data): PreparedCase | null {
      const incident = data.incidents[0];
      if (!incident) return null;
      return {
        scenarios: [
          { name: "Someone asks the agent to open a ticket", intent: "open-ticket", message: "Please open a ticket: my laptop will not boot" },
          { name: "Someone asks where their incident is up to", intent: "status", message: `What is the status of ${incident.incidentId}?`, incident },
        ],
        hint: "Give the agent the actions it needs for those two requests, and nothing that can change an existing incident.",
        requirements: [
          "The agent can open a new incident when someone asks",
          "The agent can tell someone the status of an incident",
          "The agent cannot change existing incidents",
        ],
        evaluate: (design, outcomes) => {
          const agent = design as AgentDesign;
          const runs = outcomes as AgentOutcome[];
          return [runs[0].created, runs[1].statusKnown, !agent.actions.includes("update_incident")];
        },
      };
    },
  },
];

export function parseDesign(def: BuildCaseDef, text: string): unknown {
  return parseAnyDesign(def.designer, text);
}

