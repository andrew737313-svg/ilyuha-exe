/**
 * "Class change" diagram: a thin schoolkid and the same man at 32, drawn as
 * faceless silhouettes so no invented face competes with the real photographs.
 */
export function EvolutionScene({ active }: { active: boolean }) {
  const px = (x: number, y: number, w: number, h: number, fill: string, key?: string) => (
    <rect key={key ?? `${x}-${y}-${w}-${h}-${fill}`} x={x} y={y} width={w} height={h} fill={fill} />
  );

  return (
    <svg
      className="evo"
      viewBox="0 0 220 130"
      role="img"
      aria-label="Схема эволюции: худой школьник слева, взрослый Илюха справа; лица не рисуются, это не портрет"
      shapeRendering="crispEdges"
    >
      {/* frames */}
      {px(4, 4, 96, 122, "#0d1728")}
      {px(6, 6, 92, 118, "#132139")}
      {px(120, 4, 96, 122, "#0d1728")}
      {px(122, 6, 92, 118, "#132139")}
      {px(4, 4, 96, 2, "#2b3c58")}
      {px(120, 4, 96, 2, "#2b3c58")}

      {/* LVL 7 — skinny kid, cap, backpack */}
      <g>
        {px(40, 22, 16, 14, "#c99a72")}
        {px(38, 18, 20, 6, "#3f6b8a")}
        {px(36, 22, 6, 3, "#3f6b8a")}
        {px(44, 36, 8, 4, "#c99a72")}
        {px(38, 40, 20, 24, "#4a7d9e")}
        {px(38, 40, 20, 3, "#6fa0bd")}
        {px(34, 42, 4, 18, "#c99a72")}
        {px(58, 42, 4, 18, "#c99a72")}
        {px(38, 64, 20, 4, "#25415a")}
        {px(40, 68, 6, 26, "#2f4a5e")}
        {px(50, 68, 6, 26, "#2f4a5e")}
        {px(38, 94, 10, 4, "#1b2940")}
        {px(48, 94, 10, 4, "#1b2940")}
        {px(62, 44, 6, 16, "#6b5a3a")}
      </g>

      {/* LVL 32 — adult, mug, belly */}
      <g>
        {px(154, 24, 18, 16, "#cf9e74")}
        {px(152, 20, 22, 5, "#3a3247")}
        {px(158, 40, 10, 4, "#cf9e74")}
        {px(150, 44, 26, 30, "#c25a3c")}
        {px(150, 44, 26, 3, "#e07a58")}
        {px(146, 46, 4, 20, "#cf9e74")}
        {px(176, 46, 4, 14, "#cf9e74")}
        {/* belly bulge */}
        {px(148, 62, 30, 14, "#b8502f")}
        {px(146, 66, 34, 8, "#b8502f")}
        {px(150, 76, 26, 4, "#1f2b44")}
        {px(152, 80, 8, 20, "#2c3a54")}
        {px(166, 80, 8, 20, "#2c3a54")}
        {px(150, 100, 12, 4, "#1b2940")}
        {px(164, 100, 12, 4, "#1b2940")}
        {/* mug in hand */}
        {px(172, 54, 8, 9, "#e8eef5")}
        {px(180, 56, 2, 5, "#c8d6e4")}
        {px(172, 54, 8, 2, "#f6fafd")}
      </g>

      {/* upgrade arrow */}
      <g>
        {px(106, 58, 8, 3, "#f0a93f")}
        {px(112, 54, 3, 11, "#f0a93f")}
        {px(108, 54, 4, 3, "#f0a93f")}
        {px(108, 62, 4, 3, "#f0a93f")}
      </g>

      {/* buff aura on the right figure */}
      {active ? (
        <g className="evo__aura">
          {px(144, 40, 3, 66, "#f0a93f")}
          {px(186, 40, 3, 66, "#f0a93f")}
          {px(144, 38, 45, 3, "#f0a93f")}
          {px(144, 106, 45, 3, "#f0a93f")}
        </g>
      ) : null}
    </svg>
  );
}