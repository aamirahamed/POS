import { GoogleGenerativeAI, SchemaType, Schema } from "@google/generative-ai";
import { LifeMapNode } from "@/types/lifemap";

// This will use the key from your environment variables
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export interface OSAction {
    actionType: 'shopping' | 'reminder' | 'lifemap' | 'inbox' | 'question';
    reply: string;
    // For Shopping
    shoppingItem?: string;
    // For Reminders
    reminderText?: string;
    // For Life Map
    lifeMapAction?: {
        typeToCreate: 'pillar' | 'thread' | 'initiative' | 'subnode' | 'task';
        name: string;
        parentName?: string; // name of the target parent to attach to
    };
}

export async function processUserCommand(
    prompt: string, 
    existingNodes: LifeMapNode[]
): Promise<OSAction> {
    if (!API_KEY) {
        throw new Error("Gemini API key is not configured.");
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Map the current nodes to a lightweight string for the AI context
    const graphContext = existingNodes.map(n => 
        `[${n.type.toUpperCase()}] ${n.data.label} (ID: ${n.id})`
    ).join('\n');

    const systemInstruction = `
You are the intelligent orchestration layer for a Personal Operating System.
Your job is to parse the user's natural language request and output a STRICT JSON object determining the action.

The user has the following Life Map structure:
${graphContext || "No nodes currently exist."}

Allowed actionTypes:
- "shopping": User wants to buy or get something.
- "reminder": User wants to be reminded of something.
- "lifemap": User wants to create a goal, project, task, or area of life.
- "inbox": User had a random thought that doesn't fit neatly.
- "question": The request is ambiguous and you MUST ask a clarifying question. Keep the 'reply' short.

If "shopping", provide "shoppingItem".
If "reminder", provide "reminderText".
If "lifemap", provide "lifeMapAction" with:
  - typeToCreate: "pillar" | "thread" | "initiative" | "subnode" | "task"
  - name: the name of the new item
  - parentName: the exact name of the existing node to attach this to (omit if creating a pillar)

Your "reply" field should be a short, actionable, calm confirmation (e.g., "✓ Added Bananas to Shopping List"). DO NOT be overly chatty.
`;

    // Define the schema so Gemini strictly returns the JSON we need
    const schema: Schema = {
        type: SchemaType.OBJECT,
        properties: {
            actionType: { type: SchemaType.STRING, description: "One of: shopping, reminder, lifemap, inbox, question" },
            reply: { type: SchemaType.STRING, description: "A short, calm confirmation of the action." },
            shoppingItem: { type: SchemaType.STRING, description: "The item to buy, if actionType is shopping." },
            reminderText: { type: SchemaType.STRING, description: "The reminder text, if actionType is reminder." },
            lifeMapAction: {
                type: SchemaType.OBJECT,
                properties: {
                    typeToCreate: { type: SchemaType.STRING, description: "pillar, thread, initiative, subnode, or task" },
                    name: { type: SchemaType.STRING, description: "Name of the item to create" },
                    parentName: { type: SchemaType.STRING, description: "Name of the parent node to attach to" },
                },
                required: ["typeToCreate", "name"]
            }
        },
        required: ["actionType", "reply"]
    };

    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        systemInstruction,
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema,
            temperature: 0.2, // Low temperature for deterministic, reliable routing
        }
    });

    let responseText = result.response.text();
    if (responseText.startsWith('```')) {
        responseText = responseText.replace(/^```(?:json)?/, '').replace(/```$/, '');
    }
    const action: OSAction = JSON.parse(responseText.trim());
    return action;
}
