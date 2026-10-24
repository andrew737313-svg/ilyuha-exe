/**
 * Hand-built pixel scene for the dairy plant chapter (no source artwork exists
 * for this location, so it is drawn in code instead of faking a portrait).
 * Pure rects on a 320×180 grid, palette locked to the rest of the game.
 */
export function FactoryScene() {
  const px = (x: number, y: number, w: number, h: number, fill: string, key?: string) => (
    <rect key={key ?? `${x}-${y}-${w}-${h}-${fill}`} x={x} y={y} width={w} height={h} fill={fill} />
  );

  const silo = (x: number, body: string, light: string, dark: string, k: string) => (
    <g key={k}>
      {px(x + 4, 44, 18, 4, light)}
      {px(x + 2, 48, 22, 4, light)}
      {px(x, 52, 26, 96, body)}
      {px(x, 52, 4, 96, light)}
      {px(x + 22, 52, 4, 96, dark)}
      {px(x + 8, 70, 10, 2, dark)}
      {px(x + 8, 96, 10, 2, dark)}
      {px(x, 144, 26, 6, dark)}
    </g>
  );

  return (
    <svg
      className="factory"
      viewBox="0 0 320 180"
      role="img"
      aria-label="Пиксельная иллюстрация молочного завода: ёмкости, трубы, пульт и силуэт человека со спины"
      shapeRendering="crispEdges"
    >
      {/* room */}
      {px(0, 0, 320, 180, "#0b1322")}
      {px(0, 0, 320, 96, "#101c30")}
      {px(0, 96, 320, 6, "#1a2942")}
      {px(0, 102, 320, 48, "#14213a")}
      {px(0, 150, 320, 30, "#0d1728")}
      {px(0, 150, 320, 2, "#23334f")}

      {/* back window, night shift */}
      {px(96, 28, 54, 40, "#0a1424")}
      {px(98, 30, 50, 36, "#132744")}
      {px(100, 32, 12, 10, "#1d3a5c")}
      {px(122, 44, 14, 8, "#1b3452")}
      {px(96, 44, 54, 2, "#1a2942")}
      {px(120, 28, 2, 40, "#1a2942")}

      {/* silos */}
      {silo(206, "#33445f", "#4d6285", "#22304a", "s1")}
      {silo(238, "#384a67", "#556b8f", "#243350", "s2")}
      {silo(270, "#33445f", "#4d6285", "#22304a", "s3")}

      {/* pipes */}
      {px(60, 84, 152, 8, "#243350")}
      {px(60, 86, 152, 4, "#7d93b4")}
      {px(206, 86, 8, 40, "#243350")}
      {px(208, 86, 4, 40, "#7d93b4")}
      {px(238, 86, 8, 34, "#243350")}
      {px(240, 86, 4, 34, "#7d93b4")}
      {px(270, 86, 8, 52, "#243350")}
      {px(272, 86, 4, 52, "#7d93b4")}

      {/* valves */}
      {px(150, 78, 8, 4, "#c25a3c")}
      {px(152, 82, 4, 4, "#8c3d2a")}
      {px(186, 78, 8, 4, "#c25a3c")}
      {px(188, 82, 4, 4, "#8c3d2a")}

      {/* filler machine */}
      {px(34, 92, 66, 58, "#26364f")}
      {px(38, 88, 58, 6, "#3b4f6d")}
      {px(40, 96, 54, 20, "#0d1728")}
      {px(44, 100, 16, 4, "#7fa05a")}
      {px(44, 106, 10, 3, "#4a5f7e")}
      {px(64, 100, 22, 3, "#f0a93f")}
      {px(64, 106, 14, 3, "#4a5f7e")}
      {px(42, 124, 50, 22, "#1b2940")}
      {px(46, 128, 20, 14, "#2f425e")}
      {px(70, 128, 18, 14, "#2f425e")}
      {px(34, 146, 66, 4, "#0a1220")}

      {/* conveyor + bottles */}
      {px(100, 140, 118, 4, "#2b3c58")}
      {px(100, 144, 118, 6, "#18263c")}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <g key={`b${i}`}>
          {px(104 + i * 16, 130, 6, 10, "#e8eef5")}
          {px(104 + i * 16, 127, 6, 3, "#f6fafd")}
          {px(105 + i * 16, 132, 4, 2, "#9fb4cc")}
        </g>
      ))}

      {/* control panel on the wall */}
      {px(14, 40, 44, 34, "#1b2940")}
      {px(16, 42, 40, 30, "#0d1728")}
      {px(20, 46, 8, 5, "#7fa05a")}
      {px(31, 46, 8, 5, "#c25a3c")}
      {px(42, 46, 8, 5, "#f0a93f")}
      {px(20, 56, 30, 3, "#2b3c58")}
      {px(20, 62, 22, 3, "#2b3c58")}

      {/* ceiling lamps */}
      {[44, 160, 276].map((lx, i) => (
        <g key={`lamp${i}`}>
          {px(lx, 0, 3, 10, "#2b3c58")}
          {px(lx - 5, 10, 13, 4, "#f0a93f")}
          {px(lx - 3, 14, 9, 2, "#ffe1a1")}
          <polygon
            points={`${lx - 8},16 ${lx + 11},16 ${lx + 26},110 ${lx - 23},110`}
            fill="url(#lampGlow)"
            opacity="0.16"
          />
        </g>
      ))}

      {/* worker, seen from behind — no invented face */}
      <g>
        {px(140, 104, 12, 12, "#1b2333")}
        {px(140, 100, 12, 5, "#e8eef5")}
        {px(138, 99, 16, 2, "#f6fafd")}
        {px(136, 116, 20, 22, "#eef4fa")}
        {px(136, 116, 3, 22, "#ffffff")}
        {px(153, 116, 3, 22, "#c8d6e4")}
        {px(132, 118, 4, 16, "#e4edf5")}
        {px(156, 118, 4, 16, "#d6e2ee")}
        {px(138, 138, 16, 10, "#2b3c58")}
        {px(139, 148, 6, 4, "#1b2940")}
        {px(147, 148, 6, 4, "#1b2940")}
        {px(136, 152, 20, 2, "#0a1220")}
      </g>

      {/* steam */}
      <g opacity="0.35">
        {px(284, 40, 8, 3, "#b9cbe0")}
        {px(290, 32, 6, 3, "#b9cbe0")}
        {px(286, 24, 5, 3, "#b9cbe0")}
        {px(16, 20, 7, 3, "#b9cbe0")}
        {px(20, 12, 5, 3, "#b9cbe0")}
      </g>

      <defs>
        <linearGradient id="lampGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd489" />
          <stop offset="100%" stopColor="#ffd489" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}