import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Copy, Download, Mail } from "lucide-react";
import { StepProgress, Spinner } from "./LoadingStates";
import AUDIENCES from "../audiences";

const PROSE_CLASSES = "prose prose-sm prose-invert prose-headings:text-on-surface prose-headings:text-sm prose-headings:font-semibold prose-headings:mb-2 prose-headings:mt-4 prose-p:text-on-surface-variant prose-p:leading-relaxed prose-strong:text-on-surface prose-ul:text-on-surface-variant prose-ol:text-on-surface-variant prose-li:text-on-surface-variant max-w-none";

export default function NarrativePanel({ apiBase, audience, profile, signals, analysis, gaps, visibility, onNarrative }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedNotion, setCopiedNotion] = useState(false);
  const [copiedSlack, setCopiedSlack] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpAnswer, setFollowUpAnswer] = useState(null);
  const [followUpError, setFollowUpError] = useState(null);
  const [compareAudience, setCompareAudience] = useState(null);
  const [compareResult, setCompareResult] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState(null);

  const canRun = signals && analysis;
  const audienceLabel = AUDIENCES.find((a) => a.id === audience)?.label ?? audience;
  const compareLabel = AUDIENCES.find((a) => a.id === compareAudience)?.label ?? compareAudience;

  async function handleGenerate() {
    if (!canRun) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setActiveQuestion(null);
    setFollowUpAnswer(null);
    setFollowUpError(null);
    setCompareAudience(null);
    setCompareResult(null);
    setCompareError(null);
    try {
      const res = await fetch(`${apiBase}/api/narrative`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience, signals, analysis, gaps, profile, visibility }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
      if (onNarrative) onNarrative(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCompare() {
    if (!compareAudience) return;
    setCompareLoading(true);
    setCompareResult(null);
    setCompareError(null);
    try {
      const res = await fetch(`${apiBase}/api/narrative`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience: compareAudience, signals, analysis, gaps, profile, visibility }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCompareResult(data);
    } catch (err) {
      setCompareError(err.message);
    } finally {
      setCompareLoading(false);
    }
  }

  async function handleFollowUp(question) {
    setActiveQuestion(question);
    setFollowUpLoading(true);
    setFollowUpAnswer(null);
    setFollowUpError(null);
    try {
      const res = await fetch(`${apiBase}/api/narrative/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience,
          question,
          briefing: result.briefing,
          signals,
          analysis,
          gaps,
          profile,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setFollowUpAnswer(data.answer);
    } catch (err) {
      setFollowUpError(err.message);
    } finally {
      setFollowUpLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(result.briefing).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleCopyNotion() {
    const notionText = result.briefing
      .replace(/^###\s+(.+)$/gm, "$1")
      .replace(/^##\s+(.+)$/gm, "$1")
      .replace(/^#\s+(.+)$/gm, "$1");
    navigator.clipboard.writeText(notionText).then(() => {
      setCopiedNotion(true);
      setTimeout(() => setCopiedNotion(false), 2000);
    });
  }

  function handleCopySlack() {
    const lines = result.briefing
      .replace(/^#{1,3}\s+/gm, "")
      .replace(/\*\*/g, "*")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l);
    let slackText = lines.join("\n");
    const maxLen = 500 - "\n\nFull brief in Prism".length;
    if (slackText.length > maxLen) {
      slackText = slackText.slice(0, maxLen).replace(/\n[^\n]*$/, "") + "...";
    }
    slackText += "\n\nFull brief in Prism";
    navigator.clipboard.writeText(slackText).then(() => {
      setCopiedSlack(true);
      setTimeout(() => setCopiedSlack(false), 2000);
    });
  }

  function markdownToHtml(md) {
    return md
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      // Headers
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      // Bold
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      // Bullet lists
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>")
      // Numbered lists
      .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
      // Paragraphs (lines not already wrapped)
      .replace(/^(?!<[hul]|<li)(.+)$/gm, "<p>$1</p>")
      // Clean up empty paragraphs
      .replace(/<p>\s*<\/p>/g, "");
  }

  function handleDownloadPDF() {
    const title = `${audienceLabel} Briefing`;
    const briefingHtml = markdownToHtml(result.briefing);
    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${title} — Prism Intelligence</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Manrope:wght@500;700&display=swap" rel="stylesheet">
<style>
  @page { margin: 48px 56px; }
  body { font-family: 'Inter', -apple-system, sans-serif; color: #1a1a2e; margin: 0; padding: 0; line-height: 1.7; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #aebaff; }
  .header-left h1 { font-family: 'Manrope', sans-serif; font-size: 22px; font-weight: 800; color: #0c0e14; margin: 0 0 4px 0; letter-spacing: -0.02em; }
  .header-left .subtitle { font-size: 11px; color: #717583; font-family: 'Manrope', sans-serif; text-transform: uppercase; letter-spacing: 0.1em; }
  .header-right { text-align: right; }
  .header-right .brand { font-family: 'Manrope', sans-serif; font-size: 14px; font-weight: 700; color: #4d5b9c; }
  .header-right .date { font-size: 10px; color: #a7aab9; margin-top: 2px; }
  .badge { display: inline-block; font-family: 'Manrope', sans-serif; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 3px 10px; border-radius: 4px; background: #f0f1ff; color: #4d5b9c; margin-bottom: 16px; }
  h1 { font-family: 'Manrope', sans-serif; font-size: 18px; font-weight: 700; color: #0c0e14; margin: 28px 0 8px 0; letter-spacing: -0.01em; }
  h2 { font-family: 'Manrope', sans-serif; font-size: 15px; font-weight: 700; color: #283575; margin: 24px 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid #e8e9f0; }
  h3 { font-family: 'Manrope', sans-serif; font-size: 13px; font-weight: 700; color: #334080; margin: 20px 0 6px 0; }
  p { margin: 0 0 10px 0; color: #2a2a3e; }
  ul { margin: 0 0 12px 0; padding-left: 20px; }
  li { margin-bottom: 6px; color: #2a2a3e; }
  strong { color: #0c0e14; font-weight: 700; }
  em { color: #4d5b9c; font-style: italic; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e8e9f0; display: flex; justify-content: space-between; align-items: center; }
  .footer-text { font-size: 9px; color: #a7aab9; font-family: 'Manrope', sans-serif; text-transform: uppercase; letter-spacing: 0.08em; }
  .footer-badge { font-size: 9px; color: #4d5b9c; font-family: 'Manrope', sans-serif; font-weight: 700; }
</style></head><body>
<div class="header">
  <div class="header-left">
    <h1 style="font-size:22px;border:none;margin:0 0 4px 0;padding:0;">${title}</h1>
    <div class="subtitle">Prism Enterprise Intelligence Platform</div>
  </div>
  <div class="header-right">
    <div class="brand">◆ Prism</div>
    <div class="date">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
  </div>
</div>
<div class="badge">AI-Generated Intelligence Brief</div>
${briefingHtml}
<div class="footer">
  <span class="footer-text">Confidential · Generated by Prism Intelligence</span>
  <span class="footer-badge">prism.ai</span>
</div>
</body></html>`;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.top = "-10000px";
    iframe.style.left = "-10000px";
    iframe.style.width = "800px";
    iframe.style.height = "600px";
    document.body.appendChild(iframe);

    iframe.contentDocument.open();
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();

    iframe.contentWindow.focus();
    iframe.contentWindow.print();

    setTimeout(() => document.body.removeChild(iframe), 1000);
  }

  function handleEmail() {
    const subject = encodeURIComponent(`Prism Intelligence Briefing — ${audienceLabel}`);
    const maxBodyLength = 1800;
    let bodyText = result.briefing;
    if (bodyText.length > maxBodyLength) {
      bodyText = bodyText.slice(0, maxBodyLength) + "\n\n[Briefing truncated — paste full text from Prism]";
    }
    const body = encodeURIComponent(bodyText);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  const isComparing = !!compareResult;

  return (
    <div className={`space-y-6 ${isComparing ? "max-w-5xl" : "max-w-4xl"}`}>
      {!canRun && (
        <div className="rounded-md bg-tertiary/10 border border-tertiary/20 px-4 py-3 text-sm text-tertiary">
          Complete both Signal Collection and Data Analysis before generating narratives.
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={!canRun || loading}
        className="bg-[#5C6BC0] text-white px-6 py-2.5 rounded-xl font-label font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-40"
      >
        {loading ? "Generating..." : `Generate ${audienceLabel} Briefing`}
      </button>

      {error && (
        <div className="rounded-md bg-error-container/20 border border-error-container px-4 py-3 text-sm text-on-error-container">
          {error}
        </div>
      )}

      {loading && (
        <StepProgress
          steps={[
            "Assembling intelligence context...",
            "Generating executive briefing with AI...",
          ]}
          active={loading}
        />
      )}

      {result && !loading && (() => {
        const sourcesPresent = [signals, analysis, gaps, visibility].filter(Boolean).length;
        const qualityCount = sourcesPresent + 1; // +1 for narrative itself
        const missingNames = [];
        if (!signals) missingNames.push("signals");
        if (!analysis) missingNames.push("data");
        if (!gaps) missingNames.push("gaps");
        if (!visibility) missingNames.push("visibility");
        const qualityTier = qualityCount >= 5 ? "Complete" : qualityCount >= 4 ? "Strong" : qualityCount >= 3 ? "Partial" : "Limited";
        const qualityColor = qualityCount >= 4
          ? "text-secondary border-secondary/20"
          : qualityCount >= 3
          ? "text-tertiary border-tertiary/20"
          : "text-error border-error-container";

        return (
        <>
          {/* Heading row + compare dropdown */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-primary">
                {audienceLabel} Briefing
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full border border-primary/20 text-primary">
                Prism Intelligence
              </span>
              <span className="text-xs text-outline">
                ~{Math.ceil(result.briefing.split(/\s+/).length / 200)} min read
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${qualityColor}`}>
                {qualityTier} — {qualityCount}/5
              </span>
              {missingNames.length > 0 && (
                <span className="text-xs text-outline">
                  add {missingNames.join(", ")} to strengthen
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={compareAudience || ""}
                onChange={(e) => {
                  setCompareAudience(e.target.value || null);
                  setCompareResult(null);
                  setCompareError(null);
                }}
                className="rounded-md bg-surface-container-lowest border border-outline-variant/20 px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-body"
              >
                <option value="">Compare with...</option>
                {AUDIENCES.filter((a) => a.id !== audience).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleCompare}
                disabled={!compareAudience || compareLoading}
                className="inline-flex items-center gap-1.5 bg-[#5C6BC0] text-white px-3 py-1.5 rounded-xl font-label font-bold text-xs shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40"
              >
                {compareLoading && <Spinner size="sm" />}
                {compareLoading ? "Comparing..." : "Compare"}
              </button>
            </div>
          </div>

          {compareError && (
            <div className="rounded-md bg-error-container/20 border border-error-container px-4 py-3 text-sm text-on-error-container">
              {compareError}
            </div>
          )}

          {/* Follow-up question chips */}
          {result.follow_up_questions?.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-on-surface-variant">What would you ask next?</p>
              <div className="flex flex-wrap gap-2">
                {result.follow_up_questions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleFollowUp(q)}
                    disabled={followUpLoading}
                    className={`inline-flex items-center gap-1.5 text-left text-xs px-3 py-2 rounded-lg border transition-colors ${
                      activeQuestion === q
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-outline-variant hover:text-on-surface"
                    } disabled:opacity-50`}
                  >
                    {followUpLoading && activeQuestion === q && <Spinner size="sm" />}
                    {q}
                  </button>
                ))}
              </div>

              {followUpError && (
                <div className="rounded-md bg-error-container/20 border border-error-container px-4 py-3 text-sm text-on-error-container">
                  {followUpError}
                </div>
              )}

              {followUpAnswer && (
                <div className="rounded-xl border border-[rgba(174,186,255,0.08)] p-6 backdrop-blur-[12px]" style={{ backgroundColor: "rgba(22, 25, 34, 0.45)" }}>
                  <p className="text-xs font-medium text-primary font-label mb-2">{activeQuestion}</p>
                  <div className={PROSE_CLASSES}>
                    <ReactMarkdown>{followUpAnswer}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Briefing text — side by side when comparing */}
          {isComparing ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-[rgba(174,186,255,0.08)] p-6 backdrop-blur-[12px]" style={{ backgroundColor: "rgba(22, 25, 34, 0.45)" }}>
                <p className="text-xs font-medium text-primary font-label mb-3">{audienceLabel}</p>
                <div className={PROSE_CLASSES}>
                  <ReactMarkdown>{result.briefing}</ReactMarkdown>
                </div>
              </div>
              <div className="rounded-xl border border-[rgba(174,186,255,0.08)] p-6 backdrop-blur-[12px]" style={{ backgroundColor: "rgba(22, 25, 34, 0.45)" }}>
                <p className="text-xs font-medium text-primary font-label mb-3">{compareLabel}</p>
                <div className={PROSE_CLASSES}>
                  <ReactMarkdown>{compareResult.briefing}</ReactMarkdown>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[rgba(174,186,255,0.08)] p-6 backdrop-blur-[12px]" style={{ backgroundColor: "rgba(22, 25, 34, 0.45)" }}>
              <div className={PROSE_CLASSES}>
                <ReactMarkdown>{result.briefing}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Export buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors ${
                copied
                  ? "border-secondary/30 text-secondary"
                  : "border-outline-variant text-on-surface-variant hover:border-outline-variant hover:text-on-surface"
              }`}
            >
              <Copy size={14} />
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 rounded-xl bg-surface-container-high border border-outline-variant hover:bg-surface-bright text-on-surface font-label text-xs transition-all px-3 py-1.5"
            >
              <Download size={14} />
              Download PDF
            </button>
            <button
              onClick={handleEmail}
              className="inline-flex items-center gap-1.5 rounded-xl bg-surface-container-high border border-outline-variant hover:bg-surface-bright text-on-surface font-label text-xs transition-all px-3 py-1.5"
            >
              <Mail size={14} />
              Email Draft
            </button>
            <button
              onClick={handleCopyNotion}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors ${
                copiedNotion
                  ? "border-secondary/30 text-secondary"
                  : "border-outline-variant text-on-surface-variant hover:border-outline-variant hover:text-on-surface"
              }`}
            >
              <Copy size={14} />
              {copiedNotion ? "Copied" : "Notion"}
            </button>
            <button
              onClick={handleCopySlack}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors ${
                copiedSlack
                  ? "border-secondary/30 text-secondary"
                  : "border-outline-variant text-on-surface-variant hover:border-outline-variant hover:text-on-surface"
              }`}
            >
              <Copy size={14} />
              {copiedSlack ? "Copied" : "Slack"}
            </button>
          </div>
        </>
        );
      })()}
    </div>
  );
}
