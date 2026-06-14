import { supabase } from '@/lib/supabase';
import { AssistantCommand } from '@/types/voice';

interface IntentPattern {
  pattern: RegExp;
  command: AssistantCommand['type'];
  params: (match: RegExpMatchArray, context?: any) => Record<string, any>;
  spokenReply: (match: RegExpMatchArray, params: Record<string, any>) => string;
  requiresConfirmation: boolean;
}

const INTENTS: IntentPattern[] = [
  {
    pattern: /(?:go\s+to|navigate\s+to|show|open|take\s+me\s+to)\s+(home|hub|rides|activity|community|profile|set\s+route)/i,
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
    pattern: /(?:show|find|search)\s+(?:for\s+)?rides/i,
    command: 'SEARCH_RIDES',
    params: () => ({}),
    spokenReply: () => "Sure, opening the ride search screen.",
    requiresConfirmation: false
  },
  {
    pattern: /(?:summarize|show|my)\s+(?:upcoming\s+)?(?:trips|bookings|activity)/i,
    command: 'SUMMARIZE_ACTIVITY',
    params: () => ({}),
    spokenReply: () => "Here is a summary of your activity.",
    requiresConfirmation: false
  },
  {
    pattern: /(?:accept|confirm)\s+(?:the\s+)?(?:ride|booking)(?:\s+for\s+([a-zA-Z\s]+))?/i,
    command: 'ACCEPT_BOOKING',
    params: (match) => ({ commuter_name: match[1]?.trim() || null }),
    spokenReply: (match, params) => params.commuter_name 
      ? `Accepting the booking request for ${params.commuter_name}.`
      : "Accepting the booking request.",
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
    pattern: /(?:set|change|update)\s+(?:my\s+)?route(?:\s+from\s+([a-zA-Z0-9\s,]+))?(?:\s+to\s+([a-zA-Z0-9\s,]+))?/i,
    command: 'SET_ROUTE',
    params: (match) => ({
      origin: match[1]?.trim() || null,
      destination: match[2]?.trim() || null
    }),
    spokenReply: (match, params) => {
      if (params.origin && params.destination) {
        return `Setting your route from ${params.origin} to ${params.destination}.`;
      } else if (params.destination) {
        return `Setting your destination to ${params.destination}.`;
      }
      return "Opening the route setting screen.";
    },
    requiresConfirmation: false
  }
];

export function matchClientIntent(text: string, context: any): AssistantCommand | null {
  const cleanText = text.trim();
  for (const intent of INTENTS) {
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
    // 1. Try local regex match first
    const localMatch = matchClientIntent(text, context);
    if (localMatch) {
      return localMatch;
    }

    // 2. Fallback to Groq Llama NLU
    const { data, error } = await supabase.functions.invoke('voice-command', {
      body: {
        action: 'parse',
        transcript: text,
        context: {
          userId: profile?.id,
          role: profile?.role,
          ...context,
        }
      }
    });

    if (error) throw error;
    return data as AssistantCommand;
  };

  return { parseCommand };
}
