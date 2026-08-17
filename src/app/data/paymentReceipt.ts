import { PDFDocument } from "pdf-lib";
import { dotNet10ApiFetch } from "./api";
import { AUTH_TOKEN_KEY } from "../utils/authStorage";

interface PaymentReceiptDownload {
  blob: Blob;
  filename: string;
}

const PAYMENT_RECEIPT_ENDPOINT = "/api/reports/payment-receipt";
const RECEIPT_WIDTH_POINTS = (8 / 2.54) * 72;

const getAuthHeaders = (): HeadersInit => {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(AUTH_TOKEN_KEY)?.replace(/^Bearer\s+/i, "")
      : null;

  return {
    Accept: "application/pdf",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const parseErrorMessage = async (response: Response) => {
  if (response.status === 401) {
    return "نشست کاربری شما منقضی شده است؛ دوباره وارد حساب شوید.";
  }

  if (response.status === 403) {
    return "شما مجوز دریافت این سابقه پرداخت را ندارید.";
  }

  if (response.status === 404) {
    return "سابقه پرداخت برای این تراکنش یافت نشد.";
  }

  const text = await response.text().catch(() => "");
  if (text) {
    try {
      const payload = JSON.parse(text) as Record<string, unknown>;
      const error = (payload.error ?? payload.Error) as
        | Record<string, unknown>
        | undefined;
      const message =
        error?.description ??
        error?.Description ??
        error?.name ??
        error?.Name ??
        payload.message ??
        payload.Message;

      if (typeof message === "string" && /[\u0600-\u06ff]/.test(message)) {
        return message;
      }
    } catch {
      if (/[\u0600-\u06ff]/.test(text)) return text;
    }
  }

  return "دانلود سابقه پرداخت انجام نشد؛ کمی بعد دوباره تلاش کنید.";
};

const getFilename = (response: Response, receiptId: string) => {
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  const basicMatch = disposition.match(/filename="?([^";]+)"?/i);
  const encodedFilename = utf8Match?.[1];
  let filename = basicMatch?.[1]?.trim();

  if (encodedFilename) {
    try {
      filename = decodeURIComponent(encodedFilename.trim());
    } catch {
      filename = encodedFilename.trim();
    }
  }

  const safeFilename = filename?.replace(/[\\/:*?"<>|\x00-\x1f]/g, "-");
  return safeFilename || `payment-receipt-${receiptId}.pdf`;
};

const resizePdfToReceiptWidth = async (blob: Blob) => {
  try {
    const sourcePdf = await PDFDocument.load(await blob.arrayBuffer());
    const outputPdf = await PDFDocument.create();
    const embeddedPages = await outputPdf.embedPdf(
      sourcePdf,
      sourcePdf.getPageIndices(),
    );

    embeddedPages.forEach((embeddedPage) => {
      const scale = RECEIPT_WIDTH_POINTS / embeddedPage.width;
      const pageHeight = embeddedPage.height * scale;
      const page = outputPdf.addPage([RECEIPT_WIDTH_POINTS, pageHeight]);
      page.drawPage(embeddedPage, {
        x: 0,
        y: 0,
        width: RECEIPT_WIDTH_POINTS,
        height: pageHeight,
      });
    });

    const resizedPdf = await outputPdf.save();
    return new Blob([resizedPdf.slice().buffer as ArrayBuffer], {
      type: "application/pdf",
    });
  } catch {
    throw new Error("تنظیم عرض فایل سابقه پرداخت انجام نشد.");
  }
};

export async function downloadPaymentReceipt(
  receiptId: string,
  signal?: AbortSignal,
): Promise<PaymentReceiptDownload> {
  const normalizedReceiptId = receiptId.trim();
  if (!normalizedReceiptId) {
    throw new Error("شناسه تراکنش برای دریافت سابقه پرداخت موجود نیست.");
  }

  let response: Response;
  try {
    response = await dotNet10ApiFetch(
      `${PAYMENT_RECEIPT_ENDPOINT}/${encodeURIComponent(normalizedReceiptId)}`,
      {
        method: "GET",
        headers: getAuthHeaders(),
        signal,
      },
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new Error(
      "ارتباط با سرویس سابقه پرداخت برقرار نشد؛ اتصال شبکه را بررسی کنید.",
    );
  }

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  const contentType = response.headers.get("Content-Type") ?? "";
  if (contentType.toLocaleLowerCase("en-US").includes("application/json")) {
    throw new Error(await parseErrorMessage(response));
  }

  const sourceBlob = await response.blob();
  if (sourceBlob.size === 0) {
    throw new Error("فایل سابقه پرداخت خالی است.");
  }

  const blob = await resizePdfToReceiptWidth(sourceBlob);

  return {
    blob,
    filename: getFilename(response, normalizedReceiptId),
  };
}
