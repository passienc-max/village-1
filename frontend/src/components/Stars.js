import { Star } from "lucide-react";

export const Stars = ({ value = 0, size = "h-4 w-4", onChange, testId }) => (
  <span className="inline-flex items-center gap-0.5" data-testid={testId}>
    {[1, 2, 3, 4, 5].map((n) => {
      const cls = `${size} ${n <= Math.round(value) ? "fill-[#D96838] text-[#D96838]" : "text-stone-300"}`;
      return onChange ? (
        <button type="button" key={n} onClick={() => onChange(n)} aria-label={`${n} stars`} data-testid={`${testId}-${n}`}
          className="transition-transform hover:scale-110"><Star className={cls} /></button>
      ) : <Star key={n} className={cls} />;
    })}
  </span>
);
