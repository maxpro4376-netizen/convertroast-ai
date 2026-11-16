import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY missing! Check .env.local file and restart server." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const { imageBase64, mimeType, targetAudience } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "Screenshot is required" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-3.8-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = `You are an elite Conversion Rate Optimization (CRO) & UI/UX Designer auditing a landing page.
Target Audience: "${targetAudience || "General Online Customers"}".

Analyze this landing page screenshot and return JSON in this exact structure:
{
  "score": 72,
  "verdict": "One punchy sentence summarizing the overall UX and conversion potential.",
  "flaws": [
    { "title": "Flaw 1 Title", "issue": "Why this hurts conversions", "fix": "Exact actionable UI/UX fix" },
    { "title": "Flaw 2 Title", "issue": "Why this hurts conversions", "fix": "Exact actionable UI/UX fix" },
    { "title": "Flaw 3 Title", "issue": "Why this hurts conversions", "fix": "Exact actionable UI/UX fix" }
  ],
  "copyRewrite": {
    "headline": "High-converting replacement H1 headline",
    "subheadline": "Clear, benefit-driven subheadline",
    "ctaButton": "Action-oriented button text"
  }
}`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType || "image/png",
        },
      },
    ]);

    const responseText = result.response.text();
    const auditData = JSON.parse(responseText);

    return NextResponse.json(auditData);
  } catch (error: any) {
    console.error("Audit Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to analyze landing page." },
      { status: 500 }
    );
  }
}
