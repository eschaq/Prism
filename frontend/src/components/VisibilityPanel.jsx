import React, { useState } from "react";
import { StepProgress } from "./LoadingStates";

const VISIBILITY_COLORS = {
  Visible: "text-green-400 border-green-800 bg-green-950",
  "Partially Visible": "text-yellow-400 border-yellow-800 bg-yellow-950",
  "Not Visible": "text-red-400 border-red-800 bg-red-950",
};

export default function VisibilityPanel({ apiBase, profile, onVisibility }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const hasCompany = !!profile?.companyName;
  const competitorsRaw = profile?.competitors || "";
  const competitors = competitorsRaw.split(",").map((c) => c.trim()).filter(Boolean);
  const canRun = hasCompany && competitors.length > 0;

  async function handleRun() {
    if (!canRun) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/visibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: profile.companyName,
          industry: profile.industry || "General",
          competitors,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
      if (onVisibility) onVisibility(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-100">AI Visibility</h2>
        <p className="text-sm text-gray-400 mt-1">
          Assess how visible your company and competitors are in AI-generated search responses.
        </p>
      </div>

      {!canRun && (
        <div className="rounded-md border border-yellow-800 bg-yellow-950 px-4 py-3 text-sm text-yellow-300">
          Configure your company name and competitors in Profile Settings to run AI visibility assessment.
        </div>
      )}

      <button
        onClick={handleRun}
        disabled={!canRun || loading}
        className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors"
      >
        {loading ? "Assessing..." : "Run Visibility Assessment"}
      </button>

      {error && (
        <div className="rounded-md bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <StepProgress
          steps={[
            "Preparing visibility analysis...",
            "Assessing AI search presence...",
          ]}
          active={loading}
        />
      )}

      {result && !loading && (
        Array.isArray(result.assessments) ? (
          <div className="space-y-4">
            {result.assessments.map((a, i) => {
              const tierColor = VISIBILITY_COLORS[a.visibility] || VISIBILITY_COLORS["Not Visible"];
              return (
                <div key={i} className="rounded-lg border border-gray-800 bg-gray-900 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-100">
                      {a.entity}
                      {a.is_primary_company && (
                        <span className="ml-2 text-xs font-normal text-indigo-400">(You)</span>
                      )}
                    </h3>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full border ${tierColor}`}>
                      {a.visibility}
                    </span>
                  </div>

                  <p className="text-sm text-gray-300">{a.rationale}</p>

                  {a.strengths?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-green-400 mb-1">Strengths</p>
                      <ul className="text-xs text-gray-400 space-y-0.5">
                        {a.strengths.map((s, j) => (
                          <li key={j} className="flex items-start gap-1.5">
                            <span className="text-green-600 mt-0.5">+</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {a.gaps?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-red-400 mb-1">Gaps</p>
                      <ul className="text-xs text-gray-400 space-y-0.5">
                        {a.gaps.map((g, j) => (
                          <li key={j} className="flex items-start gap-1.5">
                            <span className="text-red-600 mt-0.5">-</span>
                            <span>{g}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
            <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
              {typeof result.assessments === "string" ? result.assessments : JSON.stringify(result, null, 2)}
            </div>
          </div>
        )
      )}
    </div>
  );
}
