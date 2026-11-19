/**
 * Coded stand-ins for what a phone camera sees on the candidate's laptop. They
 * are illustrations only: plain markup, no images, no product logos. Usable from
 * both server and client components.
 */

import type { ReactNode } from 'react';

const CODE_LINES: { indent: number; parts: [string, string][] }[] = [
  { indent: 0, parts: [['text-sky-300', 'function '], ['text-amber-200', 'twoSum'], ['text-slate-300', '(nums, target) {']] },
  { indent: 1, parts: [['text-sky-300', 'const '], ['text-slate-200', 'seen = '], ['text-sky-300', 'new '], ['text-emerald-300', 'Map'], ['text-slate-300', '();']] },
  { indent: 1, parts: [['text-sky-300', 'for '], ['text-slate-300', '(let i = 0; i < nums.length; i++) {']] },
  { indent: 2, parts: [['text-sky-300', 'const '], ['text-slate-200', 'need = target - nums[i];']] },
  { indent: 2, parts: [['text-sky-300', 'if '], ['text-slate-300', '(seen.has(need)) '], ['text-sky-300', 'return '], ['text-slate-300', '[seen.get(need), i];']] },
  { indent: 2, parts: [['text-slate-200', 'seen.set(nums[i], i);']] },
  { indent: 1, parts: [['text-slate-300', '}']] },
  { indent: 1, parts: [['text-sky-300', 'return '], ['text-slate-300', '[];']] },
  { indent: 0, parts: [['text-slate-300', '}']] },
];

/** A dark code editor with a short solution on screen. */
export function CodeScreen({ dense = false }: { dense?: boolean }) {
  return (
    <div className="flex h-full w-full overflow-hidden bg-[#1b1f2a] text-left font-mono">
      <div className="flex w-[8%] min-w-3 flex-col items-center gap-1.5 bg-[#151821] pt-2">
        <span className="size-1.5 rounded-sm bg-slate-500/70" />
        <span className="size-1.5 rounded-sm bg-slate-600/70" />
        <span className="size-1.5 rounded-sm bg-slate-600/70" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex h-[12%] min-h-3 items-center gap-2 border-b border-white/5 bg-[#151821] px-2">
          <span className={`rounded-t bg-[#1b1f2a] px-1.5 text-slate-300 ${dense ? 'text-[5px]' : 'text-[7px] sm:text-[9px]'}`}>
            solution.ts
          </span>
        </div>
        <div className={`space-y-[0.35em] px-2 pt-2 leading-none ${dense ? 'text-[4.5px]' : 'text-[6.5px] sm:text-[9px] lg:text-[10px]'}`}>
          {CODE_LINES.map((line, index) => (
            <div key={index} className="flex gap-2 whitespace-pre">
              <span className="w-3 shrink-0 text-right text-slate-600">{index + 1}</span>
              <span style={{ paddingLeft: `${line.indent * 1.2}em` }}>
                {line.parts.map(([color, text], part) => (
                  <span key={part} className={color}>
                    {text}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** A light AI-chat window, the kind of screen the AI scan flags for review. */
export function ChatScreen({ app = 'ChatGPT', dense = false }: { app?: string; dense?: boolean }) {
  const label = dense ? 'text-[5px]' : 'text-[7px] sm:text-[9px] lg:text-[10px]';
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white text-left">
      <div className="flex h-[12%] min-h-3 items-center gap-1.5 border-b border-slate-200 bg-slate-100 px-2">
        <span className="size-1 rounded-full bg-slate-300" />
        <span className="size-1 rounded-full bg-slate-300" />
        <span className={`ml-1 rounded bg-white px-1.5 font-medium text-slate-600 ${label}`}>{app}</span>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="w-[18%] space-y-1 bg-slate-50 p-1.5">
          <span className="block h-1 rounded bg-slate-200" />
          <span className="block h-1 w-3/4 rounded bg-slate-200" />
          <span className="block h-1 w-5/6 rounded bg-slate-200" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-2">
          <p className={`ml-auto max-w-[80%] rounded-lg bg-slate-100 px-2 py-1 text-slate-700 ${label}`}>
            Return the indices of two numbers that add up to target
          </p>
          <div className="max-w-[90%] space-y-1">
            <p className={`text-slate-700 ${label}`}>Here&rsquo;s an O(n) approach using a hash map:</p>
            <div className="space-y-[3px] rounded-md bg-slate-900 p-1.5">
              <span className="block h-[3px] w-2/3 rounded bg-sky-300/70" />
              <span className="block h-[3px] w-1/2 rounded bg-slate-400/60" />
              <span className="block h-[3px] w-3/4 rounded bg-emerald-300/60" />
              <span className="block h-[3px] w-2/5 rounded bg-slate-400/60" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The laptop screen as a phone camera sees it: a bezel, a slight tilt, a soft
 * vignette and the green framing corners calibration draws once the whole
 * screen is in view.
 */
export function CameraView({ children, framed = true }: { children: ReactNode; framed?: boolean }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(ellipse_at_50%_40%,#1e293b,#020617_75%)]">
      <div className="absolute inset-[9%_10%_11%] [perspective:900px]">
        <div className="h-full w-full rounded-[4px] bg-black p-[1.5%] shadow-[0_10px_30px_rgb(0_0_0/0.6)] [transform:rotateX(5deg)_rotateZ(-1deg)]">
          <div className="h-full w-full overflow-hidden rounded-[2px]">{children}</div>
        </div>
      </div>
      {framed ? (
        <div className="pointer-events-none absolute inset-[6%_7%_8%]">
          <span className="absolute left-0 top-0 size-[10%] min-h-2 min-w-2 border-l-2 border-t-2 border-emerald-400/90" />
          <span className="absolute right-0 top-0 size-[10%] min-h-2 min-w-2 border-r-2 border-t-2 border-emerald-400/90" />
          <span className="absolute bottom-0 left-0 size-[10%] min-h-2 min-w-2 border-b-2 border-l-2 border-emerald-400/90" />
          <span className="absolute bottom-0 right-0 size-[10%] min-h-2 min-w-2 border-b-2 border-r-2 border-emerald-400/90" />
        </div>
      ) : null}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgb(0_0_0/0.45))]" />
    </div>
  );
}
