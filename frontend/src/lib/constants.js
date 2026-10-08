import { Car, Shirt, ShoppingBasket, GraduationCap, Baby, Soup, HeartHandshake } from "lucide-react";

export const CATEGORIES = [
  { value: "ride", label: "Ride", icon: Car },
  { value: "laundry", label: "Laundry help", icon: Shirt },
  { value: "groceries", label: "Groceries", icon: ShoppingBasket },
  { value: "school", label: "School activities", icon: GraduationCap },
  { value: "childcare", label: "Childcare", icon: Baby },
  { value: "meals", label: "Meals", icon: Soup },
  { value: "other", label: "Other", icon: HeartHandshake },
];

export const categoryOf = (v) => CATEGORIES.find((c) => c.value === v) || CATEGORIES[6];

export const NEIGHBORHOODS = [
  "Klamath Falls", "Altamont", "Henley", "Merrill", "Malin", "Chiloquin",
  "Bonanza", "Keno", "Midland", "Beatty", "Sprague River", "Other",
];

export const ROLE_LABELS = { parent: "Parent / Caregiver", volunteer: "Volunteer Neighbor", both: "Parent & Volunteer", admin: "Village Admin" };

export const STATUS = {
  open: { label: "Open", cls: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  accepted: { label: "Accepted", cls: "bg-amber-50 border-amber-200 text-amber-800" },
  in_progress: { label: "In progress", cls: "bg-blue-50 border-blue-200 text-blue-800" },
  completed: { label: "Completed", cls: "bg-stone-100 border-stone-200 text-stone-700" },
  cancelled: { label: "Cancelled", cls: "bg-stone-100 border-stone-200 text-stone-500" },
};

export const canVolunteer = (u) => u && ["volunteer", "both", "admin"].includes(u.role);
export const canRequest = (u) => u && ["parent", "both", "admin"].includes(u.role);

export const IMAGES = {
  hero: "https://images.unsplash.com/photo-1540479859555-17af45c78602?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=1600",
  community: "https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=1200",
  volunteer: "https://images.unsplash.com/photo-1758599668178-d9716bbda9d5?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=1200",
  landscape: "https://images.unsplash.com/photo-1587656421406-273a011cad8d?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=1600",
};

export const timeAgo = (iso) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
