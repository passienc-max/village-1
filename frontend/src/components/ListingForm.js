import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const RESOURCE_CATEGORIES = ["Food", "Housing & Utilities", "Youth & Family", "Health", "Crisis & Safety", "Education", "Other"];
export const BUSINESS_CATEGORIES = ["Childcare", "Laundromat", "Grocery & Market", "Health & Clinic", "Family Activities", "Services", "Other"];

export const ListingForm = ({ type, onSubmit, submitLabel, testPrefix }) => {
  const cats = type === "resource" ? RESOURCE_CATEGORIES : BUSINESS_CATEGORIES;
  const blank = { type, name: "", category: cats[0], description: "", address: "", town: "", phone: "", website: "", hours: "" };
  const [form, setForm] = useState(blank);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (await onSubmit(form)) setForm(blank);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <Input required minLength={2} placeholder="Name" value={form.name} onChange={set("name")} data-testid={`${testPrefix}-name-input`} />
      <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
        <SelectTrigger className="bg-white" data-testid={`${testPrefix}-category-select`}><SelectValue /></SelectTrigger>
        <SelectContent className="bg-white">{cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
      </Select>
      <Textarea rows={3} placeholder="What do they offer families?" value={form.description} onChange={set("description")} data-testid={`${testPrefix}-description-input`} />
      <div className="grid grid-cols-2 gap-3">
        <Input placeholder="Town" value={form.town} onChange={set("town")} data-testid={`${testPrefix}-town-input`} />
        <Input placeholder="Phone" value={form.phone} onChange={set("phone")} data-testid={`${testPrefix}-phone-input`} />
      </div>
      <Input placeholder="Address" value={form.address} onChange={set("address")} data-testid={`${testPrefix}-address-input`} />
      <div className="grid grid-cols-2 gap-3">
        <Input placeholder="Website" value={form.website} onChange={set("website")} data-testid={`${testPrefix}-website-input`} />
        <Input placeholder="Hours" value={form.hours} onChange={set("hours")} data-testid={`${testPrefix}-hours-input`} />
      </div>
      <button type="submit" data-testid={`${testPrefix}-submit-btn`} className="w-full rounded-lg bg-[#1E3D2F] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#162E23]">
        {submitLabel}
      </button>
    </form>
  );
};
