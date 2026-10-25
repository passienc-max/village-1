import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { api, formatApiError } from "@/lib/api";
import { Stars } from "@/components/Stars";

export default function ReferenceFormPage() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [f, setF] = useState({ known_for: "", rating: 5, trust_with_kids: true, recommendation: "" });

  useEffect(() => { api.get(`/reference-form/${token}`).then((r) => setInfo(r.data)).catch((e) => setErr(formatApiError(e))); }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    try { await api.post(`/reference-form/${token}`, f); setDone(true); } catch (e2) { toast.error(formatApiError(e2)); }
  };

  if (err) return <p className="py-20 text-center text-stone-600" data-testid="reference-form-error">{err}</p>;
  if (!info) return null;
  if (done || info.status === "submitted")
    return <p className="mx-auto max-w-lg px-4 py-20 text-center font-heading text-2xl text-stone-900" data-testid="reference-form-done">Thank you for helping the Village! Your reference has been received.</p>;

  return (
    <div className="mx-auto max-w-xl px-4 py-12" data-testid="reference-form-page">
      <h1 className="font-heading text-3xl font-bold text-stone-900">Reference for {info.volunteer_name}</h1>
      <p className="mt-2 text-stone-600">Hi {info.reference_name}, {info.volunteer_name} listed you as a reference ({info.relationship}). Your answers will appear on their Parent Link profile with your name and relationship. Your email stays private.</p>
      <form onSubmit={submit} className="mt-8 space-y-5 rounded-xl border border-[#E5E3D8] bg-white p-6">
        <div className="space-y-1.5"><Label>How long have you known them?</Label><Input required value={f.known_for} onChange={(e) => setF({ ...f, known_for: e.target.value })} placeholder="e.g. 6 years" data-testid="reference-known-input" /></div>
        <div className="space-y-1.5"><Label>Overall, how would you rate them?</Label><div><Stars value={f.rating} onChange={(v) => setF({ ...f, rating: v })} size="h-7 w-7" testId="reference-rating" /></div></div>
        <div className="space-y-1.5">
          <Label>Would you trust them to help with children?</Label>
          <div className="flex gap-2">
            {[[true, "Yes"], [false, "Not sure / No"]].map(([v, l]) => (
              <button type="button" key={l} onClick={() => setF({ ...f, trust_with_kids: v })} data-testid={`reference-trust-${v}`}
                className={`rounded-lg border-2 px-4 py-2 text-sm font-semibold ${f.trust_with_kids === v ? "border-[#1E3D2F] bg-[#EBF2EC]" : "border-[#E5E3D8]"}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5"><Label>Your recommendation</Label><Textarea required minLength={10} rows={5} value={f.recommendation} onChange={(e) => setF({ ...f, recommendation: e.target.value })} placeholder="What should local families know about them?" data-testid="reference-recommendation-input" /></div>
        <button type="submit" data-testid="reference-submit-btn" className="w-full rounded-lg bg-[#1E3D2F] py-3 text-sm font-semibold text-white hover:bg-[#162E23]">Submit reference</button>
      </form>
    </div>
  );
}
