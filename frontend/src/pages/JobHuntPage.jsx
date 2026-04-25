import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ExternalLink, Plus, Trash2, FileSpreadsheet } from "lucide-react";
import Loading from "../components/Loading";
import { generateJobSearches, scoreJobs } from "../lib/api";
import { loadState, updateState } from "../lib/store";
import { downloadCsv } from "../lib/csv";

const PLATFORMS = [
  { key: "linkedin", label: "LinkedIn" },
  { key: "naukri", label: "Naukri" },
  { key: "indeed", label: "Indeed" },
  { key: "wellfound", label: "Wellfound" },
];

export default function JobHuntPage() {
  const nav = useNavigate();
  const state = loadState();
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [searches, setSearches] = useState(state.searches);
  const [enabled, setEnabled] = useState({ linkedin: true, naukri: true, indeed: true, wellfound: true });
  const [jobs, setJobs] = useState(state.pastedJobs.length ? state.pastedJobs : [emptyJob()]);

  function emptyJob() {
    return { id: crypto.randomUUID(), title: "", company: "", location: "", description: "", url: "" };
  }

  useEffect(() => {
    if (!state.profile) {
      toast.error("Upload a resume first");
      nav("/");
    }
  }, [state.profile, nav]);

  const generate = async () => {
    try {
      setBusy(true);
      setStage("Agent 2 — generating job search URLs...");
      const s = await generateJobSearches(state.profile);
      setSearches(s);
      updateState({ searches: s });
      const total =
        (s.linkedin?.length || 0) +
        (s.naukri?.length || 0) +
        (s.indeed?.length || 0) +
        (s.wellfound?.length || 0) +
        (s.target_companies?.length || 0);
      toast.success(`${total} search links + companies ready`);
    } catch (e) {
      const msg = e?.budgetExceeded ? e.userMessage : (e?.response?.data?.detail || "Agent 2 failed");
      toast.error(msg, { duration: 8000 });
    } finally {
      setBusy(false); setStage("");
    }
  };

  const updateJob = (id, k, v) => setJobs((arr) => arr.map((j) => (j.id === id ? { ...j, [k]: v } : j)));
  const removeJob = (id) => setJobs((arr) => arr.filter((j) => j.id !== id));
  const addJob = () => setJobs((arr) => [...arr, emptyJob()]);

  const score = async () => {
    const valid = jobs.filter((j) => j.title.trim() && j.company.trim() && j.description.trim());
    if (!valid.length) {
      toast.error("Add at least one job with title, company, description");
      return;
    }
    try {
      setBusy(true);
      setStage("Agent 3 — scoring & ranking jobs...");
      const result = await scoreJobs(state.profile, valid);
      updateState({ pastedJobs: valid, scoreResult: result });
      toast.success(`Ranked ${result?.ranked_jobs?.length || 0} jobs`);
      nav("/ranked");
    } catch (e) {
      const msg = e?.budgetExceeded ? e.userMessage : (e?.response?.data?.detail || "Agent 3 failed");
      toast.error(msg, { duration: 8000 });
    } finally {
      setBusy(false); setStage("");
    }
  };

  const exportSearchesCsv = () => {
    if (!searches) {
      toast.error("Generate search URLs first");
      return;
    }
    const headers = ["Source", "Label", "URL", "Notes"];
    const rows = [];
    PLATFORMS.forEach((p) => {
      (searches[p.key] || []).forEach((q) => rows.push([p.label, q.label || "", q.url || "", "Search query"]));
    });
    (searches.target_companies || []).forEach((c) =>
      rows.push(["Target Company", c.company || "", c.careers_url || "", `${c.why_fits || ""} | Stack: ${c.stack_match || ""}`])
    );
    if (searches.boolean_search) rows.push(["Boolean", "Job board boolean string", "", searches.boolean_search]);
    if (searches.google_xray) rows.push(["Google X-Ray", "X-Ray search string", "", searches.google_xray]);
    if (!rows.length) {
      toast.error("Nothing to export yet");
      return;
    }
    downloadCsv(`job_search_${new Date().toISOString().slice(0, 10)}`, headers, rows);
    toast.success(`Exported ${rows.length} rows to CSV`);
  };

  const exportPastedJobsCsv = () => {
    const valid = jobs.filter((j) => j.title.trim() || j.company.trim() || j.description.trim());
    if (!valid.length) {
      toast.error("No pasted jobs to export");
      return;
    }
    const headers = ["Title", "Company", "Location", "URL", "Description"];
    const rows = valid.map((j) => [j.title, j.company, j.location || "", j.url || "", j.description]);
    downloadCsv(`pasted_jobs_${new Date().toISOString().slice(0, 10)}`, headers, rows);
    toast.success(`Exported ${rows.length} jobs to CSV`);
  };

  return (
    <div className="space-y-8" data-testid="hunt-page">
      <div>
        <div className="mono-label">Step 03 / Job Hunt</div>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold uppercase tracking-tighter">
          Hunt jobs across platforms.
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-700">
          Generate ready-to-click search URLs. Open them, copy job descriptions
          back into the form below, then score & rank.
        </p>
      </div>

      <div className="brut-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2" data-testid="platform-toggles">
            {PLATFORMS.map((p) => (
              <label key={p.key} className="flex cursor-pointer items-center gap-2 border-2 border-black bg-zinc-50 px-3 py-2">
                <input
                  type="checkbox"
                  checked={enabled[p.key]}
                  onChange={(e) => setEnabled({ ...enabled, [p.key]: e.target.checked })}
                  data-testid={`toggle-${p.key}`}
                />
                <span className="font-mono text-xs uppercase tracking-wider font-semibold">{p.label}</span>
              </label>
            ))}
          </div>
          <button className="brut-btn-primary" onClick={generate} disabled={busy} data-testid="generate-searches-btn">
            Generate Search URLs →
          </button>
        </div>
      </div>

      {busy && <Loading label={stage} />}

      {searches && (
        <div className="space-y-6" data-testid="search-results">
          <div className="border-l-4 border-[#002FA7] pl-3">
            <div className="mono-label">Step A / Open the search links</div>
            <h3 className="font-display text-xl font-extrabold uppercase tracking-tight">
              Click "Open" to browse jobs on each platform
            </h3>
            <p className="mt-1 text-sm text-zinc-700">
              Each link opens that platform's search page in a new tab. Browse jobs you like and copy their descriptions back here in Step B.
            </p>
          </div>
          <div className="brut-card p-4 flex flex-wrap items-center justify-between gap-3 bg-yellow-100">
            <div>
              <div className="mono-label">Export</div>
              <div className="font-display text-lg font-extrabold">All search links + companies →</div>
            </div>
            <button className="brut-btn-primary" onClick={exportSearchesCsv} data-testid="export-searches-csv-btn-banner">
              <FileSpreadsheet size={14} className="mr-1 inline" /> Download Excel/CSV
            </button>
          </div>
          {PLATFORMS.filter((p) => enabled[p.key] && Array.isArray(searches[p.key])).map((p) => (
            <div key={p.key} className="brut-card p-6">
              <div className="mono-label mb-3">{p.label} — {searches[p.key].length} queries</div>
              <ul className="space-y-2">
                {searches[p.key].map((q) => (
                  <li key={q.url} className="flex items-start justify-between gap-3 border-2 border-black bg-zinc-50 p-3">
                    <div className="min-w-0">
                      <div className="font-bold">{q.label}</div>
                      <div className="truncate font-mono text-xs text-zinc-600">{q.url}</div>
                    </div>
                    <a href={q.url} target="_blank" rel="noreferrer" className="brut-btn whitespace-nowrap" data-testid={`open-${p.key}-${q.url}`}>
                      Open <ExternalLink size={12} className="ml-1 inline" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {Array.isArray(searches.target_companies) && (
            <div className="brut-card p-6">
              <div className="mono-label mb-3">Top 20 Target Companies</div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b-2 border-black">
                      <th className="p-2">Company</th>
                      <th className="p-2">Why It Fits</th>
                      <th className="p-2">Stack Match</th>
                      <th className="p-2">Careers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searches.target_companies.map((c, i) => (
                      <tr key={i} className="border-b border-black/30">
                        <td className="p-2 font-bold">{c.company}</td>
                        <td className="p-2">{c.why_fits}</td>
                        <td className="p-2 font-mono text-xs">{c.stack_match}</td>
                        <td className="p-2">
                          {c.careers_url && (
                            <a className="underline" href={c.careers_url} target="_blank" rel="noreferrer">Open ↗</a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(searches.boolean_search || searches.google_xray) && (
            <div className="brut-card p-6">
              <div className="mono-label mb-2">Boolean & X-Ray</div>
              {searches.boolean_search && (
                <div className="mb-3">
                  <div className="text-xs font-semibold mb-1">Boolean</div>
                  <pre className="border-2 border-black bg-zinc-50 p-3 font-mono text-xs whitespace-pre-wrap">{searches.boolean_search}</pre>
                </div>
              )}
              {searches.google_xray && (
                <div>
                  <div className="text-xs font-semibold mb-1">Google X-Ray</div>
                  <pre className="border-2 border-black bg-zinc-50 p-3 font-mono text-xs whitespace-pre-wrap">{searches.google_xray}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="brut-card p-6" data-testid="paste-jobs-section">
        <div className="mb-4 border-l-4 border-[#002FA7] pl-3">
          <div className="mono-label">Step B / Paste jobs you found</div>
          <h3 className="font-display text-xl font-extrabold uppercase tracking-tight">
            Paste each job description below
          </h3>
          <ol className="mt-2 list-decimal pl-5 text-sm text-zinc-700 space-y-1">
            <li>Click an "Open" link above (LinkedIn / Naukri / Indeed / Wellfound) to visit that platform's search results.</li>
            <li>On a job listing you like, copy <b>Title</b>, <b>Company</b>, <b>Location</b>, and the full <b>Job Description</b>.</li>
            <li>Paste them into the card below. Click <b>+ Add Job</b> to add more cards.</li>
            <li>Click <b>Score & Rank</b> to let Agent 3 rank them all against your profile.</li>
          </ol>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-2 border-black bg-zinc-50 px-4 py-3">
          <div>
            <div className="mono-label">Detected</div>
            <div className="font-display text-2xl font-black" data-testid="pasted-jobs-count">
              {jobs.filter((j) => j.title.trim() && j.company.trim() && j.description.trim()).length}
              <span className="text-sm font-bold ml-2 text-zinc-600">/ {jobs.length} valid jobs</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="brut-btn" onClick={addJob} data-testid="add-job-btn-top">
              <Plus size={14} className="mr-1 inline" /> Add Job Card
            </button>
            <button className="brut-btn" onClick={exportPastedJobsCsv} data-testid="export-pasted-jobs-csv-btn-top">
              <FileSpreadsheet size={14} className="mr-1 inline" /> Download Pasted Jobs CSV
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {jobs.map((j, idx) => (
            <div key={j.id} className="border-2 border-black bg-zinc-50 p-4" data-testid={`job-form-${idx}`}>
              <div className="mb-2 flex items-center justify-between">
                <div className="mono-label">Job #{idx + 1}</div>
                {j.title.trim() && j.company.trim() && j.description.trim() && (
                  <span className="border-2 border-black bg-[#00C853] px-2 py-0.5 font-mono text-xs font-bold uppercase">
                    Ready
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <input className="brut-input" placeholder="Title" value={j.title}
                  onChange={(e) => updateJob(j.id, "title", e.target.value)}
                  data-testid={`job-title-${idx}`} />
                <input className="brut-input" placeholder="Company" value={j.company}
                  onChange={(e) => updateJob(j.id, "company", e.target.value)}
                  data-testid={`job-company-${idx}`} />
                <input className="brut-input" placeholder="Location (optional)" value={j.location}
                  onChange={(e) => updateJob(j.id, "location", e.target.value)}
                  data-testid={`job-location-${idx}`} />
              </div>
              <input className="brut-input mt-3 w-full" placeholder="Job URL (optional)" value={j.url}
                onChange={(e) => updateJob(j.id, "url", e.target.value)}
                data-testid={`job-url-${idx}`} />
              <textarea className="brut-input mt-3 w-full min-h-[140px]" placeholder="Paste the full job description here..."
                value={j.description} onChange={(e) => updateJob(j.id, "description", e.target.value)}
                data-testid={`job-desc-${idx}`} />
              <div className="mt-2 flex justify-end">
                <button className="brut-btn" onClick={() => removeJob(j.id)} data-testid={`remove-job-${idx}`}>
                  <Trash2 size={12} className="mr-1 inline" /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button className="brut-btn-primary" onClick={score} disabled={busy} data-testid="score-rank-btn">
            Score & Rank {jobs.length} Jobs →
          </button>
          <button className="brut-btn" onClick={exportPastedJobsCsv} data-testid="export-pasted-jobs-csv-btn">
            <FileSpreadsheet size={14} className="mr-1 inline" /> Download Pasted Jobs CSV
          </button>
          <button className="brut-btn" onClick={() => nav("/profile")} data-testid="back-profile-btn">← Profile</button>
        </div>
      </div>
    </div>
  );
}
