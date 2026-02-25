import { GoogleGenAI } from "https://esm.sh/@google/genai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { session_config, transcript } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const difficulty = session_config?.difficulty || "medium";
    const interviewType = session_config?.interview_type || "behavioral";
    const company = session_config?.company || "the company";
    const role = session_config?.role_title || "the role";
    const jd = session_config?.job_description || "";

    const difficultyPrompt = {
      easy: `You are a warm, supportive interviewer. Help the candidate succeed. If their answer is vague, gently guide them: "Could you share a concrete example?" Encourage STAR method. Give small hints.`,
      medium: `You are a professional, neutral interviewer. Ask probing follow-ups when answers lack metrics, tradeoffs, or specifics. Minimal encouragement, more probing.`,
      hard: `You are a strict, blunt-but-professional interviewer on a skeptical panel. You are NOT agreeable by default. Call out weak answers directly: "That's vague. Give me a specific example and measurable impact." "You didn't answer the question. Start with the outcome, then the steps." "What was YOUR role exactly? What did YOU do?" Push for numbers, edge cases, tradeoffs. Reject hand-wavy claims.`,
    }[difficulty as "easy" | "medium" | "hard"] || "";

    const transcriptText = transcript
      .map((t: { speaker: string; text: string }) => `${t.speaker}: ${t.text}`)
      .join("\n");

    const systemPrompt = `You are conducting a ${interviewType} interview for ${role} at ${company}.
${difficultyPrompt}

${jd ? `Job Description: ${jd}` : ""}

Rules:
- Ask ONE question at a time
- Questions must be grounded in the conversation context
- After each answer, decide follow-up based on gaps: vagueness, missing metrics, unclear ownership, contradictions, shallow detail
- For technical interviews: ask for complexity, edge cases, alternatives
- Do NOT repeat questions already asked
- Return ONLY the next question text, nothing else`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Here is the interview transcript so far:\n\n${transcriptText}\n\nGenerate the next interviewer question.`,
        config: {
            systemInstruction: systemPrompt,
        }
    });

    const question = response.text?.trim() || "Can you tell me more about that?";

    return new Response(JSON.stringify({ question }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-question error:", e);
    const status = e.status || 500;
    
    if (status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", question: "Can you elaborate on your experience with that?" }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
