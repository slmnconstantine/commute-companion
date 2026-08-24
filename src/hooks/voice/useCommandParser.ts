import { supabase } from '@/lib/supabase';
import { AssistantCommand } from '@/types/voice';
import { resolveStatusTag, getStatusTagLabel } from '@/utils/statusTag';

interface IntentPattern {
  pattern: RegExp;
  command: AssistantCommand['type'];
  params: (match: RegExpMatchArray, context?: any) => Record<string, any>;
  spokenReply: (match: RegExpMatchArray, params: Record<string, any>) => string;
  requiresConfirmation: boolean;
}

// Local offline fallback patterns (used only when network is unavailable)
const OFFLINE_FALLBACK_INTENTS: IntentPattern[] = [
  {
    pattern: /^(?:hello|hi|hey|kamusta|kumusta|mabuhay)[\s!.,?]*$/i,
    command: 'NOOP',
    params: () => ({}),
    spokenReply: () => "Hello! How can I help with your commute today?",
    requiresConfirmation: false
  },
  {
    pattern: /^(?:help|commands|what\s+can\s+you\s+do)[\s!.,?]*$/i,
    command: 'NOOP',
    params: () => ({}),
    spokenReply: () => "You can ask me to search rides, post a new ride, view your activity, navigate to different screens, or delete posts.",
    requiresConfirmation: false
  },
  {
    pattern: /(?:delete|remove|clear)\s+(?:all\s+(?:of\s+)?|any\s+|the\s+|this\s+)?(?:my\s+)?(?:community\s+|hub\s+)?(?:posts?|updates?|messages?|status)/i,
    command: 'DELETE_POSTS',
    params: () => ({}),
    spokenReply: () => "Do you want me to delete your posts from the community hub?",
    requiresConfirmation: true
  },
  {
    pattern: /(?:go\s+to|navigate\s+to|show|open|take\s+me\s+to)\s+(home|hub|rides|activity|community|profile|settings|set\s+route)/i,
    command: 'NAVIGATE',
    params: (match) => {
      let screen = match[1].toLowerCase().replace(/\s+/g, '');
      if (screen === 'setroute') screen = 'set-route';
      return { screen };
    },
    spokenReply: (match, params) => `Navigating to the ${params.screen} screen.`,
    requiresConfirmation: false
  },
  {
    pattern: /(?:show|find|search|look\s+for)\s+(?:for\s+)?rides/i,
    command: 'SEARCH_RIDES',
    params: () => ({}),
    spokenReply: () => "Sure, opening the ride search screen.",
    requiresConfirmation: false
  },
  {
    pattern: /(?:post|create|offer)\s+(?:a\s+)?ride/i,
    command: 'PREPARE_RIDE_POST',
    params: () => ({}),
    spokenReply: () => "Let's create a new ride post.",
    requiresConfirmation: false
  },
  {
    pattern: /(?:summarize|show|my)\s+(?:upcoming\s+)?(?:trips|bookings|activity)/i,
    command: 'SUMMARIZE_ACTIVITY',
    params: () => ({}),
    spokenReply: () => "Here is a summary of your activity.",
    requiresConfirmation: false
  }
];

function matchOfflineIntent(text: string, context: any): AssistantCommand | null {
  const cleanText = text.trim();
  for (const intent of OFFLINE_FALLBACK_INTENTS) {
    const match = cleanText.match(intent.pattern);
    if (match) {
      const params = intent.params(match, context);
      const spokenReply = intent.spokenReply(match, params);
      return {
        type: intent.command,
        params,
        spokenReply,
        requiresConfirmation: intent.requiresConfirmation,
        transcript: text
      };
    }
  }
  return null;
}

export function useCommandParser() {
  const parseCommand = async (text: string, context: any, profile: any): Promise<AssistantCommand> => {
    // 1. PRIMARY: Use the AI Model (Groq LLM) for natural language understanding
    try {
      const { data, error } = await supabase.functions.invoke('voice-command', {
        body: {
          action: 'parse',
          transcript: text,
          context: {
            userId: profile?.id,
            role: profile?.role,
            currentScreen: context?.currentScreen || 'home',
            activeRoute: context?.activeRoute,
            selectedTripId: context?.selectedTripId,
            selectedChatRoomId: context?.selectedChatRoomId,
            ...context,
          }
        }
      });

      if (!error && data && !data.error && data.spokenReply) {
        return {
          type: data.type || 'NOOP',
          params: data.params || {},
          spokenReply: data.spokenReply,
          requiresConfirmation: Boolean(data.requiresConfirmation),
          transcript: text,
        };
      } else if (data?.error) {
        console.warn('AI Model returned message:', data.error);
      }
    } catch (err) {
      console.warn('AI Model invocation encountered error, checking offline intent:', err);
    }

    // 2. SECONDARY: Offline regex matching if AI network request fails
    const offlineMatch = matchOfflineIntent(text, context);
    if (offlineMatch) {
      return offlineMatch;
    }

    // 3. Fallback for unmapped speech when offline
    return {
      type: 'NOOP',
      params: {},
      spokenReply: `I heard: "${text}". How can I help you with your commute?`,
      requiresConfirmation: false,
      transcript: text
    };
  };

  return { parseCommand };
}
