import { cn } from "@/lib/utils";

export type AvatarTone = "primary" | "lavender" | "mint" | "sun";

const toneStyles: Record<AvatarTone, string> = {
  primary: "bg-primary/15 text-[hsl(13,62%,38%)]",
  lavender: "bg-lavender/70 text-[hsl(266,30%,28%)]",
  mint: "bg-mint/70 text-[hsl(164,34%,22%)]",
  sun: "bg-sun/80 text-[hsl(32,50%,26%)]",
};

const sizeStyles = {
  sm: "h-9 w-9 text-[11px]",
  md: "h-11 w-11 text-xs",
  lg: "h-14 w-14 text-sm",
  xl: "h-20 w-20 text-lg",
};

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

type InitialsAvatarProps = {
  name: string;
  tone?: AvatarTone;
  size?: keyof typeof sizeStyles;
  className?: string;
  ring?: boolean;
};

export function InitialsAvatar({
  name,
  tone = "primary",
  size = "md",
  className,
  ring = false,
}: InitialsAvatarProps) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold tracking-wide",
        toneStyles[tone],
        sizeStyles[size],
        ring && "ring-2 ring-card",
        className,
      )}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
