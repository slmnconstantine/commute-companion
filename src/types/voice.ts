export type AssistantState = 'idle' | 'recording' | 'transcribing' | 'thinking' | 'confirming' | 'executing' | 'speaking' | 'error';

export interface AssistantCommand {
  type: 'SEARCH_RIDES' | 'SUMMARIZE_ACTIVITY' | 'DRAFT_MESSAGE' | 'DRAFT_COMMUNITY_POST' | 'DELETE_POSTS' | 'PREPARE_BOOKING' | 'ACCEPT_BOOKING' | 'PREPARE_RIDE_POST' | 'NAVIGATE' | 'CLARIFY' | 'NOOP' | 'SET_ROUTE';
  params: Record<string, any>;
  spokenReply: string;
  requiresConfirmation: boolean;
  transcript: string;
}

export interface VoiceMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}
