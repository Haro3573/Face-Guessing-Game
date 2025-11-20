import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL, PROMPTS } from "../constants";
import { Language } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    // Log a generic message instead of potentially exposing env details
    console.error("API Configuration Error: Key is missing");
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey });
};

const fileToInlineData = async (file: File): Promise<{ mimeType: string; data: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        mimeType: file.type,
        data: base64String,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const generateDescription = async (
  file: File,
  language: Language
): Promise<{ success: boolean; text: string }> => {
  try {
    const client = getClient();
    const imagePart = await fileToInlineData(file);
    const prompt = PROMPTS[language];

    // We use generateContent because we are asking for text based on an image
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: {
        parts: [
          { inlineData: imagePart },
          { text: prompt }
        ]
      }
    });

    const text = response.text?.trim();
    
    if (!text) {
       return { success: false, text: "No response text generated." };
    }

    if (text.includes("INVALID_IMAGE")) {
      return { success: false, text: "INVALID_IMAGE" };
    }

    return { success: true, text };
  } catch (error) {
    // Sanitize error logging to avoid exposing request details in console
    console.error("Gemini API Error:", error instanceof Error ? error.message : "Unknown error occurred");
    return { success: false, text: "API Error" };
  }
};