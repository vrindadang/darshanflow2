
import { GoogleGenAI } from "@google/genai";
import { ExpenseRequest } from "../types.ts";

export const enhanceDescription = async (text: string): Promise<string> => {
  if (!text.trim()) return "";
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an assistant for a school expense management system. Rewrite the following expense description to be more professional, clear, and detailed, suitable for financial approval. Keep it concise (under 30 words). Input: "${text}"`,
    });
    return response.text?.trim().replace(/^"|"$/g, '') || text;
  } catch (error) {
    console.error("Gemini enhance error:", error);
    return text;
  }
};

export const analyzeRequest = async (req: ExpenseRequest): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      As a strict financial auditor for a school network, analyze this expense request:
      - School: ${req.schoolName}
      - Category: ${req.category}
      - Amount: INR ${req.amount}
      - Description: "${req.description}"
      - Date: ${req.expenseDate}

      Provide a brief assessment (max 60 words) covering:
      1. Category appropriateness.
      2. Amount reasonableness for a school setting.
      3. Potential red flags or missing info.
      
      Output as a concise bulleted list.
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Could not generate analysis.";
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return "AI Analysis unavailable at this time.";
  }
};

/**
 * Drafts a professional notification email for the internal auditor.
 */
export const composeAuditorNotification = async (req: ExpenseRequest): Promise<{ subject: string; body: string }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Create a professional email notification for an Internal Auditor regarding a new fund requisition.
      
      Details:
      - ID: ${req.id}
      - School: ${req.schoolName}
      - Category: ${req.category}
      - Amount: ₹${req.amount}
      - Purpose: ${req.description}
      - Requisition Date: ${new Date().toLocaleDateString('en-IN')}

      The recipient is 'Internal Auditor (intauditor@darshanacademy.org)'.
      Provide the output as a JSON object with 'subject' and 'body' fields.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const result = JSON.parse(response.text || '{"subject": "", "body": ""}');
    return {
      subject: result.subject || `New Fund Requisition: ${req.id}`,
      body: result.body || `A new requisition has been submitted by ${req.schoolName} for ₹${req.amount}.`
    };
  } catch (error) {
    console.error("Gemini notification drafting error:", error);
    return {
      subject: `New Fund Requisition: ${req.id}`,
      body: `Alert: A new fund requisition of ₹${req.amount} for ${req.category} has been submitted by ${req.schoolName}. Reference ID: ${req.id}.`
    };
  }
};
