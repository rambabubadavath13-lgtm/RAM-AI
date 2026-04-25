import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Trash2, ExternalLink } from "lucide-react";
import { listApplications, updateStatus, deleteApplication } from "../lib/api";

const COLS = [
  { key: "applied", label: "Applied", color: "bg-zinc-200" },
  { key: "interview", label: "Interview", color: "bg-[#FFD600]" },
  { key: "rejected", label: "Rejected", color: "bg-[#D50000] text-white" },
  { key: "offer", label: "Offer", color: "bg-[#00C853]" },
];

export default function TrackerPage() {
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    try {
      setItems(await listApplications());
    } catch {
      toast.error("Failed to load applications");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onDragStart = (e, id) => {
    e.dataTransfer.setData("text/plain", id);
  };
  const onDrop = async (e, status) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    try {
      await updateStatus(id, status);
      setItems((arr) => arr.map((a) => (a.id === id ? { ...a, status } : a)));
    } catch {
      toast.error("Update failed");
    }
  };
  const onDel = async (id) => {
    if (!window.confirm("Delete this application?")) return;
    await deleteApplication(id);
    setItems((arr) => arr.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-6" data-testid="tracker-page">
      <div>
        <div className="mono-label">Step 06 / Tracker</div>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold uppercase tracking-tighter">
          Application Kanban.
        </h1>
        <p className="mt-2 text-zinc-700">Drag a card across columns to update its status.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLS.map((col) => {
          const list = items.filter((i) => i.status === col.key);
          return (
            <div
              key={col.key}
              className="border-2 border-black bg-white shadow-[4px_4px_0_0_#000] min-h-[60vh]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDrop(e, col.key)}
              data-testid={`col-${col.key}`}
            >
              <div className={`flex items-center justify-between border-b-2 border-black px-3 py-2 ${col.color}`}>
                <div className="font-display font-extrabold uppercase tracking-tight">{col.label}</div>
                <div className="font-mono text-sm font-bold">{list.length}</div>
              </div>
              <div className="space-y-2 p-3">
                {list.length === 0 && (
                  <div className="font-mono text-xs text-zinc-500">— empty</div>
                )}
                {list.map((a) => (
                  <div
                    key={a.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, a.id)}
                    className="cursor-grab border-2 border-black bg-white p-3 active:cursor-grabbing"
                    data-testid={`app-card-${a.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold truncate">{a.job?.title || "—"}</div>
                        <div className="font-mono text-xs uppercase tracking-wider text-zinc-700 truncate">
                          {a.job?.company} · {a.job?.location || "—"}
                        </div>
                      </div>
                      {a.score?.match_score != null && (
                        <div className="border-2 border-black px-2 py-0.5 font-mono text-xs font-bold">{a.score.match_score}%</div>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      {a.job?.url ? (
                        <a className="text-xs underline inline-flex items-center gap-1" href={a.job.url} target="_blank" rel="noreferrer">
                          job link <ExternalLink size={10} />
                        </a>
                      ) : <span />}
                      <button className="brut-btn !px-2 !py-1" onClick={() => onDel(a.id)} data-testid={`del-${a.id}`}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
