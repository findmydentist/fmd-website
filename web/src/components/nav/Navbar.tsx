"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AccountMenu } from "@/components/main/AccountMenu";
import { MobileMenu } from "@/components/main/MobileMenu";
import { SHOW_ACCOUNT } from "@/toggle";

/** The brand mark: public/logo.png (fmd + the meditating mascot + FindMyDentist), trimmed to public/img/logo-fmd.webp */
export function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center" aria-label="FindMyDentist home">
      <Image src="/img/logo-fmd.webp" alt="FindMyDentist" width={337} height={180} priority className="h-[44px] w-auto" />
    </Link>
  );
}

// the homepage's sections, in the order they appear on the page
const LINKS = [
  { label: "AI Assistant", href: "/#assistant" },
  { label: "Treatments", href: "/#treatments" },
  { label: "Explore", href: "/#explore" },
  { label: "Safety", href: "/#safety" },
  { label: "Records", href: "/#records" },
  { label: "FMD Edge", href: "/#concierge" },
  // { label: "Dentists", href: "/#dentists" }, // hidden with the Dentists section
  { label: "Trust", href: "/#trust" },
  { label: "Products", href: "/#products" },
];

const EASE = [0.22, 1, 0.36, 1] as const;

/** The section crossing the middle of the screen, by id: the bar marks it as where the visitor is. */
function useCurrentSection() {
  const [current, setCurrent] = useState("");
  useEffect(() => {
    const els = LINKS.map((l) => document.getElementById(l.href.slice(2))).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setCurrent(e.target.id);
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    els.forEach((e) => io.observe(e));
    // above the first section (the hero) nothing is marked
    const top = () => window.scrollY < (els[0]?.offsetTop ?? 0) - window.innerHeight / 2 && setCurrent("");
    window.addEventListener("scroll", top, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", top);
    };
  }, []);
  return current;
}

/** The site bar: a floating matte-glass pill with the logo, the homepage's sections in page order, and the early-access
 *  waitlist. Below xl the sections fold into a matte menu card. */
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const current = useCurrentSection();

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5">
      <nav
        className={`nav-matte mx-auto flex max-w-[1280px] items-center justify-between gap-4 rounded-full pl-5 pr-2 transition-[height,background-color,box-shadow] duration-500 ${
          scrolled ? "h-[58px] !bg-[color-mix(in_srgb,var(--surface)_80%,transparent)]" : "h-[64px]"
        }`}
      >
        <Logo />
        <ul className="hidden items-center xl:flex" onMouseLeave={() => setHover(null)}>
          {LINKS.map((l) => {
            const id = l.href.slice(2);
            const on = current === id;
            return (
              <li key={l.href} className="relative">
                <a
                  href={l.href}
                  onMouseEnter={() => setHover(id)}
                  onFocus={() => setHover(id)}
                  aria-current={on ? "location" : undefined}
                  className={`relative z-10 block whitespace-nowrap rounded-full px-3.5 py-2 text-[13.5px] transition-colors duration-300 ${on || hover === id ? "text-ink" : "text-ink-2"}`}
                >
                  {l.label}
                </a>
                {/* a soft pane that slides from link to link under the pointer */}
                {hover === id && (
                  <motion.span
                    layoutId="nav-hover"
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-white/[0.06]"
                    transition={{ duration: 0.35, ease: EASE }}
                  />
                )}
                {/* the section on screen: a dot under its name */}
                {on && (
                  <motion.span
                    layoutId="nav-current"
                    aria-hidden
                    className="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-[rgb(var(--accent-rgb))]"
                    transition={{ duration: 0.45, ease: EASE }}
                  />
                )}
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-1.5">
          {/* desktop: Log in or the account avatar; below that, Join Waitlist stays and everything else is in the ☰ sidebar */}
          {SHOW_ACCOUNT && (
            <span className="hidden xl:block">
              <AccountMenu />
            </span>
          )}
          <Link href="/#coming-soon" className="btn-primary cta-pulse h-11 gap-1.5 whitespace-nowrap pl-5 pr-4 text-[13.5px]">
            Join Waitlist<ArrowRight className="cta-arrow size-4" strokeWidth={2} />
          </Link>
          <MobileMenu sections={LINKS} account={SHOW_ACCOUNT} className="xl:hidden" />
        </div>
      </nav>

    </header>
  );
}
