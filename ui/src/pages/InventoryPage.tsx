import { useState, useEffect, useRef } from "react";
import ProjectsSection from "../components/inventory/ProjectsSection";
import MaterialsSection from "../components/inventory/MaterialsSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle, Package, Clock, FlaskConical,
  Layers, LayoutGrid, ChevronRight, ChevronDown, ClipboardList,
  ToolCase,
} from "lucide-react";
import { getMaterials, getProjects } from "../services/inventoryApi";
import { RawMaterial, Project } from "../types/inventory";
import Studio_Bunny_Illustration from "../assets/misc/Studio_Bunny_Illust.png";

// ─── Studio accent colour ─────────────────────────────────────────────────────
const STUDIO = "#7B8F6F";

// ─── Side nav config ──────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { id: "at-a-glance",   label: "At a Glance",   icon: LayoutGrid       },
  { id: "your-projects",  label: "Projects",      icon: ClipboardList      },
  { id: "your-materials", label: "Materials",     icon: ToolCase },
] as const;

// ─── Wavy separator (studio green) ───────────────────────────────────────────
function WavySeparator() {
  return (
    <div className="relative flex overflow-x-hidden">
      <div
        className="wavy-line-studio opacity-60 absolute left-1/2"
        style={{ width: "100vw", transform: "translateX(-50%)" }}
      />
      <div className="wavy-line-studio invisible" />
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon: Icon, sub,
}: {
  label: string; value: string | number; icon: React.ElementType; sub?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-border p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight">
          {label}
        </span>
        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const [lowStockMaterials, setLowStockMaterials] = useState<RawMaterial[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeSection, setActiveSection] = useState("intro");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    getMaterials()
      .then((data) => {
        const list: RawMaterial[] = Array.isArray(data) ? data : data.results ?? [];
        setLowStockMaterials(list.filter((m) => m.is_low_stock));
      })
      .catch(() => {});

    getProjects()
      .then((data) => setProjects(Array.isArray(data) ? data : data.results ?? []))
      .catch(() => {});
  }, []);

  // ── IntersectionObserver ──────────────────────────────────────────────────
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    NAV_SECTIONS.forEach(({ id }) => {
      const el = sectionRefs.current[id];
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { rootMargin: "-20% 0px -65% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const scrollTo = (id: string) =>
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });

  // ── Derived stats ─────────────────────────────────────────────────────────
  const linkedProjects = projects.filter((p) => p.product !== null).length;
  const projectsWithTime = projects.filter((p) => p.avg_duration_minutes != null);
  const avgMakeTime = projectsWithTime.length > 0
    ? Math.round(projectsWithTime.reduce((s, p) => s + (p.avg_duration_minutes ?? 0), 0) / projectsWithTime.length)
    : null;
  const fmt = (m: number) => {
    const h = Math.floor(m / 60), min = m % 60;
    return h > 0 ? `${h}h ${min}m` : `${min}m`;
  };

  return (
    <div className="relative flex">

      {/* ── Sticky side anchor nav (sage green) ── */}
      <nav className="fixed left-0 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1 pl-2">
        {NAV_SECTIONS.map(({ id, label, icon: Icon }) => {
          const active = activeSection === id;
          return (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className={`group flex items-center gap-2 py-2 px-2 rounded-lg transition-all text-left
                hover:bg-[#7B8F6F] ${active ? "bg-[#7B8F6F]/40 text-white" : "text-white/40 hover:text-white"}`}
            >
              <div className={`w-1 h-6 rounded-full transition-all shrink-0 ${
                active ? "bg-white" : "bg-white/20 group-hover:bg-white/40"
              }`} />
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-xs font-medium whitespace-nowrap transition-all overflow-hidden max-w-0 opacity-0 group-hover:max-w-[120px] group-hover:opacity-100">
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ── Main content ── */}
      <div className="flex-1 max-w-full pl-12 pr-4 sm:pr-6 lg:pr-10 pb-10 pt-0 space-y-0">

        {/* ═══ INTRO ═══════════════════════════════════════════════════════ */}
      <section
        id="intro"
        ref={(el) => { sectionRefs.current["intro"] = el; }}
      >
        <div
          className="scalloped-intro px-4 sm:px-8 lg:px-16 pt-6 sm:pt-12 pb-10 sm:pb-20 space-y-6 sm:space-y-10"
          style={{ backgroundColor: STUDIO }}
        >
          {/* Hero row */}
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">

            {/* Image — full width on mobile, 2/5 on desktop */}
            <div className="w-full lg:w-2/5 overflow-visible shrink-0 flex items-center justify-center">
              <img
                src={Studio_Bunny_Illustration}
                alt="Illustration of a crafting studio"
                className="w-1/2 lg:w-full max-h-40 sm:max-h-none object-contain lg:scale-125"
              />
            </div>

            {/* Right column */}
            <div className="flex-1 space-y-8 sm:space-y-10">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white">Studio</h1>
                <p className="mt-3 text-white/80 text-base leading-relaxed">
                  Everything you need to make things — track inventory for your projects and materials, link them to products in your Marketplace and log everything you make
                </p>
              </div>

              {/* Separator */}
              <div className="border-t border-white/20 w-full" />

              {/* What's Here — hidden on mobile */}
              <div className="hidden sm:block space-y-3 sm:space-y-4">
                <h2 className="text-lg sm:text-xl font-bold text-white text-center">What's Here?</h2>
                <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:gap-6">
                  {[
                    { icon: LayoutGrid,   label: "At a Glance",    sub: "Stats and low stock alerts",         id: "at-a-glance"    },
                    { icon: Package,      label: "Your Projects",  sub: "Recipes, makes and linked products", id: "your-projects"  },
                    { icon: FlaskConical, label: "Your Materials", sub: "Raw materials and stock levels",     id: "your-materials" },
                  ].map(({ icon: Icon, label, sub, id }) => (
                    <button
                      key={label}
                      onClick={() => scrollTo(id)}
                      className="bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 rounded-xl p-3 sm:p-4 text-left transition-colors group"
                    >
                      <div className="rounded-lg bg-white/10 flex items-center justify-center mb-2 p-3">
                        <Icon className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
                      </div>
                      <p className="text-xs font-semibold text-white leading-tight">{label}</p>
                      <p className="text-xs text-white/60 mt-1">{sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  onClick={() => scrollTo("at-a-glance")}
                  className="flex flex-col items-center gap-1 text-white/50 hover:text-white/80 transition-colors animate-bounce"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>


        {/* ═══ AT A GLANCE ═════════════════════════════════════════════════ */}
        <section
          id="at-a-glance"
          ref={(el) => { sectionRefs.current["at-a-glance"] = el; }}
          className="space-y-4 pt-8 sm:pt-12 scroll-mt-20"
        >
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">At a Glance</h2>
            <p className="text-white/80 text-xs sm:text-sm mt-0.5">
              An overview of your studio — projects, materials and make times.
            </p>
          </div>

          {lowStockMaterials.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800">
                  {lowStockMaterials.length} material{lowStockMaterials.length !== 1 ? "s" : ""} running low
                </p>
                <p className="text-xs text-amber-700 mt-0.5 truncate">
                  {lowStockMaterials.map((m) => m.name).join(", ")}
                </p>
              </div>
              <Button
                size="sm" variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-100 shrink-0"
                onClick={() => scrollTo("your-materials")}
              >
                View Materials
              </Button>
            </div>
          )}

          <Card className="bg-[#fdf8f6]">
            <CardContent className="p-4 sm:p-6 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground pt-1">Quick Stats</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatCard label="Total Projects" value={projects.length} icon={Package} sub={projects.length === 0 ? "No projects yet" : undefined} />
                <StatCard label="Linked to a Product" value={linkedProjects} icon={Layers} sub={projects.length > 0 ? `${projects.length - linkedProjects} not yet linked` : undefined} />
                <StatCard label="Avg. Make Time" value={avgMakeTime ? fmt(avgMakeTime) : "—"} icon={Clock} sub={avgMakeTime ? "across all projects" : "Log makes to track time"} />
                <StatCard label="Low Stock Materials" value={lowStockMaterials.length} icon={AlertTriangle} sub={lowStockMaterials.length === 0 ? "All materials stocked" : "Need restocking"} />
              </div>
            </CardContent>
          </Card>
        </section>

        <WavySeparator />

        {/* ═══ YOUR PROJECTS ═══════════════════════════════════════════════ */}
        <section
          id="your-projects"
          ref={(el) => { sectionRefs.current["your-projects"] = el; }}
          className="space-y-4 pt-8 sm:pt-12 scroll-mt-20"
        >
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">Your Projects</h2>
            <p className="text-white/80 text-xs sm:text-sm mt-0.5">
              Each project is a recipe — materials, make time, notes, and a linked product.
            </p>
          </div>

          <div className="rounded-md border border-white/20 bg-white/10 px-4 py-3 flex items-start gap-3">
            <ChevronRight className="h-4 w-4 text-white/60 mt-0.5 shrink-0" />
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
              When you <strong className="text-white">Log a Make</strong>, units are automatically
              added to the stock of the linked product in your Marketplace.
            </p>
          </div>

          <Card className="bg-[#fdf8f6]">
            <CardContent className="p-4 sm:p-6">
              <ProjectsSection />
            </CardContent>
          </Card>
        </section>

        <WavySeparator />

        {/* ═══ YOUR MATERIALS ══════════════════════════════════════════════ */}
        <section
          id="your-materials"
          ref={(el) => { sectionRefs.current["your-materials"] = el; }}
          className="space-y-4 pt-8 sm:pt-12 scroll-mt-20"
        >
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">Your Materials</h2>
            <p className="text-white/80 text-xs sm:text-sm mt-0.5">
              Raw materials used across your projects. Set low stock thresholds to get alerts.
            </p>
          </div>

          <Card className="bg-[#fdf8f6]">
            <CardContent className="p-4 sm:p-6">
              <MaterialsSection />
            </CardContent>
          </Card>
        </section>

      </div>
    </div>
  );
}