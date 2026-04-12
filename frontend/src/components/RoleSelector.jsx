import React, { useState } from "react";
import AUDIENCES from "../audiences";
import prismLogo from "../assets/prism-logo.png";

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
};

export default function RoleSelector({ onSelect, profile, onOpenSettings, onLoadDemo }) {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <div className="relative min-h-screen bg-surface text-on-surface font-body overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 dot-matrix pointer-events-none -z-10" />
      <div className="fixed top-[-10%] left-[-10%] w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-tertiary/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Top bar: logo left, settings right */}
      <div className="absolute top-0 left-0 right-0 z-10 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center">
          {logoFailed ? (
            <span className="material-symbols-outlined text-[#5C6BC0] text-7xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              filter_center_focus
            </span>
          ) : (
            <img
              src={prismLogo}
              alt="Prism"
              className="h-24 w-auto"
              onError={() => setLogoFailed(true)}
            />
          )}
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
          <p className="text-on-surface-variant text-xl max-w-2xl mx-auto leading-relaxed">
            Every role sees different signals. Select yours and Prism will refract the intelligence through the priorities that matter to you.
          </p>
        </header>

        {/* Role cards - bento grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {AUDIENCES.map((a) => {
            const icon = ROLE_ICONS[a.id] || "person";
            return (
              <button
                key={a.id}
                onClick={() => onSelect(a.id)}
                className="group relative overflow-hidden bg-surface-container-low rounded-xl p-6 border border-outline-variant/10 hover:border-primary/30 transition-all duration-500 text-left focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 blur-[40px] group-hover:bg-primary/20 transition-all"></div>
                <div className="flex items-start gap-3 relative">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                    <span className="material-symbols-outlined text-xl">{icon}</span>
                  </div>
                  <div>
                    <div className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors font-headline">
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
