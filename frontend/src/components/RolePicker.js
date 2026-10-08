import { Baby, HandHeart, Users } from "lucide-react";

const OPTIONS = [
  { value: "parent", label: "Get help", sub: "Parent / caregiver", icon: Baby },
  { value: "volunteer", label: "Give help", sub: "Volunteer neighbor", icon: HandHeart },
  { value: "both", label: "Both", sub: "Give and get", icon: Users },
];

export const RolePicker = ({ value, onChange }) => (
  <div className="grid grid-cols-3 gap-2" data-testid="role-toggle-selector">
    {OPTIONS.map(({ value: v, label, sub, icon: Icon }) => (
      <button type="button" key={v} onClick={() => onChange(v)} data-testid={`role-option-${v}`}
        className={`rounded-xl border-2 p-3 text-left transition-colors ${value === v ? "border-[#1E3D2F] bg-[#EBF2EC]" : "border-[#E5E3D8] bg-white hover:border-[#588157]"}`}>
        <Icon className="h-5 w-5 text-[#1E3D2F]" />
        <span className="mt-2 block text-sm font-semibold text-stone-900">{label}</span>
        <span className="block text-[11px] text-stone-500">{sub}</span>
      </button>
    ))}
  </div>
);
