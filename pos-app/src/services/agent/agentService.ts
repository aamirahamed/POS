import { GoogleGenerativeAI, FunctionDeclaration, Tool, Content, SchemaType } from "@google/generative-ai";
import { ORCHESTRATOR_PROMPT, LIFEMAP_PROMPT, SHOPPING_PROMPT, MENTOR_PROMPT } from "./prompts";
import { useLifeMapStore } from "@/store/useLifeMapStore";
import { useShoppingStore } from "@/store/useShoppingStore";

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

const orchestratorTools: Tool[] = [{
  functionDeclarations: [routeToLifeMapDeclaration, routeToShoppingDeclaration, routeToMentorDeclaration]
}];

// ──────────────────────────────────────────────────────────
// 2. Tool Definitions for Life Map Agent
// ──────────────────────────────────────────────────────────
const addPillarDecl: FunctionDeclaration = {
  name: 'add_pillar',
  description: 'Create a new top-level Pillar to the Life Map.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      label: { type: SchemaType.STRING, description: 'The display name of the new Pillar.' }
    },
    required: ['label']
  }
};

const addThreadDecl: FunctionDeclaration = {
  name: 'add_thread',
  description: 'Create a new Thread node under a parent node (usually a Pillar).',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      parent_id: { type: SchemaType.STRING, description: 'The exact node ID of the parent (e.g. p2, p4, pillar-inbox).' },
      label: { type: SchemaType.STRING, description: 'The display name of the new Thread.' }
    },
    required: ['parent_id', 'label']
  }
};

const addInitiativeDecl: FunctionDeclaration = {
  name: 'add_initiative',
  description: 'Create a new Initiative node under a parent node (usually a Thread).',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      parent_id: { type: SchemaType.STRING, description: 'The exact node ID of the parent Thread node (e.g. t-1771055997407).' },
      label: { type: SchemaType.STRING, description: 'The display name of the new Initiative.' }
    },
    required: ['parent_id', 'label']
  }
};

const addSubnodeDecl: FunctionDeclaration = {
  name: 'add_subnode',
  description: 'Create a new Subnode (Execution Node) under a parent node (usually an Initiative).',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      parent_id: { type: SchemaType.STRING, description: 'The exact node ID of the parent Initiative node (e.g. i-1778287435069).' },
      label: { type: SchemaType.STRING, description: 'The display name of the new Subnode.' }
    },
    required: ['parent_id', 'label']
  }
};

const addTaskToNodeDecl: FunctionDeclaration = {
  name: 'add_task_to_node',
  description: 'Create a task checklist item inside a specific Subnode (Execution Node).',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      node_id: { type: SchemaType.STRING, description: 'The exact ID of the target Subnode/Execution node.' },
      text: { type: SchemaType.STRING, description: 'The checklist task text to insert.' }
    },
    required: ['node_id', 'text']
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
  description: 'Change the type level of a node in the Life Map structure (e.g. promoting a subnode to an initiative, or demoting an initiative to a subnode).',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      node_id: { type: SchemaType.STRING, description: 'The exact ID of the node.' },
      type: { 
        type: SchemaType.STRING, 
        description: 'The new type level. Must be one of: pillar, thread, initiative, subnode.' 
      }
    },
    required: ['node_id', 'type']
  }
};

const lifemapTools: Tool[] = [{
  functionDeclarations: [
    addPillarDecl, 
    addThreadDecl, 
    addInitiativeDecl, 
    addSubnodeDecl, 
    addTaskToNodeDecl, 
    addInboxItemDecl,
    deleteNodeDecl,
    moveNodeDecl,
    renameNodeDecl,
    changeNodeTypeDecl
  ]
}];

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
  
  // 1. Initialize Orchestrator Router
  const orchestrator = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: ORCHESTRATOR_PROMPT,
    tools: orchestratorTools
  });

  const formattedHistory = formatHistory(history);
  onStatusUpdate("Secretary checking request...");

  // Send request to Orchestrator
  const result = await orchestrator.generateContent({
    contents: [...formattedHistory, { role: "user", parts: [{ text: userInput }] }]
  });

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
  const { nodes } = useLifeMapStore.getState();
  
  // Compile current Life Map structure for context
  const outlineText = nodes.map(n => {
    const parent = n.data?.parentId ? ` (parent ID: "${n.data.parentId}")` : '';
    return `- [${n.type.toUpperCase()}] ID: "${n.id}", Label: "${n.data?.label}"${parent}`;
  }).join('\n');

  const systemInstruction = `${LIFEMAP_PROMPT}\n\nCurrent Life Map Outline:\n${outlineText || "No nodes currently exist."}`;

  const lifemapAgent = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction,
    tools: lifemapAgentTools()
  });

  const result = await lifemapAgent.generateContent({
    contents: [{ role: "user", parts: [{ text: query }] }]
  });

  const calls = result.response.functionCalls();
  const statusLog: string[] = [];

  if (calls && calls.length > 0) {
    const call = calls[0];
    const args = call.args as any;
    let executionMessage = "";

    onStatusUpdate(`Architect executing: ${call.name}...`);
    statusLog.push(`Calling tool: ${call.name}`);

    // Dispatch stores actions
    if (call.name === 'add_pillar') {
      await useLifeMapStore.getState().addPillar(args.label);
      executionMessage = `✓ Added Pillar "${args.label}" to Life Map.`;
    } else if (call.name === 'add_thread') {
      await useLifeMapStore.getState().addThread(args.parent_id, args.label);
      executionMessage = `✓ Added Thread "${args.label}" under parent ID "${args.parent_id}".`;
    } else if (call.name === 'add_initiative') {
      await useLifeMapStore.getState().addInitiative(args.parent_id, args.label);
      executionMessage = `✓ Added Initiative "${args.label}" under parent ID "${args.parent_id}".`;
    } else if (call.name === 'add_subnode') {
      await useLifeMapStore.getState().addSubnode(args.parent_id, args.label);
      executionMessage = `✓ Added Subnode "${args.label}" under parent ID "${args.parent_id}".`;
    } else if (call.name === 'add_task_to_node') {
      await useLifeMapStore.getState().addTaskToNode(args.node_id, args.text);
      executionMessage = `✓ Added task "${args.text}" into Execution Node ID "${args.node_id}".`;
    } else if (call.name === 'add_inbox_item') {
      await useLifeMapStore.getState().addInboxItem(args.text);
      executionMessage = `✓ Saved thought "${args.text}" to Inbox.`;
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
    }

    statusLog.push(executionMessage);

    // Feed back result to get natural response
    const finalResult = await lifemapAgent.generateContent({
      contents: [
        { role: 'user', parts: [{ text: query }] },
        result.response.candidates![0].content,
        {
          role: 'user',
          parts: [{
            functionResponse: {
              name: call.name,
              response: { result: executionMessage }
            }
          }]
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

// ──────────────────────────────────────────────────────────
// 5.5. Personal Mentor Sub-Agent Runner
// ──────────────────────────────────────────────────────────
async function executeMentorAgent(
  genAI: GoogleGenerativeAI,
  query: string,
  onStatusUpdate: (status: string) => void
): Promise<AgentResponse> {
  const { nodes } = useLifeMapStore.getState();
  
  const outlineText = nodes.map(n => {
    const parent = n.data?.parentId ? ` (parent ID: "${n.data.parentId}")` : '';
    return `- [${n.type.toUpperCase()}] ID: "${n.id}", Label: "${n.data?.label}"${parent}`;
  }).join('\n');

  const systemInstruction = `${MENTOR_PROMPT}\n\nCurrent Life Map Outline:\n${outlineText || "No nodes currently exist."}`;

  // Try gemini-2.5-pro first as requested; fallback to gemini-2.5-flash if needed
  let mentorAgent;
  try {
    mentorAgent = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      systemInstruction,
      tools: lifemapAgentTools()
    });
  } catch (e) {
    console.warn("gemini-2.5-pro model initialization failed, falling back to gemini-2.5-flash", e);
    mentorAgent = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction,
      tools: lifemapAgentTools()
    });
  }

  let result;
  try {
    result = await mentorAgent.generateContent({
      contents: [{ role: "user", parts: [{ text: query }] }]
    });
  } catch (e: any) {
    console.warn("gemini-2.5-pro query failed, retrying with gemini-2.5-flash", e);
    mentorAgent = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction,
      tools: lifemapAgentTools()
    });
    result = await mentorAgent.generateContent({
      contents: [{ role: "user", parts: [{ text: query }] }]
    });
  }

  const calls = result.response.functionCalls();
  const statusLog: string[] = [];

  if (calls && calls.length > 0) {
    const call = calls[0];
    const args = call.args as any;
    let executionMessage = "";

    onStatusUpdate(`Mentor executing: ${call.name}...`);
    statusLog.push(`Calling tool: ${call.name}`);

    // Dispatch stores actions
    if (call.name === 'add_pillar') {
      await useLifeMapStore.getState().addPillar(args.label);
      executionMessage = `✓ Added Pillar "${args.label}" to Life Map.`;
    } else if (call.name === 'add_thread') {
      await useLifeMapStore.getState().addThread(args.parent_id, args.label);
      executionMessage = `✓ Added Thread "${args.label}" under parent ID "${args.parent_id}".`;
    } else if (call.name === 'add_initiative') {
      await useLifeMapStore.getState().addInitiative(args.parent_id, args.label);
      executionMessage = `✓ Added Initiative "${args.label}" under parent ID "${args.parent_id}".`;
    } else if (call.name === 'add_subnode') {
      await useLifeMapStore.getState().addSubnode(args.parent_id, args.label);
      executionMessage = `✓ Added Subnode "${args.label}" under parent ID "${args.parent_id}".`;
    } else if (call.name === 'add_task_to_node') {
      await useLifeMapStore.getState().addTaskToNode(args.node_id, args.text);
      executionMessage = `✓ Added task "${args.text}" into Execution Node ID "${args.node_id}".`;
    } else if (call.name === 'add_inbox_item') {
      await useLifeMapStore.getState().addInboxItem(args.text);
      executionMessage = `✓ Saved thought "${args.text}" to Inbox.`;
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
    }

    statusLog.push(executionMessage);

    // Feed back result to get natural response
    const finalResult = await mentorAgent.generateContent({
      contents: [
        { role: 'user', parts: [{ text: query }] },
        result.response.candidates![0].content,
        {
          role: 'user',
          parts: [{
            functionResponse: {
              name: call.name,
              response: { result: executionMessage }
            }
          }]
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

  const shoppingAgent = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction,
    tools: shoppingTools
  });

  const result = await shoppingAgent.generateContent({
    contents: [{ role: "user", parts: [{ text: query }] }]
  });

  const calls = result.response.functionCalls();
  const statusLog: string[] = [];

  if (calls && calls.length > 0) {
    const call = calls[0];
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

    const finalResult = await shoppingAgent.generateContent({
      contents: [
        { role: 'user', parts: [{ text: query }] },
        result.response.candidates![0].content,
        {
          role: 'user',
          parts: [{
            functionResponse: {
              name: call.name,
              response: { result: executionMessage }
            }
          }]
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
