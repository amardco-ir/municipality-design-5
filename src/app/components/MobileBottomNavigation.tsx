import {
  Activity,
  CircleHelp,
  House,
  LayoutGrid,
  Newspaper,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useAuthModal } from "./AuthContext";

type MobileNavigationItem = {
  title: string;
  label: string;
  href: string;
  icon: LucideIcon;
  isPrimary?: boolean;
  requiresAuthentication?: boolean;
};

const navigationItems: MobileNavigationItem[] = [
  {
    title: "سوالات متداول",
    label: "سوالات",
    href: "#faq",
    icon: CircleHelp,
  },
  {
    title: "فعالیت‌ها",
    label: "فعالیت‌ها",
    href: "#activities",
    icon: Activity,
    requiresAuthentication: true,
  },
  {
    title: "صفحه اصلی",
    label: "خانه",
    href: "#home",
    icon: House,
    isPrimary: true,
  },
  {
    title: "خدمات شهروندی",
    label: "خدمات",
    href: "#services",
    icon: LayoutGrid,
    requiresAuthentication: true,
  },
  {
    title: "اخبار",
    label: "اخبار",
    href: "#news",
    icon: Newspaper,
  },
];

const getCurrentHash = () => window.location.hash || "#home";

export function MobileBottomNavigation() {
  const { isAuthenticated } = useAuthModal();
  const [activeHref, setActiveHref] = useState(() => getCurrentHash());
  const visibleItems = navigationItems.filter(
    (item) => !item.requiresAuthentication || isAuthenticated,
  );

  useEffect(() => {
    const syncHash = () => setActiveHref(getCurrentHash());
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  useEffect(() => {
    const activeItem = navigationItems.find((item) => item.href === activeHref);
    if (!isAuthenticated && activeItem?.requiresAuthentication) {
      setActiveHref("#home");
    }
  }, [activeHref, isAuthenticated]);

  useEffect(() => {
    const sections = visibleItems
      .map((item) => document.querySelector<HTMLElement>(item.href))
      .filter((section): section is HTMLElement => Boolean(section));

    if (!sections.length || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSection = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visibleSection) setActiveHref(`#${visibleSection.target.id}`);
      },
      { rootMargin: "-28% 0px -58% 0px", threshold: [0, 0.1, 0.3] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [isAuthenticated]);

  return (
    <>
      <div
        className="h-[calc(5.5rem+env(safe-area-inset-bottom))] md:hidden"
        aria-hidden="true"
      />
      <nav
        aria-label="ناوبری اصلی موبایل"
        className="fixed inset-x-0 bottom-0 z-[60] border-t border-border/70 bg-card/95 px-1 pb-[max(.35rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-14px_36px_rgba(6,31,27,0.16)] backdrop-blur-xl md:hidden"
      >
        <div
          className="mx-auto grid h-[4.6rem] max-w-lg items-end"
          dir="rtl"
          style={{
            gridTemplateColumns: `repeat(${visibleItems.length}, minmax(0, 1fr))`,
          }}
        >
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeHref === item.href;

            return (
              <a
                key={item.href}
                href={item.href}
                title={item.title}
                aria-label={item.title}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setActiveHref(item.href)}
                className={`group relative flex min-w-0 flex-col items-center justify-end gap-1 rounded-2xl px-0.5 pb-1 text-[10px] font-semibold transition-colors ${
                  item.isPrimary
                    ? "self-start"
                    : isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-primary"
                }`}
              >
                {item.isPrimary ? (
                  <motion.span
                    whileTap={{ scale: 0.94 }}
                    className="relative -mt-5 flex h-14 w-14 items-center justify-center rounded-full border-[5px] border-card bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-[0_10px_24px_rgba(11,105,104,0.34)]"
                  >
                    <Icon className="h-6 w-6" strokeWidth={2.2} />
                    <span className="absolute -bottom-1 h-1.5 w-1.5 rounded-full bg-accent ring-2 ring-card" />
                  </motion.span>
                ) : (
                  <span
                    className={`flex h-9 w-11 items-center justify-center rounded-xl transition-all ${
                      isActive
                        ? "bg-[var(--primary-soft-strong)] text-primary shadow-sm"
                        : "group-hover:bg-[var(--primary-soft)]"
                    }`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={isActive ? 2.3 : 1.9} />
                  </span>
                )}
                <span
                  className={`max-w-full truncate ${
                    item.isPrimary || isActive ? "text-primary" : ""
                  }`}
                >
                  {item.label}
                </span>
              </a>
            );
          })}
        </div>
      </nav>
    </>
  );
}
