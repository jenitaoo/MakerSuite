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
            <p className="text-white text-xs leading-relaxed">
              A centralised workspace designed for people who create and sell handmade products — track your making, manage your selling, understand your business.
            </p>
            <p className="text-white text-xs leading-relaxed">
              MakerSuite was designed around real pain points from real makers, gathered through personal experience and research.
            </p>
          </div>

          {/* About the maker */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-white">
              About the Maker
            </p>
            <p className="text-white text-xs leading-relaxed">
              I'm Jenny, a maker and developer based in Dublin. I built MakerSuite as part of my studies and to help me run my small business, <span className="text-white font-medium">With Love, Jeni</span>, where I make handmade trinkets, jewellery and crochet bouquets (●'◡'●).
            </p>
            <p className="text-white text-xs leading-relaxed">
              If you like everything soft, floral and sweet, come visit my <a href="https://withlovejeni.carrd.co/" target="_blank" rel="noopener noreferrer" className="text-white underline">socials &amp; stores</a>!
            </p>
          </div>

          {/* Links and Notices*/}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-white">
              Notice
            </p>
            <div className="flex flex-col gap-2">
              <p className="text-xs text-white">
                MakerSuite is currently in active development and is free to use. However, there may be bugs, missing features, and occasional downtime.
              </p>
              <p className="text-xs text-white">
                The term 'Etsy' is a trademark of Etsy, Inc. This application uses the Etsy API but is not endorsed or certified by Etsy, Inc.
              </p>
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white">
              Links
            </p>
            <div className="flex flex-col gap-2">
              <a
                href="https://withlovejeni.carrd.co/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white hover:text-white transition-colors flex items-center gap-1.5"
              >
                <ExternalLink className="w-3 h-3" />
                With Love Jeni's Links (Socials & Stores)
              </a>
              <a
                href="https://forms.gle/MUPiE52FsT8yFuXw7"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white hover:text-white transition-colors flex items-center gap-1.5"
              >
                <ExternalLink className="w-3 h-3" />
                Leave Feedback
              </a>
              <a
                href="https://forms.gle/coahZt6JwS3bUnW48"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white hover:text-white transition-colors flex items-center gap-1.5"
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
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-white/90 text-xs">
          <span>MakerSuite · Built by Jenny Thao Huynh · TU Dublin FYP 2025/26</span>
          <span>BSc Computer Science · TU856 · C22448184</span>
        </div>
      </div>

    </footer>
  );
}