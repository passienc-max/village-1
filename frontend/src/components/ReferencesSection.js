import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Quote, Mail } from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { Stars } from "@/components/Stars";

export const ReferencesSection = ({ userId, isMe, name }) => {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get(`/users/${userId}/references`).then((r) => setItems(r.data)); }, [userId]);

  const ask = async () => {
    try {
      const { data } = await api.post(`/users/${userId}/request-references`);
      toast.success(data.already ? "You've already asked. We'll let them know again later." : `We asked ${name} to add references.`);
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="space-y-4" data-testid="references-section">
      {items.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#D4A373] bg-[#FDF8F0] p-6 text-sm text-stone-600">
          <p data-testid="references-empty">No references submitted yet.</p>
          {!isMe && (
            <button onClick={ask} data-testid="request-references-btn" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#1E3D2F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#162E23]">
              <Mail className="h-4 w-4" /> Ask {name} for references
            </button>
          )}
        </div>
      )}
      {items.map((r) => (
        <div key={r.reference_id} className="rounded-xl border border-[#E5E3D8] bg-white p-5" data-testid={`reference-${r.reference_id}`}>
          <Quote className="h-5 w-5 text-[#D4A373]" />
          <p className="mt-2 text-sm text-stone-700">{r.response.recommendation}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-stone-600">
            <span className="font-semibold text-stone-900">{r.name}</span>
            <span>{r.relationship}</span>
            <span>Known for {r.response.known_for}</span>
            <Stars value={r.response.rating} size="h-3.5 w-3.5" />
            {r.response.trust_with_kids && <span className="rounded-full bg-[#EBF2EC] px-2 py-0.5 font-semibold text-[#1E3D2F]">Trusted with kids</span>}
          </div>
        </div>
      ))}
    </div>
  );
};
