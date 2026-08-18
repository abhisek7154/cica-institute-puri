import { NoticeType } from "@/lib/types";

export interface AIClassifiedNotice {
  title: string;
  category: NoticeType;
  description: string;
}

/**
 * Single-provider server-side AI classifier for notice text.
 * Uses Gemini REST API (or OpenAI fallback if OPENAI_API_KEY is provided).
 *
 * If AI fails or is unconfigured, returns null so manual notice creation works normally.
 */
export async function classifyNoticeWithAI(rawText: string): Promise<AIClassifiedNotice | null> {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  const prompt = `You are a helper for school notice board classification.
Extract the notice details from this input text:
"${rawText.replace(/"/g, '\\"')}"

Return ONLY a valid JSON object matching this exact schema:
{
  "title": "Short descriptive notice title",
  "category": "holiday" or "daily" or "observation",
  "description": "Brief notice summary or description text"
}
Rules:
- category MUST be strictly one of: "holiday", "daily", or "observation".
- Do not include markdown tags like \`\`\`json. Return raw JSON text only.`;

  try {
    if (geminiApiKey) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
        console.warn(`[AI Classifier] Gemini API returned status ${response.status}`);
        return null;
      }

      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      return parseAIJsonResponse(textResponse);
    }

    if (openaiApiKey) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2
        })
      });

      if (!response.ok) {
        console.warn(`[AI Classifier] OpenAI API returned status ${response.status}`);
        return null;
      }

      const data = await response.json();
      const textResponse = data.choices?.[0]?.message?.content?.trim() || "";
      return parseAIJsonResponse(textResponse);
    }

    // AI is unconfigured
    return null;
  } catch (error) {
    console.warn("[AI Classifier] Classification failed gracefully:", error);
    return null;
  }
}

function parseAIJsonResponse(rawJson: string): AIClassifiedNotice | null {
  try {
    const cleaned = rawJson.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(cleaned);

    if (typeof parsed.title !== "string" || !parsed.title.trim()) {
      return null;
    }

    let category: NoticeType = "daily";
    const catLower = String(parsed.category || "").toLowerCase();
    if (catLower.includes("holiday")) {
      category = "holiday";
    } else if (catLower.includes("observation")) {
      category = "observation";
    } else if (catLower.includes("daily")) {
      category = "daily";
    }

    const description = typeof parsed.description === "string" ? parsed.description.trim() : (parsed.content || parsed.title);

    return {
      title: parsed.title.trim(),
      category,
      description
    };
  } catch {
    return null;
  }
}
