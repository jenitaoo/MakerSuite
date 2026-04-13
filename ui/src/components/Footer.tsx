import { ExternalLink } from "lucide-react";
import Makersuite_Logo from "../assets/logos/MakerSuite_Logo_White_Filled.png";

export default function Footer() {
  return (
    <footer className="footer-frosted border-t border-white/10 mt-auto">

      {/* ── Main footer content ── */}
      <div className="px-4 sm:px-8 lg:px-16 py-10 sm:py-12">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">

          {/* Brand + about */}
          <div className="space-y-3 sm:col-span-1">
            <img
              src={Makersuite_Logo}
              alt="MakerSuite"
              className="h-10 object-contain"
            />
            <p className="text-white/70 text-xs leading-relaxed">
              A centalised workspace designed for people who create and sell handmade products — track your making, manage your selling, understand your business.
            </p>
            <p className="text-white/70 text-xs leading-relaxed">
              MakerSuite was designed around real pain points from real makers, gathered through personal experience and research.
            </p>
          </div>

          {/* About the maker */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-white">
              About the Maker
            </p>
            <p className="text-white/70 text-xs leading-relaxed">
              I'm Jenny, a maker and developer based in Dublin. I built MakerSuite as part of my studies and to help me run my small business, <span className="text-white font-medium">With Love, Jeni</span>, where I make handmade trinkets, jewellery and crochet bouquets (●'◡'●).
            </p>
            <p className="text-white/70 text-xs leading-relaxed">
              If you like everything soft, floral and sweet, come find me using below link!
            </p>
            <a
              href="https://withlovejeni.carrd.co/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white hover:text-white/80 transition-colors underline underline-offset-4"
            >
              <ExternalLink className="w-3 h-3" />
              withlovejeni.carrd.co →
            </a>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-white">
              Links
            </p>
            <div className="flex flex-col gap-2">
              <a
                href="https://withlovejeni.carrd.co/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/70 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <ExternalLink className="w-3 h-3" />
                My Socials &amp; Stores
              </a>
              <a
                href="YOUR_FEEDBACK_FORM_LINK_HERE"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/70 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <ExternalLink className="w-3 h-3" />
                Leave Feedback
              </a>
              <a
                href="YOUR_UAT_FORM_LINK_HERE"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/70 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <ExternalLink className="w-3 h-3" />
                Participate in User Testing
              </a>
            </div>
          </div>

        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="border-t border-white/10 px-4 sm:px-8 lg:px-16 py-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-white/40 text-xs">
          <span>MakerSuite · Built by Jenny Huynh · TU Dublin FYP 2025/26</span>
          <span>BSc Computer Science · TU856</span>
        </div>
      </div>

    </footer>
  );
}