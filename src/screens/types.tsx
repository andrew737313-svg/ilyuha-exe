import type { Dispatch, ReactNode } from "react";
import type { GameState, GameAction } from "../game/state";
import type { ScreenId } from "../game/content";

export type ScreenProps = {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  go: (screen: ScreenId) => void;
};

export function ChapterLayout({
  children,
  head,
  nav,
  className = "",
}: {
  children: ReactNode;
  head: ReactNode;
  nav: ReactNode;
  className?: string;
}) {
  return (
    <section className={`chapter ${className}`.trim()}>
      {head}
      {children}
      <nav className="chapter__nav">{nav}</nav>
    </section>
  );
}