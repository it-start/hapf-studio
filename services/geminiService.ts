import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, CategorizedTransaction, Insights, SummaryText } from "../types";

// NOTE: process.env.API_KEY is assumed to be available as per instructions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const modelId = 'gemini-2.5-flash';

/**
 * Module 1: Ingest CSV
 * input: CSV string
 * output: List<Transaction>
 */
export const runIngestCsv = async (csvData: string): Promise<Transaction[]> => {
  const response = await ai.models.generateContent({
    model: modelId,
    contents: `Parse the following CSV data into a strict list of transaction objects.
    
    <csv_data>
    ${csvData}
    </csv_data>`,
    config: {
      systemInstruction: "You are a CSV parser module. Extract valid transactions.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING, description: "ISO8601 date string" },
            description: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            currency: { type: Type.STRING },
          },
          required: ["date", "description", "amount", "currency"],
        },
      },
    },
  });

  return JSON.parse(response.text || "[]");
};

/**
 * Module 2: Categorize Transactions
 * input: List<Transaction>
 * output: List<CategorizedTransaction>
 */
export const runCategorizeTransactions = async (transactions: Transaction[]): Promise<CategorizedTransaction[]> => {
  // We process them in a single batch for this demo
  const response = await ai.models.generateContent({
    model: modelId,
    contents: `Categorize the following transactions: ${JSON.stringify(transactions)}`,
    config: {
      systemInstruction: "Categorize each transaction into exactly one of: Food, Transport, Utilities, Entertainment, Other.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            transaction: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING },
                description: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                currency: { type: Type.STRING },
              }
            },
            category: { 
              type: Type.STRING, 
              enum: ["Food", "Transport", "Utilities", "Entertainment", "Other"] 
            },
          },
          required: ["transaction", "category"],
        },
      },
    },
  });

  return JSON.parse(response.text || "[]");
};

/**
 * Module 3: Analyze Spending
 * input: List<CategorizedTransaction>
 * output: Insights
 */
export const runAnalyzeSpending = async (categorized: CategorizedTransaction[]): Promise<Insights> => {
  const response = await ai.models.generateContent({
    model: modelId,
    contents: `Analyze these categorized transactions: ${JSON.stringify(categorized)}`,
    config: {
      systemInstruction: "Calculate total spending per category and identify the largest category.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          total_spending: { type: Type.NUMBER },
          spending_per_category: { 
            type: Type.OBJECT,
            properties: {
               Food: { type: Type.NUMBER },
               Transport: { type: Type.NUMBER },
               Utilities: { type: Type.NUMBER },
               Entertainment: { type: Type.NUMBER },
               Other: { type: Type.NUMBER },
            }
          },
          largest_category: { type: Type.STRING },
        },
        required: ["total_spending", "spending_per_category", "largest_category"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
};

/**
 * Module 4: Generate Summary
 * input: Insights
 * output: SummaryText
 */
export const runGenerateSummary = async (insights: Insights): Promise<SummaryText> => {
  const response = await ai.models.generateContent({
    model: modelId,
    contents: `Generate a summary for these financial insights: ${JSON.stringify(insights)}`,
    config: {
      systemInstruction: "Generate a concise summary of the financial insights. Keep it under 100 words.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
        },
        required: ["text"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
};
