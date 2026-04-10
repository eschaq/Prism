import React, { useState } from "react";
import { X } from "lucide-react";
import { Spinner } from "./LoadingStates";

const COMPANY_SIZES = ["1-50", "51-200", "201-1000", "1001-5000", "5000+"];

const INDUSTRIES = [
  "Business Intelligence & Analytics",
  "Data Engineering & Infrastructure",
  "Marketing & Advertising",
  "E-commerce & Retail",
  "Finance & Accounting",
  "SaaS & Technology",
  "AI & Machine Learning",
  "Sales & Revenue Operations",
  "Supply Chain & Operations",
  "HR & People Analytics",
  "Agency & Consulting",
  "Small Business & Entrepreneurship",
  "Other",
];

function resolveInitialIndustry(saved) {
  if (!saved) return { industry: "", industryOther: "" };
  if (INDUSTRIES.includes(saved)) return { industry: saved, industryOther: "" };
  // Saved value doesn't match any option — treat as "Other" with free text
  return { industry: "Other", industryOther: saved };
}

export default function ProfileSettings({ apiBase, profile, onSave, onClose }) {
  const initial = resolveInitialIndustry(profile?.industry);

  const [form, setForm] = useState({
    companyName: profile?.companyName || "",
    industry: initial.industry,
    industryOther: initial.industryOther,
    subIndustry: profile?.subIndustry || "",
    competitors: profile?.competitors || "",
    companySize: profile?.companySize || "",
    context: profile?.context || "",
  });
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    const resolvedIndustry =
      form.industry === "Other" ? form.industryOther.trim() : form.industry;

    const trimmed = {
      companyName: form.companyName.trim(),
      industry: resolvedIndustry,
      subIndustry: form.subIndustry.trim(),
      competitors: form.competitors.trim(),
      companySize: form.companySize,
      context: form.context.trim(),
    };
    const hasContent =
      trimmed.companyName || trimmed.industry || trimmed.subIndustry ||
      trimmed.competitors || trimmed.companySize || trimmed.context;
    onSave(hasContent ? trimmed : null);
    onClose();
  }

  async function handleSuggestCompetitors() {
    const resolvedIndustry =
      form.industry === "Other" ? form.industryOther.trim() : form.industry;
    if (!form.companyName.trim() || !resolvedIndustry) return;
    setLoadingSuggestions(true);
    setSuggestions([]);
    try {
      const res = await fetch(`${apiBase}/api/suggest-competitors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: form.companyName.trim(),
          industry: resolvedIndustry,
          sub_industry: form.subIndustry.trim() || null,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.suggested)) {
        setSuggestions(data.suggested.map((name) => ({ name, checked: true })));
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingSuggestions(false);
    }
  }

  function toggleSuggestion(name) {
    setSuggestions((prev) =>
      prev.map((s) => (s.name === name ? { ...s, checked: !s.checked } : s))
    );
  }

  function handleAddSelected() {
    const existingList = form.competitors.split(",").map((c) => c.trim()).filter(Boolean);
    const existingLower = new Set(existingList.map((c) => c.toLowerCase()));
    const selected = suggestions
      .filter((s) => s.checked && !existingLower.has(s.name.toLowerCase()))
      .map((s) => s.name);
    const remaining = 8 - existingList.length;
    const toAdd = selected.slice(0, Math.max(0, remaining));
    const current = form.competitors.trim();
    const updated = current
      ? `${current}, ${toAdd.join(", ")}`
      : toAdd.join(", ");
    handleChange("competitors", updated);
    setSuggestions([]);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-gray-950 border-l border-gray-800 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-gray-100">Company Profile</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <p className="text-xs text-gray-500">
            This information helps personalize all analysis and briefings to your company.
          </p>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Company Name
            </label>
            <input
              value={form.companyName}
              onChange={(e) => handleChange("companyName", e.target.value)}
              className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Acme Corp"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Industry
            </label>
            <select
              value={form.industry}
              onChange={(e) => handleChange("industry", e.target.value)}
              className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select industry...</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>

          {form.industry === "Other" && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Specify industry
              </label>
              <input
                value={form.industryOther}
                onChange={(e) => handleChange("industryOther", e.target.value)}
                className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Healthcare logistics, Legal tech"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Sub-industry (optional)
            </label>
            <input
              value={form.subIndustry}
              onChange={(e) => handleChange("subIndustry", e.target.value)}
              className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Revenue analytics, B2B payments"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Primary Competitors (optional, max 8)
            </label>
            <input
              value={form.competitors}
              onChange={(e) => handleChange("competitors", e.target.value)}
              className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Tableau, Looker, Metabase"
            />
            <button
              type="button"
              onClick={handleSuggestCompetitors}
              disabled={!form.companyName.trim() || (!form.industry && !form.industryOther.trim()) || loadingSuggestions}
              className="inline-flex items-center gap-1.5 mt-2 rounded-md border border-gray-700 px-3 py-1 text-xs text-gray-400 hover:border-gray-500 hover:text-gray-200 disabled:opacity-40 transition-colors"
            >
              {loadingSuggestions && <Spinner size="sm" />}
              {loadingSuggestions ? "Suggesting..." : "Suggest Competitors"}
            </button>
            {suggestions.length > 0 && (() => {
              const currentCount = form.competitors.split(",").map((c) => c.trim()).filter(Boolean).length;
              const currentLower = new Set(form.competitors.split(",").map((c) => c.trim().toLowerCase()).filter(Boolean));
              const checkedNew = suggestions.filter((s) => s.checked && !currentLower.has(s.name.toLowerCase())).length;
              const wouldTotal = currentCount + checkedNew;

              return (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-gray-500">
                  {currentCount}/8 competitors set — {Math.max(0, 8 - currentCount)} slots available
                </p>
                {suggestions.map((s) => {
                  const isNew = !currentLower.has(s.name.toLowerCase());
                  const atLimit = wouldTotal >= 8 && !s.checked && isNew;
                  return (
                  <label
                    key={s.name}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                      atLimit
                        ? "border-gray-800 bg-gray-900 text-gray-600 cursor-not-allowed"
                        : s.checked
                        ? "border-indigo-500 bg-indigo-950 text-indigo-300 cursor-pointer"
                        : "border-gray-700 bg-gray-800 text-gray-400 cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={s.checked}
                      disabled={atLimit}
                      onChange={() => toggleSuggestion(s.name)}
                      className="h-3 w-3 rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="text-xs">{s.name}</span>
                  </label>
                  );
                })}
                <button
                  type="button"
                  onClick={handleAddSelected}
                  disabled={!suggestions.some((s) => s.checked) || currentCount >= 8}
                  className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors"
                >
                  Add Selected{checkedNew > 0 ? ` (${Math.min(checkedNew, 8 - currentCount)})` : ""}
                </button>
              </div>
              );
            })()}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Company Size
            </label>
            <select
              value={form.companySize}
              onChange={(e) => handleChange("companySize", e.target.value)}
              className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select size...</option>
              {COMPANY_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} employees
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Additional Context
            </label>
            <textarea
              value={form.context}
              onChange={(e) => handleChange("context", e.target.value)}
              rows={4}
              className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="e.g. Expanding into APAC, main competitor is Globex, focused on mid-market customers"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-800">
          <button
            onClick={handleSave}
            className="w-full rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
}
