import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AIExplanation } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getWordFromWeb = async (word: string): Promise<AIExplanation> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Defina a palavra inglesa "${word}". Forneça uma explicação simples em português e 3 frases de exemplo em inglês com tradução.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          explanation: { type: Type.STRING },
          examples: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["explanation", "examples"]
      }
    },
  });

  const text = response.text;
  if (!text) throw new Error("Não foi possível encontrar a palavra na web.");
  return JSON.parse(text);
};

export const getWordExplanation = async (word: string, category: string): Promise<AIExplanation> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Explain the English word "${word}" in the context of "${category}". Provide a simple definition in Portuguese and 3 clear example sentences in English with Portuguese translations.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          explanation: { type: Type.STRING },
          examples: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING } 
          }
        },
        required: ["explanation", "examples"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Resposta vazia da IA");
  return JSON.parse(text);
};

export interface MnemonicData {
  scenarioEn: string;
  scenarioPt: string;
  visualPrompt: string;
}

export const getMnemonicScenario = async (word: string): Promise<MnemonicData> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Crie um cenário mnemônico (ajuda de memória) para a palavra inglesa "${word}".
    
    INSTRUÇÕES RÍGIDAS:
    - No campo "scenarioEn": escreva uma frase MUITO CURTA APENAS EM INGLÊS que ajude a fixar o significado.
    - No campo "scenarioPt": escreva a tradução dessa frase APENAS EM PORTUGUÊS.
    - No campo "visualPrompt": descreva a cena (em inglês) para um gerador de imagem, focando em elementos visuais claros.
    
    PROIBIDO: Misturar os idiomas nos campos. Cada campo deve ter apenas o idioma solicitado.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scenarioEn: { type: Type.STRING },
          scenarioPt: { type: Type.STRING },
          visualPrompt: { type: Type.STRING }
        },
        required: ["scenarioEn", "scenarioPt", "visualPrompt"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Resposta vazia da IA");
  return JSON.parse(text);
};

export const generateMnemonicImage = async (prompt: string): Promise<string | undefined> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `Digital illustration, vivid colors, simple mnemonic visual, white background: ${prompt}` }],
      },
      config: {
        imageConfig: { aspectRatio: "1:1" }
      }
    });

    if (response.candidates && response.candidates[0] && response.candidates[0].content) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return undefined;
  } catch (error) {
    console.error("Image generation error:", error);
    return undefined;
  }
};

export const generateSpeech = async (text: string): Promise<string | undefined> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("Speech generation error:", error);
    return undefined;
  }
};