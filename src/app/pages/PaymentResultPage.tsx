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
import { fetchPaymentLog, type PaymentLogPayload } from "../data/paymentLog";

interface PaymentLogRow {
  label: string;
  value: string;
}

const emptyDisplay = "—";
const pdfPageWidth = 595.28;
const pdfPageHeight = 841.89;

const paymentLogIdParamNames = [
  "id",
  "Id",
  "message",
  "Message",
  "paymentId",
  "PaymentId",
  "paymentLogId",
  "PaymentLogId",
];

const paymentLogLabels: Record<string, string> = {
  id: "شناسه",
  fileid: "شناسه پرونده",
  codenosazi: "کد نوسازی",
  billid: "شناسه قبض",
  paymentid: "شناسه پرداخت",
  year: "سال",
  amount: "مبلغ",
  status: "وضعیت",
  date: "تاریخ",
  paygatetranid: "شناسه تراکنش درگاه",
};

const normalizePaymentLogKey = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[\s_\-.:/\\\u200c\u200f]+/g, "");

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

const getPaymentLogQuery = (params: URLSearchParams) => {
  const logId = paymentLogIdParamNames
    .map((name) => params.get(name))
    .find((value) => value && value.trim());

  return logId ? `id=${encodeURIComponent(logId.trim())}` : null;
};

const formatLabel = (value: string) =>
  paymentLogLabels[normalizePaymentLogKey(value)] ||
  value
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .trim();

const formatLogValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") {
    return emptyDisplay;
  }

  if (typeof value === "boolean") {
    return value ? "بله" : "خیر";
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  return String(value);
};

const flattenPaymentLogRows = (
  value: unknown,
  prefix = "",
  depth = 0,
): PaymentLogRow[] => {
  if (value === null || value === undefined || typeof value !== "object") {
    return [{ label: prefix || "مقدار", value: formatLogValue(value) }];
  }

  if (depth > 5) {
    return [{ label: prefix || "جزئیات", value: formatLogValue(value) }];
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [{ label: prefix || "لیست", value: emptyDisplay }];
    }

    return value.flatMap((item, index) =>
      flattenPaymentLogRows(
        item,
        prefix
          ? `${prefix} ${String(index + 1).toLocaleString("fa-IR")}`
          : `ردیف ${String(index + 1).toLocaleString("fa-IR")}`,
        depth + 1,
      ),
    );
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) {
    return [{ label: prefix || "جزئیات", value: emptyDisplay }];
  }

  return entries.flatMap(([key, item]) => {
    const label = prefix ? `${prefix} / ${formatLabel(key)}` : formatLabel(key);
    if (item && typeof item === "object") {
      return flattenPaymentLogRows(item, label, depth + 1);
    }

    return [{ label, value: formatLogValue(item) }];
  });
};

const isEmptyPaymentLog = (value: PaymentLogPayload | null) => {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length === 0;
  }
  return false;
};

const wrapText = (
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) => {
  const paragraphs = String(text || emptyDisplay).split(/\r?\n/);
  const lines: string[] = [];

  paragraphs.forEach((paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      return;
    }

    let currentLine = "";
    words.forEach((word) => {
      const nextLine = currentLine ? `${currentLine} ${word}` : word;
      if (context.measureText(nextLine).width <= maxWidth) {
        currentLine = nextLine;
        return;
      }

      if (currentLine) lines.push(currentLine);
      currentLine = "";

      let chunk = "";
      Array.from(word).forEach((character) => {
        const nextChunk = `${chunk}${character}`;
        if (context.measureText(nextChunk).width <= maxWidth) {
          chunk = nextChunk;
          return;
        }
        if (chunk) lines.push(chunk);
        chunk = character;
      });

      currentLine = chunk;
    });

    lines.push(currentLine);
  });

  return lines.length > 0 ? lines : [emptyDisplay];
};

const base64ToBytes = (value: string) => {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const appendPdfPart = (
  parts: Uint8Array[],
  value: string | Uint8Array,
  encoder: TextEncoder,
) => {
  parts.push(typeof value === "string" ? encoder.encode(value) : value);
};

const buildPdfBlob = (images: Uint8Array[]) => {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let position = 0;

  const append = (value: string | Uint8Array) => {
    const part =
      typeof value === "string" ? encoder.encode(value) : value;
    parts.push(part);
    position += part.length;
  };

  const addObject = (id: number, body: Array<string | Uint8Array>) => {
    offsets[id] = position;
    append(`${id} 0 obj\n`);
    body.forEach((part) => appendPdfPart(parts, part, encoder));
    position = parts.reduce((sum, part) => sum + part.length, 0);
    append("\nendobj\n");
  };

  append("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

  const pageObjectIds = images.map((_, index) => 3 + index * 3);
  addObject(1, ["<< /Type /Catalog /Pages 2 0 R >>"]);
  addObject(2, [
    `<< /Type /Pages /Count ${images.length} /Kids [ ${pageObjectIds
      .map((id) => `${id} 0 R`)
      .join(" ")} ] >>`,
  ]);

  images.forEach((imageBytes, index) => {
    const pageId = 3 + index * 3;
    const contentId = pageId + 1;
    const imageId = pageId + 2;
    const imageName = `Im${index + 1}`;
    const content = `q\n${pdfPageWidth} 0 0 ${pdfPageHeight} 0 0 cm\n/${imageName} Do\nQ`;
    const contentBytes = encoder.encode(content);

    addObject(pageId, [
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfPageWidth} ${pdfPageHeight}] /Resources << /XObject << /${imageName} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    ]);
    addObject(contentId, [
      `<< /Length ${contentBytes.length} >>\nstream\n`,
      contentBytes,
      "\nendstream",
    ]);
    addObject(imageId, [
      `<< /Type /XObject /Subtype /Image /Width 1240 /Height 1754 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`,
      imageBytes,
      "\nendstream",
    ]);
  });

  const xrefStart = position;
  append(`xref\n0 ${offsets.length}\n`);
  append("0000000000 65535 f \n");
  for (let id = 1; id < offsets.length; id += 1) {
    append(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  }
  append(
    `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`,
  );

  return new Blob(parts, { type: "application/pdf" });
};

const createPaymentLogPdf = (rows: PaymentLogRow[]) => {
  const canvas = document.createElement("canvas");
  canvas.width = 1240;
  canvas.height = 1754;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("امکان ساخت فایل PDF در مرورگر وجود ندارد.");
  }

  const margin = 80;
  const tableWidth = canvas.width - margin * 2;
  const labelWidth = 320;
  const valueWidth = tableWidth - labelWidth;
  const lineHeight = 30;
  const cellPaddingX = 18;
  const cellPaddingY = 18;
  const headerHeight = 62;
  const images: Uint8Array[] = [];
  let y = 0;
  let pageNumber = 0;

  const drawPageHeader = () => {
    pageNumber += 1;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.direction = "rtl";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#111827";
    context.font = "700 34px Tahoma, Arial, sans-serif";
    context.fillText("سابقه پرداخت", canvas.width / 2, 72);
    context.font = "20px Tahoma, Arial, sans-serif";
    context.fillStyle = "#4b5563";
    context.fillText(
      `صفحه ${String(pageNumber).toLocaleString("fa-IR")}`,
      canvas.width / 2,
      116,
    );

    y = 154;
    context.fillStyle = "#eef2f7";
    context.fillRect(margin, y, tableWidth, headerHeight);
    context.strokeStyle = "#cbd5e1";
    context.lineWidth = 2;
    context.strokeRect(margin, y, tableWidth, headerHeight);
    context.beginPath();
    context.moveTo(margin + valueWidth, y);
    context.lineTo(margin + valueWidth, y + headerHeight);
    context.stroke();

    context.fillStyle = "#111827";
    context.font = "700 24px Tahoma, Arial, sans-serif";
    context.textAlign = "right";
    context.fillText("فیلد", margin + tableWidth - cellPaddingX, y + 32);
    context.fillText("مقدار", margin + valueWidth - cellPaddingX, y + 32);
    y += headerHeight;
  };

  const finishPage = () => {
    const imageData = canvas.toDataURL("image/jpeg", 0.95).split(",")[1];
    images.push(base64ToBytes(imageData));
  };

  drawPageHeader();

  rows.forEach((row) => {
    context.font = "22px Tahoma, Arial, sans-serif";
    const labelLines = wrapText(
      context,
      row.label,
      labelWidth - cellPaddingX * 2,
    );
    const valueLines = wrapText(
      context,
      row.value,
      valueWidth - cellPaddingX * 2,
    );
    const totalLines = Math.max(labelLines.length, valueLines.length);
    let offset = 0;

    while (offset < totalLines) {
      const availableLines = Math.floor(
        (canvas.height - margin - y - cellPaddingY * 2) / lineHeight,
      );
      if (availableLines <= 0) {
        finishPage();
        drawPageHeader();
        continue;
      }

      const chunkLines = Math.min(totalLines - offset, availableLines);
      const rowHeight = chunkLines * lineHeight + cellPaddingY * 2;

      context.strokeStyle = "#cbd5e1";
      context.lineWidth = 2;
      context.strokeRect(margin, y, tableWidth, rowHeight);
      context.beginPath();
      context.moveTo(margin + valueWidth, y);
      context.lineTo(margin + valueWidth, y + rowHeight);
      context.stroke();

      context.fillStyle = "#111827";
      context.font = "22px Tahoma, Arial, sans-serif";
      context.textAlign = "right";
      context.textBaseline = "top";

      for (let lineIndex = 0; lineIndex < chunkLines; lineIndex += 1) {
        const sourceIndex = offset + lineIndex;
        const textY = y + cellPaddingY + lineIndex * lineHeight;
        const labelLine = labelLines[sourceIndex] ?? "";
        const valueLine = valueLines[sourceIndex] ?? "";

        if (labelLine) {
          context.fillText(
            labelLine,
            margin + tableWidth - cellPaddingX,
            textY,
          );
        }
        if (valueLine) {
          context.fillText(
            valueLine,
            margin + valueWidth - cellPaddingX,
            textY,
          );
        }
      }

      y += rowHeight;
      offset += chunkLines;
    }
  });

  finishPage();
  return buildPdfBlob(images);
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const isSuccess = isSuccessfulPayment(searchParams);
  const [isLoadingLog, setIsLoadingLog] = useState(false);
  const [logError, setLogError] = useState("");
  const [paymentLogRows, setPaymentLogRows] = useState<PaymentLogRow[]>([]);

  const handleDownloadPaymentLog = async () => {
    setIsLoadingLog(true);
    setLogError("");
    setPaymentLogRows([]);

    try {
      const logData = await fetchPaymentLog(getPaymentLogQuery(searchParams));
      if (isEmptyPaymentLog(logData)) {
        throw new Error("سابقه پرداخت برای این تراکنش یافت نشد.");
      }

      const rows = flattenPaymentLogRows(logData);
      const pdfBlob = createPaymentLogPdf(rows);
      downloadBlob(pdfBlob, "payment-log.pdf");
      setPaymentLogRows(rows);
    } catch (error) {
      setLogError(
        error instanceof Error
          ? error.message
          : "خطا در دریافت سابقه پرداخت.",
      );
    } finally {
      setIsLoadingLog(false);
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
                onClick={handleDownloadPaymentLog}
                disabled={isLoadingLog}
                aria-busy={isLoadingLog}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#36c3b2] bg-[#06201a] px-5 text-sm font-bold text-[#f4fbf8] transition-colors hover:bg-[#142e27] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#78e1d4] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoadingLog ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isLoadingLog ? "در حال دریافت..." : "دریافت سابقه پرداخت"}
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

          {logError ? (
            <p className="mt-3 text-sm leading-6 text-[#f3a0a7]">{logError}</p>
          ) : null}

          {paymentLogRows.length > 0 ? (
            <div className="mt-6 rounded-2xl border border-[#294f40] bg-[#08261e] px-5 py-5 text-sm text-[#e5f2eb] shadow-[0_18px_50px_rgba(0,0,0,0.16)]">
              <h2 className="mb-4 text-base font-bold text-white">
                اطلاعات سابقه پرداخت
              </h2>
              <div className="max-h-[320px] overflow-auto">
                <table className="min-w-full table-auto border-collapse">
                  <tbody>
                    {paymentLogRows.map((row, index) => (
                      <tr key={`${row.label}-${index}`}>
                        <td className="whitespace-nowrap border-b border-[#24483f] px-3 py-2 text-right text-sm text-[#d7e4df]">
                          {row.label}
                        </td>
                        <td className="whitespace-pre-wrap break-words border-b border-[#24483f] px-3 py-2 text-right text-sm text-[#e6f2ec]">
                          {row.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
