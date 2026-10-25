import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  FileText,
  Home,
  LoaderCircle,
  MapPin,
  ReceiptText,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Link, useSearchParams } from "react-router";
import {
  redirectToPaymentGateway,
  requestPaymentToken,
} from "../services/paymentService";
import { getStoredAccessToken } from "../utils/authStorage";

type ReceiptData = {
  parvandeNo: string;
  idMalek: string;
  year: string;
  billId: string;
  paymentId: string;
  renovationCode: string;
  ownerName: string;
  address: string;
  description: string;
  issueDate: string;
  price: number | null;
  delayedPrice: number | null;
  isPaid: boolean;
};

const getParam = (params: URLSearchParams, name: string) => {
  const normalizedName = name.toLocaleLowerCase("en-US");
  for (const [key, value] of params.entries()) {
    if (key.toLocaleLowerCase("en-US") === normalizedName) {
      return value.trim();
    }
  }
  return "";
};

const parseNumber = (value: string): number | null => {
  if (!value) return null;
  const parsedValue = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const parseBoolean = (value: string) =>
  ["true", "1", "yes"].includes(value.toLocaleLowerCase("en-US"));

const formatAmount = (value: number | null) =>
  value === null ? "—" : `${value.toLocaleString("fa-IR")} ریال`;

const displayValue = (value: string) => value || "—";

const parseReceipt = (params: URLSearchParams): ReceiptData => ({
  parvandeNo: getParam(params, "ParvandeNo"),
  idMalek: getParam(params, "IdMalek"),
  year: getParam(params, "Year"),
  billId: getParam(params, "ShenaseGhabz"),
  paymentId: getParam(params, "ShenasePardakht"),
  renovationCode: getParam(params, "CodeNosazi"),
  ownerName: getParam(params, "NameOwner"),
  address: getParam(params, "Address"),
  description: getParam(params, "Description"),
  issueDate: getParam(params, "DateSodor"),
  price: parseNumber(getParam(params, "Price")),
  delayedPrice: parseNumber(getParam(params, "DelayedPrice")),
  isPaid: parseBoolean(getParam(params, "PaymentStatus")),
});

function DetailItem({
  icon: Icon,
  label,
  value,
  ltr = false,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="flex min-h-20 items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm shadow-slate-200/30 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p
          dir={ltr ? "ltr" : undefined}
          className={`mt-1 break-words text-sm font-bold text-slate-800 dark:text-slate-100 ${
            ltr ? "text-right [unicode-bidi:plaintext]" : ""
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function ReceiptNotFound() {
  return (
    <main
      dir="rtl"
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-white"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(16,185,129,0.14),transparent_42%)]" />
      <section className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-slate-900/90 p-7 text-center shadow-2xl shadow-black/30 backdrop-blur sm:p-10">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-rose-300/20 bg-rose-400/10 text-rose-300">
          <AlertCircle className="h-10 w-10" />
        </div>
        <h1 className="mt-6 text-2xl font-black">قبض یا پرداخت یافت نشد</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-slate-400">
          شناسه‌های قبض و پرداخت معتبر نیستند یا اطلاعاتی برای آن‌ها ثبت نشده
          است. لطفاً اطلاعات پرونده را دوباره بررسی کنید.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            to="/modern-toll"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
          >
            <ReceiptText className="h-4 w-4" />
            بازگشت به عوارض
          </Link>
          <Link
            to="/"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 px-5 text-sm font-bold text-white transition hover:bg-white/5"
          >
            <Home className="h-4 w-4" />
            صفحه اصلی
          </Link>
        </div>
      </section>
    </main>
  );
}

export function ReceiptPage() {
  const [searchParams] = useSearchParams();
  const isSuccess = parseBoolean(getParam(searchParams, "Success"));
  const receipt = useMemo(() => parseReceipt(searchParams), [searchParams]);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  if (!isSuccess) return <ReceiptNotFound />;

  const hasPaymentIdentifiers = Boolean(receipt.billId && receipt.paymentId);

  const handlePayment = async () => {
    if (isRedirecting || receipt.isPaid) return;

    const accessToken = getStoredAccessToken();
    if (!accessToken) {
      setPaymentError("برای ورود به درگاه پرداخت، ابتدا وارد حساب کاربری شوید.");
      return;
    }
    if (!hasPaymentIdentifiers) {
      setPaymentError("شناسه قبض یا شناسه پرداخت در اطلاعات دریافتی موجود نیست.");
      return;
    }

    setPaymentError("");
    setIsRedirecting(true);
    try {
      const { refId, redirectUrl } = await requestPaymentToken(
        { billId: receipt.billId, paymentId: receipt.paymentId },
        accessToken,
      );
      redirectToPaymentGateway(refId, redirectUrl);
    } catch (error) {
      setPaymentError(
        error instanceof Error
          ? error.message
          : "اتصال به درگاه پرداخت انجام نشد؛ دوباره تلاش کنید.",
      );
      setIsRedirecting(false);
    }
  };

  return (
    <main
      dir="rtl"
      className="relative min-h-[100svh] overflow-hidden bg-slate-50 px-3 py-6 text-slate-900 dark:bg-[#071712] dark:text-white sm:px-5 sm:py-10"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_5%,rgba(16,185,129,0.13),transparent_30%),radial-gradient(circle_at_10%_85%,rgba(14,165,233,0.08),transparent_34%)]" />

      <section className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur dark:border-white/10 dark:bg-[#0c211b]/95 dark:shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <header className="relative overflow-hidden border-b border-slate-200 bg-slate-900 px-5 py-6 text-white dark:border-white/10 sm:px-8 sm:py-8">
          <div className="pointer-events-none absolute -left-10 -top-20 h-56 w-56 rounded-full bg-emerald-400/15 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-300">
                <Building2 className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-300">
                  شهروندیار | خدمات الکترونیک شهری
                </p>
                <h1 className="mt-1 text-xl font-black sm:text-2xl">
                  مشاهده و تأیید اطلاعات قبض
                </h1>
              </div>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-200">
              <ShieldCheck className="h-4 w-4" />
              اطلاعات آماده پرداخت
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-8">
          <div className="grid gap-4 lg:grid-cols-[1fr_290px]">
            <div>
              <div className="flex items-center gap-2">
                <ReceiptText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-base font-black">مشخصات قبض و ملک</h2>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <DetailItem
                  icon={UserRound}
                  label="نام مالک"
                  value={displayValue(receipt.ownerName)}
                />
                <DetailItem
                  icon={FileText}
                  label="شماره پرونده"
                  value={displayValue(receipt.parvandeNo)}
                  ltr
                />
                <DetailItem
                  icon={UserRound}
                  label="شناسه مالک"
                  value={displayValue(receipt.idMalek)}
                  ltr
                />
                <DetailItem
                  icon={Building2}
                  label="کد نوسازی"
                  value={displayValue(receipt.renovationCode)}
                  ltr
                />
                <DetailItem
                  icon={CalendarDays}
                  label="سال / تاریخ صدور"
                  value={`${displayValue(receipt.year)} / ${displayValue(receipt.issueDate)}`}
                />
                <DetailItem
                  icon={ReceiptText}
                  label="شناسه قبض"
                  value={displayValue(receipt.billId)}
                  ltr
                />
                <DetailItem
                  icon={CreditCard}
                  label="شناسه پرداخت"
                  value={displayValue(receipt.paymentId)}
                  ltr
                />
              </div>

              {(receipt.address || receipt.description) && (
                <div className="mt-3 space-y-3">
                  {receipt.address && (
                    <div className="flex gap-3 rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                      <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          نشانی ملک
                        </p>
                        <p className="mt-1 text-sm font-semibold leading-7">
                          {receipt.address}
                        </p>
                      </div>
                    </div>
                  )}
                  {receipt.description && (
                    <div className="flex gap-3 rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                      <FileText className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          توضیحات
                        </p>
                        <p className="mt-1 text-sm font-semibold leading-7">
                          {receipt.description}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <aside className="h-fit rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-300/15 dark:bg-emerald-400/[0.06]">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                <CircleDollarSign className="h-5 w-5" />
                <h2 className="text-sm font-black">خلاصه پرداخت</h2>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500 dark:text-slate-400">
                    مبلغ قبض
                  </span>
                  <bdi dir="rtl" className="font-black">
                    {formatAmount(receipt.price)}
                  </bdi>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-emerald-200/70 pb-4 dark:border-white/10">
                  <span className="text-slate-500 dark:text-slate-400">
                    مبلغ دیرکرد
                  </span>
                  <bdi dir="rtl" className="font-bold">
                    {formatAmount(receipt.delayedPrice)}
                  </bdi>
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-slate-500 dark:text-slate-400">
                    وضعیت
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                      receipt.isPaid
                        ? "bg-sky-100 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {receipt.isPaid ? "پرداخت شده" : "پرداخت نشده"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePayment}
                disabled={isRedirecting || receipt.isPaid || !hasPaymentIdentifiers}
                aria-busy={isRedirecting}
                className="mt-6 inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300"
              >
                {isRedirecting ? (
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                ) : (
                  <CreditCard className="h-5 w-5" />
                )}
                {receipt.isPaid
                  ? "این قبض پرداخت شده است"
                  : isRedirecting
                    ? "در حال اتصال به درگاه..."
                    : "ورود به درگاه پرداخت"}
              </button>

              <p className="mt-3 text-center text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                پس از تأیید، به درگاه امن بانکی منتقل می‌شوید.
              </p>

              {paymentError && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-6 text-rose-700 dark:border-rose-300/15 dark:bg-rose-400/10 dark:text-rose-300"
                >
                  {paymentError}
                </p>
              )}
            </aside>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 dark:border-white/10 sm:flex-row sm:justify-between">
            <Link
              to="/"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <Home className="h-4 w-4" />
              صفحه اصلی
            </Link>
            <Link
              to="/modern-toll"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
            >
              بازگشت به عوارض
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
