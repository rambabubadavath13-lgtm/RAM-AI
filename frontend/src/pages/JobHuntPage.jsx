import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import Loading from "../components/Loading";
import { generateJobSearches, scoreJobs } from "../lib/api";
import { loadState, updateState } from "../lib/store";

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
      toast.success("Search links ready");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Agent 2 failed");
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
      toast.error(e?.response?.data?.detail || "Agent 3 failed");
    } finally {
      setBusy(false); setStage("");
    }
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

      <div className="brut-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="mono-label">Paste found jobs back here</div>
          <button className="brut-btn" onClick={addJob} data-testid="add-job-btn">
            <Plus size={14} className="mr-1 inline" /> Add Job
          </button>
        </div>
        <div className="space-y-4">
          {jobs.map((j, idx) => (
            <div key={j.id} className="border-2 border-black bg-zinc-50 p-4" data-testid={`job-form-${idx}`}>
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

        <div className="mt-6 flex gap-3">
          <button className="brut-btn-primary" onClick={score} disabled={busy} data-testid="score-rank-btn">
            Score & Rank {jobs.length} Jobs →
          </button>
          <button className="brut-btn" onClick={() => nav("/profile")} data-testid="back-profile-btn">← Profile</button>
        </div>
      </div>
    </div>
  );
}
