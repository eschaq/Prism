const PATHS = [
  {
    id: "signal_report",
    label: "Signal Report",
    description: "Market intelligence from Reddit",
    steps: ["signals"],
  },
  {
    id: "data_brief",
    label: "Data Brief",
    description: "Business summary from your CSV",
    steps: ["data"],
  },
  {
    id: "gap_analysis",
    label: "Gap Analysis",
    description: "Cross-reference signals with data",
    steps: ["signals", "data", "gaps"],
  },
  {
    id: "full_report",
    label: "Full Intelligence Report",
    description: "Complete briefing for your role",
    steps: ["signals", "data", "gaps", "visibility", "narrative"],
  },
];

const STEP_META = {
  signals: { label: "Market Intelligence", description: "What is your market saying right now?" },
  data: { label: "Data Insights", description: "What does your internal data show?" },
  gaps: { label: "Opportunity Gaps", description: "Where do the signals and the data disagree?" },
  narrative: { label: "Executive Briefing", description: "What does all of this mean for your role?" },
  visibility: { label: "AI Search Presence", description: "How visible are you in AI search results?" },
};

export { PATHS, STEP_META };
