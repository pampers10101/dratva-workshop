import { useScrollProgress } from '../hooks/useWorkshopMotion';

const HOLE_COUNT = 13;

export function ScrollSeamRail() {
  const progress = useScrollProgress();
  const stitchedCount = Math.round(progress * (HOLE_COUNT - 1));

  const activeY = 12 + Math.min(HOLE_COUNT - 1, stitchedCount) * 21;

  return (
    <aside
      aria-hidden="true"
      className="pointer-events-none fixed left-3.5 top-1/2 z-20 hidden -translate-y-1/2 min-[1360px]:flex flex-col items-center gap-2 select-none opacity-85"
    >
      <span className="font-mono-craft text-[10px] tracking-wider text-[#768095]">0 мм</span>

      <svg width="26" height="276" viewBox="0 0 26 276" fill="none" className="overflow-visible">
        <line
          x1="13"
          y1="8"
          x2="13"
          y2="268"
          stroke="rgba(220,227,239,0.16)"
          strokeWidth="1"
          strokeDasharray="2 4"
        />

        {Array.from({ length: HOLE_COUNT }).map((_, index) => {
          const y = 12 + index * 21;
          const isStitched = index < stitchedCount;
          const nextY = y + 21;

          return (
            <g key={index}>
              <path
                d={`M10.5 ${y - 2} L15.5 ${y + 2}`}
                stroke={index <= stitchedCount ? '#DCE3EF' : 'rgba(220,227,239,0.28)'}
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              {index < HOLE_COUNT - 1 && (
                <path
                  d={`M13 ${y + 1.5} C16.5 ${y + 7}, 9.5 ${nextY - 7}, 13 ${nextY - 1.5}`}
                  stroke="#E85D2A"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeDasharray="26"
                  strokeDashoffset={isStitched ? 0 : 26}
                  className="transition-[stroke-dashoffset] duration-300 ease-out"
                />
              )}
            </g>
          );
        })}

        {/* Active brass-chrome saddle stitch head */}
        <circle cx="13" cy={activeY} r="3.4" fill="#0B0C10" stroke="#E85D2A" strokeWidth="1.6" />
      </svg>

      <span className="font-mono-craft text-[10px] tracking-wider text-[#DCE3EF]">
        {Math.round(progress * 48)} мм
      </span>
    </aside>
  );
}
