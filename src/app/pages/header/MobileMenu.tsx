import { ArrowUpLeft, Bell, ChevronDown, Grid2X2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Link } from "react-router";
import { type HeaderMenuItem } from "../../components/Header";

interface MobileMenuProps {
  isOpen: boolean;
  isMobile: boolean;
  menuItems: HeaderMenuItem[];
  activeMenuItem: string;
  isAuthenticated: boolean;
  unreadCount: number;
  onMenuItemClick: (href: string) => void;
  onNotificationsClick: () => void;
}

export function MobileMenu({
  isOpen,
  isMobile,
  menuItems,
  activeMenuItem,
  isAuthenticated,
  unreadCount,
  onMenuItemClick,
  onNotificationsClick,
}: MobileMenuProps) {
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const servicesMenu = menuItems.find((item) => item.href === "#services");

  const handleSubmenuToggle = (title: string) => {
    setOpenSubmenu((current) => (current === title ? null : title));
  };

  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.985 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="container mx-auto mt-2 px-0 md:hidden"
          >
            <div className="max-h-[calc(100dvh-5.75rem)] overflow-hidden rounded-[calc(var(--radius)+10px)] border border-border/80 bg-card/95 shadow-[0_20px_44px_rgba(6,31,27,0.22)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-[var(--primary-soft)] px-4 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-md">
                    <Grid2X2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-foreground">خدمات شهروندی</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      خدمت موردنظر خود را انتخاب کنید
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-primary/20 bg-card px-2.5 py-1 text-[11px] font-bold text-primary">
                  {servicesMenu?.children?.length ?? 0} خدمت
                </span>
              </div>

              <nav
                aria-label="زیرمجموعه‌های خدمات"
                className="grid max-h-[calc(100dvh-11.5rem)] grid-cols-2 gap-2 overflow-y-auto p-3"
              >
                {servicesMenu?.children?.map((child, index) => {
                  const Icon = child.icon;
                  return (
                    <motion.div
                      key={child.href}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ delay: index * 0.035 }}
                    >
                      <Link
                        to={child.href}
                        onClick={() => onMenuItemClick(child.href)}
                        className="group flex min-h-28 h-full flex-col justify-between gap-3 overflow-hidden rounded-2xl border border-border/80 bg-background p-3 text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md"
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft-strong)] text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                            {Icon ? (
                              <Icon className="h-5 w-5" />
                            ) : (
                              <Grid2X2 className="h-5 w-5" />
                            )}
                          </span>
                          <ArrowUpLeft className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                        </span>
                        <span className="text-xs font-bold leading-5 sm:text-sm">
                          {child.title}
                        </span>
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="container mx-auto mt-2 px-0 md:px-2 min-[1281px]:hidden"
        >
          <div className="max-h-[calc(100dvh-6rem)] overflow-hidden rounded-[calc(var(--radius)+10px)] border border-border bg-card shadow-[0_16px_34px_rgba(6,31,27,0.16)]">
            <nav className="flex max-h-[calc(100dvh-6rem)] flex-col gap-2 overflow-y-auto p-3 sm:p-4">
              {menuItems.map((item, index) => {
                const isActive = item.href === activeMenuItem;
                const hasChildren = Boolean(item.children?.length);
                const isSubmenuOpen = openSubmenu === item.title;

                if (hasChildren) {
                  return (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className="overflow-hidden rounded-xl"
                    >
                      <button
                        type="button"
                        onClick={() => handleSubmenuToggle(item.title)}
                        className={`relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-xl px-4 py-3 text-right text-sm font-medium transition-all ${
                          isActive
                            ? "text-primary-foreground"
                            : "text-foreground hover:text-primary"
                        }`}
                        aria-expanded={isSubmenuOpen}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="mobile-menu-active"
                            transition={{
                              type: "spring",
                              stiffness: 420,
                              damping: 34,
                            }}
                            className="absolute inset-0 rounded-xl bg-gradient-to-l from-primary to-secondary"
                          />
                        )}
                        <span className="relative z-10">{item.title}</span>
                        <ChevronDown
                          className={`relative z-10 h-4 w-4 shrink-0 transition-transform ${
                            isSubmenuOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      <AnimatePresence initial={false}>
                        {isSubmenuOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-1 grid gap-1 rounded-xl border border-border bg-background p-1.5">
                              <a
                                href={item.href}
                                onClick={() => onMenuItemClick(item.href)}
                                className="rounded-lg px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-[var(--primary-soft)]"
                              >
                                مشاهده بخش {item.title}
                              </a>
                              {item.children?.map((child) => (
                                <Link
                                  key={child.href}
                                  to={child.href}
                                  onClick={() => onMenuItemClick(child.href)}
                                  className="rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-[var(--primary-soft)] hover:text-primary"
                                >
                                  {child.title}
                                </Link>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                }

                return (
                  <motion.a
                    key={item.title}
                    href={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onMenuItemClick(item.href)}
                    className={`relative overflow-hidden rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                      isActive
                        ? "text-primary-foreground"
                        : "text-foreground hover:text-primary"
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="mobile-menu-active"
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 34,
                        }}
                        className="absolute inset-0 rounded-xl bg-gradient-to-l from-primary to-secondary"
                      />
                    )}
                    <span className="relative z-10">{item.title}</span>
                  </motion.a>
                );
              })}

              <div className="grid grid-cols-1 gap-2 border-t border-border/70 pt-3 sm:grid-cols-2">
                {isAuthenticated && (
                  <button
                    type="button"
                    onClick={onNotificationsClick}
                    className="flex items-center justify-between gap-3 rounded-xl bg-[var(--primary-soft)] px-4 py-3 text-sm text-foreground transition-colors hover:bg-[var(--primary-soft-strong)]"
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <Bell className="h-4 w-4 shrink-0" />
                      <span>اعلان‌ها</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                      {unreadCount}
                      {unreadCount > 0 && (
                        <span className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </span>
                  </button>
                )}
              </div>
            </nav>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
