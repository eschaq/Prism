import React, { useState } from "react";
import { Copy, ChevronDown, ChevronUp } from "lucide-react";
import { StepProgress, Spinner } from "./LoadingStates";

const CONFIDENCE_COLORS = {
  High: "text-green-400 border-green-800",
  Medium: "text-yellow-400 border-yellow-800",
  Low: "text-gray-400 border-gray-700",
};

const GAP_SECTIONS = [
  { key: "alignments", label: "Alignments", fieldMain: "finding", fieldDetail: "evidence", accent: "border-green-800 bg-green-950", labelColor: "text-green-400" },
  { key: "gaps", label: "Critical Gaps", fieldMain: "finding", fieldDetail: "evidence", accent: "border-red-800 bg-red-950", labelColor: "text-red-400" },
  { key: "blind_spots", label: "Blind Spots", fieldMain: "finding", fieldDetail: "evidence", accent: "border-yellow-800 bg-yellow-950", labelColor: "text-yellow-400" },
  { key: "recommendations", label: "Recommendations", fieldMain: "action", fieldDetail: "rationale", accent: "border-indigo-800 bg-indigo-950", labelColor: "text-indigo-400" },
  { key: "competitive_contrast", label: "Competitive Contrast", fieldMain: "finding", fieldDetail: "evidence", accent: "border-orange-800 bg-orange-950", labelColor: "text-orange-400" },
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
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-100">Gap Analysis</h2>
        <p className="text-sm text-gray-400 mt-1">
          Cross-reference market signals with internal data to surface misalignments and opportunities.
        </p>
      </div>

      {!canRun && (
        <div className="rounded-md border border-yellow-800 bg-yellow-950 px-4 py-3 text-sm text-yellow-300">
          Complete both Signal Collection and Data Analysis before running gap analysis.
        </div>
      )}

      <button
        onClick={handleRun}
        disabled={!canRun || loading}
        className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors"
      >
        {loading ? "Analyzing..." : "Run Gap Analysis"}
      </button>

      {error && (
        <div className="rounded-md bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300">
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
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
            <h3 className="text-sm font-semibold text-indigo-400 mb-3">Gap Analysis Report</h3>
            <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
              {result.gaps}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {result.gaps?.messaging_alignment && (() => {
              const ma = result.gaps.messaging_alignment;
              const scoreColor = ma.score >= 8
                ? "text-green-400 border-green-800 bg-green-950"
                : ma.score >= 5
                ? "text-yellow-400 border-yellow-800 bg-yellow-950"
                : "text-red-400 border-red-800 bg-red-950";
              const labelColor = ma.score >= 8
                ? "text-green-400 border-green-800"
                : ma.score >= 5
                ? "text-yellow-400 border-yellow-800"
                : "text-red-400 border-red-800";
              const [textClass, borderClass, bgClass] = scoreColor.split(" ");
              return (
                <div className={`rounded-lg border p-5 ${borderClass} ${bgClass}`}>
                  <div className="flex items-center gap-4">
                    <div className={`text-3xl font-bold ${textClass}`}>
                      {ma.score}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-100">Messaging Alignment</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${labelColor}`}>
                          {ma.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">{ma.rationale}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {result.gaps?.mindshare_risk && (
              <div className="rounded-lg border border-orange-800 bg-orange-950 p-5">
                <div className="flex items-start gap-3">
                  <span className="text-orange-400 text-lg mt-0.5">⚠</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-gray-100">Mindshare Risk</span>
                      <span className="text-xs px-2 py-0.5 rounded-full border border-orange-800 text-orange-400">
                        {result.gaps.mindshare_risk.top_threat}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">{result.gaps.mindshare_risk.summary}</p>
                  </div>
                </div>
              </div>
            )}

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
                        <p className="text-sm font-medium text-gray-100">
                          {item[section.fieldMain]}
                        </p>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {item.competitor && (
                            <span className="text-xs px-2 py-0.5 rounded-full border border-orange-800 text-orange-400">
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
                        <p className="text-xs text-gray-400 mt-1">
                          {item[section.fieldDetail]}
                        </p>
                      )}
                      {item.confidence_rationale && (
                        <p className="text-xs text-gray-500 mt-1 italic">
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
                  className="inline-flex items-center gap-1.5 rounded-md border border-orange-800 px-4 py-2 text-xs font-medium text-orange-400 hover:bg-orange-950 disabled:opacity-40 transition-colors"
                >
                  {battlecardLoading && <Spinner size="sm" />}
                  {battlecardLoading ? "Generating..." : "Generate Battlecard"}
                </button>

                {battlecardError && (
                  <div className="rounded-md bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300">
                    {battlecardError}
                  </div>
                )}

                {battlecard && (
                  <div className="rounded-lg border border-gray-800 bg-gray-900">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
                      <h3 className="text-sm font-semibold text-orange-400">Competitor Battlecard</h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCopyBattlecard}
                          className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs transition-colors ${
                            battlecardCopied
                              ? "border-green-700 text-green-400"
                              : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200"
                          }`}
                        >
                          <Copy size={12} />
                          {battlecardCopied ? "Copied" : "Copy"}
                        </button>
                        <button
                          onClick={() => setShowBattlecard(!showBattlecard)}
                          className="rounded-md border border-gray-700 p-1 text-gray-400 hover:border-gray-500 hover:text-gray-200 transition-colors"
                        >
                          {showBattlecard ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>
                    {showBattlecard && (
                      <div className="px-5 py-4">
                        <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
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
