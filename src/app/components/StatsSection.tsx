import { motion } from "motion/react";
import {
  ArrowUpRight,
  Building2,
  FileCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { fetchStatisticsFigures } from "../data/adminDashboard";

const statsLabels = [
  {
    icon: Users,
    label: "شهروندان",
    description: "تعداد کاربران ثبت‌شده در سامانه",
    color: "from-primary to-secondary",
  },
  {
    icon: FileCheck,
    label: "درخواست‌ها",
    description: "تعداد درخواست‌های ثبت‌شده در پنل",
    color: "from-secondary to-primary",
  },
  {
    icon: Building2,
    label: "پرداخت‌ها",
    description: "تعداد تراکنش‌های ثبت‌شده در گزارش‌ها",
    color: "from-primary/90 to-secondary/90",
  },
  {
    icon: TrendingUp,
    label: "اخبار",
    description: "تعداد خبرهای منتشرشده در سامانه",
    color: "from-secondary/90 to-primary/90",
  },
];

function formatCount(value?: number) {
  return typeof value === "number" ? value.toLocaleString("fa-IR") : "۰";
}

export function StatsSection() {
  const [statistics, setStatistics] = useState({
    requestCount: 0,
    userCount: 0,
    paymentCount: 0,
    newsCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadStatistics() {
      setIsLoading(true);
      setError("");

      try {
        const figures = await fetchStatisticsFigures();
        if (!isMounted) return;

        setStatistics({
          requestCount: figures.requestCount ?? 0,
          userCount: figures.userCount ?? 0,
          paymentCount: figures.paymentCount ?? 0,
          newsCount: figures.newsCount ?? 0,
        });
      } catch (err) {
        if (!isMounted) return;
        setError(
          err instanceof Error ? err.message : "خطا در دریافت آمار و ارقام",
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadStatistics();
    return () => {
      isMounted = false;
    };
  }, []);

  const stats = [
    {
      ...statsLabels[0],
      value: isLoading
        ? "در حال بارگذاری..."
        : formatCount(statistics.userCount),
      trend: "+12%",
    },
    {
      ...statsLabels[1],
      value: isLoading
        ? "در حال بارگذاری..."
        : formatCount(statistics.requestCount),
      trend: "+28%",
    },
    {
      ...statsLabels[2],
      value: isLoading
        ? "در حال بارگذاری..."
        : formatCount(statistics.paymentCount),
      trend: "+15%",
    },
    {
      ...statsLabels[3],
      value: isLoading
        ? "در حال بارگذاری..."
        : formatCount(statistics.newsCount),
      trend: "+5%",
    },
  ];

  return (
    <section className="stats-spotlight section-decor py-12 md:py-20">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 md:mb-16"
        >
          <span className="section-chip mb-3">گزارش عملکرد</span>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-foreground mb-3 md:mb-4">
            آمار و ارقام
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto px-4">
            نمای کلی از وضعیت خدمات شهری و عملکرد سامانه
          </p>
        </motion.div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              whileHover={{ y: -6, scale: 1.01 }}
              className="group"
            >
              <div className="soft-card soft-card-hover mesh-panel relative isolate h-full overflow-hidden p-5 md:p-6">
                <div
                  className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-l ${stat.color}`}
                />
                <div
                  className={`pointer-events-none absolute -top-12 -left-10 h-28 w-28 rounded-full bg-gradient-to-br ${stat.color} opacity-20 blur-2xl`}
                />
                <div
                  className={`pointer-events-none absolute -bottom-14 -right-12 h-32 w-32 rounded-full bg-gradient-to-br ${stat.color} opacity-20 blur-3xl`}
                />

                <div className="relative z-10 flex items-start justify-between gap-3">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.color} shadow-lg md:h-16 md:w-16`}
                  >
                    <stat.icon className="h-7 w-7 text-white md:h-8 md:w-8" />
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-[var(--primary-soft)] px-2.5 py-1 text-xs font-semibold text-primary">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    {stat.trend}
                  </span>
                </div>

                <div className="relative z-10 mt-5">
                  <p className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground md:text-base">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground md:text-sm">
                    {stat.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
