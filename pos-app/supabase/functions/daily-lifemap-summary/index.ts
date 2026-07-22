import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { Resend } from "npm:resend@2.0.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

interface LifeMapNode {
  id: string;
  type: "center" | "domain" | "project" | "milestone" | "pillar" | "thread" | "initiative" | "subnode";
  data: {
    label: string;
    description?: string;
    status?: "active" | "paused" | "completed" | "archived" | "backlog";
    expanded?: boolean;
    parentId?: string;
    hue?: number;
    tasks?: Task[];
    priority?: "low" | "medium" | "high";
    notes?: string;
    resources?: any[];
    lastUpdated?: number;
    streak?: number;
  };
}

interface Edge {
  id: string;
  source: string;
  target: string;
}

// Helper: Parse creation timestamp from node ID suffix
function getCreatedAt(node: LifeMapNode, mapUpdatedAt?: string): number {
  const match = node.id.match(/^[p|t|i|s|d|m|pjt]-(\d+)$/);
  if (match) {
    return parseInt(match[1], 10);
  }
  if (mapUpdatedAt) {
    return new Date(mapUpdatedAt).getTime();
  }
  return Date.now() - 30 * 24 * 60 * 60 * 1000; // default 30 days ago
}

// Helper: Parse direct update timestamp
function getLastUpdated(node: LifeMapNode, mapUpdatedAt?: string): number {
  if (node.data.lastUpdated) {
    return node.data.lastUpdated;
  }
  return getCreatedAt(node, mapUpdatedAt);
}

// Helper: Get recursive maximum update timestamp of a node and its descendants
function getEffectiveLastUpdated(
  node: LifeMapNode,
  allNodes: LifeMapNode[],
  edges: Edge[],
  mapUpdatedAt?: string,
  memo = new Map<string, number>()
): number {
  if (memo.has(node.id)) return memo.get(node.id)!;

  let maxTime = getLastUpdated(node, mapUpdatedAt);

  // Find children in edges
  const childIds = edges.filter((e) => e.source === node.id).map((e) => e.target);
  const children = allNodes.filter((n) => childIds.includes(n.id));

  for (const child of children) {
    const childMax = getEffectiveLastUpdated(child, allNodes, edges, mapUpdatedAt, memo);
    if (childMax > maxTime) {
      maxTime = childMax;
    }
  }

  memo.set(node.id, maxTime);
  return maxTime;
}

// Helper: Format timestamp as relative date text
function getRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Just now";
  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins <= 1 ? "Just now" : `${diffMins}m ago`;
    }
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

// Helper: Get integer days since a timestamp
function getDaysSince(timestamp: number): number {
  const diffMs = Date.now() - timestamp;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error("RESEND_API_KEY is not set.");
    return new Response(
      JSON.stringify({
        error: "Missing RESEND_API_KEY",
        details: "Please set the RESEND_API_KEY secret in your Supabase project dashboard.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  const resend = new Resend(resendApiKey);

  try {
    console.log("Fetching life maps...");
    const { data: lifeMaps, error: fetchError } = await supabase
      .from("life_maps")
      .select("*");

    if (fetchError) {
      console.error("Error fetching life maps:", fetchError);
      throw fetchError;
    }

    if (!lifeMaps || lifeMaps.length === 0) {
      console.log("No life maps found in database.");
      return new Response(JSON.stringify({ message: "No life maps found" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Found ${lifeMaps.length} life maps. Processing...`);
    const emailResults = [];

    for (const map of lifeMaps) {
      const userId = map.user_id;
      const nodes = (map.nodes || []) as LifeMapNode[];
      const edges = (map.edges || []) as Edge[];
      const mapUpdatedAt = map.updated_at;

      // 1. Fetch user email dynamically from Auth
      console.log(`Fetching email for user ${userId}...`);
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
      const email = userData?.user?.email || "aamirahamed97@gmail.com";
      if (userError) {
        console.warn(`Could not fetch email for ${userId}, falling back to default. Error:`, userError.message);
      }

      console.log(`Processing map for user: ${email} (${userId})`);

      // 2. Pre-calculate effective lastUpdated timestamps for all nodes
      const effectiveUpdates = new Map<string, number>();
      nodes.forEach((node) => {
        getEffectiveLastUpdated(node, nodes, edges, mapUpdatedAt, effectiveUpdates);
      });

      // 3. Organise Graph Hierarchy
      const centerNode = nodes.find((n) => n.type === "center");
      if (!centerNode) {
        console.warn(`No center node found for map belonging to user ${userId}`);
        continue;
      }

      // Root children are Domains (old pillars)
      const domainEdges = edges.filter((e) => e.source === centerNode.id);
      const domainIds = domainEdges.map((e) => e.target);
      const domains = nodes.filter((n) => (n.type === "domain" || n.type === "pillar") && domainIds.includes(n.id));

      const processedDomains = [];
      let totalActiveProjectsCount = 0;
      let totalInactiveProjectsCount = 0;
      let totalDomainsWithActiveFocus = 0;
      const stagnantProjects = [];

      for (const domain of domains) {
        const hue = domain.data.hue || 210;
        
        // Find child projects (old initiatives) directly under the domain
        const projectEdges = edges.filter((e) => e.source === domain.id);
        const projectIds = projectEdges.map((e) => e.target);
        
        // Exclude archived projects
        const projects = nodes.filter(
          (n) => (n.type === "project" || n.type === "initiative") && projectIds.includes(n.id) && n.data.status !== "archived"
        );

        const activeProjectsList = [];
        const inactiveProjectsList = [];

        for (const project of projects) {
          // Find milestones (old subnodes) under this project
          const milestoneEdges = edges.filter((e) => e.source === project.id);
          const milestoneIds = milestoneEdges.map((e) => e.target);
          const milestones = nodes.filter((n) => (n.type === "milestone" || n.type === "subnode") && milestoneIds.includes(n.id));

          let totalTasks = 0;
          let completedTasks = 0;
          milestones.forEach((mile) => {
            const tasks = mile.data.tasks || [];
            totalTasks += tasks.length;
            completedTasks += tasks.filter((t) => t.completed).length;
          });

          const projStatus = project.data.status || "active";
          const projCreatedAt = getCreatedAt(project, mapUpdatedAt);
          const projLastUpdated = effectiveUpdates.get(project.id) || getLastUpdated(project, mapUpdatedAt);
          const daysSinceAdded = getDaysSince(projCreatedAt);
          const daysSinceUpdated = getDaysSince(projLastUpdated);

          const projectDetails = {
            id: project.id,
            label: project.data.label,
            status: projStatus,
            daysSinceAdded,
            daysSinceUpdated,
            lastUpdatedText: getRelativeTime(projLastUpdated),
            createdAtText: getRelativeTime(projCreatedAt),
            taskStats: totalTasks > 0 ? `(${completedTasks}/${totalTasks} actions)` : "",
            completedPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          };

          // Detect Stagnant Active Projects (Active but not updated in > 7 days)
          if (projStatus === "active" && daysSinceUpdated > 7) {
            stagnantProjects.push({
              pillarName: domain.data.label,
              initiativeName: project.data.label,
              daysSinceUpdated,
            });
          }

          if (projStatus === "active") {
            activeProjectsList.push(projectDetails);
            totalActiveProjectsCount++;
          } else if (projStatus === "paused" || projStatus === "backlog") {
            inactiveProjectsList.push(projectDetails);
            totalInactiveProjectsCount++;
          }
        }

        if (activeProjectsList.length > 0) {
          totalDomainsWithActiveFocus++;
        }

        processedDomains.push({
          id: domain.id,
          label: domain.data.label,
          hue,
          activeProjects: activeProjectsList,
          inactiveProjects: inactiveProjectsList,
          hasContent: activeProjectsList.length > 0 || inactiveProjectsList.length > 0,
        });
      }

      // 4. Identify Cold Spots (Domains with 0 active projects)
      const coldSpots = processedDomains
        .filter((d) => d.activeProjects.length === 0)
        .map((d) => d.label);

      // 5. Generate Email HTML Template
      const dateStr = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const activeRatio = totalActiveProjectsCount + totalInactiveProjectsCount > 0
        ? Math.round((totalActiveProjectsCount / (totalActiveProjectsCount + totalInactiveProjectsCount)) * 100)
        : 0;

      let emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Life Map Daily Digest</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0A0A0C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FFFFFF; -webkit-font-smoothing: antialiased;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0A0A0C; table-layout: fixed;">
            <tr>
              <td align="center" style="padding: 24px 16px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; text-align: left;">
                  
                  <!-- HEADER -->
                  <tr>
                    <td style="padding-bottom: 24px;">
                      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #6366F1; font-weight: 700; margin-bottom: 6px;">
                        Personal Operating System
                      </div>
                      <h1 style="font-size: 22px; font-weight: 800; color: #FFFFFF; margin: 0 0 4px 0;">Life Map Daily Digest</h1>
                      <div style="font-size: 13px; color: #71717A;">${dateStr}</div>
                    </td>
                  </tr>

                  <!-- METRICS SUMMARY PANEL -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #18181B 0%, #09090B 100%); border: 1px solid #27272A; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td width="33%" style="text-align: center; border-right: 1px solid #27272A; padding: 0 10px;">
                            <div style="font-size: 24px; font-weight: 800; color: #6366F1; margin-bottom: 4px;">
                              ${totalActiveProjectsCount}
                            </div>
                            <div style="font-size: 10px; color: #A1A1AA; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">
                              Active Projects
                            </div>
                          </td>
                          <td width="34%" style="text-align: center; border-right: 1px solid #27272A; padding: 0 10px;">
                            <div style="font-size: 24px; font-weight: 800; color: #10B981; margin-bottom: 4px;">
                              ${activeRatio}%
                            </div>
                            <div style="font-size: 10px; color: #A1A1AA; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">
                              Focus Ratio
                            </div>
                          </td>
                          <td width="33%" style="text-align: center; padding: 0 10px;">
                            <div style="font-size: 24px; font-weight: 800; color: #F59E0B; margin-bottom: 4px;">
                              ${stagnantProjects.length}
                            </div>
                            <div style="font-size: 10px; color: #A1A1AA; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">
                              Slipping Items
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <tr><td style="height: 20px;"></td></tr>

                  <!-- PILLARS SECTIONS -->
                  <tr>
                    <td>
                      <h2 style="font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #A1A1AA; margin: 0 0 16px 0; border-bottom: 1px solid #27272A; padding-bottom: 8px;">
                        Domain Breakdown
                      </h2>
      `;

      for (const domain of processedDomains) {
        if (!domain.hasContent) continue;

        emailHtml += `
          <!-- DOMAIN CARD: ${domain.label} -->
          <div style="background-color: #121214; border: 1px solid #27272A; border-left: 4px solid hsl(${domain.hue}, 70%, 50%); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <!-- Domain Title -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 16px;">
              <tr>
                <td>
                  <span style="font-size: 18px; font-weight: 800; color: #FFFFFF;">${domain.label}</span>
                </td>
                <td align="right">
                  <span style="font-size: 11px; font-weight: 700; color: #A1A1AA; background-color: #1F1F23; border: 1px solid #27272A; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.05em;">
                    ${domain.activeProjects.length + domain.inactiveProjects.length} ${domain.activeProjects.length + domain.inactiveProjects.length === 1 ? 'Project' : 'Projects'}
                  </span>
                </td>
              </tr>
            </table>
        `;

        // Active Focus Section
        if (domain.activeProjects.length > 0) {
          emailHtml += `
            <div style="margin-bottom: 16px;">
              <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #10B981; font-weight: 700; margin-bottom: 8px;">
                🟢 Active Focus
              </div>
          `;

          for (const project of domain.activeProjects) {
            // Determine color indicators for days since updated
            const ageColor = project.daysSinceUpdated > 7 ? "#F59E0B" : "#A1A1AA";
            emailHtml += `
              <div style="background-color: #18181B; border: 1px solid #27272A; border-radius: 8px; padding: 12px; margin-bottom: 8px;">
                <!-- Project Title -->
                <div style="font-size: 12px; font-weight: 700; color: #FFFFFF; display: inline-block; margin-bottom: 4px;">
                  ${project.label} <span style="font-size: 10px; color: #71717A; font-weight: normal; margin-left: 4px;">${project.taskStats}</span>
                </div>
                <div style="font-size: 10px; color: ${ageColor};">
                  Added ${project.daysSinceAdded}d ago &bull; Updated ${project.lastUpdatedText}
                </div>
              </div>
            `;
          }

          emailHtml += `</div>`;
        }

        // Backburner / Backlog Section
        if (domain.inactiveProjects.length > 0) {
          emailHtml += `
            <div>
              <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #A1A1AA; font-weight: 700; margin-bottom: 8px;">
                ⏸ Backburner / Backlog
              </div>
          `;

          for (const project of domain.inactiveProjects) {
            const badge = project.status === "paused" ? "⏸" : "⚪";
            const ageColor = project.daysSinceUpdated > 14 ? "#F59E0B" : "#71717A";
            emailHtml += `
              <div style="background-color: #18181B; border: 1px solid #27272A; border-radius: 8px; padding: 12px; margin-bottom: 8px; opacity: 0.75;">
                <!-- Project Title -->
                <div style="font-size: 12px; font-weight: 700; color: #A1A1AA; display: inline-block; margin-bottom: 4px;">
                  ${badge} ${project.label} <span style="font-size: 9px; color: #71717A; font-weight: normal; margin-left: 4px;">${project.taskStats}</span>
                </div>
                <div style="font-size: 10px; color: ${ageColor};">
                  Added ${project.daysSinceAdded}d ago &bull; Updated ${project.lastUpdatedText}
                </div>
              </div>
            `;
          }

          emailHtml += `</div>`;
        }

        emailHtml += `</div>`;
      }

      // 4. Identify Cold Spots (Pillars with 0 active threads/initiatives)
      const coldSpots = processedPillars
        .filter((p) => p.activeThreads.length === 0)
        .map((p) => p.label);

      // 5. Generate Email HTML Template
      const dateStr = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const activeRatio = totalActiveInitiativesCount + totalInactiveInitiativesCount > 0
        ? Math.round((totalActiveInitiativesCount / (totalActiveInitiativesCount + totalInactiveInitiativesCount)) * 100)
        : 0;

      let emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Life Map Daily Digest</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0A0A0C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FFFFFF; -webkit-font-smoothing: antialiased;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0A0A0C; table-layout: fixed;">
            <tr>
              <td align="center" style="padding: 24px 16px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; text-align: left;">
                  
                  <!-- HEADER -->
                  <tr>
                    <td style="padding-bottom: 24px;">
                      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #6366F1; font-weight: 700; margin-bottom: 6px;">
                        Personal Operating System
                      </div>
                      <h1 style="font-size: 24px; font-weight: 800; color: #FFFFFF; margin: 0 0 4px 0; letter-spacing: -0.025em;">
                        Life Map Daily Digest
                      </h1>
                      <div style="font-size: 13px; color: #71717A;">
                        ${dateStr}
                      </div>
                    </td>
                  </tr>

                  <!-- STATS SUMMARY CARD -->
                  <tr>
                    <td style="background-color: #121214; border: 1px solid #27272A; border-radius: 16px; padding: 20px; margin-bottom: 28px;">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td width="33%" align="center" style="border-right: 1px solid #27272A; padding: 4px;">
                            <div style="font-size: 20px; font-weight: 800; color: #10B981;">${totalActiveThreadsCount}</div>
                            <div style="font-size: 10px; text-transform: uppercase; color: #A1A1AA; letter-spacing: 0.05em; font-weight: 600; margin-top: 4px;">Active Threads</div>
                          </td>
                          <td width="33%" align="center" style="border-right: 1px solid #27272A; padding: 4px;">
                            <div style="font-size: 20px; font-weight: 800; color: #6366F1;">${activeRatio}%</div>
                            <div style="font-size: 10px; text-transform: uppercase; color: #A1A1AA; letter-spacing: 0.05em; font-weight: 600; margin-top: 4px;">Focus Ratio</div>
                          </td>
                          <td width="33%" align="center" style="padding: 4px;">
                            <div style="font-size: 20px; font-weight: 800; color: #F59E0B;">${stagnantInitiatives.length}</div>
                            <div style="font-size: 10px; text-transform: uppercase; color: #A1A1AA; letter-spacing: 0.05em; font-weight: 600; margin-top: 4px;">Slipping Items</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <tr><td style="height: 20px;"></td></tr>

                  <!-- PILLARS SECTIONS -->
                  <tr>
                    <td>
                      <h2 style="font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #A1A1AA; margin: 0 0 16px 0; border-bottom: 1px solid #27272A; padding-bottom: 8px;">
                        Pillar Breakdown
                      </h2>
      `;

      for (const pillar of processedPillars) {
        if (!pillar.hasContent) continue;

        emailHtml += `
          <!-- PILLAR CARD: ${pillar.label} -->
          <div style="background-color: #121214; border: 1px solid #27272A; border-left: 4px solid hsl(${pillar.hue}, 70%, 50%); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <!-- Pillar Title -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 16px;">
              <tr>
                <td>
                  <span style="font-size: 18px; font-weight: 800; color: #FFFFFF;">${pillar.label}</span>
                </td>
                <td align="right">
                  <span style="font-size: 11px; font-weight: 700; color: #A1A1AA; background-color: #1F1F23; border: 1px solid #27272A; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.05em;">
                    ${pillar.activeThreads.length + pillar.inactiveThreads.length} ${pillar.activeThreads.length + pillar.inactiveThreads.length === 1 ? 'Thread' : 'Threads'}
                  </span>
                </td>
              </tr>
            </table>
        `;

        // Active Focus Section
        if (pillar.activeThreads.length > 0) {
          emailHtml += `
            <div style="margin-bottom: 16px;">
              <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #10B981; font-weight: 700; margin-bottom: 8px;">
                🟢 Active Focus
              </div>
          `;

          for (const thread of pillar.activeThreads) {
            emailHtml += `
              <div style="background-color: #18181B; border: 1px solid #27272A; border-radius: 8px; padding: 12px; margin-bottom: 8px;">
                <!-- Thread Title -->
                <div style="font-size: 12px; font-weight: 700; color: #FFFFFF; display: inline-block; margin-bottom: 6px;">
                  ${thread.label}
                </div>
                <div style="font-size: 10px; color: #71717A; margin-bottom: 8px;">
                  Added ${thread.daysSinceAdded}d ago &bull; Activity: ${thread.lastUpdatedText}
                </div>
            `;

            if (thread.activeInitiatives.length > 0) {
              for (const init of thread.activeInitiatives) {
                // Determine color indicators for days since updated
                const ageColor = init.daysSinceUpdated > 7 ? "#F59E0B" : "#A1A1AA";
                emailHtml += `
                  <div style="border-left: 2px solid #10B981; padding-left: 10px; margin-left: 4px; margin-top: 8px; margin-bottom: 8px;">
                    <div style="font-size: 12px; font-weight: 600; color: #E4E4E7;">
                      ${init.label} <span style="font-size: 10px; color: #71717A; font-weight: normal; margin-left: 4px;">${init.taskStats}</span>
                    </div>
                    <div style="font-size: 10px; color: ${ageColor}; margin-top: 2px;">
                      Added ${init.daysSinceAdded}d ago &bull; Updated ${init.lastUpdatedText}
                    </div>
                  </div>
                `;
              }
            } else {
              emailHtml += `
                <div style="font-size: 11px; color: #71717A; font-style: italic; padding-left: 4px;">
                  No active initiatives under this thread
                </div>
              `;
            }

            emailHtml += `</div>`;
          }

          emailHtml += `</div>`;
        }

        // Backburner / Backlog Section
        if (pillar.inactiveThreads.length > 0) {
          emailHtml += `
            <div>
              <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #A1A1AA; font-weight: 700; margin-bottom: 8px;">
                ⏸ Backburner / Backlog
              </div>
          `;

          for (const thread of pillar.inactiveThreads) {
            emailHtml += `
              <div style="background-color: #18181B; border: 1px solid #27272A; border-radius: 8px; padding: 12px; margin-bottom: 8px; opacity: 0.75;">
                <!-- Thread Title -->
                <div style="font-size: 12px; font-weight: 700; color: #A1A1AA; display: inline-block; margin-bottom: 6px;">
                  ${thread.label}
                </div>
                <div style="font-size: 10px; color: #71717A; margin-bottom: 8px;">
                  Added ${thread.daysSinceAdded}d ago &bull; Activity: ${thread.lastUpdatedText}
                </div>
            `;

            for (const init of thread.inactiveInitiatives) {
              const badge = init.status === "paused" ? "⏸" : "⚪";
              const ageColor = init.daysSinceUpdated > 14 ? "#F59E0B" : "#71717A";
              emailHtml += `
                <div style="border-left: 2px solid #52525B; padding-left: 10px; margin-left: 4px; margin-top: 8px; margin-bottom: 8px;">
                  <div style="font-size: 11px; font-weight: 600; color: #A1A1AA;">
                    ${badge} ${init.label} <span style="font-size: 9px; color: #71717A; font-weight: normal; margin-left: 4px;">${init.taskStats}</span>
                  </div>
                  <div style="font-size: 10px; color: ${ageColor}; margin-top: 2px;">
                    Added ${init.daysSinceAdded}d ago &bull; Updated ${init.lastUpdatedText}
                  </div>
                </div>
              `;
            }

            emailHtml += `</div>`;
          }

          emailHtml += `</div>`;
        }

        emailHtml += `</div>`;
      }

      emailHtml += `
                    </td>
                  </tr>

                  <!-- ATTENTION HIGHLIGHTS -->
                  <tr>
                    <td style="padding-top: 12px; padding-bottom: 24px;">
                      <h2 style="font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #A1A1AA; margin: 0 0 16px 0; border-bottom: 1px solid #27272A; padding-bottom: 8px;">
                        🚨 Attention Highlights
                      </h2>
                      
                      <!-- Cold Spots -->
                      <div style="background-color: #121214; border: 1px solid #27272A; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
                        <div style="font-size: 13px; font-weight: 700; color: #FFFFFF; margin-bottom: 6px;">❄️ Cold Spots (Unfocused Domains)</div>
                        <div style="font-size: 12px; color: #A1A1AA; line-height: 1.4;">
                          ${
                            coldSpots.length > 0
                              ? `You have no active projects under: <strong>${coldSpots.join(", ")}</strong>.`
                              : "Great coverage! All domains have at least one active project."
                          }
                        </div>
                      </div>

                      <!-- Stagnant Items -->
                      <div style="background-color: #121214; border: 1px solid #27272A; border-radius: 12px; padding: 16px;">
                        <div style="font-size: 13px; font-weight: 700; color: #FFFFFF; margin-bottom: 6px;">⏳ Slipping Items (Active but idle > 7 days)</div>
                        <div style="font-size: 12px; color: #A1A1AA; line-height: 1.4;">
                          ${
                            stagnantProjects.length > 0
                              ? stagnantProjects
                                  .slice(0, 4)
                                  .map(
                                    (stg) =>
                                      `• [${stg.pillarName}] <strong>${stg.initiativeName}</strong> (No updates in ${stg.daysSinceUpdated} days)`
                                  )
                                  .join("<br/>")
                              : "Excellent momentum! No active projects are currently stagnant."
                          }
                        </div>
                      </div>
                    </td>
                  </tr>

                  <!-- FOOTER -->
                  <tr>
                    <td style="border-top: 1px solid #27272A; padding-top: 24px; padding-bottom: 32px; text-align: center;">
                      <p style="font-size: 12px; color: #71717A; margin: 0 0 12px 0; line-height: 1.5;">
                        "Small steps in the right direction can turn out to be the biggest step of your life."
                      </p>
                      <a href="${supabaseUrl}" style="background-color: #1F1F23; border: 1px solid #27272A; color: #E4E4E7; font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.1em; padding: 10px 20px; border-radius: 8px; text-decoration: none; display: inline-block;">
                        Open Personal OS
                      </a>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      // 6. Send the Email
      try {
        console.log(`Sending email to ${email} for user ${userId}...`);
        const emailResponse = await resend.emails.send({
          from: "POS Life Map <onboarding@resend.dev>",
          to: [email],
          subject: `Life Map Summary Digest – ${dateStr}`,
          html: emailHtml,
        });

        console.log(`Email successfully sent for user ${userId}:`, emailResponse);
        emailResults.push({
          userId,
          email,
          success: true,
          emailResponse,
        });
      } catch (emailError: any) {
        console.error(`Failed to send email for user ${userId}:`, emailError);
        emailResults.push({
          userId,
          email,
          success: false,
          error: emailError.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${lifeMaps.length} life maps.`,
        results: emailResults,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Critical error in daily-lifemap-summary function:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: "Failed to generate daily Life Map email digest",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
