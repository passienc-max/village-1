import { MapPin, Phone, Globe, Clock } from "lucide-react";

export const ListingCard = ({ l, children }) => (
  <div data-testid={`listing-card-${l.listing_id}`} className="flex flex-col rounded-xl border border-[#E5E3D8] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
    <span className="w-fit rounded-full bg-[#FDF8F0] px-2.5 py-0.5 text-xs font-semibold text-[#9a6a3a]">{l.category}</span>
    <h3 className="mt-3 font-heading text-lg font-semibold text-stone-900">{l.name}</h3>
    {l.description && <p className="mt-1 text-sm leading-relaxed text-stone-600">{l.description}</p>}
    <div className="mt-4 space-y-1.5 text-sm text-stone-700">
      {(l.address || l.town) && <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#588157]" />{[l.address, l.town].filter(Boolean).join(", ")}</p>}
      {l.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-[#588157]" /><a href={`tel:${l.phone}`} className="hover:underline">{l.phone}</a></p>}
      {l.hours && <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-[#588157]" />{l.hours}</p>}
      {l.website && (
        <p className="flex items-center gap-2"><Globe className="h-4 w-4 text-[#588157]" />
          <a href={l.website} target="_blank" rel="noopener noreferrer" className="truncate text-[#1E3D2F] underline-offset-2 hover:underline" data-testid={`listing-website-${l.listing_id}`}>
            {l.website.replace(/^https?:\/\//, "")}
          </a>
        </p>
      )}
    </div>
    {children}
  </div>
);
