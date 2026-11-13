import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  markClassName?: string;
  withWordmark?: boolean;
  subtitle?: string;
};

export function Logo({ className, markClassName, withWordmark = true, subtitle }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary shadow-soft",
          markClassName,
        )}
        aria-hidden="true"
      >
        <svg viewBox="0 0 48 48" className="h-8 w-8" fill="none">
          <path
            d="M12 26a12 12 0 0 0 24 0"
            stroke="hsl(var(--sun))"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="24" cy="20.5" r="5.6" fill="hsl(30 60% 96%)" />
          <circle cx="17.6" cy="11.6" r="1.9" fill="hsl(var(--mint))" />
          <circle cx="30.6" cy="11.2" r="1.6" fill="hsl(var(--sun))" />
        </svg>
      </span>
      {withWordmark && (
        <span className="leading-none">
          <span className="block font-display text-lg font-semibold tracking-tight text-foreground">
            Nosso Bebê
          </span>
          {subtitle && (
            <span className="mt-1 block text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {subtitle}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
