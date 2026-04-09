import React, { useState } from "react";
import AUDIENCES from "./audiences";
import RoleSelector from "./components/RoleSelector";
import SignalPanel from "./components/SignalPanel";
import DataPanel from "./components/DataPanel";
import NarrativePanel from "./components/NarrativePanel";
import GapAnalysis from "./components/GapAnalysis";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function App() {
  const [audience, setAudience] = useState(null);
  const [signals, setSignals] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [gaps, setGaps] = useState(null);
  const [activeTab, setActiveTab] = useState("signals");

  if (!audience) {
    return <RoleSelector onSelect={setAudience} />;
  }

  const audienceLabel = AUDIENCES.find((a) => a.id === audience)?.label ?? audience;

  const tabs = [
    { id: "signals", label: "Signal Collection" },
    { id: "data", label: "Data Analysis" },
    { id: "gaps", label: "Gap Analysis" },
    { id: "narrative", label: "Narrative Engine" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="text-indigo-400">Prism</span>
              <span className="ml-2 text-sm font-normal text-gray-400">
                Enterprise Intelligence Platform
              </span>
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              One source of truth. Every audience, perfectly framed.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-300">
              <span className="text-xs text-gray-500 mr-1">Role:</span>
              <span className="font-medium text-indigo-400">{audienceLabel}</span>
            </span>
            <button
              onClick={() => setAudience(null)}
              className="rounded-md border border-gray-700 px-3 py-1 text-xs text-gray-400 hover:border-gray-500 hover:text-gray-200 transition-colors"
            >
              Change role
            </button>
          </div>
        </div>
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
          <NarrativePanel apiBase={API_BASE} audience={audience} signals={signals} analysis={analysis} gaps={gaps} />
        )}
      </main>
    </div>
  );
}
