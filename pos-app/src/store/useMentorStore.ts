import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { executeMentorAgent } from '@/services/agent/agentService';
import { useLifeMapStore } from './useLifeMapStore';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  statusLog?: string[];
  timestamp: number;
}

export interface MentorSuggestion {
  id: string;
  description: string;
  actionType: 'add_subnode' | 'add_initiative' | 'add_task';
  payload: {
    parentId: string;
    label: string;
    text?: string;
  };
}

interface MentorState {
  messages: ChatMessage[];
  activeCritique: string;
  balanceRatios: { label: string; count: number; percentage: number }[];
  suggestions: MentorSuggestion[];
  isGenerating: boolean;
  isAuditing: boolean;
  currentStatus: string;
  
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
  runAudit: () => Promise<void>;
  applySuggestion: (suggestionId: string) => Promise<void>;
}

export const useMentorStore = create<MentorState>()(
  persist(
    (set, get) => ({
      messages: [
        {
          id: 'welcome',
          role: 'assistant',
          text: "Hello Aamir. I am your Personal Lifemap Mentor. I have analyzed your pillars, threads, initiatives, and execution nodes. I am here to help you strategize, prioritize, call out stagnation, and ensure you make continuous progress in life. Ask me anything about your roadmap, what you should focus on today, or ask me to review your balance.",
          timestamp: Date.now()
        }
      ],
      activeCritique: "No critique generated yet. Click 'Run Life Map Audit' to analyze your focus distribution.",
      balanceRatios: [],
      suggestions: [],
      isGenerating: false,
      isAuditing: false,
      currentStatus: '',

      sendMessage: async (text) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        const userMsg: ChatMessage = {
          id: `msg-user-${Date.now()}`,
          role: 'user',
          text: trimmed,
          timestamp: Date.now()
        };

        set(state => ({
          messages: [...state.messages, userMsg],
          isGenerating: true,
          currentStatus: 'Mentor thinking...'
        }));

        try {
          const genAI = new GoogleGenerativeAI(API_KEY || '');


          const response = await executeMentorAgent(
            genAI,
            trimmed,
            (status) => set({ currentStatus: status })
          );

          const assistantMsg: ChatMessage = {
            id: `msg-mentor-${Date.now()}`,
            role: 'assistant',
            text: response.text,
            statusLog: response.statusLog,
            timestamp: Date.now()
          };

          set(state => ({
            messages: [...state.messages, assistantMsg],
            isGenerating: false,
            currentStatus: ''
          }));

          // Trigger a silent audit update in the background when the map changes
          if (response.statusLog && response.statusLog.length > 0) {
            get().runAudit();
          }

        } catch (error: any) {
          console.error("Mentor error:", error);
          const errorMsg: ChatMessage = {
            id: `msg-error-${Date.now()}`,
            role: 'assistant',
            text: `⚠️ Mentor connection error: ${error.message || "Failed to process strategy."}`,
            timestamp: Date.now()
          };

          set(state => ({
            messages: [...state.messages, errorMsg],
            isGenerating: false,
            currentStatus: ''
          }));
        }
      },

      clearMessages: () => set({
        messages: [
          {
            id: 'welcome',
            role: 'assistant',
            text: "Hello Aamir. I am your Personal Lifemap Mentor. I have analyzed your pillars, threads, initiatives, and execution nodes. I am here to help you strategize, prioritize, call out stagnation, and ensure you make continuous progress in life. Ask me anything about your roadmap, what you should focus on today, or ask me to review your balance.",
            timestamp: Date.now()
          }
        ]
      }),

      runAudit: async () => {
        if (!API_KEY) return;
        set({ isAuditing: true });

        try {
          const { nodes } = useLifeMapStore.getState();
          const outlineText = nodes.map(n => {
            const parent = n.data?.parentId ? ` (parent ID: "${n.data.parentId}")` : '';
            return `- [${n.type.toUpperCase()}] ID: "${n.id}", Label: "${n.data?.label}"${parent}`;
          }).join('\n');

          const genAI = new GoogleGenerativeAI(API_KEY);
          
          // Request structured JSON audit from Gemini 2.5 Flash for speed & cost
          const auditorModel = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: SchemaType.OBJECT,
                properties: {
                  activeCritique: {
                    type: SchemaType.STRING,
                    description: "High-level professional strategic audit critique. Highlight imbalances, stagnation, or neglect. Be direct and structured."
                  },
                  balanceRatios: {
                    type: SchemaType.ARRAY,
                    items: {
                      type: SchemaType.OBJECT,
                      properties: {
                        label: { type: SchemaType.STRING, description: "Name of the Pillar (Health, Career, Growth, Relationships, Masters)" },
                        count: { type: SchemaType.INTEGER, description: "Number of active nodes under this pillar" }
                      },
                      required: ["label", "count"]
                    }
                  },
                  suggestions: {
                    type: SchemaType.ARRAY,
                    description: "List of 3 concrete, actionable changes to improve the life map structure.",
                    items: {
                      type: SchemaType.OBJECT,
                      properties: {
                        description: { type: SchemaType.STRING, description: "Mentor explanation of what to add/edit and why." },
                        actionType: { type: SchemaType.STRING, description: "Type of action to perform. Must be one of: add_subnode, add_initiative, add_task" },
                        payload: {
                          type: SchemaType.OBJECT,
                          properties: {
                            parentId: { type: SchemaType.STRING, description: "Target ID of the existing parent node." },
                            label: { type: SchemaType.STRING, description: "Label/Title for the new node (required for add_subnode/add_initiative)." },
                            text: { type: SchemaType.STRING, description: "Task text (required for add_task)." }
                          },
                          required: ["parentId"]
                        }
                      },
                      required: ["description", "actionType", "payload"]
                    }
                  }
                },
                required: ["activeCritique", "balanceRatios", "suggestions"]
              }
            }
          });

          const prompt = `
You are the auditing engine for Aamir's Personal Lifemap Mentor.
Analyze his current Life Map structure and output a strict JSON audit.

Here is the current Life Map tree structure:
${outlineText || "No nodes exist."}

Rules:
1. Count the density of nodes (threads, initiatives, subnodes) under each of the 5 pillars (Health, Career, Personal Growth/Growth, Relationships, Masters).
2. Write a highly strategic, structured, and challenging critique. Point out what Aamir is ignoring, where projects are cluttered, or if there is no actionable detail.
3. Suggest exactly 3 concrete roadmap improvements (creating initiatives, subnodes, or tasks). Provide the exact parent node IDs from the outline.
`;

          const result = await auditorModel.generateContent(prompt);
          const responseText = result.response.text();
          const auditData = JSON.parse(responseText);

          // Calculate focus percentages
          const totalNodesCount = auditData.balanceRatios.reduce((acc: number, val: any) => acc + val.count, 0) || 1;
          const processedRatios = auditData.balanceRatios.map((item: any) => ({
            label: item.label,
            count: item.count,
            percentage: Math.round((item.count / totalNodesCount) * 100)
          }));

          const mappedSuggestions = auditData.suggestions.map((s: any, idx: number) => ({
            id: `sug-${Date.now()}-${idx}`,
            description: s.description,
            actionType: s.actionType,
            payload: s.payload
          }));

          set({
            activeCritique: auditData.activeCritique,
            balanceRatios: processedRatios,
            suggestions: mappedSuggestions,
            isAuditing: false
          });

        } catch (error) {
          console.error("Audit error:", error);
          set({ isAuditing: false });
        }
      },

      applySuggestion: async (suggestionId) => {
        const state = get();
        const sug = state.suggestions.find(s => s.id === suggestionId);
        if (!sug) return;

        try {
          const store = useLifeMapStore.getState();
          const { actionType, payload } = sug;

          if (actionType === 'add_subnode') {
            await store.addSubnode(payload.parentId, payload.label);
          } else if (actionType === 'add_initiative') {
            await store.addInitiative(payload.parentId, payload.label);
          } else if (actionType === 'add_task') {
            await store.addTaskToNode(payload.parentId, payload.text || payload.label);
          }

          // Remove the applied suggestion from the active list
          set(state => ({
            suggestions: state.suggestions.filter(s => s.id !== suggestionId)
          }));

          // Trigger a background re-audit to update charts
          get().runAudit();

        } catch (error) {
          console.error("Failed to apply mentor suggestion:", error);
        }
      }
    }),
    {
      name: 'pos-mentor-messages-storage-v1',
      partialize: (state) => ({
        messages: state.messages,
        activeCritique: state.activeCritique,
        balanceRatios: state.balanceRatios,
        suggestions: state.suggestions
      })
    }
  )
);
