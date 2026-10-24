import type { ReactNode } from "react";
import { PixelIcon } from "./PixelIcon";

export function PixelButton({
  children,
  onClick,
  variant = "primary",
  icon,
  disabled,
  className = "",
  type = "button",
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "choice" | "icon" | "chip";
  icon?: React.ComponentProps<typeof PixelIcon>["name"];
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
  ariaLabel?: string;
}) {
  return (
    <button
      type={type}
      className={`btn btn--${variant} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {icon ? <PixelIcon name={icon} size={14} className="btn__icon" /> : null}
      <span className="btn__label">{children}</span>
    </button>
  );
}

export function ChapterHeader({
  chapter,
  kicker,
  title,
  lead,
}: {
  chapter: string;
  kicker: string;
  title: string;
  lead?: ReactNode;
}) {
  return (
    <header className="chapter__head">
      <div className="chapter__no" aria-hidden="true">
        {chapter}
      </div>
      <div className="chapter__heading">
        <p className="chapter__kicker">{kicker}</p>
        <h1 className="chapter__title">{title}</h1>
        {lead ? <p className="chapter__lead">{lead}</p> : null}
      </div>
    </header>
  );
}

export function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="dots" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`dots__dot ${i < current ? "is-done" : ""} ${i === current ? "is-now" : ""}`}
        />
      ))}
    </div>
  );
}