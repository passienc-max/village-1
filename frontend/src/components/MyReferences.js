import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { api, formatApiError } from "@/lib/api";

const STATUS_CLS = { requested: "bg-amber-50 text-amber-800", submitted: "bg-emerald-50 text-emerald-800" };

export const MyReferences = () => {
  const [items, setItems] = useState([]);
  const [f, setF] = useState({ name: "", email: "", relationship: "" });
  const load = useCallback(() => api.get("/references/mine").then((r) => setItems(r.data)), []);
  useEffect(() => { load(); }, [load]);

  const call = async (fn, msg) => {
    try { await fn(); toast.success(msg); load(); return true; } catch (e) { toast.error(formatApiError(e)); return false; }
  };
  const add = async (e) => {
    e.preventDefault();
    if (await call(() => api.post("/references", f), `Reference request emailed to ${f.name}`)) setF({ name: "", email: "", relationship: "" });
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="rounded-xl border border-[#E5E3D8] bg-white p-6 sm:p-8" data-testid="my-references">
      <h2 className="font-heading text-xl font-semibold text-stone-900">My references</h2>
      <p className="mt-1 text-sm text-stone-600">Add up to 5 people who know you. We email each one a short form, and their answers appear on your profile.</p>
      <form onSubmit={add} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <Input required minLength={2} placeholder="Name" value={f.name} onChange={set("name")} data-testid="reference-name-input" />
        <Input required type="email" placeholder="Email" value={f.email} onChange={set("email")} data-testid="reference-email-input" />
        <Input required minLength={2} placeholder="Relationship (e.g. coworker)" value={f.relationship} onChange={set("relationship")} data-testid="reference-relationship-input" />
        <button type="submit" data-testid="add-reference-btn" className="rounded-lg bg-[#D96838] px-4 py-2 text-sm font-semibold text-white hover:bg-[#BE5527]">Send request</button>
      </form>
      <div className="mt-5 space-y-2">
        {items.map((r) => (
          <div key={r.reference_id} className="flex flex-wrap items-center gap-3 rounded-lg bg-[#F4F3EE] p-3 text-sm" data-testid={`my-reference-${r.reference_id}`}>
            <span className="font-semibold text-stone-900">{r.name}</span>
            <span className="text-stone-500">{r.relationship} · {r.email}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLS[r.status]}`}>{r.status === "requested" ? "Waiting" : "Received"}</span>
            <span className="ml-auto flex gap-3 text-xs font-semibold">
              {r.status === "requested" && <button onClick={() => call(() => api.post(`/references/${r.reference_id}/resend`), "Reminder sent")} data-testid={`resend-reference-btn-${r.reference_id}`} className="text-[#1E3D2F]">Resend</button>}
              <button onClick={() => call(() => api.delete(`/references/${r.reference_id}`), "Reference removed")} data-testid={`remove-reference-btn-${r.reference_id}`} className="text-red-700">Remove</button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
