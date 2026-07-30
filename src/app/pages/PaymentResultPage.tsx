import {
  AlertCircle,
  CheckCircle2,
  Home,
  ReceiptText,
} from "lucide-react";
import { Link, useSearchParams } from "react-router";

const isSuccessfulPayment = (params: URLSearchParams) => {
  for (const [name, value] of params.entries()) {
    if (
      name.toLocaleLowerCase("en-US") === "success" &&
      value.trim().toLocaleLowerCase("en-US") === "true"
    ) {
      return true;
    }
  }

  return false;
};

export function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const isSuccess = isSuccessfulPayment(searchParams);

  return (
    <main
      dir="rtl"
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#071712] px-4 py-10 text-[#f4fbf8]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(33,118,99,0.12),transparent_42%)]"
      />

      <section className="relative w-full max-w-[520px] overflow-hidden rounded-2xl border border-[#24483f] bg-[#0c211b] shadow-[0_24px_70px_rgba(0,0,0,0.32)]">
        <div
          className={`h-1.5 w-full ${
            isSuccess ? "bg-[#35c4b2]" : "bg-[#e68189]"
          }`}
        />
        <div className="px-6 py-8 text-center sm:px-8 sm:py-9">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border ${
              isSuccess
                ? "border-[#35c4b2]/20 bg-[#35c4b2]/10 text-[#46d5c2]"
                : "border-[#e68189]/15 bg-[#e68189]/10 text-[#e68189]"
            }`}
          >
            {isSuccess ? (
              <CheckCircle2 className="h-9 w-9" />
            ) : (
              <AlertCircle className="h-9 w-9" />
            )}
          </div>

          <h1 className="mt-5 text-xl font-bold text-white">
            {isSuccess ? "پرداخت با موفقیت تأیید شد" : "پرداخت انجام نشد"}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#9ab5ad]">
            {isSuccess
              ? "پرداخت شما با موفقیت انجام و در سامانه ثبت شد."
              : "پرداخت شما انجام نشد. لطفاً دوباره تلاش کنید."}
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/"
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#36c3b2] px-5 text-sm font-bold text-[#06201a] transition-colors hover:bg-[#4bd3c2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#78e1d4]"
            >
              <Home className="h-4 w-4" />
              ورود به صفحه اصلی
            </Link>
            <Link
              to="/modern-toll"
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#315248] bg-transparent px-5 text-sm font-bold text-[#eaf4f1] transition-colors hover:bg-[#142e27] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#537b70]"
            >
              <ReceiptText className="h-4 w-4" />
              مشاهده عوارض
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
