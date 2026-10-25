import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Home,
  LoaderCircle,
  Printer,
  ReceiptText,
} from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { downloadPaymentReceipt } from "../data/paymentReceipt";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../components/ui/dialog";

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

export function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const isSuccess = isSuccessfulPayment(searchParams);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<{
    url: string;
    filename: string;
  } | null>(null);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [printError, setPrintError] = useState("");
  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const receiptButtonRef = useRef<HTMLButtonElement>(null);
  const downloadControllerRef = useRef<AbortController | null>(null);
  const previewUrl = preview?.url;

  useEffect(() => {
    return () => downloadControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const handlePreviewOpenChange = (open: boolean) => {
    setIsPreviewOpen(open);
    if (!open) {
      downloadControllerRef.current?.abort();
      downloadControllerRef.current = null;
      setIsDownloading(false);
      setPreview(null);
      setIsPreviewReady(false);
      setPrintError("");
    }
  };

  const handlePrintReceipt = () => {
    setPrintError("");
    try {
      const frameWindow = previewFrameRef.current?.contentWindow;
      if (!frameWindow) return;
      frameWindow.focus();
      frameWindow.print();
    } catch {
      setPrintError(
        "چاپ مستقیم در این مرورگر امکان‌پذیر نیست؛ فایل PDF را دانلود و چاپ کنید.",
      );
    }
  };

  const handleDownloadPaymentReceipt = async () => {
    if (downloadControllerRef.current) return;
    const receiptId = getReceiptId(searchParams);
    if (!receiptId) {
      setDownloadError("شناسه تراکنش برای دریافت سابقه پرداخت موجود نیست.");
      return;
    }

    const controller = new AbortController();
    downloadControllerRef.current = controller;
    setIsPreviewOpen(true);
    setIsDownloading(true);
    setDownloadError("");
    setPrintError("");
    setIsPreviewReady(false);

    try {
      const { blob, filename } = await downloadPaymentReceipt(
        receiptId,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setPreview({ url: URL.createObjectURL(blob), filename });
    } catch (error) {
      if (controller.signal.aborted) return;
      setIsPreviewOpen(false);
      setDownloadError(
        error instanceof Error
          ? error.message
          : "دانلود سابقه پرداخت انجام نشد.",
      );
    } finally {
      if (downloadControllerRef.current === controller) {
        downloadControllerRef.current = null;
        if (!controller.signal.aborted) setIsDownloading(false);
      }
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
                ref={receiptButtonRef}
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

      <Dialog open={isPreviewOpen} onOpenChange={handlePreviewOpenChange}>
        <DialogContent
          dir="rtl"
          className="flex h-[90svh] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden border-[#24483f] bg-[#0c211b] p-0 text-[#f4fbf8] sm:max-w-5xl"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            receiptButtonRef.current?.focus();
          }}
        >
          <div className="shrink-0 border-b border-[#24483f] px-5 pb-4 pt-12 sm:px-6">
            <DialogTitle className="text-right text-lg font-bold">
              پیش‌نمایش سابقه پرداخت
            </DialogTitle>
            <DialogDescription className="sr-only">
              مشاهده، چاپ و دانلود فایل PDF سابقه پرداخت
            </DialogDescription>
            {preview ? (
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  disabled={!isPreviewReady}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#36c3b2] px-5 text-sm font-bold text-[#06201a] transition-colors hover:bg-[#4bd3c2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#78e1d4] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Printer className="h-4 w-4" />
                  چاپ
                </button>
                <a
                  href={preview.url}
                  download={preview.filename}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#36c3b2] px-5 text-sm font-bold transition-colors hover:bg-[#142e27] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#78e1d4]"
                >
                  <Download className="h-4 w-4" />
                  دانلود PDF
                </a>
              </div>
            ) : null}
            {printError ? (
              <p role="alert" className="mt-3 text-sm leading-6 text-[#f3a0a7]">
                {printError}
              </p>
            ) : null}
          </div>
          {preview ? (
            <iframe
              ref={previewFrameRef}
              title="پیش‌نمایش سابقه پرداخت"
              src={preview.url}
              onLoad={() => setIsPreviewReady(true)}
              className="min-h-0 w-full flex-1 border-0 bg-white"
            />
          ) : (
            <div
              role="status"
              className="flex flex-1 flex-col items-center justify-center gap-4 px-5 text-sm text-[#9ab5ad]"
            >
              <LoaderCircle className="h-8 w-8 animate-spin text-[#36c3b2]" />
              در حال آماده‌سازی پیش‌نمایش چاپ...
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
