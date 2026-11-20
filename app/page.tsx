
"use client";

import React, { useState, useEffect } from "react";

interface AuditResult {
  overallScore: number;
  firstImpression: string;
  flaws: {
    issue: string;
    fix: string;
  }[];
  headlineRewrite: {
    before: string;
    after: string;
  };
  ctaRewrite: string;
}

const DAILY_LIMIT = 2;

const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.8-flash",
  "gemini-3.8-flash",
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function LandingPageAuditor() {
  const [imageBase64, setImageBase64] = useState<string>("");
  const [mimeType, setMimeType] = useState<string>("image/jpeg");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [targetCustomer, setTargetCustomer] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [auditsUsed, setAuditsUsed] = useState<number>(0);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const savedDate = localStorage.getItem("cr_audit_date");
    const savedCount = Number(localStorage.getItem("cr_audit_count") || "0");

    if (savedDate === today) {
      setAuditsUsed(savedCount);
    } else {
      localStorage.setItem("cr_audit_date", today);
      localStorage.setItem("cr_audit_count", "0");
      setAuditsUsed(0);
    }
  }, []);

  const compressImage = (
    file: File
  ): Promise<{ base64: string; mimeType: string; preview: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 900;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          const base64 = dataUrl.split(",")[1];
          resolve({
            base64,
            mimeType: "image/jpeg",
            preview: dataUrl,
          });
        };
        img.onerror = () => reject(new Error("Could not process image."));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file."));
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setResult(null);

    try {
      const compressed = await compressImage(file);
      setImageBase64(compressed.base64);
      setMimeType(compressed.mimeType);
      setPreviewUrl(compressed.preview);
    } catch {
      setError("Please select a valid PNG, JPG, or WebP screenshot.");
    }
  };

  const handleAnalyze = async () => {
    if (!imageBase64) {
      setError("Please upload a landing page screenshot first.");
      return;
    }

    if (auditsUsed >= DAILY_LIMIT) {
      setError(
        "You have used your 2 free audits for today. Upgrade to Pro for unlimited audits!"
      );
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      setError("API Key missing: Add NEXT_PUBLIC_GEMINI_API_KEY in Vercel Settings.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

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

    let lastError = "AI servers are busy right now. Please try again in a moment.";

    for (let i = 0; i < MODELS.length; i++) {
      const modelName = MODELS[i];
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    {
                      inline_data: {
                        mime_type: mimeType,
                        data: imageBase64,
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
          }
        );

        const data = await res.json();

        if (!res.ok) {
          lastError = data?.error?.message || lastError;
          if (i < MODELS.length - 1) {
            await sleep(1200 * (i + 1));
          }
          continue;
        }

        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (!rawText) continue;

        const cleanedJson = rawText.replace(/```json|```/g, "").trim();
        const parsed: AuditResult = JSON.parse(cleanedJson);

        setResult(parsed);

        const newCount = auditsUsed + 1;
        setAuditsUsed(newCount);
        localStorage.setItem("cr_audit_count", String(newCount));
        setLoading(false);
        return;
      } catch (err: any) {
        lastError = err?.message || lastError;
        if (i < MODELS.length - 1) {
          await sleep(1200 * (i + 1));
        }
        continue;
      }
    }

    setError(lastError);
    setLoading(false);
  };

  const freeLeft = Math.max(0, DAILY_LIMIT - auditsUsed);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
              ⚡
            </div>
            <span className="font-bold text-lg tracking-tight">
              ConvertRoast<span className="text-indigo-400">.ai</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs sm:text-sm px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
              Free Audits Left: <strong className="text-white">{freeLeft}/2</strong>
            </span>
            <a
              href="#pricing"
              className="hidden sm:inline-block text-sm text-slate-300 hover:text-white transition"
            >
              Pricing
            </a>
            <a
              href="#pricing"
              className="text-sm font-medium px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition"
            >
              Go Pro
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-20">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 text-xs font-medium mb-4">
            AI Conversion & UI/UX Auditor
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
            Find Out Why Your Landing Page Isn&apos;t Converting
          </h1>
          <p className="text-slate-400 text-base sm:text-lg">
            Upload a screenshot of your website. Get an instant conversion score,
            brutal UX feedback, and copy-ready headline rewrites in seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              1. Upload Landing Page Screenshot
            </label>

            <label className="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl cursor-pointer bg-slate-950/50 transition overflow-hidden relative">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Landing page preview"
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                  <span className="text-3xl mb-2">📸</span>
                  <p className="text-sm text-slate-300 font-medium">
                    Click to upload screenshot
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    PNG, JPG, or WebP (Auto-optimized for fast analysis)
                  </p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {previewUrl && (
              <p className="text-xs text-indigo-400 mt-2 text-right">
                Click image above to replace screenshot
              </p>
            )}

            <div className="mt-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                2. Who is your target customer? (Optional)
              </label>
              <input
                type="text"
                value={targetCustomer}
                onChange={(e) => setTargetCustomer(e.target.value)}
                placeholder="e.g. SaaS founders, E-commerce store owners..."
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>

            {error && (
              <div className="mt-5 p-4 rounded-xl bg-red-950/50 border border-red-800/80 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full mt-6 py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-semibold text-sm sm:text-base transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Roasting Your Page...
                </>
              ) : (
                <>Roast My Landing Page →</>
              )}
            </button>
          </div>

          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/70 border border-slate-800 min-h-[420px] flex flex-col justify-center">
            {!result && !loading && (
              <div className="text-center text-slate-500 py-12">
                <p className="text-base font-medium text-slate-400 mb-1">
                  Your UX Audit Report Will Appear Here
                </p>
                <p className
