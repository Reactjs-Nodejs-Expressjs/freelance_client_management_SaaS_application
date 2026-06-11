/**
 * SBLogo — "SB" initials logo component
 * Replaces the company photo logo with a branded purple rounded-square initials badge.
 * Pass `size` to control pixel dimension (default 40).
 * Pass `className` for extra wrapper classes.
 */
interface SBLogoProps {
  size?: number;
  className?: string;
  rounded?: "full" | "lg" | "xl" | "2xl" | "3xl";
}

export default function SBLogo({ size = 40, className = "", rounded = "xl" }: SBLogoProps) {
  const fontSize = Math.max(10, Math.round(size * 0.38));
  const borderRadius = rounded === "full" ? "9999px" : rounded === "3xl" ? "1.25rem" : rounded === "2xl" ? "1rem" : rounded === "lg" ? "0.5rem" : "0.75rem";

  return (
    <div
      className={`shrink-0 flex items-center justify-center select-none ${className}`}
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 60%, #5b21b6 100%)",
        borderRadius,
        boxShadow: "0 4px 16px rgba(124,58,237,0.35), 0 1px 4px rgba(0,0,0,0.18)",
        flexShrink: 0,
      }}
      aria-label="Strategic Brand Solutions"
    >
      <span
        style={{
          color: "#ffffff",
          fontWeight: 800,
          fontSize,
          letterSpacing: "0.04em",
          lineHeight: 1,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          userSelect: "none",
        }}
      >
        SB
      </span>
    </div>
  );
}
