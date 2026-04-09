import React, { useState } from "react";
import SignalPanel from "./components/SignalPanel";
import DataPanel from "./components/DataPanel";
import NarrativePanel from "./components/NarrativePanel";
import GapAnalysis from "./components/GapAnalysis";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function App() {
  const [signals, setSignals] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [gaps, setGaps] = useState(null);
  const [activeTab, setActiveTab] = useState("signals");

  const tabs = [
    { id: "signals", label: "Signal Collection" },
    { id: "data", label: "Data Analysis" },
    { id: "gaps", label: "Gap Analysis" },
    { id: "narrative", label: "Narrative Engine" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-6 py-4">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-indigo-400">Prism</span>
          <span className="ml-2 text-sm font-normal text-gray-400">
            Enterprise Intelligence Platform
          </span>
        </h1>
        <p className="mt-1 text-xs text-gray-500">
          One source of truth. Every audience, perfectly framed.
        </p>
      </header>

      <nav className="flex gap-1 border-b border-gray-800 px-6 pt-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              activeTab === tab.id
                ? "bg-gray-800 text-indigo-400 border-b-2 border-indigo-400"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="p-6">
        {activeTab === "signals" && (
          <SignalPanel apiBase={API_BASE} onSignals={setSignals} />
        )}
        {activeTab === "data" && (
          <DataPanel apiBase={API_BASE} onAnalysis={setAnalysis} />
        )}
        {activeTab === "gaps" && (
          <GapAnalysis apiBase={API_BASE} signals={signals} analysis={analysis} onGaps={setGaps} />
        )}
        {activeTab === "narrative" && (
          <NarrativePanel apiBase={API_BASE} signals={signals} analysis={analysis} gaps={gaps} />
        )}
      </main>
    </div>
  );
}
