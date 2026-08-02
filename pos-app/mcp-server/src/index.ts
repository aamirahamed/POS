import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  ListToolsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { fetchLifeMap, createProject, createMilestone, addTaskToNode } from './lifemapService.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const server = new Server(
  {
    name: "pos-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      prompts: {}
    }
  }
);

// ──────────────────────────────────────────────────────────
// Prompts
// ──────────────────────────────────────────────────────────

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "pos_lifemap_rules",
        description: "The rules for modifying Aamir's Life Map. Read this before calling any POS tools.",
      }
    ]
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name !== "pos_lifemap_rules") {
    throw new Error("Unknown prompt");
  }

  return {
    description: "Life Map Rules",
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `You are connected to Aamir's Personal Operating System (POS). You can read his Life Map and create projects, milestones, or add tasks.

CRITICAL RULES:
1. The Life Map hierarchy is strictly: Domain -> Project -> Milestone -> Tasks.
2. Tasks CANNOT be added directly to Domains or Projects. They MUST go inside a Milestone.
3. If you have action items to save, first check the state of the Life Map using get_lifemap_state.
4. If a relevant Milestone exists, add your tasks to it using add_task_to_node.
5. If no relevant Milestone exists, but a relevant Project exists, use create_milestone to create one, then add tasks to the new milestone ID.
6. If no relevant Project exists, use create_project first, then create a milestone, then add tasks.
7. Be intelligent in your categorization. If you are generating software requirements, put them under the relevant software project.`
        }
      }
    ]
  };
});

// ──────────────────────────────────────────────────────────
// Tools
// ──────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_lifemap_state",
        description: "Gets a simplified tree structure of the current Domains, Projects, and Milestones in the POS Life Map.",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "create_project",
        description: "Creates a new Project under a specific Domain.",
        inputSchema: {
          type: "object",
          properties: {
            parent_id: { type: "string", description: "The exact node ID of the parent Domain." },
            label: { type: "string", description: "The name of the new project." }
          },
          required: ["parent_id", "label"]
        }
      },
      {
        name: "create_milestone",
        description: "Creates a new Milestone under a specific Project.",
        inputSchema: {
          type: "object",
          properties: {
            parent_id: { type: "string", description: "The exact node ID of the parent Project." },
            label: { type: "string", description: "The name of the new milestone." }
          },
          required: ["parent_id", "label"]
        }
      },
      {
        name: "add_task_to_node",
        description: "Adds a task string to a specific Milestone.",
        inputSchema: {
          type: "object",
          properties: {
            node_id: { type: "string", description: "The exact node ID of the target Milestone." },
            task_text: { type: "string", description: "The text of the task to add." }
          },
          required: ["node_id", "task_text"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "get_lifemap_state") {
      const { nodes, edges } = await fetchLifeMap();
      
      // Build a simple tree representation
      const tree: any = {};
      const domains = nodes.filter(n => n.type === 'domain');
      const projects = nodes.filter(n => n.type === 'project');
      const milestones = nodes.filter(n => n.type === 'milestone');

      const result = domains.map(d => {
        const dProjects = projects.filter(p => p.data.parentId === d.id);
        return {
          id: d.id,
          label: d.data.label,
          type: 'domain',
          projects: dProjects.map(p => {
            const pMilestones = milestones.filter(m => m.data.parentId === p.id);
            return {
              id: p.id,
              label: p.data.label,
              type: 'project',
              milestones: pMilestones.map(m => ({
                id: m.id,
                label: m.data.label,
                type: 'milestone'
              }))
            };
          })
        };
      });

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };
    }

    if (name === "create_project") {
      const parent_id = String(args?.parent_id);
      const label = String(args?.label);
      const id = await createProject(parent_id, label);
      return {
        content: [{ type: "text", text: `Successfully created project "${label}" with ID: ${id}` }]
      };
    }

    if (name === "create_milestone") {
      const parent_id = String(args?.parent_id);
      const label = String(args?.label);
      const id = await createMilestone(parent_id, label);
      return {
        content: [{ type: "text", text: `Successfully created milestone "${label}" with ID: ${id}` }]
      };
    }

    if (name === "add_task_to_node") {
      const node_id = String(args?.node_id);
      const task_text = String(args?.task_text);
      await addTaskToNode(node_id, task_text);
      return {
        content: [{ type: "text", text: `Successfully added task to milestone ${node_id}` }]
      };
    }

    throw new Error(`Unknown tool: ${name}`);

  } catch (error: any) {
    return {
      content: [{ type: "text", text: `Error executing tool ${name}: ${error.message}` }],
      isError: true
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("POS MCP Server running on stdio");
}

main().catch(console.error);
