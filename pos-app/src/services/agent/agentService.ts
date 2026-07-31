import { GoogleGenerativeAI, FunctionDeclaration, Tool, Content, SchemaType } from "@google/generative-ai";
import { ORCHESTRATOR_PROMPT, LIFEMAP_PROMPT, SHOPPING_PROMPT, MENTOR_PROMPT, FINANCE_MENTOR_PROMPT } from "./prompts";
import { useLifeMapStore } from "@/store/useLifeMapStore";
import { useShoppingStore } from "@/store/useShoppingStore";
import { useMentorStore } from "@/store/useMentorStore";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useRemindersStore } from "@/store/useRemindersStore";
import { useProfileStore } from "@/store/useProfileStore";
import { compileUnifiedContext } from "./contextEngine";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export interface AgentResponse {
  text: string;
  statusLog: string[];
}

// ──────────────────────────────────────────────────────────
// 1. Tool Definitions for Orchestrator (Routing Intents)
// ──────────────────────────────────────────────────────────
const routeToLifeMapDeclaration: FunctionDeclaration = {
  name: 'route_to_lifemap_agent',
  description: 'Delegate the user request to the Life Map sub-agent to handle mind map operations (adding pillars, threads, initiatives, execution nodes, and checklists).',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: { type: SchemaType.STRING, description: 'The specific command or question for the Life Map agent.' }
    },
    required: ['query']
  }
};

const routeToShoppingDeclaration: FunctionDeclaration = {
  name: 'route_to_shopping_agent',
  description: 'Delegate the user request to the Shopping List sub-agent to handle shopping list operations (adding, toggling, or deleting items).',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: { type: SchemaType.STRING, description: 'The specific command or question for the Shopping List agent.' }
    },
    required: ['query']
  }
};

const routeToMentorDeclaration: FunctionDeclaration = {
  name: 'route_to_mentor_agent',
  description: 'Delegate the user request to the Personal Lifemap Mentor sub-agent to handle strategy sessions, roadmaps, prioritizations, accountability critiques, and coaching reviews.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: { type: SchemaType.STRING, description: 'The coaching request or strategy query for the Mentor agent.' }
    },
    required: ['query']
  }
};

const routeToFinanceDeclaration: FunctionDeclaration = {
  name: 'route_to_finance_agent',
  description: 'Delegate the user request to the Finance Manager sub-agent to handle spending analysis, budget queries, transaction category updates, financial health reviews, and banking questions.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: { type: SchemaType.STRING, description: 'The financial question or command for the Finance Manager agent.' }
    },
    required: ['query']
  }
};

const orchestratorTools: Tool[] = [{
  functionDeclarations: [routeToLifeMapDeclaration, routeToShoppingDeclaration, routeToMentorDeclaration, routeToFinanceDeclaration]
}];

// ──────────────────────────────────────────────────────────
// 2. Tool Definitions for Life Map Agent
// ──────────────────────────────────────────────────────────
const addDomainDecl: FunctionDeclaration = {
  name: 'add_domain',
  description: 'Create one or more new top-level Domains to the Life Map.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      labels: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: 'Array of display names of the new Domains.' }
    },
    required: ['labels']
  }
};

const addProjectDecl: FunctionDeclaration = {
  name: 'add_project',
  description: 'Create one or more new Project nodes under a parent Domain node.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      parent_id: { type: SchemaType.STRING, description: 'The exact node ID of the parent Domain node (e.g. d-1771055997407).' },
      labels: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: 'Array of display names of the new Projects.' }
    },
    required: ['parent_id', 'labels']
  }
};

const addMilestoneDecl: FunctionDeclaration = {
  name: 'add_milestone',
  description: 'Create one or more new Milestone nodes under a parent Project node.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      parent_id: { type: SchemaType.STRING, description: 'The exact node ID of the parent Project node (e.g. pjt-1778287435069).' },
      labels: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: 'Array of display names of the new Milestones.' }
    },
    required: ['parent_id', 'labels']
  }
};

const addTaskToNodeDecl: FunctionDeclaration = {
  name: 'add_task_to_node',
  description: 'Create one or more task checklist items inside a specific Milestone node.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      node_id: { type: SchemaType.STRING, description: 'The exact ID of the target Milestone node.' },
      texts: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: 'Array of checklist task texts to insert.' }
    },
    required: ['node_id', 'texts']
  }
};

const addInboxItemDecl: FunctionDeclaration = {
  name: 'add_inbox_item',
  description: 'Create a raw capture or thought item in the Inbox.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      text: { type: SchemaType.STRING, description: 'The text of the capture/thought.' }
    },
    required: ['text']
  }
};

const addResourceToNodeDecl: FunctionDeclaration = {
  name: 'add_resource_to_node',
  description: 'Add a reference resource link (url, youtube link, article link, design resource) inside a specific Milestone node.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      node_id: { type: SchemaType.STRING, description: 'The exact ID of the target Milestone node.' },
      title: { type: SchemaType.STRING, description: 'The human-readable title or description of the resource.' },
      url: { type: SchemaType.STRING, description: 'The absolute URL link of the resource (e.g. https://21st.dev).' },
      type: { type: SchemaType.STRING, description: 'The type of resource. Must be one of: link, youtube, article.' }
    },
    required: ['node_id', 'title', 'url', 'type']
  }
};

const addReminderDecl: FunctionDeclaration = {
  name: 'add_reminder',
  description: 'Create a new personal reminder or alert in Aamir\'s POS system (e.g. remind me to do X tomorrow).',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      text: { type: SchemaType.STRING, description: 'The text/content of the reminder.' },
      category: { type: SchemaType.STRING, description: 'Optional category (e.g. "Work", "Personal", "Health", "Career").' },
      dueDate: { type: SchemaType.STRING, description: 'Optional date or description of when it is due (e.g. "2026-07-23T12:00:00Z" or "tomorrow").' }
    },
    required: ['text']
  }
};

function parseReminderDueDate(dueDateStr?: string): number | undefined {
  if (!dueDateStr) return undefined;
  const lower = dueDateStr.toLowerCase();
  if (lower.includes('tomorrow')) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0); // Tomorrow at 9 AM
    return d.getTime();
  }
  if (lower.includes('today')) {
    const d = new Date();
    d.setHours(18, 0, 0, 0); // Today evening
    return d.getTime();
  }
  const timestamp = Date.parse(dueDateStr);
  if (!isNaN(timestamp)) {
    return timestamp;
  }
  return undefined;
}

const deleteNodeDecl: FunctionDeclaration = {
  name: 'delete_node',
  description: 'Delete a node and all of its sub-nodes/descendants from the Life Map.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      node_id: { type: SchemaType.STRING, description: 'The exact ID of the node to delete.' }
    },
    required: ['node_id']
  }
};

const moveNodeDecl: FunctionDeclaration = {
  name: 'move_node',
  description: 'Move a node to a different parent node in the Life Map (re-parenting/moving).',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      node_id: { type: SchemaType.STRING, description: 'The exact ID of the node to move.' },
      new_parent_id: { type: SchemaType.STRING, description: 'The exact ID of the new parent node.' }
    },
    required: ['node_id', 'new_parent_id']
  }
};

const renameNodeDecl: FunctionDeclaration = {
  name: 'rename_node',
  description: 'Change/update the display label of a specific node in the Life Map (rename it).',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      node_id: { type: SchemaType.STRING, description: 'The exact ID of the node to rename.' },
      label: { type: SchemaType.STRING, description: 'The new name/label for the node.' }
    },
    required: ['node_id', 'label']
  }
};

const changeNodeTypeDecl: FunctionDeclaration = {
  name: 'change_node_type',
  description: 'Change the type level of a node in the Life Map structure (e.g. promoting a milestone to a project, or demoting a project to a milestone).',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      node_id: { type: SchemaType.STRING, description: 'The exact ID of the node.' },
      type: { 
        type: SchemaType.STRING, 
        description: 'The new type level. Must be one of: domain, project, milestone.' 
      }
    },
    required: ['node_id', 'type']
  }
};

const updateUserFactDecl: FunctionDeclaration = {
  name: 'update_user_fact',
  description: 'Add or update a structured life fact constraint for Aamir (e.g. graduation date, visa status, target job locations).',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      key: { type: SchemaType.STRING, description: 'The fact key/label (e.g. "graduation_date", "visa_status", "target_locations"). Use lower_snake_case.' },
      value: { type: SchemaType.STRING, description: 'The text value or JSON string value of the fact.' }
    },
    required: ['key', 'value']
  }
};

const updateNodeDescriptionDecl: FunctionDeclaration = {
  name: 'update_node_description',
  description: 'Update the description or context notes of a specific node in the Life Map (used for saving context gathered about a project/domain).',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      node_id: { type: SchemaType.STRING, description: 'The exact ID of the node.' },
      description: { type: SchemaType.STRING, description: 'The detailed context, purpose, or goal of the node.' }
    },
    required: ['node_id', 'description']
  }
};

const lifemapTools: Tool[] = [{
  functionDeclarations: [
    addDomainDecl, 
    addProjectDecl, 
    addMilestoneDecl, 
    addTaskToNodeDecl, 
    addInboxItemDecl,
    addResourceToNodeDecl,
    addReminderDecl,
    deleteNodeDecl,
    moveNodeDecl,
    renameNodeDecl,
    changeNodeTypeDecl,
    updateUserFactDecl,
    updateNodeDescriptionDecl
  ]
}];

const updateMentorProfileDecl: FunctionDeclaration = {
  name: 'update_mentor_profile',
  description: 'Update the persistent dynamic coaching profile memo / memory of Aamir. Use this to remember his target companies, preferred schedule constraints, or long term decisions.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      content: { type: SchemaType.STRING, description: 'The updated full content for the persistent profile memory.' }
    },
    required: ['content']
  }
};

const mentorTools: Tool[] = [{
  functionDeclarations: [
    addDomainDecl, 
    addProjectDecl, 
    addMilestoneDecl, 
    addTaskToNodeDecl, 
    addInboxItemDecl,
    addResourceToNodeDecl,
    addReminderDecl,
    deleteNodeDecl,
    moveNodeDecl,
    renameNodeDecl,
    changeNodeTypeDecl,
    updateMentorProfileDecl,
    updateUserFactDecl,
    updateNodeDescriptionDecl
  ]
}];

function mentorAgentTools(): Tool[] {
  return mentorTools;
}

// ──────────────────────────────────────────────────────────
// 3. Tool Definitions for Shopping Agent
// ──────────────────────────────────────────────────────────
const addShoppingItemDecl: FunctionDeclaration = {
  name: 'add_shopping_item',
  description: 'Add a new item to the shopping list checklist.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      text: { type: SchemaType.STRING, description: 'The item label with details, e.g. "Milk (2 cartons)" or "Apples".' }
    },
    required: ['text']
  }
};

const toggleShoppingItemDecl: FunctionDeclaration = {
  name: 'toggle_shopping_item',
  description: 'Toggle the completed checklist state of a shopping item.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      item_id: { type: SchemaType.STRING, description: 'The unique ID of the shopping item.' }
    },
    required: ['item_id']
  }
};

const deleteShoppingItemDecl: FunctionDeclaration = {
  name: 'delete_shopping_item',
  description: 'Delete/remove an item from the shopping list.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      item_id: { type: SchemaType.STRING, description: 'The unique ID of the shopping item.' }
    },
    required: ['item_id']
  }
};

const shoppingTools: Tool[] = [{
  functionDeclarations: [
    addShoppingItemDecl, 
    toggleShoppingItemDecl, 
    deleteShoppingItemDecl
  ]
}];

// Helper: Converts state history to Gemini SDK format
const formatHistory = (history: { role: 'user' | 'assistant'; text: string }[]): Content[] => {
  return history.map(h => ({
    role: h.role === 'user' ? 'user' : 'model',
    parts: [{ text: h.text }]
  }));
};

// ──────────────────────────────────────────────────────────
// 4. Main Service Loop
// ──────────────────────────────────────────────────────────
export async function executeAgentCommand(
  userInput: string,
  history: { role: 'user' | 'assistant'; text: string }[],
  onStatusUpdate: (status: string) => void
): Promise<AgentResponse> {
  if (!API_KEY) {
    throw new Error("Gemini API key is not configured.");
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  
  const formattedHistory = formatHistory(history);
  onStatusUpdate("Secretary checking request...");

  const unifiedContext = await compileUnifiedContext();
  const orchestratorPromptWithContext = `${ORCHESTRATOR_PROMPT}\n\n${unifiedContext.markdown}`;

  let result;
  try {
    const orchestrator = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: orchestratorPromptWithContext,
      tools: orchestratorTools
    });
    result = await orchestrator.generateContent({
      contents: [...formattedHistory, { role: "user", parts: [{ text: userInput }] }]
    });
  } catch (e) {
    console.warn("Orchestrator failed with gemini-2.5-flash, trying gemini-flash-latest", e);
    const orchestrator = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      systemInstruction: orchestratorPromptWithContext,
      tools: orchestratorTools
    });
    result = await orchestrator.generateContent({
      contents: [...formattedHistory, { role: "user", parts: [{ text: userInput }] }]
    });
  }

  const orchestratorCalls = result.response.functionCalls();

  // If Orchestrator decides to route
  if (orchestratorCalls && orchestratorCalls.length > 0) {
    const call = orchestratorCalls[0];
    const targetQuery = (call.args as any).query || userInput;

    if (call.name === 'route_to_lifemap_agent') {
      onStatusUpdate("Forwarding to Life Map Architect...");
      return await executeLifeMapAgent(genAI, targetQuery, onStatusUpdate);
    } 
    
    if (call.name === 'route_to_shopping_agent') {
      onStatusUpdate("Forwarding to Shopping Assistant...");
      return await executeShoppingAgent(genAI, targetQuery, onStatusUpdate);
    }

    if (call.name === 'route_to_mentor_agent') {
      onStatusUpdate("Forwarding to Personal Mentor...");
      return await executeMentorAgent(genAI, targetQuery, onStatusUpdate);
    }

    if (call.name === 'route_to_finance_agent') {
      onStatusUpdate("Forwarding to Finance Manager...");
      return await executeFinanceAgent(genAI, targetQuery, onStatusUpdate);
    }
  }

  // Fallback to direct general response
  return {
    text: result.response.text(),
    statusLog: []
  };
}

// ──────────────────────────────────────────────────────────
// 5. Life Map Sub-Agent Runner
// ──────────────────────────────────────────────────────────
async function executeLifeMapAgent(
  genAI: GoogleGenerativeAI,
  query: string,
  onStatusUpdate: (status: string) => void
): Promise<AgentResponse> {
  const unifiedContext = await compileUnifiedContext();
  const systemInstruction = `${LIFEMAP_PROMPT}\n\n${unifiedContext.markdown}`;

  let lifemapAgent;
  let result;
  try {
    lifemapAgent = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction,
      tools: lifemapAgentTools()
    });
    result = await lifemapAgent.generateContent({
      contents: [{ role: "user", parts: [{ text: query }] }]
    });
  } catch (e) {
    console.warn("Life Map Agent failed with gemini-2.5-flash, trying gemini-flash-latest", e);
    lifemapAgent = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      systemInstruction,
      tools: lifemapAgentTools()
    });
    result = await lifemapAgent.generateContent({
      contents: [{ role: "user", parts: [{ text: query }] }]
    });
  }

  const statusLog: string[] = [];
  const contents: Content[] = [{ role: "user", parts: [{ text: query }] }];

  let currentResult = result;
  let iterations = 0;
  const maxIterations = 5;

  while (iterations < maxIterations) {
    const calls = currentResult.response.functionCalls();
    if (!calls || calls.length === 0) {
      break;
    }

    // Add model's function call response to history
    contents.push(currentResult.response.candidates![0].content);

    const functionResponses = [];

    for (const call of calls) {
      const args = call.args as any;
      let executionMessages: string[] = [];

      onStatusUpdate(`Architect executing: ${call.name}...`);
      statusLog.push(`Calling tool: ${call.name}`);

      // Dispatch stores actions
      if (call.name === 'add_domain') {
        const labelsToAdd = args.labels || (args.label ? [args.label] : []);
        for (const label of labelsToAdd) {
            const id = await useLifeMapStore.getState().addDomain(label);
            executionMessages.push(`✓ Added Domain "${label}" to Life Map. Generated Domain ID: "${id}".\n\n__JSON_PAYLOAD__${JSON.stringify({ type: 'add_domain', nodeId: id })}`);
        }
      } else if (call.name === 'add_project') {
        const labelsToAdd = args.labels && args.labels.length > 0 ? args.labels : (args.label ? [args.label] : []);
        for (const label of labelsToAdd) {
            const id = await useLifeMapStore.getState().addProject(args.parent_id, label);
            executionMessages.push(`✓ Added Project "${label}" under parent ID "${args.parent_id}". Generated Project ID: "${id}".\n\n__JSON_PAYLOAD__${JSON.stringify({ type: 'add_project', nodeId: id })}`);
        }
      } else if (call.name === 'add_milestone') {
        const labelsToAdd = args.labels && args.labels.length > 0 ? args.labels : (args.label ? [args.label] : []);
        for (const label of labelsToAdd) {
            const id = await useLifeMapStore.getState().addMilestone(args.parent_id, label);
            executionMessages.push(`✓ Added Milestone "${label}" under parent ID "${args.parent_id}". Generated Milestone ID: "${id}".\n\n__JSON_PAYLOAD__${JSON.stringify({ type: 'add_milestone', nodeId: id })}`);
        }
      } else if (call.name === 'add_task_to_node') {
        const textsToAdd = args.texts && args.texts.length > 0 ? args.texts : (args.text ? [args.text] : []);
        for (const text of textsToAdd) {
            await useLifeMapStore.getState().addTaskToNode(args.node_id, text);
            executionMessages.push(`✓ Added task "${text}" into Milestone node ID "${args.node_id}".\n\n__JSON_PAYLOAD__${JSON.stringify({ type: 'add_task_to_node', nodeId: args.node_id })}`);
        }
      } else if (call.name === 'add_inbox_item') {
        await useLifeMapStore.getState().addInboxItem(args.text);
        executionMessages.push(`✓ Saved thought "${args.text}" to Inbox.`);
      } else if (call.name === 'add_resource_to_node') {
        const id = `res-${Date.now()}`;
        await useLifeMapStore.getState().addResource(args.node_id, {
          id,
          title: args.title,
          url: args.url,
          type: args.type
        });
        executionMessages.push(`✓ Added resource reference "${args.title}" to Milestone ID "${args.node_id}".`);
      } else if (call.name === 'delete_node') {
        await useLifeMapStore.getState().deleteNodeImmediately(args.node_id);
        executionMessages.push(`✓ Deleted node ID "${args.node_id}".`);
      } else if (call.name === 'move_node') {
        await useLifeMapStore.getState().moveNode(args.node_id, args.new_parent_id);
        executionMessages.push(`✓ Moved node ID "${args.node_id}" to new parent ID "${args.new_parent_id}".`);
      } else if (call.name === 'rename_node') {
        await useLifeMapStore.getState().renameNode(args.node_id, args.label);
        executionMessages.push(`✓ Renamed node ID "${args.node_id}" to "${args.label}".`);
      } else if (call.name === 'change_node_type') {
        await useLifeMapStore.getState().changeNodeType(args.node_id, args.type);
        executionMessages.push(`✓ Changed type of node ID "${args.node_id}" to "${args.type}".`);
      } else if (call.name === 'add_reminder') {
        const parsedDue = parseReminderDueDate(args.dueDate);
        await useRemindersStore.getState().addReminder(args.text, args.category || 'General', parsedDue);
        executionMessages.push(`✓ Created reminder "${args.text}" (Category: "${args.category || 'General'}"${args.dueDate ? `, Due: ${args.dueDate}` : ''}).`);
      } else if (call.name === 'update_user_fact') {
        await useProfileStore.getState().updateFact(args.key, args.value);
        executionMessages.push(`✓ Updated user profile fact "${args.key}" to "${args.value}".`);
      } else if (call.name === 'update_node_description') {
        await useLifeMapStore.getState().updateNode(args.node_id, { description: args.description });
        executionMessages.push(`✓ Updated description for node ID "${args.node_id}".`);
      }

      for (const msg of executionMessages) {
          statusLog.push(msg);
      }

      functionResponses.push({
        functionResponse: {
          name: call.name,
          response: { result: executionMessages.join('\n') }
        }
      });
    }

    contents.push({
      role: 'user',
      parts: functionResponses
    });

    currentResult = await lifemapAgent.generateContent({ contents });
    iterations++;
  }

  return {
    text: currentResult.response.text(),
    statusLog
  };
}

// ──────────────────────────────────────────────────────────
// 5.5. Personal Mentor Sub-Agent Runner
// ──────────────────────────────────────────────────────────
export async function executeMentorAgent(
  genAI: GoogleGenerativeAI,
  query: string,
  onStatusUpdate: (status: string) => void
): Promise<AgentResponse> {
  const unifiedContext = await compileUnifiedContext();
  const systemInstruction = `${MENTOR_PROMPT}\n\n${unifiedContext.markdown}`;

  let mentorAgent: any = null;
  let result: any = null;
  const mentorModels = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-flash-latest"];
  let success = false;
  let lastError: any = null;

  for (const modelName of mentorModels) {
    try {
      mentorAgent = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
        tools: mentorAgentTools()
      });
      result = await mentorAgent.generateContent({
        contents: [{ role: "user", parts: [{ text: query }] }]
      });
      success = true;
      break;
    } catch (e) {
      console.warn(`Mentor query failed with ${modelName}, trying next fallback.`, e);
      lastError = e;
    }
  }

  if (!success || !result) {
    throw new Error(`All mentor models failed. Last error: ${lastError?.message || lastError}`);
  }

  const statusLog: string[] = [];
  const contents: Content[] = [{ role: "user", parts: [{ text: query }] }];

  let currentResult = result;
  let iterations = 0;
  const maxIterations = 5;

  while (iterations < maxIterations) {
    const calls = currentResult.response.functionCalls();
    if (!calls || calls.length === 0) {
      break;
    }

    // Add model's function call response to history
    contents.push(currentResult.response.candidates![0].content);

    const functionResponses = [];

    for (const call of calls) {
      const args = call.args as any;
      let executionMessage = "";

      onStatusUpdate(`Mentor executing: ${call.name}...`);
      statusLog.push(`Calling tool: ${call.name}`);

      // Dispatch stores actions
      if (call.name === 'add_domain') {
        const labelsToAdd = args.labels || (args.label ? [args.label] : []);
        for (const label of labelsToAdd) {
            const id = await useLifeMapStore.getState().addDomain(label);
            executionMessage += `✓ Added Domain "${label}" to Life Map. Generated Domain ID: "${id}".\n\n__JSON_PAYLOAD__${JSON.stringify({ type: 'add_domain', nodeId: id })}\n`;
        }
      } else if (call.name === 'add_project') {
        const labelsToAdd = args.labels && args.labels.length > 0 ? args.labels : (args.label ? [args.label] : []);
        for (const label of labelsToAdd) {
            const id = await useLifeMapStore.getState().addProject(args.parent_id, label);
            executionMessage += `✓ Added Project "${label}" under parent ID "${args.parent_id}". Generated Project ID: "${id}".\n\n__JSON_PAYLOAD__${JSON.stringify({ type: 'add_project', nodeId: id })}\n`;
        }
      } else if (call.name === 'add_milestone') {
        const labelsToAdd = args.labels && args.labels.length > 0 ? args.labels : (args.label ? [args.label] : []);
        for (const label of labelsToAdd) {
            const id = await useLifeMapStore.getState().addMilestone(args.parent_id, label);
            executionMessage += `✓ Added Milestone "${label}" under parent ID "${args.parent_id}". Generated Milestone ID: "${id}".\n\n__JSON_PAYLOAD__${JSON.stringify({ type: 'add_milestone', nodeId: id })}\n`;
        }
      } else if (call.name === 'add_task_to_node') {
        const textsToAdd = args.texts && args.texts.length > 0 ? args.texts : (args.text ? [args.text] : []);
        for (const text of textsToAdd) {
            await useLifeMapStore.getState().addTaskToNode(args.node_id, text);
            executionMessage += `✓ Added task "${text}" into Milestone node ID "${args.node_id}".\n\n__JSON_PAYLOAD__${JSON.stringify({ type: 'add_task_to_node', nodeId: args.node_id })}\n`;
        }
      } else if (call.name === 'add_inbox_item') {
        await useLifeMapStore.getState().addInboxItem(args.text);
        executionMessage = `✓ Saved thought "${args.text}" to Inbox.`;
      } else if (call.name === 'add_resource_to_node') {
        const id = `res-${Date.now()}`;
        await useLifeMapStore.getState().addResource(args.node_id, {
          id,
          title: args.title,
          url: args.url,
          type: args.type
        });
        executionMessage = `✓ Added resource reference "${args.title}" to Milestone ID "${args.node_id}".`;
      } else if (call.name === 'delete_node') {
        await useLifeMapStore.getState().deleteNodeImmediately(args.node_id);
        executionMessage = `✓ Deleted node ID "${args.node_id}".`;
      } else if (call.name === 'move_node') {
        await useLifeMapStore.getState().moveNode(args.node_id, args.new_parent_id);
        executionMessage = `✓ Moved node ID "${args.node_id}" to new parent ID "${args.new_parent_id}".`;
      } else if (call.name === 'rename_node') {
        await useLifeMapStore.getState().renameNode(args.node_id, args.label);
        executionMessage = `✓ Renamed node ID "${args.node_id}" to "${args.label}".`;
      } else if (call.name === 'change_node_type') {
        await useLifeMapStore.getState().changeNodeType(args.node_id, args.type);
        executionMessage = `✓ Changed type of node ID "${args.node_id}" to "${args.type}".`;
      } else if (call.name === 'add_reminder') {
        const parsedDue = parseReminderDueDate(args.dueDate);
        await useRemindersStore.getState().addReminder(args.text, args.category || 'General', parsedDue);
        executionMessage = `✓ Created reminder "${args.text}" (Category: "${args.category || 'General'}"${args.dueDate ? `, Due: ${args.dueDate}` : ''}).`;
      } else if (call.name === 'update_mentor_profile') {
        await useMentorStore.getState().updateProfileMemory(args.content);
        executionMessage = `✓ Updated dynamic profile memory.`;
      } else if (call.name === 'update_user_fact') {
        await useProfileStore.getState().updateFact(args.key, args.value);
        executionMessage = `✓ Updated user profile fact "${args.key}" to "${args.value}".`;
      } else if (call.name === 'update_node_description') {
        await useLifeMapStore.getState().updateNode(args.node_id, { description: args.description });
        executionMessage = `✓ Updated description for node ID "${args.node_id}".`;
      }

      statusLog.push(executionMessage);

      functionResponses.push({
        functionResponse: {
          name: call.name,
          response: { result: executionMessage }
        }
      });
    }

    contents.push({
      role: 'user',
      parts: functionResponses
    });

    currentResult = await mentorAgent.generateContent({ contents });
    iterations++;
  }

  return {
    text: currentResult.response.text(),
    statusLog
  };
}

// ──────────────────────────────────────────────────────────
// 6. Shopping List Sub-Agent Runner
// ──────────────────────────────────────────────────────────
async function executeShoppingAgent(
  genAI: GoogleGenerativeAI,
  query: string,
  onStatusUpdate: (status: string) => void
): Promise<AgentResponse> {
  const { items } = useShoppingStore.getState();

  // Compile current Shopping items for context
  const listText = items.map(i => 
    `- ID: "${i.id}", Text: "${i.text}", Completed: ${i.completed}, Recurring: ${i.recurring}`
  ).join('\n');

  const systemInstruction = `${SHOPPING_PROMPT}\n\nCurrent Shopping List:\n${listText || "No items currently on the list."}`;

  let shoppingAgent;
  let result;
  try {
    shoppingAgent = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction,
      tools: shoppingTools
    });
    result = await shoppingAgent.generateContent({
      contents: [{ role: "user", parts: [{ text: query }] }]
    });
  } catch (e) {
    console.warn("Shopping Agent failed with gemini-2.5-flash, trying gemini-flash-latest", e);
    shoppingAgent = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      systemInstruction,
      tools: shoppingTools
    });
    result = await shoppingAgent.generateContent({
      contents: [{ role: "user", parts: [{ text: query }] }]
    });
  }

  const calls = result.response.functionCalls();
  const statusLog: string[] = [];

  if (calls && calls.length > 0) {
    const functionResponses = [];

    for (const call of calls) {
      const args = call.args as any;
      let executionMessage = "";

      onStatusUpdate(`Clerk executing: ${call.name}...`);
      statusLog.push(`Calling tool: ${call.name}`);

      if (call.name === 'add_shopping_item') {
        await useShoppingStore.getState().addItem(args.text);
        executionMessage = `✓ Added "${args.text}" to Shopping List.`;
      } else if (call.name === 'toggle_shopping_item') {
        await useShoppingStore.getState().toggleComplete(args.item_id);
        executionMessage = `✓ Toggled completed state of item ID "${args.item_id}".`;
      } else if (call.name === 'delete_shopping_item') {
        await useShoppingStore.getState().deleteItem(args.item_id);
        executionMessage = `✓ Deleted item ID "${args.item_id}" from Shopping List.`;
      }

      statusLog.push(executionMessage);

      functionResponses.push({
        functionResponse: {
          name: call.name,
          response: { result: executionMessage }
        }
      });
    }

    const finalResult = await shoppingAgent.generateContent({
      contents: [
        { role: 'user', parts: [{ text: query }] },
        result.response.candidates![0].content,
        {
          role: 'user',
          parts: functionResponses
        }
      ]
    });

    return {
      text: finalResult.response.text(),
      statusLog
    };
  }

  return {
    text: result.response.text(),
    statusLog: []
  };
}

// Workaround function for hoisting tools definition
function lifemapAgentTools(): Tool[] {
  return lifemapTools;
}

// ──────────────────────────────────────────────────────────
// 7. Finance Manager Sub-Agent Runner
// ──────────────────────────────────────────────────────────
async function executeFinanceAgent(
  genAI: GoogleGenerativeAI,
  query: string,
  onStatusUpdate: (status: string) => void
): Promise<AgentResponse> {
  const { transactions, bankAccounts, updateTransactionCategory } = useFinanceStore.getState();

  // Compact transaction summary for context (latest 100, most relevant fields)
  const txSummary = transactions.slice(0, 100).map(t => ({
    id: t.id,
    date: t.date,
    amount: t.amount,
    merchant: t.merchantName || t.transactionDetails,
    category: t.category,
    direction: t.isIncome ? 'credit' : 'debit',
    account: t.accountName,
  }));

  // Compact account summary
  const accountSummary = bankAccounts.map(a => ({
    name: a.name,
    accountNumber: a.accountNumber,
    type: a.type,
  }));

  const unifiedContext = await compileUnifiedContext();

  const systemInstruction = `${FINANCE_MENTOR_PROMPT}

${unifiedContext.markdown}

Connected Bank Accounts:
${JSON.stringify(accountSummary, null, 2)}

Recent Transactions (latest ${txSummary.length}):
${JSON.stringify(txSummary, null, 2)}`;

  // Finance agent tool: update category
  const financeTools: Tool[] = [{
    functionDeclarations: [{
      name: 'update_transaction_category',
      description: 'Update the category label of a specific transaction.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          transaction_id: { type: SchemaType.STRING, description: 'The ID of the transaction to update.' },
          category: { type: SchemaType.STRING, description: 'The new category label (e.g. Groceries, Transport, Food & Drinks, Subscriptions, Income, Transfers, Other).' },
        },
        required: ['transaction_id', 'category']
      }
    }]
  }];

  onStatusUpdate("Finance Manager analysing your transactions...");

  let financeAgent: any = null;
  let result: any = null;
  const financeModels = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-flash-latest"];
  let lastError: any = null;

  for (const modelName of financeModels) {
    try {
      financeAgent = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
        tools: financeTools
      });
      result = await financeAgent.generateContent({
        contents: [{ role: "user", parts: [{ text: query }] }]
      });
      break;
    } catch (e) {
      console.warn(`Finance agent failed with ${modelName}, trying fallback.`, e);
      lastError = e;
    }
  }

  if (!result) {
    throw new Error(`All finance models failed. Last error: ${lastError?.message ?? lastError}`);
  }

  const calls = result.response.functionCalls();
  const statusLog: string[] = [];

  if (calls && calls.length > 0) {
    const functionResponses = [];

    for (const call of calls) {
      const args = call.args as any;
      let executionMessage = "";

      if (call.name === 'update_transaction_category') {
        await updateTransactionCategory(args.transaction_id, args.category);
        executionMessage = `✓ Updated transaction ${args.transaction_id} to category "${args.category}".`;
        onStatusUpdate(`Finance Manager updated category → ${args.category}`);
      }

      statusLog.push(executionMessage);
      functionResponses.push({
        functionResponse: {
          name: call.name,
          response: { result: executionMessage }
        }
      });
    }

    const finalResult = await financeAgent.generateContent({
      contents: [
        { role: 'user', parts: [{ text: query }] },
        result.response.candidates![0].content,
        { role: 'user', parts: functionResponses }
      ]
    });

    return {
      text: finalResult.response.text(),
      statusLog
    };
  }

  return {
    text: result.response.text(),
    statusLog: []
  };
}
