import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { executeMentorAgent } from '@/services/agent/agentService';
import { useLifeMapStore } from './useLifeMapStore';
import { supabase } from '@/lib/supabase';

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
  actionType: 'add_milestone' | 'add_project' | 'add_task' | 'add_subnode' | 'add_initiative';
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
  profileMemory: string;
  
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
  runAudit: () => Promise<void>;
  applySuggestion: (suggestionId: string) => Promise<void>;
  loadHistoryFromDB: () => Promise<void>;
  loadProfileMemory: () => Promise<void>;
  updateProfileMemory: (content: string) => Promise<void>;
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
      profileMemory: '',

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

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('mentor_chat_history').insert({
            id: userMsg.id,
            user_id: user.id,
            role: userMsg.role,
            text: userMsg.text,
            status_log: []
          });
        }

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

          if (user) {
            await supabase.from('mentor_chat_history').insert({
              id: assistantMsg.id,
              user_id: user.id,
              role: assistantMsg.role,
              text: assistantMsg.text,
              status_log: assistantMsg.statusLog || []
            });
          }

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

      clearMessages: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('mentor_chat_history').delete().eq('user_id', user.id);
        }
        set({
          messages: [
            {
              id: 'welcome',
              role: 'assistant',
              text: "Hello Aamir. I am your Personal Lifemap Mentor. I have analyzed your pillars, threads, initiatives, and execution nodes. I am here to help you strategize, prioritize, call out stagnation, and ensure you make continuous progress in life. Ask me anything about your roadmap, what you should focus on today, or ask me to review your balance.",
              timestamp: Date.now()
            }
          ]
        });
      },

      loadHistoryFromDB: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase
          .from('mentor_chat_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });
        
        if (error) {
          console.error("Error loading chat history:", error);
          return;
        }

        if (data && data.length > 0) {
          const formatted: ChatMessage[] = data.map((row: any) => ({
            id: row.id,
            role: row.role,
            text: row.text,
            statusLog: row.status_log || [],
            timestamp: new Date(row.created_at).getTime()
          }));
          
          const hasWelcome = formatted.some(m => m.id === 'welcome');
          const finalMessages = hasWelcome ? formatted : [
            {
              id: 'welcome',
              role: 'assistant',
              text: "Hello Aamir. I am your Personal Lifemap Mentor. I have analyzed your pillars, threads, initiatives, and execution nodes. I am here to help you strategize, prioritize, call out stagnation, and ensure you make continuous progress in life. Ask me anything about your roadmap, what you should focus on today, or ask me to review your balance.",
              timestamp: Date.now()
            },
            ...formatted
          ] as ChatMessage[];

          set({ messages: finalMessages });
        }
      },

      loadProfileMemory: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase
          .from('mentor_profile_memory')
          .select('content')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error) {
          console.error("Error loading profile memory:", error);
          return;
        }
        if (data) {
          set({ profileMemory: data.content });
        }
      },

      updateProfileMemory: async (content: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { error } = await supabase
          .from('mentor_profile_memory')
          .upsert({ user_id: user.id, content, updated_at: new Date().toISOString() });
        if (error) {
          console.error("Error updating profile memory:", error);
          return;
        }
        set({ profileMemory: content });
      },

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
          
          const auditSchema: any = {
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
                    actionType: { type: SchemaType.STRING, description: "Type of action to perform. Must be one of: add_milestone, add_project, add_task" },
                    payload: {
                      type: SchemaType.OBJECT,
                      properties: {
                        parentId: { type: SchemaType.STRING, description: "Target ID of the existing parent node." },
                        label: { type: SchemaType.STRING, description: "Label/Title for the new node (required for add_milestone/add_project)." },
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
          };

          const prompt = `
You are the auditing engine for Aamir's Personal Lifemap Mentor.
Analyze his current Life Map structure and output a strict JSON audit.

Here is the current Life Map tree structure:
${outlineText || "No nodes exist."}

Rules:
1. Count the density of nodes (projects, milestones) under each of the domains (Health & Lifestyle, Career, Personal Growth, Relationships, Masters).
2. Write a highly strategic, structured, and challenging critique. Point out what Aamir is ignoring, where projects are cluttered, or if there is no actionable detail.
3. Suggest exactly 3 concrete roadmap improvements (creating projects, milestones, or tasks). Provide the exact parent node IDs from the outline.
`;

          let result;
          try {
            const auditorModel = genAI.getGenerativeModel({
              model: "gemini-2.5-flash",
              generationConfig: {
                responseMimeType: "application/json",
                responseSchema: auditSchema
              }
            });
            result = await auditorModel.generateContent(prompt);
          } catch (e) {
            console.warn("Audit failed with gemini-2.5-flash, trying gemini-flash-latest", e);
            const auditorModel = genAI.getGenerativeModel({
              model: "gemini-flash-latest",
              generationConfig: {
                responseMimeType: "application/json",
                responseSchema: auditSchema
              }
            });
            result = await auditorModel.generateContent(prompt);
          }
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

          if (actionType === 'add_subnode' || actionType === 'add_milestone') {
            await store.addMilestone(payload.parentId, payload.label);
          } else if (actionType === 'add_initiative' || actionType === 'add_project') {
            await store.addProject(payload.parentId, payload.label);
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
        suggestions: state.suggestions,
        profileMemory: state.profileMemory
      })
    }
  )
);
