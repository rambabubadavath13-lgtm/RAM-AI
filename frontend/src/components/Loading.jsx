import React from "react";
import { Loader2 } from "lucide-react";

export default function Loading({ label = "Working..." }) {
  return (
    <div
      className="flex items-center gap-3 border-2 border-black bg-yellow-200 px-4 py-3 shadow-[4px_4px_0_0_#000]"
      data-testid="loading-banner"
    >
      <Loader2 className="animate-spin" size={18} strokeWidth={2.5} />
      <span className="font-mono text-sm font-semibold uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}
