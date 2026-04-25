import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { loadState, updateState } from "../lib/store";

const tierConfig = {
  TIER_1: { bg: "bg-[#00C853]", label: "TIER 1 / APPLY" },
  TIER_2: { bg: "bg-[#FFD600]", label: "TIER 2 / CAUTION" },
  TIER_3: { bg: "bg-[#D50000]", label: "TIER 3 / SKIP", textW: true },
};

const Bar = ({ label, value }) => (
  <div className="grid grid-cols-[80px_1fr_36px] items-center gap-2 text-xs">
    <span className="mono-label">{label}</span>
    <div className="h-3 border-2 border-black bg-white">
      <div className="h-full bg-black" style={{ width: `${value}%` }} />
    </div>
    <span className="font-mono font-bold text-right">{value}%</span>
  </div>
);

export default function RankedJobsPage() {
  const nav = useNavigate();
  const { scoreResult } = loadState();

  if (!scoreResult) {
    return (
      <div className="brut-card p-8" data-testid="empty-ranked">
        <h2 className="font-display text-2xl font-bold uppercase">No ranked jobs yet</h2>
        <p className="mt-2 text-zinc-700">Paste & score jobs first.</p>
        <button className="mt-4 brut-btn-primary" onClick={() => nav("/hunt")} data-testid="go-hunt">
          Go to job hunt
        </button>
      </div>
    );
  }

  const ranked = scoreResult.ranked_jobs || [];
  const tier1 = ranked.filter((j) => j.tier === "TIER_1");
  const tier2 = ranked.filter((j) => j.tier === "TIER_2");
  const tier3 = ranked.filter((j) => j.tier === "TIER_3");

  const openPackage = (job) => {
    updateState({ activeJobId: job.id });
    nav(`/package?id=${encodeURIComponent(job.id)}`);
  };

  const Section = ({ title, jobs, color }) => (
    <div className="space-y-3" data-testid={`section-${title.toLowerCase().replace(/\s/g, "-")}`}>
      <div className={`flex items-center justify-between border-2 border-black ${color} px-4 py-2 shadow-[3px_3px_0_0_#000]`}>
        <div className="font-display font-extrabold uppercase tracking-tight">{title}</div>
        <div className="font-mono text-sm font-bold">{jobs.length} jobs</div>
      </div>
      {jobs.length === 0 && <div className="font-mono text-xs text-zinc-500 px-2">— none</div>}
      {jobs.map((j) => (
        <div key={j.id} className="brut-card-sm p-4" data-testid={`job-card-${j.id}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-display text-lg font-bold">{j.title}</div>
              <div className="font-mono text-xs uppercase tracking-wider text-zinc-700">
                {j.company} · {j.location || "—"}
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-3xl font-black">{j.match_score}%</div>
              <div className="mono-label">match</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-1.5">
            <Bar label="Skills" value={j.breakdown?.hard_skills ?? 0} />
            <Bar label="Keywords" value={j.breakdown?.keywords ?? 0} />
            <Bar label="Tools" value={j.breakdown?.tools ?? 0} />
            <Bar label="Domain" value={j.breakdown?.domain ?? 0} />
            <Bar label="Senior" value={j.breakdown?.seniority ?? 0} />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <div className="mono-label">Matched Skills</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {(j.matched_skills || []).map((s, i) => (
                  <span key={i} className="border-2 border-black bg-zinc-50 px-2 py-0.5 font-mono text-[11px]">{s}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="mono-label">Critical Gaps</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {(j.critical_gaps || []).map((s, i) => (
                  <span key={i} className="border-2 border-black bg-red-100 px-2 py-0.5 font-mono text-[11px]">{s}</span>
                ))}
              </div>
            </div>
          </div>

          {j.why_apply && (
            <p className="mt-3 border-l-4 border-black pl-3 text-sm italic">{j.why_apply}</p>
          )}

          <div className="mt-4 flex justify-end">
            <button className="brut-btn-primary" onClick={() => openPackage(j)} data-testid={`open-package-${j.id}`}>
              Generate Application Package <ChevronRight size={14} className="inline" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-8" data-testid="ranked-page">
      <div>
        <div className="mono-label">Step 04 / Ranked Jobs</div>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold uppercase tracking-tighter">
          {ranked.length} jobs ranked.
        </h1>
        {scoreResult.skill_gap_pattern && (
          <p className="mt-3 max-w-3xl border-l-4 border-[#002FA7] pl-3 text-zinc-800">
            <span className="mono-label mr-2">Pattern:</span>{scoreResult.skill_gap_pattern}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <Section title="Tier 1 / Apply" jobs={tier1} color={tierConfig.TIER_1.bg} />
        <Section title="Tier 2 / Caution" jobs={tier2} color={tierConfig.TIER_2.bg} />
        <Section title="Tier 3 / Skip" jobs={tier3} color={tierConfig.TIER_3.bg + " text-white"} />
      </div>
    </div>
  );
}
