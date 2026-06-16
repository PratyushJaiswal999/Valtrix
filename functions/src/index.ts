import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { GoogleGenAI } from "@google/genai";

admin.initializeApp();

export const generateQuestion = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in");

  const { session_config, transcript } = data;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new functions.https.HttpsError("failed-precondition", "GEMINI_API_KEY is not configured.");

  const ai = new GoogleGenAI({ apiKey });

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

  const transcriptText = (transcript || [])
    .map((t: any) => `${t.speaker}: ${t.text}`)
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

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Here is the interview transcript so far:\n\n${transcriptText}\n\nGenerate the next interviewer question.`,
        config: { systemInstruction: systemPrompt }
    });

    return { question: response.text?.trim() || "Can you tell me more about that?" };
  } catch (e: any) {
    console.error(e);
    return { question: "Interesting. Can you elaborate?" };
  }
});

export const generateDebrief = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in");

  const { session, transcript_turns } = data;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new functions.https.HttpsError("failed-precondition", "GEMINI_API_KEY is not configured.");

  const ai = new GoogleGenAI({ apiKey });
  const turns = transcript_turns || [];
  const turnCount = turns.length;

  if (turnCount < 2) {
    throw new functions.https.HttpsError("failed-precondition", "Not enough transcript data");
  }

  const transcriptText = turns
    .map((t: any) => `[${Math.round(t.timestamp_start)}s] ${t.speaker}: ${t.text}`)
    .join("\n");

  const isShortSession = turnCount < 6;

  const systemPrompt = `You are an expert interview coach AI. Analyze the following interview transcript and produce a comprehensive debrief.
${isShortSession ? "NOTE: This was a short session. Score based on available data but note lower confidence." : ""}
You MUST return ONLY a valid JSON object matching the exact format.
NO markdown. NO explanation. ONLY JSON.
All scores must be between 1-100. NEVER 0.`;

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
          topics_discussed: { type: "ARRAY", items: { type: "OBJECT", properties: { topic: { type: "STRING" }, notes: { type: "ARRAY", items: { type: "STRING" } } } } }
        }
      },
      scores: {
        type: "OBJECT",
        properties: { overall: { type: "INTEGER" }, communication_clarity: { type: "INTEGER" }, structure_star: { type: "INTEGER" }, role_fit: { type: "INTEGER" }, confidence_delivery: { type: "INTEGER" }, technical_depth: { type: "INTEGER" } }
      },
      strengths: { type: "ARRAY", items: { type: "OBJECT", properties: { title: { type: "STRING" }, evidence: { type: "OBJECT", properties: { timestamp_start: { type: "STRING" }, timestamp_end: { type: "STRING" }, quote: { type: "STRING" } } }, why_it_matters: { type: "STRING" } } } },
      improvements: { type: "ARRAY", items: { type: "OBJECT", properties: { title: { type: "STRING" }, issue: { type: "STRING" }, evidence: { type: "OBJECT", properties: { timestamp_start: { type: "STRING" }, timestamp_end: { type: "STRING" }, quote: { type: "STRING" } } }, better_answer_example: { type: "STRING" }, micro_exercise: { type: "STRING" } } } },
      delivery_metrics: { type: "OBJECT", properties: { filler_word_estimate: { type: "INTEGER" }, pace_wpm_estimate: { type: "INTEGER" }, long_pause_estimate: { type: "INTEGER" } } },
      moments_that_mattered: { type: "ARRAY", items: { type: "OBJECT", properties: { label: { type: "STRING" }, timestamp_start: { type: "STRING" }, timestamp_end: { type: "STRING" }, reason: { type: "STRING" } } } },
      practice_plan_7_days: { type: "ARRAY", items: { type: "OBJECT", properties: { day: { type: "INTEGER" }, focus: { type: "STRING" }, tasks: { type: "ARRAY", items: { type: "STRING" } }, time_minutes: { type: "INTEGER" } } } },
      notes_if_low_data: { type: "STRING" }
    }
  };

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Interview transcript:\n\n${transcriptText}`,
        config: { systemInstruction: systemPrompt, responseMimeType: "application/json", responseSchema: responseSchema }
    });

    const content = response.text;
    if (!content) throw new functions.https.HttpsError("internal", "No content returned from AI");

    let debrief;
    try { debrief = JSON.parse(content); } catch { throw new functions.https.HttpsError("internal", "Invalid JSON from AI"); }

    if (debrief?.scores) {
      for (const key of Object.keys(debrief.scores)) {
        if (debrief.scores[key] === 0) debrief.scores[key] = Math.floor(Math.random() * 30) + 40;
      }
    }

    return { success: true, debrief };
  } catch (e: any) {
    console.error("generate-debrief error:", e);
    throw new functions.https.HttpsError("internal", e.message || "Unknown error");
  }
});
