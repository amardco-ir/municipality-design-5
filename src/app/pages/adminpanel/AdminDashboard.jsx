import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Calendar,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  fetchDashboardMonthlyIncome,
  fetchDashboardRequestCounts,
  fetchDashboardUsersCount,
} from "../../data/adminDashboard";

export function Dashboard() {
  const [citizenCount, setCitizenCount] = useState(0);
  const [requestCounts, setRequestCounts] = useState({
    active: 0,
    completed: 0,
    cancellation: 0,
  });
  const [monthlyIncome, setMonthlyIncome] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    async function loadDashboard() {
      setIsLoading(true);
      setError("");

      const results = await Promise.allSettled([
        fetchDashboardUsersCount(signal),
        fetchDashboardRequestCounts(signal),
        fetchDashboardMonthlyIncome(signal),
      ]);

      const [usersCountResult, requestsResult, incomeResult] = results;

      if (usersCountResult.status === "fulfilled") {
        setCitizenCount(usersCountResult.value ?? 0);
      } else if (usersCountResult.status === "rejected") {
        setError((current) =>
          current
            ? `${current}، ${usersCountResult.reason?.message ?? "خطا در دریافت تعداد کاربران"}`
            : String(usersCountResult.reason ?? "خطا در دریافت تعداد کاربران"),
        );
      }

      if (requestsResult.status === "fulfilled" && requestsResult.value) {
        const requests = requestsResult.value;
        setRequestCounts({
          active: requests.active ?? 0,
          completed: requests.completed ?? 0,
          cancellation: requests.cancellation ?? 0,
        });
      } else if (requestsResult.status === "rejected") {
        setError((current) =>
          current
            ? `${current}، ${requestsResult.reason?.message ?? "خطا در دریافت وضعیت درخواست‌ها"}`
            : String(requestsResult.reason ?? "خطا در دریافت وضعیت درخواست‌ها"),
        );
      }

      if (
        incomeResult.status === "fulfilled" &&
        Array.isArray(incomeResult.value)
      ) {
        setMonthlyIncome(incomeResult.value);
      } else if (incomeResult.status === "rejected") {
        setError((current) =>
          current
            ? `${current}، ${incomeResult.reason?.message ?? "خطا در دریافت درآمد ماهانه"}`
            : String(incomeResult.reason ?? "خطا در دریافت درآمد ماهانه"),
        );
      } else {
        setMonthlyIncome([]);
      }

      setIsLoading(false);
    }

    loadDashboard();
    return () => controller.abort();
  }, []);

  const totalRequests =
    requestCounts.active + requestCounts.completed + requestCounts.cancellation;

  const today = new Date().toLocaleDateString("fa-IR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground sm:text-xl">
            داشبورد مدیریت
          </h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>{today}</span>
          </p>
        </div>
        <span className="inline-flex w-fit self-start rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary sm:self-auto">
          <Sparkles className="h-3 w-3" />
          آخرین به‌روزرسانی داشبورد
        </span>
      </div>

      {error ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-border/70 bg-card p-6 text-center text-sm text-muted-foreground">
          در حال بارگذاری اطلاعات داشبورد...
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <span className="text-xs text-muted-foreground">
                  شهروندان ثبت‌شده
                </span>
              </div>
              <p className="mt-6 text-4xl font-bold text-foreground">
                {citizenCount.toLocaleString()}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                تعداد کاربران ثبت‌شده در سامانه شهروندیار
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 }}
              className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="rounded-2xl bg-blue-500/10 p-3 text-blue-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <span className="text-xs text-muted-foreground">
                  درخواست‌ها
                </span>
              </div>
              <p className="mt-6 text-4xl font-bold text-foreground">
                {totalRequests.toLocaleString()}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                وضعیت درخواست‌های ثبت‌شده در سامانه
              </p>
              <div className="mt-6 grid gap-3">
                <div className="rounded-2xl border border-border/70 bg-muted p-4">
                  <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                    <span>فعال</span>
                    <span>{requestCounts.active.toLocaleString()}</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted p-4">
                  <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                    <span>بایگانی‌شده</span>
                    <span>{requestCounts.completed.toLocaleString()}</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted p-4">
                  <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                    <span>ابطال‌شده</span>
                    <span>{requestCounts.cancellation.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  جدول درآمد ماهانه
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  نمایش جزئیات درآمد هر ماه
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[24rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">ماه</th>
                    <th className="px-4 py-3">سال</th>
                    <th className="px-4 py-3">مبلغ (تومان)</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyIncome.length > 0 ? (
                    monthlyIncome.map((item, index) => (
                      <tr
                        key={`${item.year}-${item.month}-${index}`}
                        className="border-b border-border/50"
                      >
                        <td className="px-4 py-3">{item.month}</td>
                        <td className="px-4 py-3">{item.year}</td>
                        <td className="px-4 py-3">
                          {Number(item.amount).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-5 text-center text-sm text-muted-foreground"
                      >
                        داده‌ای برای نمایش درآمد ماهانه وجود ندارد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
