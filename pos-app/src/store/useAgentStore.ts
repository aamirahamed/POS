import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { executeAgentCommand } from '@/services/agent/agentService';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  statusLog?: string[];
  timestamp: number;
}

interface AgentState {
  messages: ChatMessage[];
  isOpen: boolean;
  isGenerating: boolean;
  currentStatus: string;
  setIsOpen: (isOpen: boolean) => void;
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
}

export const useAgentStore = create<AgentState>()(
  persist(
    (set, get) => ({
      messages: [
        {
          id: 'welcome',
          role: 'assistant',
          text: "Hello Aamir! I am your POS Assistant. I can help you organize your Life Map (pillars, threads, initiatives, and subnodes) and manage your Shopping List. Try typing: *'Add 2 packs of coffee to shopping list'* or *'Add Learn Figma under Career pillar'*.",
          timestamp: Date.now()
        }
      ],
      isOpen: false,
      isGenerating: false,
      currentStatus: '',

      setIsOpen: (isOpen) => set({ isOpen }),

      sendMessage: async (text) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        const userMsg: ChatMessage = {
          id: `msg-user-${Date.now()}`,
          role: 'user',
          text: trimmed,
          timestamp: Date.now()
        };

        // Add user message to log immediately
        set(state => ({
          messages: [...state.messages, userMsg],
          isGenerating: true,
          currentStatus: 'Orchestrating...'
        }));

        try {
          // Prepare chat history (filtered to relevant fields)
          const historyToSend = get().messages
            .filter(m => m.id !== 'welcome')
            .map(m => ({
              role: m.role,
              text: m.text
            }));

          // Run agent loop
          const response = await executeAgentCommand(
            trimmed,
            historyToSend,
            (status) => set({ currentStatus: status })
          );

          const assistantMsg: ChatMessage = {
            id: `msg-agent-${Date.now()}`,
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

        } catch (error: any) {
          console.error("Agent error:", error);
          const errorMsg: ChatMessage = {
            id: `msg-error-${Date.now()}`,
            role: 'assistant',
            text: `⚠️ Error: ${error.message || "Failed to process request."}`,
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
            text: "Hello Aamir! I am your POS Assistant. I can help you organize your Life Map (pillars, threads, initiatives, and subnodes) and manage your Shopping List. Try typing: *'Add 2 packs of coffee to shopping list'* or *'Add Learn Figma under Career pillar'*.",
            timestamp: Date.now()
          }
        ]
      })
    }),
    {
      name: 'pos-agent-messages-storage-v1',
      partialize: (state) => ({ messages: state.messages }) // Only persist messages, not open/loading state
    }
  )
);
