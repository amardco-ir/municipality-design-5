import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Home,
  LoaderCircle,
  ReceiptText,
} from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { paymentApiFetch } from "../data/api";

type PaymentResultStatus = "loading" | "success" | "error";

const firstParam = (
  params: URLSearchParams,
  ...names: string[]
) => {
  for (const name of names) {
    const value = params.get(name)?.trim();
    if (value) return value;
  }
  return "";
};

const readResponse = async (response: Response) => {
  const text = await response.text().catch(() => "");
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const getResultMessage = (payload: any, fallback: string) => {
  if (typeof payload === "string" && payload.trim()) return payload;
  return (
    payload?.error?.name ||
    payload?.error?.description ||
    payload?.Error?.Name ||
    payload?.Error?.Description ||
    payload?.message ||
    payload?.Message ||
    fallback
  );
};

export function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const startedRef = useRef(false);
  const [status, setStatus] = useState<PaymentResultStatus>("loading");
  const [message, setMessage] = useState("در حال بررسی نتیجه پرداخت...");

  const localInvoiceId = firstParam(
    searchParams,
    "localInvoiceId",
    "LocalInvoiceId",
  );
  const payGateTranId = firstParam(
    searchParams,
    "PayGateTranId",
    "payGateTranId",
  );
  const merchantShaparakFee = firstParam(
    searchParams,
    "MerchantShaparakFee",
    "merchantShaparakFee",
  );
  const returningParams = firstParam(
    searchParams,
    "ReturningParams",
    "returningParams",
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!payGateTranId || !merchantShaparakFee || !returningParams) {
      setStatus("error");
      setMessage("اطلاعات بازگشتی درگاه کامل نیست و امکان تأیید پرداخت وجود ندارد.");
      return;
    }

    const verifyPayment = async () => {
      const query = new URLSearchParams({
        PayGateTranId: payGateTranId,
        MerchantShaparakFee: merchantShaparakFee,
        ReturningParams: returningParams,
      });
      if (localInvoiceId) query.set("localInvoiceId", localInvoiceId);

      try {
        const response = await paymentApiFetch(
          `/api/payment/pay?${query.toString()}`,
          {
            method: "GET",
            headers: { Accept: "*/*" },
            cache: "no-store",
          },
        );
        const payload = await readResponse(response);
        const isSuccess =
          response.ok &&
          payload?.isSuccess !== false &&
          payload?.IsSuccess !== false &&
          payload?.isFailure !== true &&
          payload?.IsFailure !== true;

        if (!isSuccess) {
          throw new Error(
            getResultMessage(payload, "تأیید پرداخت توسط سرویس انجام نشد."),
          );
        }

        setStatus("success");
        setMessage(
          getResultMessage(payload, "پرداخت شما با موفقیت تأیید و ثبت شد."),
        );
      } catch (error) {
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "ارتباط با سرویس تأیید پرداخت برقرار نشد.",
        );
      }
    };

    void verifyPayment();
  }, [
    localInvoiceId,
    merchantShaparakFee,
    payGateTranId,
    returningParams,
  ]);

  const isLoading = status === "loading";
  const isSuccess = status === "success";

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground"
    >
      <section className="w-full max-w-lg overflow-hidden rounded-lg border border-border bg-card shadow-xl">
        <div
          className={`h-1.5 w-full ${
            isLoading
              ? "bg-primary"
              : isSuccess
                ? "bg-emerald-600"
                : "bg-destructive"
          }`}
        />
        <div className="p-6 text-center sm:p-8">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
              isLoading
                ? "bg-primary/10 text-primary"
                : isSuccess
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-destructive/10 text-destructive"
            }`}
          >
            {isLoading ? (
              <LoaderCircle className="h-8 w-8 animate-spin" />
            ) : isSuccess ? (
              <CheckCircle2 className="h-9 w-9" />
            ) : (
              <AlertCircle className="h-9 w-9" />
            )}
          </div>

          <h1 className="mt-5 text-xl font-bold">
            {isLoading
              ? "بررسی پرداخت"
              : isSuccess
                ? "پرداخت موفق"
                : "پرداخت تأیید نشد"}
          </h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {message}
          </p>

          {(localInvoiceId || payGateTranId) && (
            <div className="mt-6 divide-y divide-border rounded-lg border border-border text-xs">
              {localInvoiceId && (
                <div className="flex items-center justify-between gap-4 px-4 py-3">
                  <span className="text-muted-foreground">شماره صورتحساب</span>
                  <bdi dir="ltr" className="font-semibold">
                    {localInvoiceId}
                  </bdi>
                </div>
              )}
              {payGateTranId && (
                <div className="flex items-center justify-between gap-4 px-4 py-3">
                  <span className="text-muted-foreground">شناسه تراکنش درگاه</span>
                  <bdi dir="ltr" className="font-semibold">
                    {payGateTranId}
                  </bdi>
                </div>
              )}
            </div>
          )}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/"
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Home className="h-4 w-4" />
              ورود به صفحه اصلی
            </Link>
            <Link
              to="/modern-toll"
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border px-5 text-sm font-bold transition-colors hover:bg-muted"
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
