 import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is missing in Vercel Environment Variables." },
        { status: 500 }
      );
    }

    const { image, mimeType, targetCustomer } = await req.json();

    if (!image) {
      return NextResponse.json(
        { error: "Please upload a landing page screenshot first." },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-3.8-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.4,
      },
    });

    const prompt = `You are a senior Conversion Rate Optimization (CRO) and UI/UX expert. Analyze this landing page screenshot${
      targetCustomer ? ` targeting "${targetCustomer}"` : ""
    }.

Return ONLY valid JSON in this exact structure:
{
  "overallScore": 74,
  "firstImpression": "One sharp sentence on clarity and visual hierarchy.",
  "flaws": [
    {
      "issue": "Specific UX or conversion flaw",
      "fix": "Concrete, actionable fix"
    }
  ],
  "headlineRewrite": {
    "before": "Current weak headline or hero message",
    "after": "High-converting, benefit-driven rewrite"
  },
  "ctaRewrite": "Stronger button text"
}
Keep flaws to the top 3 most impactful points.`;

    const imagePart = {
      inlineData: {
        data: image,
        mimeType: mimeType || "image/jpeg",
      },
    };

    let lastError: any = null;

    // 3 attempts with short delay to bypass temporary 503 high-demand spikes
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await model.generateContent([prompt, imagePart]);
        const rawText = result.response.text();
        const cleanedJson = rawText.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleanedJson);

        return NextResponse.json(parsed);
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || "";
        if ((msg.includes("503") || msg.includes("429") || msg.includes("overloaded")) && attempt < 3) {
          await sleep(1500 * attempt);
          continue;
        }
        throw err;
      }
    }

    throw lastError;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to analyze landing page." },
      { status: 500 }
    );
  }
}
