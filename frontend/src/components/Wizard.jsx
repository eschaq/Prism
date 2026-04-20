import React from "react";
import SignalPanel from "./SignalPanel";
import DataPanel from "./DataPanel";
import GapAnalysis from "./GapAnalysis";
import NarrativePanel from "./NarrativePanel";
import VisibilityPanel from "./VisibilityPanel";

export default function Wizard({
  steps,
  activeIndex,
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
  onSignalTopicChange,
  onSignalsLoadingChange,
  onDataLoadedChange,
  onAnalysisLoadingChange,
  onGapsLoadingChange,
  onBriefLoadingChange,
}) {
  const activeStep = steps[activeIndex];

  return (
    <div>
      {activeStep === "signals" && (
        <SignalPanel apiBase={apiBase} profile={profile} initialConfig={initialConfig} onSignals={onSignals} onSignalTopicChange={onSignalTopicChange} onSignalsLoadingChange={onSignalsLoadingChange} />
      )}
      {activeStep === "data" && (
        <DataPanel apiBase={apiBase} profile={profile} onAnalysis={onAnalysis} onDataLoadedChange={onDataLoadedChange} onAnalysisLoadingChange={onAnalysisLoadingChange} />
      )}
      {activeStep === "gaps" && (
        <GapAnalysis
          apiBase={apiBase}
          profile={profile}
          signals={signals}
          analysis={analysis}
          onGaps={onGaps}
          onGapsLoadingChange={onGapsLoadingChange}
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
          onBriefLoadingChange={onBriefLoadingChange}
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
