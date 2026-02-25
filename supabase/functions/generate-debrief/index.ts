import { GoogleGenAI } from "https://esm.sh/@google/genai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session, transcript_turns } = await req.json();

    // @ts-ignore - Deno global is injected at runtime in Supabase Edge Functions
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const turns = transcript_turns || [];
    const turnCount = turns.length;

    if (turnCount < 2) {
      return new Response(
        JSON.stringify({
          error: "Not enough transcript data",
          debrief: null,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const transcriptText = turns
      .map(
        (t: { timestamp_start: number; speaker: string; text: string }) =>
          `[${Math.round(t.timestamp_start)}s] ${t.speaker}: ${t.text}`
      )
      .join("\n");

    const durationActual =
      session?.duration_actual ||
      Math.round(
        (turns[turns.length - 1]?.timestamp_start || 0) / 60
      );

    const _sessionStatus =
      session?.status === "ended_early" ||
      session?.status === "debrief_generating"
        ? durationActual < (session?.duration_planned || 30)
          ? "ended_early"
          : "completed"
        : "completed";

    const isShortSession = turnCount < 6;

    const systemPrompt = `
You are an expert interview coach AI. Analyze the following interview transcript and produce a comprehensive debrief.

${isShortSession ? "NOTE: This was a short session. Score based on available data but note lower confidence." : ""}

You MUST return ONLY a valid JSON object matching the exact format.
NO markdown. NO explanation. ONLY JSON.

All scores must be between 1-100. NEVER 0.
`;

    // Ensure we define the JSON Schema exactly as expected by the frontend
    const responseSchema = {
      type: "OBJECT",
      properties: {
        session_summary: {
          type: "OBJECT",
          properties: {
            session_status: { type: "STRING" },
            planned_duration_minutes: { type: "INTEGER" },
            actual_duration_minutes: { type: "INTEGER" },
            role_guess: { type: "STRING" },
            company: { type: "STRING" },
            interview_type: { type: "STRING" },
            difficulty: { type: "STRING" },
            topics_discussed: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        topic: { type: "STRING" },
                        notes: { type: "ARRAY", items: { type: "STRING" } }
                    }
                }
            }
          }
        },
        scores: {
          type: "OBJECT",
          properties: {
            overall: { type: "INTEGER" },
            communication_clarity: { type: "INTEGER" },
            structure_star: { type: "INTEGER" },
            role_fit: { type: "INTEGER" },
            confidence_delivery: { type: "INTEGER" },
            technical_depth: { type: "INTEGER" }
          }
        },
        strengths: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              evidence: {
                  type: "OBJECT",
                  properties: { timestamp_start: { type: "STRING" }, timestamp_end: { type: "STRING" }, quote: { type: "STRING" } }
              },
              why_it_matters: { type: "STRING" }
            }
          }
        },
        improvements: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                issue: { type: "STRING" },
                evidence: {
                    type: "OBJECT",
                    properties: { timestamp_start: { type: "STRING" }, timestamp_end: { type: "STRING" }, quote: { type: "STRING" } }
                },
                better_answer_example: { type: "STRING" },
                micro_exercise: { type: "STRING" }
              }
            }
        },
        delivery_metrics: {
          type: "OBJECT",
          properties: {
            filler_word_estimate: { type: "INTEGER" },
            pace_wpm_estimate: { type: "INTEGER" },
            long_pause_estimate: { type: "INTEGER" }
          }
        },
        moments_that_mattered: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              label: { type: "STRING" },
              timestamp_start: { type: "STRING" },
              timestamp_end: { type: "STRING" },
              reason: { type: "STRING" }
            }
          }
        },
        practice_plan_7_days: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              day: { type: "INTEGER" },
              focus: { type: "STRING" },
              tasks: { type: "ARRAY", items: { type: "STRING" } },
              time_minutes: { type: "INTEGER" }
            }
          }
        },
        notes_if_low_data: { type: "STRING" }
      }
    };

    console.log("Calling Google Gen AI SDK...");
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Interview transcript:\n\n${transcriptText}`,
        config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        }
    });

    const content = response.text;

    if (!content) {
      throw new Error("No content returned from AI");
    }

    let debrief;

    try {
      debrief = JSON.parse(content);
    } catch {
      throw new Error("Invalid JSON from AI");
    }

    // Ensure no score is 0
    if (debrief?.scores) {
      for (const key of Object.keys(debrief.scores)) {
        if (debrief.scores[key] === 0) {
          debrief.scores[key] =
            Math.floor(Math.random() * 30) + 40; // 40-70 fallback
        }
      }
    }

    return new Response(JSON.stringify({ debrief }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (e) {
    console.error("generate-debrief error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});