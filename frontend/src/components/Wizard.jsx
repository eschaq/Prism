import React, { useState, useEffect, useRef } from "react";
import { STEP_META } from "../paths";
import { Spinner } from "./LoadingStates";
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
  const [transitioning, setTransitioning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [paused, setPaused] = useState(false);
  const advanceTimer = useRef(null);
  const countdownTimer = useRef(null);

  const completionMap = {
    signals: signals !== null,
    data: analysis !== null,
    gaps: gaps !== null,
    narrative: narrative !== null,
    visibility: visibility !== null,
  };

  function advanceNow() {
    clearTimeout(advanceTimer.current);
    clearInterval(countdownTimer.current);
    setTransitioning(false);
    setCountdown(0);
    setPaused(false);
    setActiveIndex((prev) => prev + 1);
  }

  function togglePause() {
    if (paused) {
      // Resume from current countdown
      countdownTimer.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimer.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      advanceTimer.current = setTimeout(() => {
        clearInterval(countdownTimer.current);
        setTransitioning(false);
        setCountdown(0);
        setPaused(false);
        setActiveIndex((prev) => prev + 1);
      }, countdown * 1000);
      setPaused(false);
    } else {
      // Pause
      clearTimeout(advanceTimer.current);
      clearInterval(countdownTimer.current);
      setPaused(true);
    }
  }

  // Auto-advance with 10-second countdown when the current step completes
  useEffect(() => {
    const currentStep = steps[activeIndex];
    if (completionMap[currentStep] && activeIndex < steps.length - 1) {
      setTransitioning(true);
      setPaused(false);
      setCountdown(10);
      countdownTimer.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimer.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      advanceTimer.current = setTimeout(() => {
        clearInterval(countdownTimer.current);
        setTransitioning(false);
        setCountdown(0);
        setActiveIndex(activeIndex + 1);
      }, 10000);
    }
    return () => {
      clearTimeout(advanceTimer.current);
      clearInterval(countdownTimer.current);
    };
  }, [signals, analysis, gaps, narrative, visibility]);

  const activeStep = steps[activeIndex];
  const nextStep = activeIndex < steps.length - 1 ? steps[activeIndex + 1] : null;
  const nextStepLabel = nextStep ? STEP_META[nextStep]?.label : null;

  function canNavigate(index) {
    if (index === 0) return true;
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
          const clickable = canNavigate(i) && !transitioning && !paused;

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

      {/* Transition countdown */}
      {transitioning && nextStepLabel && (
        <div className="flex items-center justify-center gap-3 py-3 -mt-6 mb-2 border-b border-gray-800">
          {!paused && <Spinner size="sm" />}
          <span className="text-xs text-gray-400">
            {paused
              ? `Paused — ${countdown}s remaining`
              : `Continuing to ${nextStepLabel} in ${countdown}s...`}
          </span>
          <button
            onClick={togglePause}
            className="rounded-md border border-gray-700 px-3 py-1 text-xs text-gray-400 hover:border-gray-500 hover:text-gray-200 transition-colors"
          >
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            onClick={advanceNow}
            className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            Continue now
          </button>
        </div>
      )}

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
