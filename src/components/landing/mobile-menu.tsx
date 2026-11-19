'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { Logo, ctaClass } from './primitives';

/** The small-screen menu: a top sheet in a native modal dialog (focus trap, Esc to close). */
export function MobileMenu({ links, signedIn }: { links: { href: string; label: string }[]; signedIn: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  const show = () => {
    dialog.current?.showModal();
    setOpen(true);
  };
  const close = () => dialog.current?.close();

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={show}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Open menu"
        className="-mr-2 rounded-lg p-2 text-slate-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
      >
        <Menu className="size-5" aria-hidden />
      </button>
      <dialog
        ref={dialog}
        aria-label="Menu"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === dialog.current) close();
        }}
        className="m-0 h-dvh max-h-none w-full max-w-none border-0 bg-transparent p-0 backdrop:bg-navy-950/60 backdrop:backdrop-blur-sm"
      >
        <div className="border-b border-white/10 bg-navy-950 px-4 pb-6 shadow-2xl">
          <div className="flex h-16 items-center justify-between">
            <Logo tone="light" />
            <button
              type="button"
              onClick={close}
              aria-label="Close menu"
              className="-mr-2 rounded-lg p-2 text-slate-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <ul className="space-y-1 pt-2">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={close}
                  className="block rounded-lg px-3 py-3 text-base font-medium text-slate-200 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-white"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid gap-2 border-t border-white/10 pt-4">
            {signedIn ? (
              <Link href="/dashboard" className={ctaClass.primary}>
                Open dashboard
              </Link>
            ) : (
              <>
                <Link href="/register" className={ctaClass.primary}>
                  Get started
                </Link>
                <Link href="/login" className={ctaClass.ghostLight}>
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
}
