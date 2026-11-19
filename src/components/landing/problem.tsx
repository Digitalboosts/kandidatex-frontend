import { AppWindow, CircleHelp, Webcam } from 'lucide-react';
import { reveal } from './primitives';

const POINTS = [
  {
    icon: Webcam,
    title: 'The webcam faces the wrong way',
    body: 'It shows the candidate. The screen they are typing on stays out of view.',
  },
  {
    icon: AppWindow,
    title: 'AI sits one Alt-Tab away',
    body: 'ChatGPT, Claude, Gemini or Copilot can run in a window right next to the editor.',
  },
  {
    icon: CircleHelp,
    title: 'Interviewers are left guessing',
    body: 'A long pause or a perfect answer could mean anything. Without the screen, you can’t tell.',
  },
];

export function Problem() {
  return (
    <section aria-labelledby="problem-title" className="bg-canvas py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center" {...reveal()}>
          <h2 id="problem-title" className="text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl">
            Webcams show faces, not screens.
          </h2>
          <p className="mt-4 text-base leading-7 text-ink-soft sm:text-lg">
            Remote coding rounds depend on what happens on the candidate&rsquo;s screen. Today, that&rsquo;s the one thing
            you can&rsquo;t see.
          </p>
        </div>
        <ul className="mt-12 grid gap-4 md:grid-cols-3">
          {POINTS.map(({ icon: Icon, title, body }, index) => (
            <li
              key={title}
              {...reveal(index * 90)}
              className="rounded-2xl border border-line bg-white p-6 transition-shadow hover:shadow-md"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-canvas text-ink ring-1 ring-line">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-5 font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
