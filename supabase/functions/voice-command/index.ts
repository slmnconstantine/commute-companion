import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define the Assistant Command structure
interface AssistantCommand {
  type: 'SEARCH_RIDES' | 'SUMMARIZE_ACTIVITY' | 'DRAFT_MESSAGE' | 'DRAFT_COMMUNITY_POST' | 'DELETE_POSTS' | 'PREPARE_BOOKING' | 'ACCEPT_BOOKING' | 'PREPARE_RIDE_POST' | 'NAVIGATE' | 'CLARIFY' | 'NOOP';
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
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not set');
    }

    const { audioBase64, context } = await req.json();

    if (!audioBase64) {
      throw new Error('Missing audioBase64 payload');
    }

    // 1. Convert base64 to File for OpenAI Whisper API
    const byteCharacters = atob(audioBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'audio/m4a' });
    const formData = new FormData();
    formData.append('file', blob, 'audio.m4a');
    formData.append('model', Deno.env.get('AI_TRANSCRIBE_MODEL') || 'whisper-large-v3');
    formData.append('language', 'en'); // 'en' handles Taglish reasonably well

    // 2. Transcribe Audio using Groq
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

    const { text: transcript } = await transcribeRes.json();
    console.log('Transcript:', transcript);

    if (!transcript || transcript.trim().length === 0) {
      return new Response(JSON.stringify({
        type: 'NOOP',
        params: {},
        spokenReply: 'I didn\'t catch that. Could you repeat?',
        requiresConfirmation: false,
        transcript: ''
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 3. Intent Parsing with GPT-4o-mini
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

App Context:
User Role: ${context.role}
Active Route: ${context.activeRoute ? context.activeRoute.origin_label + ' to ' + context.activeRoute.destination_label : 'None'}
Current Screen: ${context.currentScreen}
Current Date/Time: ${new Date().toISOString()}
Selected Trip ID: ${context.selectedTripId || 'None'}
Selected Chat Room ID: ${context.selectedChatRoomId || 'None'}

Return ONLY a JSON object matching this TypeScript interface exactly:
{
  "type": "SEARCH_RIDES" | "SUMMARIZE_ACTIVITY" | "DRAFT_MESSAGE" | "DRAFT_COMMUNITY_POST" | "DELETE_POSTS" | "PREPARE_BOOKING" | "ACCEPT_BOOKING" | "PREPARE_RIDE_POST" | "NAVIGATE" | "CLARIFY" | "NOOP",
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
          { role: 'user', content: `User said: "${transcript}"` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      })
    });

    if (!chatRes.ok) {
      throw new Error(`Groq Chat Error: ${chatRes.status}`);
    }

    const chatData = await chatRes.json();
    const commandRaw = JSON.parse(chatData.choices[0].message.content);
    
    const finalResponse: AssistantCommand = {
      type: commandRaw.type || 'NOOP',
      params: commandRaw.params || {},
      spokenReply: commandRaw.spokenReply || 'Sorry, something went wrong.',
      requiresConfirmation: !!commandRaw.requiresConfirmation,
      transcript
    };

    return new Response(JSON.stringify(finalResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Voice Assistant Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
