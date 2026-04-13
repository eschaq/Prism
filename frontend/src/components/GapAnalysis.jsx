import React, { useState } from "react";
import { Copy, ChevronDown, ChevronUp } from "lucide-react";
import { StepProgress, Spinner } from "./LoadingStates";

const CONFIDENCE_COLORS = {
  High: "text-secondary border-secondary/20",
  Medium: "text-tertiary border-tertiary/20",
  Low: "text-on-surface-variant border-outline-variant",
};

const GAP_SECTIONS = [
  { key: "alignments", label: "Alignments", fieldMain: "finding", fieldDetail: "evidence", accent: "border-secondary/20 bg-secondary/10", labelColor: "text-secondary" },
  { key: "gaps", label: "Critical Gaps", fieldMain: "finding", fieldDetail: "evidence", accent: "border-error-container bg-error-container/20", labelColor: "text-error" },
  { key: "blind_spots", label: "Blind Spots", fieldMain: "finding", fieldDetail: "evidence", accent: "border-tertiary/20 bg-tertiary/10", labelColor: "text-tertiary" },
  { key: "recommendations", label: "Recommendations", fieldMain: "action", fieldDetail: "rationale", accent: "border-primary/20 bg-primary/10", labelColor: "text-primary" },
  { key: "competitive_contrast", label: "Competitive Contrast", fieldMain: "finding", fieldDetail: "evidence", accent: "border-tertiary/20 bg-tertiary/10", labelColor: "text-tertiary" },
];

export default function GapAnalysis({ apiBase, profile, signals, analysis, onGaps }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [battlecard, setBattlecard] = useState(null);
  const [battlecardLoading, setBattlecardLoading] = useState(false);
  const [battlecardError, setBattlecardError] = useState(null);
  const [showBattlecard, setShowBattlecard] = useState(false);
  const [battlecardCopied, setBattlecardCopied] = useState(false);

  const canRun = signals && analysis;

  async function handleRun() {
    if (!canRun) return;
    setLoading(true);
    setError(null);
    setBattlecard(null);
    setBattlecardError(null);
    setShowBattlecard(false);
    try {
      const res = await fetch(`${apiBase}/api/gaps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signals,
          analysis,
          profile,
          competitor_signals: signals?.competitor_signals || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
      onGaps(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateBattlecard() {
    setBattlecardLoading(true);
    setBattlecardError(null);
    try {
      const res = await fetch(`${apiBase}/api/battlecard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitive_contrast: result.gaps.competitive_contrast,
          signals,
          profile,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setBattlecard(data.battlecard);
      setShowBattlecard(true);
    } catch (err) {
      setBattlecardError(err.message);
    } finally {
      setBattlecardLoading(false);
    }
  }

  function handleCopyBattlecard() {
    navigator.clipboard.writeText(battlecard).then(() => {
      setBattlecardCopied(true);
      setTimeout(() => setBattlecardCopied(false), 2000);
    });
  }

  const hasCompetitiveContrast =
    result && typeof result.gaps !== "string" && result.gaps?.competitive_contrast?.length > 0;

  return (
    <div className="space-y-6 max-w-4xl">
      {!canRun && (
        <div className="rounded-md bg-tertiary/10 border border-tertiary/20 px-4 py-3 text-sm text-tertiary">
          Complete both Signal Collection and Data Analysis before running gap analysis.
        </div>
      )}

      <button
        onClick={handleRun}
        disabled={!canRun || loading}
        className="bg-[#5C6BC0] text-white px-6 py-2.5 rounded-xl font-label font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-40"
      >
        {loading ? "Analyzing..." : "Run Gap Analysis"}
      </button>

      {error && (
        <div className="rounded-md bg-error-container/20 border border-error-container px-4 py-3 text-sm text-on-error-container">
          {error}
        </div>
      )}

      {loading && (
        <StepProgress
          steps={[
            "Cross-referencing signals with data...",
            "Identifying gaps and opportunities with AI...",
          ]}
          active={loading}
        />
      )}

      {result && !loading && (
        typeof result.gaps === "string" ? (
          <div className="rounded-xl border border-[rgba(174,186,255,0.08)] p-6 backdrop-blur-[12px]" style={{ backgroundColor: "rgba(22, 25, 34, 0.45)" }}>
            <h3 className="text-sm font-semibold text-primary mb-3">Gap Analysis Report</h3>
            <div className="text-sm text-on-surface-variant whitespace-pre-wrap leading-relaxed">
              {result.gaps}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {result.gaps?.messaging_alignment && (() => {
              const ma = result.gaps.messaging_alignment;
              const scoreColor = ma.score >= 8
                ? "text-secondary border-secondary/20 bg-secondary/10"
                : ma.score >= 5
                ? "text-tertiary border-tertiary/20 bg-tertiary/10"
                : "text-error border-error-container bg-error-container/20";
              const labelColor = ma.score >= 8
                ? "text-secondary border-secondary/20"
                : ma.score >= 5
                ? "text-tertiary border-tertiary/20"
                : "text-error border-error-container";
              const [textClass, borderClass, bgClass] = scoreColor.split(" ");
              return (
                <div className={`rounded-lg border p-5 ${borderClass} ${bgClass}`}>
                  <div className="flex items-center gap-4">
                    <div className={`text-3xl font-bold ${textClass}`}>
                      {ma.score}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-on-surface">Messaging Alignment</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${labelColor}`}>
                          {ma.label}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant">{ma.rationale}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {result.gaps?.mindshare_risk && (
              <div className="rounded-lg border border-tertiary/20 bg-tertiary/10 p-5">
                <div className="flex items-start gap-3">
                  <span className="text-tertiary text-lg mt-0.5">⚠</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-on-surface">Mindshare Risk</span>
                      <span className="text-xs px-2 py-0.5 rounded-full border border-tertiary/20 text-tertiary">
                        {result.gaps.mindshare_risk.top_threat}
                      </span>
                    </div>
                    <p className="text-sm text-on-surface-variant">{result.gaps.mindshare_risk.summary}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Competitive Gap Heat Map */}
            {(() => {
              const cc = result.gaps?.competitive_contrast || [];
              const scored = cc.filter((item) => item.pain_intensity != null && item.competitor_presence != null);
              if (scored.length === 0) return null;

              const quadrants = {
                opportunity: { label: "Your Opportunity", desc: "High pain, low competitor", color: "border-secondary/20 bg-secondary/10", textColor: "text-secondary", chipColor: "border-secondary/30 bg-secondary/5 text-secondary", items: [] },
                contested: { label: "Contested", desc: "High pain, high competitor", color: "border-tertiary/20 bg-tertiary/10", textColor: "text-tertiary", chipColor: "border-tertiary/30 bg-tertiary/5 text-tertiary", items: [] },
                monitor: { label: "Monitor", desc: "Low pain, low competitor", color: "border-outline-variant/20 bg-surface-container-high", textColor: "text-outline", chipColor: "border-outline-variant bg-surface-container-low text-on-surface-variant", items: [] },
                ceded: { label: "Ceded", desc: "Low pain, high competitor", color: "border-error-container bg-error-container/10", textColor: "text-error", chipColor: "border-error-container/30 bg-error-container/5 text-error", items: [] },
              };

              scored.forEach((item) => {
                const highPain = item.pain_intensity >= 4;
                const highComp = item.competitor_presence >= 4;
                if (highPain && !highComp) quadrants.opportunity.items.push(item);
                else if (highPain && highComp) quadrants.contested.items.push(item);
                else if (!highPain && !highComp) quadrants.monitor.items.push(item);
                else quadrants.ceded.items.push(item);
              });

              return (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-on-surface">Competitive Gap Heat Map</h3>
                  <div className="flex gap-2">
                    {/* Y-axis label */}
                    <div className="flex items-center">
                      <span className="text-[9px] font-label text-outline uppercase tracking-widest" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                        Pain Intensity →
                      </span>
                    </div>
                    {/* 2x2 grid */}
                    <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-2">
                      {/* Top-left: Your Opportunity (high pain, low competitor) */}
                      {[["opportunity", "contested"], ["monitor", "ceded"]].map((row, ri) => (
                        row.map((key) => {
                          const q = quadrants[key];
                          return (
                            <div key={key} className={`rounded-xl border p-4 min-h-[100px] ${q.color}`}>
                              <p className={`text-[10px] font-label font-bold uppercase tracking-widest mb-1 ${q.textColor}`}>{q.label}</p>
                              <p className="text-[9px] text-outline mb-2">{q.desc}</p>
                              {q.items.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {q.items.map((item, i) => (
                                    <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full border ${q.chipColor}`}>
                                      {item.finding?.slice(0, 30)}{item.finding?.length > 30 ? "..." : ""} · {item.competitor}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[9px] text-outline/50 italic">No findings</p>
                              )}
                            </div>
                          );
                        })
                      ))}
                    </div>
                  </div>
                  {/* X-axis label */}
                  <div className="text-center ml-6">
                    <span className="text-[9px] font-label text-outline uppercase tracking-widest">Competitor Presence →</span>
                  </div>
                </div>
              );
            })()}

            {GAP_SECTIONS.map((section) => {
              const items = result.gaps?.[section.key];
              if (!items?.length) return null;
              return (
                <div key={section.key} className="space-y-3">
                  <h3 className={`text-sm font-semibold ${section.labelColor}`}>
                    {section.label}
                  </h3>
                  {items.map((item, i) => (
                    <div
                      key={i}
                      className={`rounded-lg border p-4 ${section.accent}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-on-surface">
                          {item[section.fieldMain]}
                        </p>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {item.competitor && (
                            <span className="text-xs px-2 py-0.5 rounded-full border border-tertiary/20 text-tertiary">
                              {item.competitor}
                            </span>
                          )}
                          {item.confidence && (
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${CONFIDENCE_COLORS[item.confidence] || CONFIDENCE_COLORS.Low}`}>
                              {item.confidence}
                            </span>
                          )}
                        </div>
                      </div>
                      {item[section.fieldDetail] && (
                        <p className="text-xs text-on-surface-variant mt-1">
                          {item[section.fieldDetail]}
                        </p>
                      )}
                      {item.confidence_rationale && (
                        <p className="text-xs text-outline mt-1 italic">
                          {item.confidence_rationale}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}

            {hasCompetitiveContrast && (
              <div className="space-y-3">
                <button
                  onClick={handleGenerateBattlecard}
                  disabled={battlecardLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-surface-container-high border border-outline-variant hover:bg-surface-bright text-on-surface font-label text-xs transition-all px-4 py-2 disabled:opacity-40"
                >
                  {battlecardLoading && <Spinner size="sm" />}
                  {battlecardLoading ? "Generating..." : "Generate Battlecard"}
                </button>

                {battlecardError && (
                  <div className="rounded-md bg-error-container/20 border border-error-container px-4 py-3 text-sm text-on-error-container">
                    {battlecardError}
                  </div>
                )}

                {battlecard && (
                  <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-outline-variant/10">
                      <h3 className="text-sm font-semibold text-tertiary">Competitor Battlecard</h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCopyBattlecard}
                          className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs transition-colors ${
                            battlecardCopied
                              ? "border-secondary/30 text-secondary"
                              : "border-outline-variant text-on-surface-variant hover:border-outline-variant hover:text-on-surface"
                          }`}
                        >
                          <Copy size={12} />
                          {battlecardCopied ? "Copied" : "Copy"}
                        </button>
                        <button
                          onClick={() => setShowBattlecard(!showBattlecard)}
                          className="rounded-md border border-outline-variant p-1 text-on-surface-variant hover:border-outline-variant hover:text-on-surface transition-colors"
                        >
                          {showBattlecard ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>
                    {showBattlecard && (
                      <div className="px-5 py-4">
                        <div className="text-sm text-on-surface-variant whitespace-pre-wrap leading-relaxed">
                          {battlecard}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
