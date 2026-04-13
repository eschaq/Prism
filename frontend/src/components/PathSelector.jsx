import React, { useState } from "react";
import { PATHS } from "../paths";
import prismLogo from "../assets/prism-logo.png";
import prismBg from "../assets/prism-backround.png";

const PATH_META = {
  signal_report: {
    icon: "sensors",
    accent: "primary",
    tag: "MULTI-SOURCE",
    tagline: "Pull live market signals from Reddit and RSS. See what your customers are actually talking about right now.",
  },
  data_brief: {
    icon: "analytics",
    accent: "secondary",
    tag: "DATA INSIGHTS",
    tagline: "Upload your CSV and get a plain-English summary of what your numbers actually mean.",
  },
  gap_analysis: {
    icon: "hub",
    accent: "tertiary",
    tag: "CROSS-STREAM",
    tagline: "Cross-reference market signals with your internal data. Find the gaps your competitors are filling and you're not.",
  },
  full_report: {
    icon: "auto_awesome",
    accent: "primary-container",
    tag: "FULL SYNTHESIS",
    tagline: "The whole pipeline. Signals, data, gaps, and a briefing written specifically for your role. Start here if you want everything.",
  },
};

const ACCENT_CLASSES = {
  primary: {
    iconBg: "bg-primary/10 text-primary",
    tag: "text-primary bg-primary/5 border-primary/20",
    glow: "bg-primary/10 group-hover:bg-primary/20",
    hoverBorder: "hover:border-primary/30",
    label: "group-hover:text-primary",
  },
  secondary: {
    iconBg: "bg-secondary/10 text-secondary",
    tag: "text-secondary bg-secondary/5 border-secondary/20",
    glow: "bg-secondary/10 group-hover:bg-secondary/20",
    hoverBorder: "hover:border-secondary/30",
    label: "group-hover:text-secondary",
  },
  tertiary: {
    iconBg: "bg-tertiary/10 text-tertiary",
    tag: "text-tertiary bg-tertiary/5 border-tertiary/20",
    glow: "bg-tertiary/10 group-hover:bg-tertiary/20",
    hoverBorder: "hover:border-tertiary/30",
    label: "group-hover:text-tertiary",
  },
  "primary-container": {
    iconBg: "bg-primary-container/10 text-primary-container",
    tag: "text-primary-container bg-primary-container/5 border-primary-container/20",
    glow: "bg-primary-container/10 group-hover:bg-primary-container/20",
    hoverBorder: "hover:border-primary-container/30",
    label: "group-hover:text-primary-container",
  },
};

export default function PathSelector({ audienceLabel, onSelect, onHome, onAgenticMode }) {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <div className="relative min-h-screen bg-surface text-on-surface font-body overflow-hidden">
      {/* Background image */}
      <img src={prismBg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50 pointer-events-none z-0" />
      {/* Background effects */}
      <div className="fixed inset-0 dot-matrix pointer-events-none z-0" />
      <div className="fixed top-[-10%] right-[-10%] w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] left-[20%] w-[500px] h-[500px] bg-secondary/5 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* Top bar: logo (clickable → home) */}
      <div className="absolute top-0 left-0 z-10 px-8 py-5">
        <button onClick={onHome} className="hover:opacity-80 transition-opacity">
          {logoFailed ? (
            <span className="material-symbols-outlined text-[#5C6BC0] text-7xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              filter_center_focus
            </span>
          ) : (
            <img
              src={prismLogo}
              alt="Prism"
              className="h-24 w-auto"
              onError={() => setLogoFailed(true)}
            />
          )}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-8 pt-28 pb-16 relative z-10">
        {/* Hero */}
        <header className="mb-12 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-container/10 border border-primary-container/20 text-primary text-xs font-label mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            SYSTEM ACTIVE · FRAMING FOR {audienceLabel?.toUpperCase()}
          </div>
          <h1 className="text-5xl font-extrabold tracking-tighter text-on-surface mb-4 font-headline">
            Intelligence{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              Synthesized.
            </span>
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl leading-relaxed">
            Pick how deep you want to go. Each path runs a different set of steps and delivers a different kind of output. Not sure? Start with the Full Intelligence Report — it's the whole narrative intelligence pipeline in one click.
          </p>
        </header>

        {/* Bento grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {PATHS.map((p) => {
            const meta = PATH_META[p.id] || PATH_META.signal_report;
            const a = ACCENT_CLASSES[meta.accent];
            return (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                className={`group relative overflow-hidden rounded-xl p-8 border border-[rgba(174,186,255,0.08)] ${a.hoverBorder} transition-all duration-500 text-left focus:outline-none focus:ring-1 focus:ring-primary backdrop-blur-[12px]`}
                style={{ backgroundColor: "rgba(22, 25, 34, 0.45)" }}
              >
                <div className={`absolute top-0 right-0 w-32 h-32 blur-[40px] transition-all ${a.glow}`}></div>

                <div className="flex justify-between items-start mb-6 relative">
                  <div className={`p-3 rounded-lg ${a.iconBg}`}>
                    <span className="material-symbols-outlined text-3xl">{meta.icon}</span>
                  </div>
                  <span className={`font-label text-xs font-bold px-2 py-1 rounded border ${a.tag}`}>
                    {meta.tag}
                  </span>
                </div>

                <h3 className={`text-xl font-bold text-on-surface mb-2 font-headline transition-colors ${a.label}`}>
                  {p.label}
                </h3>
                <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">
                  {meta.tagline}
                </p>

                <div className="flex items-center justify-between gap-4 pt-4 border-t border-outline-variant/10">
                  <span className="text-[10px] font-label text-on-surface-variant uppercase tracking-widest">
                    {p.description}
                  </span>
                  <span className="text-[10px] font-label text-on-surface-variant">
                    {p.steps.length} {p.steps.length === 1 ? "STEP" : "STEPS"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Agentic Mode */}
        <div className="mt-8">
          <button
            onClick={onAgenticMode}
            className="group relative overflow-hidden w-full rounded-xl p-8 border border-secondary/20 hover:border-secondary/40 transition-all duration-500 text-left focus:outline-none focus:ring-1 focus:ring-secondary backdrop-blur-[12px]"
            style={{ backgroundColor: "rgba(22, 25, 34, 0.45)" }}
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-secondary/10 blur-[60px] group-hover:bg-secondary/20 transition-all"></div>

            <div className="flex justify-between items-start mb-4 relative">
              <div className="p-3 rounded-lg bg-secondary/10 text-secondary">
                <span className="material-symbols-outlined text-3xl">bolt</span>
              </div>
              <span className="font-label text-xs font-bold px-2 py-1 rounded border text-secondary bg-secondary/5 border-secondary/20">
                AGENTIC
              </span>
            </div>

            <h3 className="text-xl font-bold text-on-surface mb-2 font-headline group-hover:text-secondary transition-colors">
              Run Everything
            </h3>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              One click. All five steps run automatically. Get your complete intelligence report without lifting a finger.
            </p>

            <div className="flex items-center gap-2 pt-4 mt-4 border-t border-outline-variant/10">
              <span className="text-[10px] font-label text-secondary uppercase tracking-widest">
                Intelligence → Insights → Gaps → Presence → Briefing
              </span>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
}
