import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const MODELS = ["gemini-3.8-flash", "gemini-2.5-flash"];

export async function POST(req: Request) {
  try {
    const { image, mimeType, targetCustomer } = await req.json();

    if (!image) {
      return NextResponse.json(
        { error: "Please upload a landing page screenshot first." },
        { status: 400 }
      );
    }

    const prompt = `You are a senior Conversion Rate Optimization (CRO) and UI/UX expert. Analyze this landing page screenshot${
      targetCustomer ? ` targeting "${targetCustomer}"` : ""
    }.

Return ONLY valid JSON (no markdown, no backticks) in this exact format:
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

    for (const modelName of MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.4,
          },
        });

        const result = await model.generateContent([prompt, imagePart]);
        const text = result.response.text();
        const parsed = JSON.parse(text);

        return NextResponse.json(parsed);
      } catch (err: any) {
        lastError = err;
        // Agar model busy (503) ya overloaded ho toh aglay model par switch karein
        continue;
      }
    }

    return NextResponse.json(
      {
        error:
          lastError?.message ||
          "AI servers are temporarily busy. Please try again in a few seconds.",
      },
      { status: 503 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to analyze landing page." },
      { status: 500 }
    );
  }
}
