import React, { useState } from "react";
import { X } from "lucide-react";

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

export default function ProfileSettings({ profile, onSave, onClose }) {
  const initial = resolveInitialIndustry(profile?.industry);

  const [form, setForm] = useState({
    companyName: profile?.companyName || "",
    industry: initial.industry,
    industryOther: initial.industryOther,
    subIndustry: profile?.subIndustry || "",
    companySize: profile?.companySize || "",
    context: profile?.context || "",
  });

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
      companySize: form.companySize,
      context: form.context.trim(),
    };
    const hasContent =
      trimmed.companyName || trimmed.industry || trimmed.subIndustry ||
      trimmed.companySize || trimmed.context;
    onSave(hasContent ? trimmed : null);
    onClose();
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
