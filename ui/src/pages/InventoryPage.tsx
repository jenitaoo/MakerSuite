import { useState, useEffect, useRef } from "react";
import ProjectsSection from "../components/inventory/ProjectsSection";
import MaterialsSection from "../components/inventory/MaterialsSection";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronDown, ClipboardList,
  ToolCase,
} from "lucide-react";
import { getMaterials, getProjects } from "../services/inventoryApi";
import { RawMaterial, Project } from "../types/inventory";
import Studio_Bunny_Illustration from "../assets/misc/Studio_Bunny_Illust.png";

// ─── Studio accent colour ─────────────────────────────────────────────────────
const STUDIO = "#8496af";

// ─── Side nav config ──────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { id: "your-projects",  label: "Projects",      icon: ClipboardList },
  { id: "your-materials", label: "Materials",     icon: ToolCase     },
] as const;

// ─── Wavy separator (studio green) ───────────────────────────────────────────
function WavySeparator() {
  return (
    <div className="relative w-full overflow-x-hidden my-2" aria-hidden="true">
      <div
        className="wavy-line-studio opacity-60 absolute left-1/2"
        style={{ width: "100vw", transform: "translateX(-50%)" }}
      />
      <div className="wavy-line-studio invisible" />
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

  return (
    <div className="relative flex overflow-x-hidden">

      {/* ── Sticky side anchor nav ── */}
      <nav aria-label="Page sections" className="fixed left-0 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1 pl-2">
        {NAV_SECTIONS.map(({ id, label, icon: Icon }) => {
          const active = activeSection === id;
          return (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              aria-label={`Navigate to ${label}`}
              aria-current={active ? "location" : undefined}
              className={`group flex items-center gap-2 py-2 px-2 rounded-lg transition-all text-left
                hover:bg-[#5f718a] ${active ? "bg-[#8496af]/40 text-white" : "text-white/40 hover:text-white"}`}
            >
              <div className={`w-1 h-6 rounded-full transition-all shrink-0 ${
                active ? "bg-white" : "bg-white/20 group-hover:bg-white/40"
              }`} />
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
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
          aria-label="Studio overview"
        >
          <div
            className="scalloped-intro px-4 sm:px-8 lg:px-16 pt-6 sm:pt-12 pb-10 sm:pb-20 space-y-6 sm:space-y-10"
            style={{ backgroundColor: STUDIO }}
          >
            <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
              <div className="w-full lg:w-2/5 overflow-visible shrink-0 flex items-center justify-center">
                <img
                  src={Studio_Bunny_Illustration}
                  alt="Illustration of a crafting studio"
                  className="w-1/2 lg:w-full max-h-40 sm:max-h-none object-contain lg:scale-125"
                />
              </div>

              <div className="flex-1 space-y-6 sm:space-y-8">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white">Studio</h1>
                  <p className="mt-3 text-white/90 text-base leading-relaxed">
                  Your Studio is where you plan everything you make. Create projects for each product, define what goes into them, and track production automatically. When you log a make, your stock updates instantly in your Marketplace so everything stays in sync.
                  </p>
                </div>

                <div className="border-t border-white/30 w-full" />

                {/* What's Here — hidden on mobile */}
                <div className="hidden sm:block space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-bold text-white text-center">What's Here?</h2>
                  <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-6">
                    {[
                      { icon: ClipboardList,      label: "Your Projects",  sub: "Recipes, makes and linked products", id: "your-projects"  },
                      { icon: ToolCase, label: "Your Materials", sub: "Raw materials and stock levels",     id: "your-materials" },
                    ].map(({ icon: Icon, label, sub, id }) => (
                      <button
                        key={label}
                        onClick={() => scrollTo(id)}
                        aria-label={`Go to ${label}`}
                        className="bg-white/15 hover:bg-white/25 border border-white/30 hover:border-white/50 rounded-xl p-3 sm:p-4 text-left transition-colors group w-full"
                      >
                        <div className="rounded-lg bg-white/15 flex items-center justify-center mb-2 p-3">
                          <Icon className="w-4 h-4 text-white/80 group-hover:text-white transition-colors" aria-hidden="true" />
                        </div>
                        <p className="text-sm font-semibold text-white leading-tight">{label}</p>
                        <p className="text-sm text-white/80 mt-1 leading-snug">{sub}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => scrollTo("your-projects")}
                    aria-label="Scroll to Your Projects section"
                    className="flex flex-col items-center gap-1 text-white/70 hover:text-white transition-colors animate-bounce"
                  >
                    <ChevronDown className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ YOUR PROJECTS ═══════════════════════════════════════════════ */}
        <section
          id="your-projects"
          ref={(el) => { sectionRefs.current["your-projects"] = el; }}
          className="space-y-4 pt-8 sm:pt-12 scroll-mt-20"
          aria-label="Your Projects"
        >
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Your Projects</h2>
            <p className="text-white/90 text-sm sm:text-base mt-1 leading-relaxed">
              Each project is a recipe for something you make. Add materials, make time, and notes, then link it to a product in your Marketplace. Every time you log a make, your project and it's linked product's stock is updated automatically so you never have to manage inventory manually.
            </p>
          </div>

          <Card className="bg-white border-neutral-200">
            <CardContent className="p-6">
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
          aria-label="Your Materials"
        >
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Your Materials</h2>
            <p className="text-white/90 text-sm sm:text-base mt-1 leading-relaxed">
              All the raw materials used in your projects, from yarn to packaging. Track stock levels automatically as you make products and set low-stock alerts so you always know when to restock.
            </p>
          </div>

          <Card className="bg-white border-neutral-200">
            <CardContent className="p-6">
              <MaterialsSection />
            </CardContent>
          </Card>
        </section>

      </div>
    </div>
  );
}