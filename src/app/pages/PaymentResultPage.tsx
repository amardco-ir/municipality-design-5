import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Home,
  LoaderCircle,
  ReceiptText,
} from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { downloadPaymentReceipt } from "../data/paymentReceipt";

const receiptIdParamNames = [
  "id",
  "Id",
  "message",
  "Message",
  "paymentId",
  "PaymentId",
  "paymentLogId",
  "PaymentLogId",
  "trackingCode",
  "TrackingCode",
  "payGateTranId",
  "PayGateTranId",
];

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

const getReceiptId = (params: URLSearchParams) =>
  receiptIdParamNames
    .map((name) => params.get(name)?.trim())
    .find((value): value is string => Boolean(value));

const createPrintWindow = () => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return null;

  printWindow.document.title = "آماده‌سازی سابقه پرداخت";
  printWindow.document.documentElement.dir = "rtl";
  printWindow.document.body.style.cssText =
    "margin:0;display:grid;place-items:center;min-height:100vh;background:#071712;color:#f4fbf8;font-family:Tahoma,Arial,sans-serif";

  const loadingMessage = printWindow.document.createElement("p");
  loadingMessage.textContent = "در حال آماده‌سازی پیش‌نمایش چاپ...";
  loadingMessage.style.fontSize = "14px";
  printWindow.document.body.appendChild(loadingMessage);

  return printWindow;
};

const showPrintPreview = (
  printWindow: Window,
  blob: Blob,
  filename: string,
) => {
  const url = URL.createObjectURL(blob);
  const previewDocument = printWindow.document;
  previewDocument.title = "سابقه پرداخت";
  previewDocument.body.replaceChildren();
  previewDocument.body.style.cssText =
    "margin:0;height:100vh;overflow:hidden;background:#1f2937;font-family:Tahoma,Arial,sans-serif";

  const toolbar = previewDocument.createElement("div");
  toolbar.style.cssText =
    "height:56px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:12px;padding:8px 16px;background:#0c211b;border-bottom:1px solid #24483f";

  const printButton = previewDocument.createElement("button");
  printButton.type = "button";
  printButton.textContent = "چاپ";
  printButton.style.cssText =
    "height:38px;padding:0 24px;border:0;border-radius:10px;background:#36c3b2;color:#06201a;font:700 14px Tahoma,Arial,sans-serif;cursor:pointer";

  const downloadLink = previewDocument.createElement("a");
  downloadLink.href = url;
  downloadLink.download = filename;
  downloadLink.textContent = "دانلود PDF";
  downloadLink.style.cssText =
    "height:38px;box-sizing:border-box;display:inline-flex;align-items:center;padding:0 24px;border:1px solid #36c3b2;border-radius:10px;color:#f4fbf8;text-decoration:none;font:700 14px Tahoma,Arial,sans-serif";

  const previewFrame = previewDocument.createElement("iframe");
  previewFrame.title = "پیش‌نمایش سابقه پرداخت";
  previewFrame.src = url;
  previewFrame.style.cssText =
    "display:block;width:100%;height:calc(100vh - 56px);border:0;background:#ffffff";

  const printPdf = () => {
    printWindow.focus();
    try {
      previewFrame.contentWindow?.focus();
      previewFrame.contentWindow?.print();
    } catch {
      printWindow.print();
    }
  };

  printButton.addEventListener("click", printPdf);
  previewFrame.addEventListener(
    "load",
    () => printWindow.setTimeout(printPdf, 350),
    { once: true },
  );
  printWindow.addEventListener(
    "beforeunload",
    () => URL.revokeObjectURL(url),
    { once: true },
  );

  toolbar.append(printButton, downloadLink);
  previewDocument.body.append(toolbar, previewFrame);
};

export function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const isSuccess = isSuccessfulPayment(searchParams);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const handleDownloadPaymentReceipt = async () => {
    const receiptId = getReceiptId(searchParams);
    if (!receiptId) {
      setDownloadError("شناسه تراکنش برای دریافت سابقه پرداخت موجود نیست.");
      return;
    }

    const printWindow = createPrintWindow();
    if (!printWindow) {
      setDownloadError(
        "برای نمایش صفحه چاپ، اجازه بازشدن پنجره جدید را در مرورگر فعال کنید.",
      );
      return;
    }

    setIsDownloading(true);
    setDownloadError("");

    try {
      const { blob, filename } = await downloadPaymentReceipt(receiptId);
      showPrintPreview(printWindow, blob, filename);
    } catch (error) {
      printWindow.close();
      setDownloadError(
        error instanceof Error
          ? error.message
          : "دانلود سابقه پرداخت انجام نشد.",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <main
      dir="rtl"
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#071712] px-4 py-10 text-[#f4fbf8]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(33,118,99,0.12),transparent_42%)]"
      />

      <section className="relative w-full max-w-[560px] overflow-hidden rounded-2xl border border-[#24483f] bg-[#0c211b] shadow-[0_24px_70px_rgba(0,0,0,0.32)]">
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
            {isSuccess ? (
              <button
                type="button"
                onClick={handleDownloadPaymentReceipt}
                disabled={isDownloading}
                aria-busy={isDownloading}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#36c3b2] bg-[#06201a] px-5 text-sm font-bold text-[#f4fbf8] transition-colors hover:bg-[#142e27] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#78e1d4] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isDownloading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isDownloading
                  ? "در حال آماده‌سازی..."
                  : "دانلود سابقه پرداخت"}
              </button>
            ) : null}
            <Link
              to="/modern-toll"
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#315248] bg-transparent px-5 text-sm font-bold text-[#eaf4f1] transition-colors hover:bg-[#142e27] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#537b70]"
            >
              <ReceiptText className="h-4 w-4" />
              مشاهده عوارض
            </Link>
          </div>

          {downloadError ? (
            <p role="alert" className="mt-3 text-sm leading-6 text-[#f3a0a7]">
              {downloadError}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
