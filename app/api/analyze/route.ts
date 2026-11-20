
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Vercel mein GEMINI_API_KEY set nahi hai. Settings > Environment Variables check karein." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { image, mimeType, targetCustomer } = body;

    if (!image) {
      return NextResponse.json(
        { error: "Please upload a landing page screenshot first." },
        { status: 400 }
      );
    }

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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType || "image/jpeg",
                  data: image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.4,
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message || `Gemini API Error (${res.status})` },
        { status: res.status }
      );
    }

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return NextResponse.json(
        { error: "AI se khali jawab aaya. Dubara try karein." },
        { status: 500 }
      );
    }

    const cleanedJson = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanedJson);

    return NextResponse.json(parsed);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Server error while analyzing image." },
      { status: 500 }
    );
  }
}
