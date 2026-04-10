import React, { useState, useEffect } from "react";
import { STEP_META } from "../paths";
import SignalPanel from "./SignalPanel";
import DataPanel from "./DataPanel";
import GapAnalysis from "./GapAnalysis";
import NarrativePanel from "./NarrativePanel";
import VisibilityPanel from "./VisibilityPanel";

export default function Wizard({
  steps,
  apiBase,
  audience,
  profile,
  initialConfig,
  signals,
  analysis,
  gaps,
  narrative,
  visibility,
  onSignals,
  onAnalysis,
  onGaps,
  onNarrative,
  onVisibility,
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  const completionMap = {
    signals: signals !== null,
    data: analysis !== null,
    gaps: gaps !== null,
    narrative: narrative !== null,
    visibility: visibility !== null,
  };

  // Auto-advance when the current step completes
  useEffect(() => {
    const currentStep = steps[activeIndex];
    if (completionMap[currentStep] && activeIndex < steps.length - 1) {
      setActiveIndex(activeIndex + 1);
    }
  }, [signals, analysis, gaps, narrative, visibility]);

  const activeStep = steps[activeIndex];

  function canNavigate(index) {
    if (index === 0) return true;
    // Can navigate to a step if all prior steps are complete
    for (let i = 0; i < index; i++) {
      if (!completionMap[steps[i]]) return false;
    }
    return true;
  }

  return (
    <div className="space-y-6">
      {/* Horizontal step bar */}
      <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-800 -mx-6 -mt-6 mb-6">
        {steps.map((stepId, i) => {
          const meta = STEP_META[stepId];
          const isComplete = completionMap[stepId];
          const isActive = i === activeIndex;
          const clickable = canNavigate(i);

          return (
            <React.Fragment key={stepId}>
              {i > 0 && (
                <div
                  className={`flex-shrink-0 h-px w-8 ${
                    completionMap[steps[i - 1]] ? "bg-green-700" : "bg-gray-800"
                  }`}
                />
              )}
              <button
                onClick={() => clickable && setActiveIndex(i)}
                disabled={!clickable}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
                  isActive
                    ? "bg-gray-800 ring-1 ring-indigo-500"
                    : clickable
                    ? "hover:bg-gray-800/50"
                    : "opacity-40 cursor-not-allowed"
                }`}
              >
                <div
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isComplete
                      ? "bg-green-600 text-white"
                      : isActive
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-800 text-gray-500 border border-gray-700"
                  }`}
                >
                  {isComplete ? "\u2713" : i + 1}
                </div>
                <div>
                  <div
                    className={`text-xs font-medium ${
                      isComplete
                        ? "text-green-400"
                        : isActive
                        ? "text-indigo-400"
                        : "text-gray-500"
                    }`}
                  >
                    {meta.label}
                  </div>
                </div>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Active panel */}
      {activeStep === "signals" && (
        <SignalPanel apiBase={apiBase} profile={profile} initialConfig={initialConfig} onSignals={onSignals} />
      )}
      {activeStep === "data" && (
        <DataPanel apiBase={apiBase} profile={profile} onAnalysis={onAnalysis} />
      )}
      {activeStep === "gaps" && (
        <GapAnalysis
          apiBase={apiBase}
          profile={profile}
          signals={signals}
          analysis={analysis}
          onGaps={onGaps}
        />
      )}
      {activeStep === "narrative" && (
        <NarrativePanel
          apiBase={apiBase}
          audience={audience}
          profile={profile}
          signals={signals}
          analysis={analysis}
          gaps={gaps}
          visibility={visibility}
          onNarrative={onNarrative}
        />
      )}
      {activeStep === "visibility" && (
        <VisibilityPanel
          apiBase={apiBase}
          profile={profile}
          onVisibility={onVisibility}
        />
      )}
    </div>
  );
}
