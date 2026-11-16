"use client";

import React, { useState, useEffect } from "react";
import { Upload, Sparkles, AlertTriangle, CheckCircle2, ArrowRight, Zap, ShieldCheck, Copy, Check, Lock } from "lucide-react";

interface AuditResult {
  score: number;
  verdict: string;
  flaws: { title: string; issue: string; fix: string }[];
  copyRewrite: { headline: string; subheadline: string; ctaButton: string };
}

export default function LandingPageAuditor() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/png");
  const [targetAudience, setTargetAudience] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [auditsUsed, setAuditsUsed] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  const FREE_LIMIT = 2;

  useEffect(() => {
    const saved = localStorage.getItem("convertroast_audits");
    if (saved) setAuditsUsed(parseInt(saved, 10));
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMimeType(file.type);
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      setImageBase64(dataUrl.split(",")[1]);
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const runAudit = async () => {
    if (auditsUsed >= FREE_LIMIT) {
      setError("Free limit reached (2/2 audits used). Upgrade to Pro for unlimited audits!");
      return;
    }

    if (!imageBase64) {
      setError("Please upload a screenshot of your landing page first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType, targetAudience }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      setResult(data);
      const newCount = auditsUsed + 1;
      setAuditsUsed(newCount);
      localStorage.setItem("convertroast_audits", newCount.toString());
    } catch (err: any) {
      setError(err.message || "Error analyzing image.");
    } finally {
      setLoading(false);
    }
  };

  const copyRewrittenCopy = () => {
    if (!result) return;
    const text = `Headline: ${result.copyRewrite.headline}\nSubheadline: ${result.copyRewrite.subheadline}\nCTA: ${result.copyRewrite.ctaButton}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navbar */}
      <nav className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span>ConvertRoast<span className="text-indigo-400">.ai</span></span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-300">
            <span className="hidden sm:inline-block text-xs px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
              Free Audits Left: <strong className="text-white">{Math.max(0, FREE_LIMIT - auditsUsed)}/{FREE_LIMIT}</strong>
            </span>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
            <a href="#pricing" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition">
              Go Pro
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-indigo-300 text-xs font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5" /> AI-Powered UI/UX & Conversion Optimization
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
          Find Out Why Your Landing Page <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Isn&apos;t Converting</span>
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
          Upload a screenshot of your website. In 10 seconds, our AI UX Auditor exposes hidden design flaws and rewrites your copy to boost signups and sales.
        </p>
      </header>

      {/* Main Tool Section */}
      <main id="tool" className="max-w-5xl mx-auto px-6 pb-24">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl">
          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Left: Upload & Controls */}
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  1. Upload Landing Page Screenshot
                </label>
                <label className="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl cursor-pointer bg-slate-950/50 transition overflow-hidden relative">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover object-top" />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center">
                      <Upload className="w-8 h-8 text-indigo-400 mb-3" />
                      <p className="text-sm font-medium text-slate-200">Click to upload screenshot</p>
                      <p className="text-xs text-slate-500 mt-1">PNG, JPG, or WEBP (Hero section works best)</p>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  2. Who is your target customer? (Optional)
                </label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g. SaaS founders, E-commerce store owners..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {error && (
                <div className="p-3.5 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-sm flex items-center justify-between gap-2">
                  <span>{error}</span>
                  {auditsUsed >= FREE_LIMIT && (
                    <a href="#pricing" className="shrink-0 bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-md font-semibold">
                      Unlock Pro
                    </a>
                  )}
                </div>
              )}

              <button
                onClick={runAudit}
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-semibold text-white flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                {loading ? (
                  <>Analyzing UX & Copy...</>
                ) : auditsUsed >= FREE_LIMIT ? (
                  <>
                    <Lock className="w-4 h-4" /> Free Limit Reached — Upgrade to Pro
                  </>
                ) : (
                  <>
                    Roast My Landing Page <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Right: Results Area */}
            <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-6 min-h-[380px] flex flex-col justify-center">
              {!result && !loading && (
                <div className="text-center text-slate-500 space-y-2">
                  <ShieldCheck className="w-10 h-10 mx-auto text-slate-700" />
                  <p className="text-sm font-medium text-slate-400">Your UX Audit Report Will Appear Here</p>
                  <p className="text-xs">Upload a screenshot on the left and click Roast to get started.</p>
                </div>
              )}

              {loading && (
                <div className="text-center space-y-3 animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-indigo-600/20 border border-indigo-500 mx-auto flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-indigo-400" />
                  </div>
                  <p className="text-sm font-medium text-indigo-300">Scanning visual hierarchy, contrast & copy...</p>
                </div>
              )}

              {result && (
                <div className="space-y-6">
                  {/* Score */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-slate-400">Conversion Score</span>
                      <p className="text-sm text-slate-300 mt-1">{result.verdict}</p>
                    </div>
                    <div className="text-3xl font-extrabold text-indigo-400 bg-indigo-950/60 border border-indigo-800/60 px-4 py-2 rounded-xl">
                      {result.score}/100
                    </div>
                  </div>

                  {/* Flaws */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> Top UX & Conversion Flaws
                    </h3>
                    {result.flaws.map((flaw, i) => (
                      <div key={i} className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                        <p className="text-sm font-semibold text-white">{flaw.title}</p>
                        <p className="text-xs text-slate-400">{flaw.issue}</p>
                        <p className="text-xs text-emerald-400 font-medium pt-1">Fix: {flaw.fix}</p>
                      </div>
                    ))}
                  </div>

                  {/* Copy Rewrite */}
                  <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> High-Converting Copy Rewrite
                      </h3>
                      <button
                        onClick={copyRewrittenCopy}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <p className="text-sm font-bold text-white">&ldquo;{result.copyRewrite.headline}&rdquo;</p>
                    <p className="text-xs text-slate-300">{result.copyRewrite.subheadline}</p>
                    <div className="pt-1">
                      <span className="inline-block text-xs bg-indigo-600 text-white px-3 py-1 rounded-md font-medium">
                        CTA: {result.copyRewrite.ctaButton}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-4xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Simple, Founder-Friendly Pricing</h2>
          <p className="text-slate-400 text-sm">Start free. Upgrade when you want unlimited page audits & competitor breakdowns.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-semibold">Starter</h3>
              <div className="text-3xl font-extrabold my-4">$0 <span className="text-sm font-normal text-slate-400">/ forever</span></div>
              <ul className="space-y-3 text-sm text-slate-300 mb-8">
                <li>✓ 2 Landing Page Audits included</li>
                <li>✓ Conversion Score & Top 3 UX Flaws</li>
                <li>✓ Headline & CTA Copy Rewrites</li>
              </ul>
            </div>
            <a href="#tool" className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-center text-sm font-semibold transition">
              Start Free
            </a>
          </div>

          <div className="p-8 rounded-2xl bg-gradient-to-b from-indigo-950/60 to-slate-900 border border-indigo-500/50 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Pro Founder</h3>
                <span className="text-xs bg-indigo-600 px-2.5 py-0.5 rounded-full font-medium">Most Popular</span>
              </div>
              <div className="text-3xl font-extrabold my-4">$12 <span className="text-sm font-normal text-slate-400">/ month</span></div>
              <ul className="space-y-3 text-sm text-slate-300 mb-8">
                <li>✓ Unlimited Full-Page UX Audits</li>
                <li>✓ Mobile + Desktop Responsive Checks</li>
                <li>✓ Copy-Ready High-Converting Rewrites</li>
                <li>✓ Priority AI Processing</li>
              </ul>
            </div>
            <a
              href="https://lemonsqueezy.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-center text-sm font-semibold transition cursor-pointer"
            >
              Upgrade to Pro — $12/mo
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
