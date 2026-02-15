import { GoogleGenAI, Type, Modality } from "@google/genai";
import { FarmerProfile, EligibilityResult, Scheme } from "../types";
import { SCHEME_GUIDELINES } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Global throttle state to prevent rapid-fire requests
let lastRequestTime = 0;
const MIN_REQUEST_GAP = 2000; // Increased to 2 seconds for stability

/**
 * Ensures a minimum gap between API calls to stay within limits.
 */
async function throttle() {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < MIN_REQUEST_GAP) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_GAP - timeSinceLast));
  }
  lastRequestTime = Date.now();
}

/**
 * Robust wrapper for AI calls with retry logic for quota and transient 500 errors.
 */
async function callAiWithRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  await throttle();
  try {
    return await fn();
  } catch (error: any) {
    const errorStr = JSON.stringify(error).toLowerCase();
    
    // Check for Quota (429) or Internal Server/XHR (500)
    const isRetryable = 
      error?.status === 429 || 
      error?.status === 500 ||
      error?.code === 429 ||
      error?.code === 500 ||
      errorStr.includes('quota') || 
      errorStr.includes('rate_limit') ||
      errorStr.includes('resource_exhausted') ||
      errorStr.includes('xhr error') ||
      errorStr.includes('rpc failed');

    if (retries > 0 && isRetryable) {
      const delay = (4 - retries) * 4000; // 4s, 8s, 12s backoff
      console.warn(`Retryable error detected. Waiting ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callAiWithRetry(fn, retries - 1);
    }
    throw error;
  }
}

/**
 * Extracts structured farmer profile from natural language.
 */
export const extractProfileFromText = async (text: string): Promise<Partial<FarmerProfile>> => {
  const cleanText = text.trim();
  if (cleanText.length < 5) return {};

  const greetings = ['hi', 'hello', 'hey', 'good morning', 'thanks', 'ok'];
  if (greetings.includes(cleanText.toLowerCase())) return {};

  return callAiWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract farmer details from: "${text}". 
      Return JSON with: name, state, district, landHolding (acres as number), cropType, category.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            state: { type: Type.STRING },
            district: { type: Type.STRING },
            landHolding: { type: Type.NUMBER },
            cropType: { type: Type.STRING },
            category: { type: Type.STRING },
          }
        }
      }
    });

    try {
      return JSON.parse(response.text || "{}");
    } catch (e) {
      return {};
    }
  });
};

/**
 * General chat interaction with Gemini.
 */
export const getChatResponse = async (message: string, currentProfile: Partial<FarmerProfile>) => {
  return callAiWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: message,
      config: {
        systemInstruction: `You are Niti-Setu AI for Indian farmers. 
        Context: ${JSON.stringify(currentProfile)}.
        Give helpful, professional advice in 1-2 sentences.`
      }
    });
    return response.text;
  });
};

/**
 * BATCH ELIGIBILITY CHECK: Uses gemini-3-pro-preview for robustness.
 */
export const checkAllEligibilities = async (profile: FarmerProfile, schemes: Scheme[]): Promise<EligibilityResult[]> => {
  return callAiWithRetry(async () => {
    const guidelinesContext = schemes.map(s => `SCHEME: ${s.name} (ID: ${s.id})\nGUIDELINES: ${SCHEME_GUIDELINES[s.id as keyof typeof SCHEME_GUIDELINES] || "General agricultural rules."}`).join('\n\n');

    const prompt = `
      Analyze eligibility for ALL schemes below based on the profile provided.
      FARMER PROFILE: 
      - Name: ${profile.name}
      - State: ${profile.state}
      - Land Holding: ${profile.landHolding} acres
      - Category: ${profile.category}
      - Crop: ${profile.cropType}

      ${guidelinesContext}

      You must return an array of objects for each Scheme ID. Ensure accurate cross-referencing.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // Upgraded for complex JSON tasks
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 4000 }, // Allow some reasoning for eligibility logic
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              schemeId: { type: Type.STRING },
              schemeName: { type: Type.STRING },
              isEligible: { type: Type.BOOLEAN },
              benefit: { type: Type.STRING },
              proofCitation: { type: Type.STRING },
              proofSnippet: { type: Type.STRING },
              nextSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
              requiredDocuments: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["schemeId", "schemeName", "isEligible", "benefit"]
          }
        }
      }
    });

    try {
      const text = response.text || "[]";
      // Handle cases where the model might wrap in markdown blocks
      const cleanJson = text.replace(/```json|```/g, "").trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      console.error("JSON Parse Error in Batch Analysis:", e);
      return [];
    }
  });
};

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const playSpeech = async (text: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const binary = atob(base64Audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      
      const buffer = await decodeAudioData(bytes, audioCtx, 24000, 1);
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start();
    }
  } catch (error) {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }
};