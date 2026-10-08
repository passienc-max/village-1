import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Search, Lightbulb } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ListingCard } from "@/components/ListingCard";
import { ListingForm, RESOURCE_CATEGORIES, BUSINESS_CATEGORIES } from "@/components/ListingForm";

export const Directory = ({ type, title, intro, image }) => {
  const cats = type === "resource" ? RESOURCE_CATEGORIES : BUSINESS_CATEGORIES;
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => {
      api.get("/listings", { params: { type, q: q || undefined, category: cat || undefined } }).then((r) => setItems(r.data));
    }, 250);
    return () => clearTimeout(t);
  }, [type, q, cat]);

  const suggest = async (form) => {
    try {
      await api.post("/listings/suggest", form);
      toast.success("Thanks! An admin will review your suggestion.");
      setOpen(false);
      return true;
    } catch (e) {
      toast.error(formatApiError(e));
      return false;
    }
  };

  const onSuggestClick = () => (user ? setOpen(true) : navigate("/login"));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <section className="relative overflow-hidden rounded-2xl bg-[#1E3D2F]">
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="relative px-6 py-14 sm:px-12">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A373]">Klamath County · Southern Oregon</p>
          <h1 className="mt-2 font-heading text-4xl font-bold text-white sm:text-5xl" data-testid="directory-title">{title}</h1>
          <p className="mt-3 max-w-xl text-stone-200">{intro}</p>
        </div>
      </section>
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, service or town" className="h-11 bg-white pl-9" data-testid="directory-search-input" />
        </div>
        <button onClick={onSuggestClick} data-testid="suggest-listing-btn" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#D96838] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#BE5527]">
          <Lightbulb className="h-4 w-4" /> Suggest a listing
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {["", ...cats].map((c) => (
          <button key={c || "all"} onClick={() => setCat(c)} data-testid={`directory-filter-${c || "all"}`}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${cat === c ? "border-[#1E3D2F] bg-[#1E3D2F] text-white" : "border-[#E5E3D8] bg-white text-stone-700 hover:bg-[#F4F3EE]"}`}>
            {c || "All"}
          </button>
        ))}
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="directory-list">
        {items.map((l) => <ListingCard key={l.listing_id} l={l} />)}
      </div>
      {items.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-[#D4A373] bg-[#FDF8F0] p-10 text-center" data-testid="directory-empty">
          <p className="font-heading text-lg font-semibold text-stone-900">Nothing listed here yet</p>
          <p className="mt-1 text-sm text-stone-600">Know a great local place? Suggest it and help other families find it.</p>
        </div>
      )}
      <p className="mt-8 text-xs text-stone-500">Listings are community-maintained. Please confirm hours and details directly before visiting.</p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-white" data-testid="suggest-listing-modal">
          <DialogHeader>
            <DialogTitle className="font-heading">Suggest a {type === "resource" ? "resource" : "business or organization"}</DialogTitle>
            <DialogDescription>Suggestions appear after a Village admin approves them.</DialogDescription>
          </DialogHeader>
          <ListingForm type={type} onSubmit={suggest} submitLabel="Send suggestion" testPrefix="suggest-listing" />
        </DialogContent>
      </Dialog>
    </div>
  );
};
