import { GoogleGenAI } from "@google/genai";
import { CONFIG } from "../../config/index";

export const ai = new GoogleGenAI({ apiKey: CONFIG.GEMINI_API_KEY });
