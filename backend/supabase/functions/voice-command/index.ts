import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting config (in-memory per isolate)
const rateLimits = new Map<string, { count: number, resetAt: number }>();
const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

// Define the Assistant Command structure
interface AssistantCommand {
  type: 'SEARCH_RIDES' | 'SUMMARIZE_ACTIVITY' | 'DRAFT_MESSAGE' | 'DRAFT_COMMUNITY_POST' | 'DELETE_POSTS' | 'PREPARE_BOOKING' | 'ACCEPT_BOOKING' | 'PREPARE_RIDE_POST' | 'NAVIGATE' | 'CLARIFY' | 'NOOP' | 'SET_ROUTE';
  params: Record<string, any>;
  spokenReply: string;
  requiresConfirmation: boolean;
  transcript: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate Limiting Check
    const now = Date.now();
    let limitRecord = rateLimits.get(user.id);
    if (!limitRecord || limitRecord.resetAt < now) {
      limitRecord = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    }
    limitRecord.count++;
    rateLimits.set(user.id, limitRecord);

    if (limitRecord.count > RATE_LIMIT_MAX_REQUESTS) {
      return new Response(JSON.stringify({ error: 'Too Many Requests', message: 'You have exceeded the voice command rate limit. Please try again in a minute.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': Math.ceil((limitRecord.resetAt - now) / 1000).toString() },
      });
    }

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not set');
    }

    const body = await req.json().catch(() => ({}));
    const { action, audioBase64, transcript: clientTranscript, context } = body;

    // Determine the route:
    // 1. Explicit transcribe action, or audioBase64 without context/transcript (transcribe only)
    // 2. Explicit parse action, or transcript with context (NLU only)
    // 3. Legacy: audioBase64 + context (does both transcription and NLU)
    const runTranscribe = action === 'transcribe' || (audioBase64 && !clientTranscript && !context) || (!action && audioBase64 && context);
    const runParse = action === 'parse' || (clientTranscript && context) || (!action && audioBase64 && context);

    let activeTranscript = clientTranscript || '';

    if (runTranscribe) {
      if (!audioBase64) {
        throw new Error('Missing audioBase64 payload for transcription');
      }

      // Convert base64 to File for Groq Whisper API
      const base64Data = audioBase64.replace(/^data:[^;]+;base64,/, "");
      
      // Efficiently convert base64 to Blob using native fetch
      const reqDataUri = `data:audio/m4a;base64,${base64Data}`;
      const response = await fetch(reqDataUri);
      const blob = await response.blob();
      
      // Some APIs require the payload to be a File rather than a Blob
      const file = new File([blob], 'audio.m4a', { type: 'audio/m4a' });
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('model', Deno.env.get('AI_TRANSCRIBE_MODEL') || 'whisper-large-v3');
      formData.append('language', 'en'); // 'en' handles Taglish reasonably well

      // Transcribe Audio using Groq
      const transcribeRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: formData
      });

      if (!transcribeRes.ok) {
        const errorText = await transcribeRes.text();
        console.error('Groq Transcription Error:', errorText);
        throw new Error(`Groq Transcription Error: ${transcribeRes.status}`);
      }

      const transcriptionData = await transcribeRes.json();
      activeTranscript = transcriptionData.text;
      console.log('Transcribed Text:', activeTranscript);

      // If we only wanted transcription, return it now
      if (!runParse) {
        return new Response(JSON.stringify({ transcript: activeTranscript }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (runParse) {
      if (!activeTranscript || activeTranscript.trim().length === 0) {
        return new Response(JSON.stringify({
          type: 'NOOP',
          params: {},
          spokenReply: 'I didn\'t catch that. Could you repeat?',
          requiresConfirmation: false,
          transcript: ''
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (!context) {
        throw new Error('Missing context payload for intent parsing');
      }

      // Intent Parsing with Groq Llama/NLU
      const systemPrompt = `
You are the voice assistant for 'Commute Companion', an app for carpooling and route sharing in the Philippines.
Users will speak to you in English or Taglish.
Map their request to one of the following commands:
1. SEARCH_RIDES: user wants to find a ride. Extracts: destination, origin, date, time.
2. SUMMARIZE_ACTIVITY: user wants to know their upcoming trips or bookings.
3. DRAFT_MESSAGE: user wants to send a chat message. Extracts: message (the actual text), target (who to send it to).
4. DRAFT_COMMUNITY_POST: user wants to post an update to the route community. Extracts: message (the text to post).
5. PREPARE_BOOKING: user wants to book a ride. Extracts: trip_id (if clear), or details about the ride.
6. NAVIGATE: user wants to go to a specific screen (e.g. Activity, Home, Hub, Set Route). Extracts: screen.
7. CLARIFY: the user's intent is unclear or ambiguous. You must ask a single clarifying question. Extracts: question.
8. NOOP: generic chatter, unrecognizable, or outside app scope.
9. DELETE_POSTS: user wants to delete their own updates/posts from the community hub.
10. PREPARE_RIDE_POST: user (driver) wants to post/create a new ride. Extracts: 'time' (HH:MM format), 'date' (YYYY-MM-DD format), 'origin' (pickup location, e.g. "BGC"), 'destination' (drop-off location, e.g. "Makati"). If date is "today" or "tomorrow", convert it to actual date based on current context. If any are not specified, leave empty.
11. ACCEPT_BOOKING: user (driver) wants to accept a pending booking request for their ride. Extracts: commuter_name (if specified).
12. SET_ROUTE: user wants to set, change, or update their route. Extracts: origin, destination.

App Context:
User Role: ${context.role}
Active Route: ${context.activeRoute ? context.activeRoute.origin_label + ' to ' + context.activeRoute.destination_label : 'None'}
Current Screen: ${context.currentScreen}
Current Date/Time: ${new Date().toISOString()}
Selected Trip ID: ${context.selectedTripId || 'None'}
Selected Chat Room ID: ${context.selectedChatRoomId || 'None'}

Return ONLY a JSON object matching this TypeScript interface exactly:
{
  "type": "SEARCH_RIDES" | "SUMMARIZE_ACTIVITY" | "DRAFT_MESSAGE" | "DRAFT_COMMUNITY_POST" | "DELETE_POSTS" | "PREPARE_BOOKING" | "ACCEPT_BOOKING" | "PREPARE_RIDE_POST" | "NAVIGATE" | "CLARIFY" | "NOOP" | "SET_ROUTE",
  "params": { ...any extracted parameters... },
  "spokenReply": "A concise, conversational response (1-2 sentences max) to read aloud to the user.",
  "requiresConfirmation": boolean
}

Rules for requiresConfirmation:
- MUST be true for DRAFT_MESSAGE, DRAFT_COMMUNITY_POST, PREPARE_BOOKING, DELETE_POSTS.
- False for others.

For spokenReply:
- If confirming an action, ask for confirmation (e.g. "Do you want me to post this message?").
- If navigating or searching, say "Sure, looking for rides to BGC."
- Always keep it short.
      `;

      const chatRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: Deno.env.get('AI_INTENT_MODEL') || 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `User said: "${activeTranscript}"` }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1
        })
      });

      if (!chatRes.ok) {
        throw new Error(`Groq Chat Error: ${chatRes.status}`);
      }

      const chatData = await chatRes.json();
      let commandRaw: any = {};
      try {
        commandRaw = JSON.parse(chatData.choices[0].message.content);
      } catch (err) {
        console.warn('Failed to parse Groq LLM response as JSON:', err);
        commandRaw = {
          type: 'NOOP',
          spokenReply: 'Sorry, my brain got a little scrambled. Could you repeat that?'
        };
      }
      const finalResponse: AssistantCommand = {
        type: commandRaw.type || 'NOOP',
        params: commandRaw.params || {},
        spokenReply: commandRaw.spokenReply || 'Sorry, something went wrong.',
        requiresConfirmation: !!commandRaw.requiresConfirmation,
        transcript: activeTranscript
      };

      return new Response(JSON.stringify(finalResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Could not determine action for voice assistant');
  } catch (error: any) {
    console.error('Voice Assistant Error:', error);
    // Return 200 with error property so frontend doesn't throw FunctionsHttpError and can read the error message
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
