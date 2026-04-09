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
    steps: ["signals", "data", "gaps", "narrative"],
  },
];

const STEP_META = {
  signals: { label: "Signal Collection", description: "Scrape Reddit for market themes" },
  data: { label: "Data Analysis", description: "Upload and analyze CSV data" },
  gaps: { label: "Gap Analysis", description: "Cross-reference signals with data" },
  narrative: { label: "Narrative Engine", description: "Generate audience-specific briefing" },
};

export { PATHS, STEP_META };
