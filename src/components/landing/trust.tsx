import { FileLock2, FileText, HandHeart, ScanFace, Scale } from 'lucide-react';
import { SectionHeading, reveal } from './primitives';

const PRINCIPLES = [
  {
    icon: HandHeart,
    title: 'Consent first',
    body: 'Candidates give consent on the joining page before anything starts. Nothing is captured until they do.',
  },
  {
    icon: Scale,
    title: 'Review, not verdict',
    body: 'Every flag reads “review recommended”, never “cheating”. A person always makes the call.',
  },
  {
    icon: FileLock2,
    title: 'Private storage',
    body: 'Screenshots and recordings live in private storage, visible only to the interview’s owner.',
  },
  {
    icon: ScanFace,
    title: 'No face recognition',
    body: 'There’s no face detection or recognition. The camera points at the screen, and that’s what the AI reads.',
  },
  {
    icon: FileText,
    title: 'Summaries from text only',
    body: 'The AI summary is written from alert text. Screenshots are never sent to the model.',
  },
];

export function Trust() {
  return (
    <section aria-labelledby="trust-title" className="border-y border-line bg-white py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            id="trust-title"
            align="left"
            eyebrow="Trust & fairness"
            title="Fair to candidates. Clear for interviewers."
            description="Monitoring only works if both sides trust it. These rules are built into the product, not left to policy."
          />
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {PRINCIPLES.map(({ icon: Icon, title, body }, index) => (
            <li
              key={title}
              {...reveal(index * 70)}
              className={`rounded-2xl border border-line bg-canvas p-6 ${index === PRINCIPLES.length - 1 ? 'sm:col-span-2' : ''}`}
            >
              <Icon className="size-5 text-brand-600" aria-hidden />
              <h3 className="mt-4 font-semibold text-ink">{title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-ink-soft">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
