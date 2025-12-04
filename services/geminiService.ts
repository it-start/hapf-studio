import { GoogleGenAI, Type } from "@google/genai";
import { Insight, Outline, Draft } from "../types";

// NOTE: process.env.API_KEY is assumed to be available as per instructions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const modelId = 'gemini-2.5-flash';

/**
 * Module 1: Ingest
 * Simulates the "ingest.thought_extractor" module.
 */
export const runIngestModule = async (inputText: string): Promise<Insight[]> => {
  const response = await ai.models.generateContent({
    model: modelId,
    contents: `Extract insights from the following raw text. Ignore filler. 
    
    <raw_input>
    ${inputText}
    </raw_input>`,
    config: {
      systemInstruction: "You are a Mining Droid. Extract valuable insights. Map output to JSON.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING },
            source_text: { type: Type.STRING },
            importance: { type: Type.INTEGER },
          },
          required: ["topic", "source_text", "importance"],
        },
      },
    },
  });

  return JSON.parse(response.text || "[]");
};

/**
 * Module 2: Architect
 * Simulates the "plan.architect" module.
 */
export const runArchitectModule = async (insights: Insight[]): Promise<Outline> => {
  const response = await ai.models.generateContent({
    model: modelId,
    contents: `Create an article outline based on these insights: ${JSON.stringify(insights)}`,
    config: {
      systemInstruction: "Act as a Chief Editor. Organize insights into a narrative structure. Merge duplicates.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          sections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                header: { type: Type.STRING },
                key_points: { type: Type.ARRAY, items: { type: Type.STRING } },
                estimated_tokens: { type: Type.INTEGER },
              },
              required: ["header", "key_points"],
            },
          },
        },
        required: ["title", "sections"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
};

/**
 * Module 3: Writer (Map Step)
 * Simulates "write.section_expander" for a single section.
 */
export const runWriterModule = async (sectionHeader: string, keyPoints: string[]): Promise<string> => {
  const response = await ai.models.generateContent({
    model: modelId,
    contents: `Write the section '${sectionHeader}'. Key points: ${keyPoints.join(", ")}`,
    config: {
      systemInstruction: "You are a Tech Writer. Tone: Smart & Ironic. Use Markdown. Keep it concise (under 200 words).",
    },
  });

  return response.text || "";
};

/**
 * Module 4: Critic
 * Simulates "qa.critic".
 */
export const runCriticModule = async (fullText: string): Promise<Draft> => {
  const response = await ai.models.generateContent({
    model: modelId,
    contents: fullText,
    config: {
      systemInstruction: "Rate the text quality. Check for logic and contradictions.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          readability_score: { type: Type.NUMBER },
          hallucination_check_passed: { type: Type.BOOLEAN },
          content_markdown: { type: Type.STRING }, // Just echoing back specifically for the data structure, usually we wouldn't echo.
        },
        required: ["readability_score", "hallucination_check_passed"],
      },
    },
  });

  const result = JSON.parse(response.text || "{}");
  // Ensure we keep the content
  return {
    ...result,
    content_markdown: fullText
  };
};
