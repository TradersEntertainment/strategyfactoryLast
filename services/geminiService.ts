import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { Candle, StrategyConfig, Timeframe } from '../types';

const getAiModel = () => {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    console.warn("UYARI: Google Gemini API anahtarı bulunamadı.");
    console.warn("Lütfen .env dosyanıza veya Railway değişkenlerine API_KEY ekleyin.");
  }

  const genAI = new GoogleGenerativeAI(apiKey || 'MISSING_KEY');
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Use stable flash model
};

export const analyzeChartPoints = async (
  data: Candle[],
  userNotes: string
): Promise<StrategyConfig> => {
  const model = getAiModel();

  const prompt = `
    You are a Quantitative Strategy Architect.
    
    Task:
    1. Interpret the User Notes below to build a quantitative trading strategy.
    2. Translate the natural language description into technical indicators and logic.
    3. Create a robust strategy configuration JSON.

    User Notes: "${userNotes}"
    
    Requirements:
    1. Include StopLoss and TakeProfit defaults appropriate for crypto (1-5%).
    2. Provide a short, professional logic explanation.
    3. Use standard indicators: 'RSI', 'SMA_CROSS', 'PRICE_LEVEL'.

    Return ONLY JSON matching the specific Schema provided.
  `;

  // Define Schema for structured output
  const responseSchema = {
    type: SchemaType.OBJECT,
    properties: {
      name: { type: SchemaType.STRING },
      description: { type: SchemaType.STRING },
      timeframe: { type: SchemaType.STRING, enum: ['15m', '1h', '4h', '1d'] },
      entryConditions: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            indicator: { type: SchemaType.STRING, enum: ['RSI', 'SMA_CROSS', 'PRICE_LEVEL'] },
            operator: { type: SchemaType.STRING, enum: ['>', '<', 'crosses_above', 'crosses_below'] },
            value: { type: SchemaType.NUMBER },
            params: {
              type: SchemaType.OBJECT,
              properties: {
                period: { type: SchemaType.NUMBER },
                fast: { type: SchemaType.NUMBER },
                slow: { type: SchemaType.NUMBER },
              }
            }
          }
        }
      },
      exitConditions: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            indicator: { type: SchemaType.STRING, enum: ['RSI', 'SMA_CROSS', 'PRICE_LEVEL'] },
            operator: { type: SchemaType.STRING, enum: ['>', '<', 'crosses_above', 'crosses_below'] },
            value: { type: SchemaType.NUMBER },
            params: {
              type: SchemaType.OBJECT,
              properties: {
                period: { type: SchemaType.NUMBER }
              }
            }
          }
        }
      },
      stopLossPct: { type: SchemaType.NUMBER },
      takeProfitPct: { type: SchemaType.NUMBER },
      riskPerTradePct: { type: SchemaType.NUMBER },
      logicExplanation: { type: SchemaType.STRING }
    },
    required: ["name", "entryConditions", "stopLossPct", "takeProfitPct", "logicExplanation"]
  };

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const responseText = result.response.text();
    const strategyConfig = JSON.parse(responseText) as StrategyConfig;
    return strategyConfig;

  } catch (error) {
    console.error("Gemini Strategy Factory Error:", error);

    // Check for specific API key errors
    if (error && error.toString().includes('API_KEY')) {
      alert("HATA: Google API Anahtarı geçersiz veya eksik. Lütfen geçerli bir anahtar kullanın.");
    }

    // Fallback strategy if AI fails
    return {
      name: "Fallback RSI Reversion",
      description: "AI failed to parse, reverting to standard mean reversion.",
      timeframe: Timeframe.H1,
      entryConditions: [{ indicator: 'RSI', operator: '<', value: 30, params: { period: 14 } }],
      exitConditions: [{ indicator: 'RSI', operator: '>', value: 70, params: { period: 14 } }],
      stopLossPct: 0.02,
      takeProfitPct: 0.04,
      riskPerTradePct: 0.01,
      logicExplanation: "Fallback strategy due to service interruption or invalid API Key."
    };
  }
};