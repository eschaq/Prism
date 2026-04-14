import React, { useState, useEffect } from "react";
import AUDIENCES from "../audiences";

const ROLE_ICONS = {
  cfo: "account_balance",
  operations: "precision_manufacturing",
  marketing: "campaign",
  sales: "storefront",
  product: "inventory_2",
  sales_engineer: "engineering",
  hr: "groups",
  supply_chain: "local_shipping",
  customer_success: "support_agent",
  risk_compliance: "shield",
  board: "corporate_fare",
  small_business: "store",
  cio: "hub",
};

export const ROLE_COLORS = {
  cfo: "#6366f1",
  operations: "#14b8a6",
  marketing: "#ec4899",
  sales: "#f97316",
  product: "#8b5cf6",
  sales_engineer: "#06b6d4",
  hr: "#22c55e",
  supply_chain: "#f59e0b",
  customer_success: "#10b981",
  risk_compliance: "#ef4444",
  board: "#3b82f6",
  small_business: "#eab308",
  cio: "#a855f7",
};

export default function RoleSelector({ onSelect, profile, onOpenSettings, onLoadDemo }) {
  const profileIncomplete = !profile || !profile.companyName || !profile.industry;

  // Auto-open profile settings on first visit if empty
  useEffect(() => {
    if (!profile) {
      onOpenSettings();
    }
  }, []);

  return (
    <div className="relative min-h-screen bg-surface text-on-surface font-body overflow-hidden">
      {/* Background image */}
      <img src="/assets/prism-backround.png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-35 pointer-events-none" style={{zIndex: 0}} />
      {/* Background effects */}
      <div className="fixed inset-0 dot-matrix pointer-events-none z-0" />
      <div className="fixed top-[-10%] left-[-10%] w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-tertiary/5 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* Top bar: logo left, settings right */}
      <div className="absolute top-0 left-0 right-0 z-10 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center">
          <img src="/assets/prism-logo.png" alt="Prism" className="h-12 w-auto" onError={(e) => { e.target.style.display='none'; }} />
        </div>
        <button
          onClick={onOpenSettings}
          className="relative p-2 text-on-surface-variant hover:text-white hover:bg-surface-container-low rounded-lg transition-all"
          title="Company Profile Settings"
        >
          <span className="material-symbols-outlined">settings</span>
          {profile && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-secondary" />
          )}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-8 pt-28 pb-16 relative z-10">
        {/* Hero */}
        <header className="mb-14 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-container/10 border border-primary-container/20 text-primary text-xs font-label mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            SYSTEM ACTIVE · AWAITING ROLE ASSIGNMENT
          </div>

          <h1 className="text-6xl font-extrabold tracking-tighter text-white mb-6 font-headline">
            Choose Your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              Lens.
            </span>
          </h1>
        </header>

        <div className="max-w-5xl mx-auto mb-10">
          <div className="rounded-xl border border-[rgba(174,186,255,0.08)] border-l-4 border-l-[#aebaff] p-6 max-w-2xl mx-auto backdrop-blur-[12px]" style={{ backgroundColor: "rgba(22, 25, 34, 0.45)" }}>
            <p className="text-base text-white leading-relaxed">
              83% of your buyers make decisions in channels your analytics will never see — Reddit threads, community forums, peer conversations. That's the dark funnel. Prism makes it visible. Pick your role below and it frames everything around what matters to you. Same data, different lens. Prism is the narrative intelligence layer your BI tools and market research were never designed to be.
            </p>
          </div>
        </div>

        {profileIncomplete && (
          <div className="max-w-5xl mx-auto mb-6 flex items-center justify-between gap-4 rounded-xl border border-tertiary/20 bg-tertiary/5 px-5 py-3 backdrop-blur-[12px]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary text-sm">info</span>
              <p className="text-sm text-tertiary">Set up your company profile for personalized results.</p>
            </div>
            <button
              onClick={onOpenSettings}
              className="shrink-0 rounded-lg bg-tertiary/10 border border-tertiary/20 px-4 py-1.5 text-xs font-label font-bold text-tertiary hover:bg-tertiary/20 transition-colors"
            >
              Set up profile
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {AUDIENCES.map((a) => {
            const icon = ROLE_ICONS[a.id] || "person";
            const accent = ROLE_COLORS[a.id] || "#aebaff";
            return (
              <button
                key={a.id}
                onClick={() => onSelect(a.id)}
                className="group relative overflow-hidden rounded-xl p-6 border border-[rgba(174,186,255,0.08)] border-l-2 transition-all duration-500 text-left focus:outline-none focus:ring-1 backdrop-blur-[12px]"
                style={{
                  backgroundColor: "rgba(22, 25, 34, 0.45)",
                  borderLeftColor: accent,
                  "--accent": accent,
                }}
              >
                <div className="absolute top-0 right-0 w-24 h-24 blur-[40px] transition-all opacity-10 group-hover:opacity-20" style={{ backgroundColor: accent }}></div>
                <div className="flex items-start gap-3 relative">
                  <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: `${accent}15`, color: accent }}>
                    <span className="material-symbols-outlined text-xl">{icon}</span>
                  </div>
                  <div>
                    <div className="font-bold text-sm text-on-surface transition-colors font-headline" style={{ "--hover-color": accent }}>
                      {a.label}
                    </div>
                    <div className="text-xs text-on-surface-variant mt-1 font-body leading-relaxed">
                      {a.description}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Demo button */}
        <div className="mt-12 text-center">
          <p className="text-[10px] text-outline mb-3 font-label uppercase tracking-widest">or try a pre-configured scenario</p>
          <button
            onClick={onLoadDemo}
            className="rounded-xl bg-surface-container-low px-6 py-2.5 text-sm text-on-surface-variant border border-outline-variant/10 hover:border-tertiary/30 hover:text-tertiary hover:bg-surface-bright transition-all duration-300 font-label font-bold flex items-center gap-2 mx-auto"
          >
            <span className="material-symbols-outlined text-sm">science</span>
            Load Demo: Acme Analytics
          </button>
        </div>
      </main>
    </div>
  );
}
