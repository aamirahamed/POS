import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  ListToolsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { 
  fetchLifeMap, 
  createProject, 
  createMilestone, 
  addTaskToNode,
  createDomain,
  updateNode,
  updateTask,
  deleteNode,
  deleteTask,
  getProject,
  searchMap,
  getActivity,
  getNeedsYou,
  createSubtree,
  applyTemplate,
  addRelation,
  removeRelation
} from './lifemapService.js';
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
          text: `You are connected to Aamir's Personal Operating System (POS). You have FULL CRUD capabilities over his Life Map.

CRITICAL RULES:
1. The Life Map hierarchy is strictly: Domain -> Project -> Milestone -> Tasks.
2. Tasks CANNOT be added directly to Domains or Projects. They MUST go inside a Milestone.
3. If you are planning a completely new software or major initiative, you can use create_domain to start from scratch.
4. If a relevant Domain exists but no Project, use create_project.
5. If a relevant Project exists but no Milestone, use create_milestone.
6. Use add_task_to_node to add action items.
7. As the project evolves, you can use update_node and update_task to rename items, change statuses, or mark tasks as completed.
8. If a node or task is no longer relevant, you can use delete_node or delete_task. (Be careful with delete_node as it recursively deletes all children).`
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
            task_text: { type: "string", description: "The text of the task to add." },
            type: { type: "string", description: "Optional type: task, decision, idea, bug." },
            owner: { type: "string", description: "Optional owner: me or claude." },
            position: { type: "number", description: "Optional position integer." },
            external_key: { type: "string", description: "Optional external idempotency key." }
          },
          required: ["node_id", "task_text"]
        }
      },
      {
        name: "create_domain",
        description: "Creates a new top-level Domain.",
        inputSchema: {
          type: "object",
          properties: {
            label: { type: "string", description: "The name of the new domain." }
          },
          required: ["label"]
        }
      },
      {
        name: "update_node",
        description: "Updates the label or status of an existing Domain, Project, or Milestone.",
        inputSchema: {
          type: "object",
          properties: {
            node_id: { type: "string" },
            label: { type: "string", description: "Optional new name for the node." },
            status: { type: "string", description: "Optional new status (e.g. active, completed, backlog)." },
            manual_status_override: { type: "boolean", description: "Optional boolean to manually override computed status." },
            kind: { type: "string", description: "Optional project kind string." },
            repo_url: { type: "string", description: "Optional repo URL string." }
          },
          required: ["node_id"]
        }
      },
      {
        name: "update_task",
        description: "Updates the text or completion status of an existing task.",
        inputSchema: {
          type: "object",
          properties: {
            node_id: { type: "string", description: "The ID of the milestone containing the task." },
            task_id: { type: "string", description: "The ID of the task to update." },
            text: { type: "string", description: "Optional new text for the task." },
            completed: { type: "boolean", description: "Optional boolean to mark task as completed or incomplete." },
            status: { type: "string", description: "Optional status (done, not_started, blocked, parked)." },
            type: { type: "string", description: "Optional type." },
            owner: { type: "string", description: "Optional owner." },
            position: { type: "number", description: "Optional position integer." }
          },
          required: ["node_id", "task_id"]
        }
      },
      {
        name: "delete_node",
        description: "Recursively deletes a node and all of its children.",
        inputSchema: {
          type: "object",
          properties: {
            node_id: { type: "string" }
          },
          required: ["node_id"]
        }
      },
      {
        name: "delete_task",
        description: "Deletes a specific task from a milestone.",
        inputSchema: {
          type: "object",
          properties: {
            node_id: { type: "string" },
            task_id: { type: "string" }
          },
          required: ["node_id", "task_id"]
        }
      },
      {
        name: "get_project",
        description: "Fetches a single project and its full depth (milestones and tasks).",
        inputSchema: {
          type: "object",
          properties: {
            project_id: { type: "string" }
          },
          required: ["project_id"]
        }
      },
      {
        name: "get_activity",
        description: "Fetches recent activity logs.",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Optional limit. Default 50." },
            project_id: { type: "string", description: "Optional filter by project." },
            actor: { type: "string", description: "Optional filter by actor." }
          }
        }
      },
      {
        name: "search_map",
        description: "Searches nodes and tasks by text.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
            project_id: { type: "string" }
          },
          required: ["query"]
        }
      },
      {
        name: "get_needs_you",
        description: "Returns tasks that are blocked, need decisions, or are owned by 'me'.",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "create_subtree",
        description: "Creates multiple nested nodes in one operation.",
        inputSchema: {
          type: "object",
          properties: {
            parent_id: { type: "string" },
            nodes: { 
              type: "array", 
              items: { type: "object" },
              description: "Array of objects with { label, type, tasks: [{text, type, ...}] }"
            }
          },
          required: ["parent_id", "nodes"]
        }
      },
      {
        name: "apply_template",
        description: "Creates a pre-defined tree template.",
        inputSchema: {
          type: "object",
          properties: {
            template_name: { type: "string" },
            label: { type: "string" },
            parent_id: { type: "string" }
          },
          required: ["template_name", "label", "parent_id"]
        }
      },
      {
        name: "add_relation",
        description: "Adds a dependency relation between two nodes or tasks.",
        inputSchema: {
          type: "object",
          properties: {
            source_id: { type: "string", description: "The ID of the node/task that depends on or blocks." },
            target_id: { type: "string", description: "The ID of the target node/task." },
            relation_type: { type: "string", description: "Must be: blocks, depends_on, related_to, duplicate_of" }
          },
          required: ["source_id", "target_id", "relation_type"]
        }
      },
      {
        name: "remove_relation",
        description: "Removes a dependency relation between two nodes or tasks.",
        inputSchema: {
          type: "object",
          properties: {
            source_id: { type: "string" },
            target_id: { type: "string" },
            relation_type: { type: "string", description: "Optional filter by relation type." }
          },
          required: ["source_id", "target_id"]
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
                type: 'milestone',
                tasks: m.data.tasks?.map((t: any) => ({ id: t.id, text: t.text, completed: t.completed })) || []
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
      const type = args?.type ? String(args.type) : undefined;
      const owner = args?.owner ? String(args.owner) : undefined;
      const position = args?.position !== undefined ? Number(args.position) : undefined;
      const external_key = args?.external_key ? String(args.external_key) : undefined;
      await addTaskToNode(node_id, task_text, type, owner, position, external_key);
      return {
        content: [{ type: "text", text: `Successfully added task to milestone ${node_id}` }]
      };
    }

    if (name === "create_domain") {
      const label = String(args?.label);
      const id = await createDomain(label);
      return {
        content: [{ type: "text", text: `Successfully created domain "${label}" with ID: ${id}` }]
      };
    }

    if (name === "update_node") {
      const node_id = String(args?.node_id);
      const label = args?.label ? String(args.label) : undefined;
      const status = args?.status ? String(args.status) : undefined;
      const manual_status_override = args?.manual_status_override !== undefined ? Boolean(args.manual_status_override) : undefined;
      const kind = args?.kind ? String(args.kind) : undefined;
      const repo_url = args?.repo_url ? String(args.repo_url) : undefined;
      
      await updateNode(node_id, label, status, manual_status_override, kind, repo_url, undefined);
      return {
        content: [{ type: "text", text: `Successfully updated node ${node_id}` }]
      };
    }

    if (name === "update_task") {
      const node_id = String(args?.node_id);
      const task_id = String(args?.task_id);
      const text = args?.text ? String(args.text) : undefined;
      const completed = args?.completed !== undefined ? Boolean(args.completed) : undefined;
      const status = args?.status ? String(args.status) : undefined;
      const type = args?.type ? String(args.type) : undefined;
      const owner = args?.owner ? String(args.owner) : undefined;
      const position = args?.position !== undefined ? Number(args.position) : undefined;
      
      await updateTask(node_id, task_id, text, completed, status, type, owner, position);
      return {
        content: [{ type: "text", text: `Successfully updated task ${task_id}` }]
      };
    }

    if (name === "delete_node") {
      const node_id = String(args?.node_id);
      await deleteNode(node_id);
      return {
        content: [{ type: "text", text: `Successfully deleted node ${node_id} and its children` }]
      };
    }

    if (name === "delete_task") {
      const node_id = String(args?.node_id);
      const task_id = String(args?.task_id);
      await deleteTask(node_id, task_id);
      return {
        content: [{ type: "text", text: `Successfully deleted task ${task_id}` }]
      };
    }

    if (name === "get_project") {
      const project_id = String(args?.project_id);
      const project = await getProject(project_id);
      return {
        content: [{ type: "text", text: JSON.stringify(project, null, 2) }]
      };
    }

    if (name === "search_map") {
      const query = String(args?.query);
      const project_id = args?.project_id ? String(args.project_id) : undefined;
      const results = await searchMap(query, project_id);
      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }]
      };
    }

    if (name === "get_activity") {
      const limit = args?.limit ? Number(args.limit) : 50;
      const project_id = args?.project_id ? String(args.project_id) : undefined;
      const actor = args?.actor ? String(args.actor) : undefined;
      const activity = await getActivity(limit, project_id, actor);
      return {
        content: [{ type: "text", text: JSON.stringify(activity, null, 2) }]
      };
    }

    if (name === "get_needs_you") {
      const needsYou = await getNeedsYou();
      return {
        content: [{ type: "text", text: JSON.stringify(needsYou, null, 2) }]
      };
    }

    if (name === "create_subtree") {
      const parent_id = String(args?.parent_id);
      const nodes = args?.nodes as any[];
      const addedIds = await createSubtree(parent_id, nodes);
      return {
        content: [{ type: "text", text: `Successfully created subtree. IDs: ${addedIds.join(', ')}` }]
      };
    }

    if (name === "apply_template") {
      const template_name = String(args?.template_name);
      const label = String(args?.label);
      const parent_id = String(args?.parent_id);
      const id = await applyTemplate(template_name, label, parent_id);
      return {
        content: [{ type: "text", text: `Successfully applied template "${template_name}" as "${label}" under ${parent_id}. Top node ID: ${id}` }]
      };
    }

    if (name === "add_relation") {
      const source_id = String(args?.source_id);
      const target_id = String(args?.target_id);
      const relation_type = String(args?.relation_type);
      await addRelation(source_id, target_id, relation_type);
      return {
        content: [{ type: "text", text: `Successfully added ${relation_type} relation.` }]
      };
    }

    if (name === "remove_relation") {
      const source_id = String(args?.source_id);
      const target_id = String(args?.target_id);
      const relation_type = args?.relation_type ? String(args.relation_type) : undefined;
      await removeRelation(source_id, target_id, relation_type);
      return {
        content: [{ type: "text", text: `Successfully removed relation.` }]
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
