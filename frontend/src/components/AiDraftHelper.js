import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { api, formatApiError } from "@/lib/api";

export const AiDraftHelper = ({ onDraft }) => {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const draft = async () => {
    if (text.trim().length < 5) { toast.error("Describe what you need in a few words first"); return; }
    setBusy(true);
    try {
      const { data } = await api.post("/ai/draft-request", { text });
      onDraft(Object.fromEntries(Object.entries(data).filter(([, v]) => v)));
      toast.success("Draft ready. Review it below before posting.");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#D4A373]/60 bg-[#FDF8F0] p-4" data-testid="ai-draft-helper">
      <p className="flex items-center gap-2 text-sm font-semibold text-stone-900"><Sparkles className="h-4 w-4 text-[#D96838]" />Describe it in your own words</p>
      <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} className="mt-2 bg-white" data-testid="ai-draft-input"
        placeholder="e.g. need someone to take my 2 kids to soccer at Steen Sports Park thursday 5pm, I work late" />
      <button type="button" onClick={draft} disabled={busy} data-testid="ai-draft-btn"
        className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#D96838] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#BE5527] disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Write it for me
      </button>
    </div>
  );
};
