import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Briefcase, Upload, User, Search, ListOrdered, Package, KanbanSquare } from "lucide-react";

const steps = [
  { to: "/", label: "Upload", icon: Upload, key: "upload" },
  { to: "/profile", label: "Profile", icon: User, key: "profile" },
  { to: "/hunt", label: "Hunt", icon: Search, key: "hunt" },
  { to: "/ranked", label: "Ranked", icon: ListOrdered, key: "ranked" },
  { to: "/package", label: "Package", icon: Package, key: "package" },
  { to: "/tracker", label: "Tracker", icon: KanbanSquare, key: "tracker" },
];

export default function Layout({ children }) {
  const loc = useLocation();
  return (
    <div className="min-h-screen bg-[#fafafa] text-black" data-testid="app-shell">
      <header className="border-b-2 border-black bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3" data-testid="brand">
              <div className="grid h-10 w-10 place-items-center border-2 border-black bg-[#002FA7] text-white shadow-[3px_3px_0_0_#000]">
                <Briefcase size={20} strokeWidth={2.5} />
              </div>
              <div className="leading-tight">
                <div className="font-display text-xl font-extrabold uppercase tracking-tight">
                  AJAS<span className="text-[#002FA7]">.v3</span>
                </div>
                <div className="mono-label text-[10px]">Auto Job Application System</div>
              </div>
            </div>
            <a
              className="hidden md:inline-flex brut-btn"
              href="https://www.linkedin.com/jobs/"
              target="_blank"
              rel="noreferrer"
              data-testid="open-linkedin"
            >
              Open LinkedIn ↗
            </a>
          </div>
          <nav className="flex gap-0 overflow-x-auto border-t-2 border-black" data-testid="step-nav">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const active = loc.pathname === s.to;
              return (
                <NavLink
                  key={s.key}
                  to={s.to}
                  data-testid={`nav-${s.key}`}
                  className={`flex items-center gap-2 border-r-2 border-black px-4 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                    active
                      ? "bg-black text-white"
                      : "bg-white text-black hover:bg-zinc-100"
                  }`}
                >
                  <span className="font-mono">{String(i + 1).padStart(2, "0")}</span>
                  <Icon size={14} strokeWidth={2.5} />
                  {s.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-12">{children}</main>
      <footer className="border-t-2 border-black bg-white py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 mono-label">
          Built for any role — Resume-first, auto-discovery
        </div>
      </footer>
    </div>
  );
}
