import { Link } from "react-router-dom";
import { TreePine } from "lucide-react";

export const Footer = () => (
  <footer className="mt-24 border-t border-[#E5E3D8] bg-[#1E3D2F] text-stone-200">
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
      <div>
        <div className="flex items-center gap-2 text-white">
          <TreePine className="h-5 w-5" />
          <span className="font-heading text-lg font-bold">Parent Link — The Village</span>
        </div>
        <p className="mt-3 max-w-xs text-sm text-stone-300">Neighbors helping parents across Klamath County and Southern Oregon.</p>
      </div>
      <div className="flex flex-col gap-2 text-sm">
        <Link to="/resources" className="hover:text-white" data-testid="footer-resources-link">Local resources</Link>
        <Link to="/businesses" className="hover:text-white" data-testid="footer-businesses-link">Business & organization listings</Link>
        <Link to="/safety" className="hover:text-white" data-testid="footer-safety-link">Safety guidelines</Link>
      </div>
      <div className="text-sm text-stone-300">
        <p className="font-semibold text-white">In an emergency, call 911.</p>
        <p className="mt-1">For local help finding services, dial 211.</p>
        <p className="mt-1">Crisis support: call or text 988.</p>
      </div>
    </div>
    <p className="border-t border-white/10 py-5 text-center text-xs text-stone-400">© 2026 Parent Link — The Village</p>
  </footer>
);
