import { useNavigate } from "react-router-dom";
import {
  Hammer, Store, BarChart3, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Studio_Bunny from "../assets/misc/Studio_Bunny_Illust.png";
import Market_Bunny from "../assets/misc/Market_Bunny_Illust.png";
import Insights_Bunny from "../assets/misc/Insights_Bunny_Illust.png";
import Makersuite_Logo from "../assets/logos/MakerSuite_Logo_White_Filled.png";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

// ─── Wavy separator (pink) ────────────────────────────────────────────────────
function WavySeparator() {
  return (
    <div className="relative w-full overflow-x-hidden my-0" aria-hidden="true">
      <div
        className="wavy-line opacity-40 absolute left-1/2"
        style={{ width: "100vw", transform: "translateX(-50%)" }}
      />
      <div className="wavy-line invisible" />
    </div>
  );
}

// ─── Pillar card ──────────────────────────────────────────────────────────────
function PillarCard({
  icon: Icon,
  colour,
  label,
  description,
  illustration,
  illustrationAlt,
  href,
}: {
  icon: React.ElementType;
  colour: string;
  label: string;
  description: string;
  illustration: string;
  illustrationAlt: string;
  href?: string;
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (href) navigate(href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && href) {
      handleClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={href ? "button" : undefined}
      tabIndex={href ? 0 : undefined}
      aria-label={href ? `Navigate to ${label}` : undefined}
      className={`rounded-2xl p-6 flex flex-col items-center text-center gap-4 border border-white/20 ${
        href ? "cursor-pointer hover:border-white/40 transition-all hover:shadow-lg" : ""
      }`}
      style={{ backgroundColor: colour }}
    >
      <div
        className="rounded-full p-3 bg-white/20"
      >
        <Icon className="w-6 h-6 text-white" aria-hidden="true" />
      </div>
      <img
        src={illustration}
        alt={illustrationAlt}
        className="w-24 h-24 object-contain"
      />
      <div>
        <p className="font-bold text-white text-lg">{label}</p>
        <p className="text-white/80 text-sm mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ─── How it works step ────────────────────────────────────────────────────────
function Step({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 items-start">
      <div className="shrink-0 w-8 h-8 rounded-full bg-[#6b3a2e] flex items-center justify-center text-white text-sm font-bold">
        {number}
      </div>
      <div>
        <p className="font-bold text-neutral-900">{title}</p>
        <p className="text-neutral-600 text-sm mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const isLoggedIn = !!auth?.user;

  return (
    <div className="overflow-x-hidden">

      {/* ══════════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════════ */}
      <section
        className="scalloped-intro bg-[#6b3a2e] px-4 sm:px-8 lg:px-16 pt-10 sm:pt-16 pb-16 sm:pb-24"
        aria-label="Hero"
      >
        <div className="max-w-4xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
          {/* Illustration — hidden on small mobile, shown from sm up */}
          <div className="hidden sm:flex w-full lg:w-2/5 shrink-0 items-center justify-center">
            <img
              src={Makersuite_Logo}
              alt="Illustration of a bunny at a craft market stall"
              className="w-48 sm:w-56 lg:w-full max-h-64 object-contain lg:scale-110"
            />
          </div>
          {/* Text */}
          <div className="flex-1 space-y-6 text-center lg:text-left">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
                Your handmade business,{" "}
                <span className="underline decoration-white/40 underline-offset-4">
                  all in one place.
                </span>
              </h1>
              <p className="mt-4 text-white/85 text-base sm:text-lg leading-relaxed max-w-lg mx-auto lg:mx-0">
                MakerSuite is a centralised workspace designed for people who create and sell handmade products — track your making, manage your selling, understand your business.
              </p>
            </div>
            {!isLoggedIn && (
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Button
                  aria-label="Sign up for MakerSuite"
                  size="lg"
                  className="bg-white text-[#6b3a2e] hover:bg-white/90 font-semibold gap-2"
                  onClick={() => navigate("/signup")}
                >
                  Sign up to get started
                  <ArrowRight className="w-4 h-4" />
                </Button>

                <Button
                  aria-label="Log in to MakerSuite"
                  size="lg"
                  variant="outline"
                  className="border-white/40 text-white hover:bg-white/10 font-semibold"
                  onClick={() => navigate("/login")}
                >
                  Log in
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          THREE PILLARS
      ══════════════════════════════════════════════════════════════════ */}
      <section
        className="px-4 sm:px-8 lg:px-16 py-12 sm:py-16"
        aria-label="Features"
      >
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Everything a maker needs
            </h2>
            <p className="text-white/75 mt-2 text-sm sm:text-base">
              Three connected tools that work together automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {isLoggedIn && (
              <>
                <PillarCard
                  icon={Hammer}
                  colour="#7d4436"
                  label="Studio"
                  description="Track projects, raw materials and make logs. Set up a recipe once — MakerSuite handles the rest."
                  illustration={Studio_Bunny}
                  illustrationAlt="Illustration of a bunny crafting"
                  href="/studio"
                />
                <PillarCard
                  icon={Store}
                  colour="#6b3a2e"
                  label="Marketplace"
                  description="Manage product listings, in-person markets and sales. Sync with Etsy and keep stock up to date automatically."
                  illustration={Market_Bunny}
                  illustrationAlt="Illustration of a bunny at a market"
                  href="/marketplace"
                />
                <PillarCard
                  icon={BarChart3}
                  colour="#593026"
                  label="Insights"
                  description="See your profit, sell-through rate and stock coverage. Know which products actually make you money."
                  illustration={Insights_Bunny}
                  illustrationAlt="Illustration of a bunny reviewing charts"
                  href="/insights"
                />
              </>
            )}
            {!isLoggedIn && (
              <>
                <PillarCard
                  icon={Hammer}
                  colour="#7d4436"
                  label="Studio"
                  description="Track projects, raw materials and make logs. Set up a recipe once — MakerSuite handles the rest."
                  illustration={Studio_Bunny}
                  illustrationAlt="Illustration of a bunny crafting"
                />
                <PillarCard
                  icon={Store}
                  colour="#6b3a2e"
                  label="Marketplace"
                  description="Manage product listings, in-person markets and sales. Sync with Etsy and keep stock up to date automatically."
                  illustration={Market_Bunny}
                  illustrationAlt="Illustration of a bunny at a market"
                />
                <PillarCard
                  icon={BarChart3}
                  colour="#593026"
                  label="Insights"
                  description="See your profit, sell-through rate and stock coverage. Know which products actually make you money."
                  illustration={Insights_Bunny}
                  illustrationAlt="Illustration of a bunny reviewing charts"
                />
              </>
            )}
          </div>
        </div>
      </section>

      <WavySeparator />

    {/* ══════════════════════════════════════════════════════════════════
        HOW IT WORKS
    ══════════════════════════════════════════════════════════════════ */}
    <section
      className="px-4 sm:px-8 lg:px-16 py-12 sm:py-16"
      aria-label="How it works"
    >
      <div className="max-w-2xl mx-auto space-y-8">

        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            How it works
          </h2>
          <p className="text-white/75 mt-2 text-sm sm:text-base">
            Focus on making and selling — MakerSuite handles the tracking, maths, and insights.
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 space-y-6">

          <Step
            number={1}
            title="Set up your Studio"
            description="Create projects for each thing you make (e.g. a plush) and track the raw materials they use (e.g. yarn, stuffing). MakerSuite tracks labour, material costs, and updates inventory automatically."
          />

          <div className="flex items-center gap-2 text-xs text-neutral-600 ml-2">
            <span>↓</span>
          </div>

          <Step
            number={2}
            title="Set up your Marketplace"
            description="Manage every product you sell in one place. Connect your online stores (e.g. Etsy, Shopify) and log the markets you sell at. MakerSuite gives you a single workspace to track sales, manage listings, and updates stock levels automatically."
          />
          <div className="flex items-center gap-2 text-xs text-neutral-600 ml-2">
            <span>↓</span>
          </div>

          <Step
            number={3}
            title="Grow with Insights"
            description="Get a clear view of your business. MakerSuite turns your Studio and Marketplace activity into insights so you can track performance, spot issues early, and stay in control of your growth."
          />
        </div>
      </div>
    </section>
    </div>
  );
}