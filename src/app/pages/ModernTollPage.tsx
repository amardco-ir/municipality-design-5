import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Home,
  Info,
  Minus,
  Plus,
  Search,
  Moon,
  Sun,
  Trash2,
  X,
  Layers,
  FileText,
  Users,
  Receipt,
  History,
  LayoutGrid,
  MapPinHouse,
  CreditCard,
  LoaderCircle,
  Wallet,
} from "lucide-react";
import { Link } from "react-router";
import {
  guildCodeFields,
  type RenewalCodeKey,
  type RenewalCodes,
  getSelectedPropertyFullCode,
  normalizeRenewalCode,
} from "../data/properties";
import {
  isApiSuccess,
  getApiValue,
  type ApiResponse,
} from "../utils/apiResponseHandler";
import { apiFetch, renovationBillApiFetch } from "../data/api";
import { AUTH_TOKEN_KEY } from "../utils/authStorage";
import {
  extractPaymentIdentifiers,
  redirectToPaymentGateway,
  requestPaymentToken,
  type PaymentIdentifiers,
} from "../services/paymentService";
import {
  fetchPaymentReports,
  type PaymentReportRecord,
} from "../data/paymentReports";
import {
  PropertyTreeList,
  type PropertyItem as TreePropertyItem,
  type PropertyTreeItem,
} from "../components/PropertyTreeList";
import {
  fetchCurrentUserPropertyFiles,
  flattenApiPropertyFiles,
  getPropertyFileList,
} from "../data/propertyFiles";

//import Map from "@/app/components/Map";
import Map from "../components/Map";
//import { MapHandle } from "@/app/components/Map/types";
import { MapHandle } from "../components/Map/types";

interface LocalPropertyItem {
  id: string;
  fullCode: string;
  ownerName: string;
  description: string;
  codes: RenewalCodes;
}

interface OwnerItem {
  id: string;
  firstName: string;
  lastName: string;
  ownerType: string;
  fatherName: string;
  birthPlace: string;
}

interface LabelValue {
  label: string;
  value: string;
}

interface HistoryItem {
  id: string;
  date: string;
  amount: string;
  status: string;
}

interface PaymentReportItem {
  id: string;
  billId: string;
  paymentId: string;
  amount: string;
  paymentDate: string;
  trackingCode: string;
  status: string;
  description: string;
  raw: PaymentReportRecord;
}

interface RenovationBill {
  ParvandeNo: number;
  IdMalek: number;
  BillType: number;
  Year: number;
  ShenaseGhabz: string;
  ShenasePardakht: string;
  CodeNosazi: string;
  NameOwner: string;
  Address: string | null;
  Description: string;
  DateSodor: string;
  Price: number;
  DelayedPrice: number;
  PaymentStatus: boolean;
}

const billRows = (bill: RenovationBill): LabelValue[] => [
  { label: "کد نوسازی", value: bill.CodeNosazi },
  { label: "شماره پرونده", value: String(bill.ParvandeNo) },
  { label: "نام مالک", value: bill.NameOwner },
  { label: "سال", value: String(bill.Year) },
  { label: "تاریخ صدور", value: bill.DateSodor },
  { label: "شناسه قبض", value: bill.ShenaseGhabz },
  { label: "شناسه پرداخت", value: bill.ShenasePardakht },
  {
    label: "مبلغ",
    value: `${Number(bill.Price || 0).toLocaleString("fa-IR")} ریال`,
  },
  {
    label: "دیرکرد",
    value: `${Number(bill.DelayedPrice || 0).toLocaleString("fa-IR")} ریال`,
  },
  { label: "وضعیت", value: bill.PaymentStatus ? "پرداخت شده" : "پرداخت نشده" },
  { label: "نشانی", value: bill.Address || emptyDisplay },
  { label: "توضیحات", value: bill.Description || emptyDisplay },
];

interface ModernTollPageProps {
  isDark: boolean;
  toggleTheme: () => void;
}

const emptyDisplay = "\u2014";

const asArray = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value.items)) return value.items;
  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.result)) return value.result;
  if (Array.isArray(value.results)) return value.results;
  if (Array.isArray(value.list)) return value.list;
  if (Array.isArray(value.rows)) return value.rows;
  if (Array.isArray(value.Value)) return value.Value;
  if (Array.isArray(value.value)) return value.value;
  return [value];
};

const firstFilledText = (...values: unknown[]) => {
  const value = values.find(
    (item) => item !== undefined && item !== null && String(item).trim() !== "",
  );
  return value === undefined ? emptyDisplay : String(value);
};

const modernTollLabels: Record<string, string> = {
  Shofish: "شماره فیش",
  Nam_malek: "نام مالک",
  Address: "نشانی",
  Azsal: "از سال",
  Tasal: "تا سال",
  Avarez: "عوارض",
  Moavaghe: "معوقه",
  SahmMalek: "سهم مالک",
  Education: "آموزش و پرورش",
  FireStation: "آتش نشانی",
  Khadamat: "خدمات",
  M_khadamat: "مبلغ خدمات",
  Tax: "مالیات",
  Mafiyat: "معافیت",
  Khoshhesabi: "خوش حسابی",
  BadHesabi: "بدحسابی",
  Mablagh: "مبلغ قابل پرداخت",
  Mablagh_farsi: "مبلغ به حروف",
};

const modernTollOrder = [
  "Shofish",
  "Nam_malek",
  "Address",
  "Azsal",
  "Tasal",
  "Avarez",
  "Moavaghe",
  "SahmMalek",
  "Education",
  "FireStation",
  "Khadamat",
  "M_khadamat",
  "Tax",
  "Mafiyat",
  "Khoshhesabi",
  "BadHesabi",
  "Mablagh",
  "Mablagh_farsi",
];

const modernTollMoneyKeys = new Set([
  "Avarez",
  "Moavaghe",
  "SahmMalek",
  "Education",
  "FireStation",
  "Khadamat",
  "M_khadamat",
  "Tax",
  "Mafiyat",
  "Khoshhesabi",
  "BadHesabi",
  "Mablagh",
]);

const formatDisplayValue = (value: unknown, key?: string) => {
  if (value === undefined || value === null || value === "")
    return emptyDisplay;
  if (typeof value === "number" && Number.isFinite(value)) {
    const formatted = value.toLocaleString("fa-IR");
    return key && modernTollMoneyKeys.has(key)
      ? `${formatted} ریال`
      : formatted;
  }
  if (typeof value === "boolean") return value ? "بله" : "خیر";
  return String(value);
};

const unwrapRenovationBillItems = (value: any): any[] => {
  const root = getApiValue(value) ?? value;
  const result: any[] = [];
  const queue: any[] = [root];
  const visited = new WeakSet<object>();
  const listKeys = [
    "items",
    "data",
    "result",
    "results",
    "list",
    "rows",
    "Value",
    "value",
  ];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    if (Array.isArray(current)) {
      current.forEach((item) => queue.push(item));
      continue;
    }

    if (typeof current !== "object") continue;
    if (visited.has(current)) continue;
    visited.add(current);

    if (isRenovationBillLike(current)) {
      result.push(current);
      continue;
    }

    listKeys.forEach((key) => {
      const nextValue = current[key];
      if (
        nextValue &&
        (Array.isArray(nextValue) || typeof nextValue === "object")
      ) {
        queue.push(nextValue);
      }
    });
  }

  return result;
};

const isRenovationBillLike = (value: Record<string, unknown>) =>
  [
    "ParvandeNo",
    "parvandeNo",
    "parvande_no",
    "IdMalek",
    "idMalek",
    "BillType",
    "billType",
    "bill_type",
    "Year",
    "year",
    "ShenaseGhabz",
    "shenaseGhabz",
    "ShenasePardakht",
    "shenasePardakht",
    "CodeNosazi",
    "codeNosazi",
    "codeN",
    "Price",
    "price",
    "DelayedPrice",
    "delayedPrice",
    "PaymentStatus",
    "paymentStatus",
  ].some((key) => value[key] !== undefined);

const firstValue = (...values: unknown[]) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const toNumberValue = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const normalized = String(value ?? "").replace(/[^\d.-]/g, "");
  const numberValue = Number(normalized);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const toBooleanValue = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const normalized = String(value ?? "")
    .trim()
    .toLocaleLowerCase("en-US");
  if (["true", "1", "yes", "paid"].includes(normalized)) return true;
  if (["false", "0", "no", "unpaid"].includes(normalized)) return false;
  return Boolean(value);
};

const toTextValue = (value: unknown, fallback = "") => {
  const selected = firstValue(value, fallback);
  return selected === undefined || selected === null ? "" : String(selected);
};

const normalizeReportKey = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[\s_\-.:/\\\u200c\u200f]+/g, "");

const readReportValue = (
  record: PaymentReportRecord,
  aliases: string[],
): unknown => {
  const normalizedAliases = new Set(aliases.map(normalizeReportKey));
  const entry = Object.entries(record).find(([key, value]) => {
    return (
      normalizedAliases.has(normalizeReportKey(key)) &&
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    );
  });

  return entry?.[1];
};

const formatReportAmount = (value: unknown) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return emptyDisplay;
  }

  const numberValue = toNumberValue(value);
  if (numberValue > 0) {
    return `${numberValue.toLocaleString("fa-IR")} ریال`;
  }

  return String(value);
};

const formatReportStatus = (value: unknown) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return emptyDisplay;
  }

  if (typeof value === "boolean") return value ? "پرداخت شده" : "پرداخت نشده";
  if (typeof value === "number")
    return value !== 0 ? "پرداخت شده" : "پرداخت نشده";

  const text = String(value).trim();
  const normalized = text.toLocaleLowerCase("en-US");
  if (
    ["true", "1", "paid", "success", "successful", "succeeded"].includes(
      normalized,
    )
  ) {
    return "پرداخت شده";
  }
  if (
    [
      "false",
      "0",
      "unpaid",
      "failed",
      "failure",
      "canceled",
      "cancelled",
    ].includes(normalized)
  ) {
    return "پرداخت نشده";
  }

  return text;
};

const normalizePaymentReport = (
  record: PaymentReportRecord,
  index: number,
): PaymentReportItem => {
  const billId = readReportValue(record, [
    "billId",
    "billNo",
    "shenaseGhabz",
    "ghabzId",
    "ShenaseGhabz",
  ]);
  const paymentId = readReportValue(record, [
    "paymentId",
    "payId",
    "shenasePardakht",
    "pardakhtId",
    "ShenasePardakht",
  ]);
  const amount = readReportValue(record, [
    "amount",
    "price",
    "mablagh",
    "payablePrice",
    "totalAmount",
    "Mablagh",
    "Price",
  ]);
  const paymentDate = readReportValue(record, [
    "paymentDate",
    "payDate",
    "date",
    "createdAt",
    "tarikh",
    "PaymentDate",
  ]);
  const trackingCode = readReportValue(record, [
    "trackingCode",
    "traceNo",
    "referenceNo",
    "refId",
    "refNo",
    "transactionId",
    "TrackingCode",
  ]);
  const status = readReportValue(record, [
    "status",
    "paymentStatus",
    "isSuccess",
    "isPaid",
    "paid",
    "Status",
  ]);
  const description = readReportValue(record, [
    "description",
    "message",
    "title",
    "type",
    "Description",
  ]);

  return {
    id: String(
      readReportValue(record, ["id", "Id", "paymentReportId"]) ?? index + 1,
    ),
    billId: toTextValue(billId, emptyDisplay),
    paymentId: toTextValue(paymentId, emptyDisplay),
    amount: formatReportAmount(amount),
    paymentDate: toTextValue(paymentDate, emptyDisplay),
    trackingCode: toTextValue(trackingCode, emptyDisplay),
    status: formatReportStatus(status),
    description: toTextValue(description, emptyDisplay),
    raw: record,
  };
};

const normalizeRenovationBill = (item: any): RenovationBill => ({
  ...item,
  ParvandeNo: toNumberValue(
    firstValue(
      item.ParvandeNo,
      item.parvandeNo,
      item.parvande_no,
      item.FileNo,
      item.fileNo,
    ),
  ),
  IdMalek: toNumberValue(
    firstValue(
      item.IdMalek,
      item.idMalek,
      item.id_malek,
      item.OwnerId,
      item.ownerId,
    ),
  ),
  BillType: toNumberValue(
    firstValue(item.BillType, item.billType, item.bill_type),
  ),
  Year: toNumberValue(firstValue(item.Year, item.year, item.Sal, item.sal)),
  ShenaseGhabz: toTextValue(
    firstValue(
      item.ShenaseGhabz,
      item.shenaseGhabz,
      item.billId,
      item.BillId,
      item.ghabzId,
    ),
  ),
  ShenasePardakht: toTextValue(
    firstValue(
      item.ShenasePardakht,
      item.shenasePardakht,
      item.paymentId,
      item.PaymentId,
      item.pardakhtId,
    ),
  ),
  CodeNosazi: toTextValue(
    firstValue(
      item.CodeNosazi,
      item.codeNosazi,
      item.CodeN,
      item.codeN,
      item.fullCode,
    ),
  ),
  NameOwner: toTextValue(
    firstValue(
      item.NameOwner,
      item.nameOwner,
      item.Nam_malek,
      item.ownerName,
      item.MalekName,
    ),
  ),
  Address:
    firstValue(item.Address, item.address, item.Nam_address) === undefined
      ? null
      : toTextValue(firstValue(item.Address, item.address, item.Nam_address)),
  Description: toTextValue(
    firstValue(item.Description, item.description, item.Desc, item.desc),
  ),
  DateSodor: toTextValue(
    firstValue(
      item.DateSodor,
      item.dateSodor,
      item.Date,
      item.date,
      item.Tarikh,
      item.tarikh,
    ),
  ),
  Price: toNumberValue(
    firstValue(item.Price, item.price, item.Mablagh, item.amount, item.Amount),
  ),
  DelayedPrice: toNumberValue(
    firstValue(
      item.DelayedPrice,
      item.delayedPrice,
      item.Moavaghe,
      item.delayed_price,
    ),
  ),
  PaymentStatus: toBooleanValue(
    firstValue(
      item.PaymentStatus,
      item.paymentStatus,
      item.IsPaid,
      item.isPaid,
      item.Paid,
      item.paid,
    ),
  ),
});

const getExplicitBillCode = (bill: RenovationBill) =>
  toTextValue(
    firstValue(
      bill.CodeNosazi,
      (bill as any).codeNosazi,
      (bill as any).CodeN,
      (bill as any).codeN,
    ),
  );

const getBillType = (bill: RenovationBill) =>
  toNumberValue(
    firstValue(bill.BillType, (bill as any).billType, (bill as any).bill_type),
  );

const hasValidPaymentIdentifiers = (bill: RenovationBill) =>
  Boolean(extractPaymentIdentifiers(bill));

const isDisplayableRenovationBill = (bill: RenovationBill) =>
  (getBillType(bill) === 1 || getBillType(bill) === 2) &&
  hasValidPaymentIdentifiers(bill);

const getPrimitiveKeys = (source: Record<string, unknown>) =>
  Object.keys(source).filter((key) => {
    const value = source[key];
    return typeof value !== "object" || value === null;
  });

const toModernTollPairs = (value: any): LabelValue[] => {
  const rows = asArray(value);
  const source = rows[0];

  if (!source || typeof source !== "object") return [];

  if (Array.isArray(source.items)) {
    return source.items.map((item: any, index: number) => ({
      label: item.title ?? item.label ?? item.key ?? String(index + 1),
      value: formatDisplayValue(item.value ?? item.text ?? item.amount ?? item),
    }));
  }

  const keys = getPrimitiveKeys(source);
  const orderedKeys = [
    ...modernTollOrder.filter((key) => keys.includes(key)),
    ...keys.filter((key) => !modernTollOrder.includes(key)),
  ];

  return orderedKeys.map((key) => ({
    label: modernTollLabels[key] ?? key,
    value: formatDisplayValue(source[key], key),
  }));
};

const mergePairs = (right: LabelValue[], left: LabelValue[]) => {
  const rows: LabelValue[] = [];
  const maxLength = Math.max(right.length, left.length);

  for (let index = 0; index < maxLength; index += 1) {
    if (right[index]) rows.push(right[index]);
    if (left[index]) rows.push(left[index]);
  }

  return rows;
};

const escapeExportCell = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const exportPairsToPdf = (rows: LabelValue[], title: string) => {
  if (rows.length === 0 || typeof window === "undefined") return;

  const tableRows = rows
    .map(
      (row) =>
        `<tr><td>${escapeExportCell(row.label)}</td><td>${escapeExportCell(
          row.value,
        )}</td></tr>`,
    )
    .join("");
  const html = `
    <!doctype html>
    <html dir="rtl" lang="fa">
      <head>
        <meta charset="utf-8" />
        <title>${escapeExportCell(title)}</title>
        <style>
          @page { size: A4; margin: 16mm; }
          body {
            font-family: Tahoma, Arial, sans-serif;
            color: #111827;
            direction: rtl;
          }
          h1 {
            margin: 0 0 18px;
            font-size: 18px;
            text-align: center;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          th, td {
            border: 1px solid #d1d5db;
            padding: 8px 10px;
            text-align: right;
            vertical-align: top;
          }
          th {
            background: #f3f4f6;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        <h1>${escapeExportCell(title)}</h1>
        <table>
          <thead><tr><th>عنوان</th><th>مقدار</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>
  `;
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => printWindow.print(), 250);
};

const exportPaymentReportsToPdf = (reports: PaymentReportItem[]) => {
  if (reports.length === 0 || typeof window === "undefined") return;

  const tableRows = reports
    .map(
      (report, index) => `
        <tr>
          <td>${String(index + 1).toLocaleString("fa-IR")}</td>
          <td>${escapeExportCell(report.billId)}</td>
          <td>${escapeExportCell(report.paymentId)}</td>
          <td>${escapeExportCell(report.amount)}</td>
          <td>${escapeExportCell(report.paymentDate)}</td>
          <td>${escapeExportCell(report.trackingCode)}</td>
          <td>${escapeExportCell(report.status)}</td>
          <td>${escapeExportCell(report.description)}</td>
        </tr>
      `,
    )
    .join("");

  const html = `
    <!doctype html>
    <html dir="rtl" lang="fa">
      <head>
        <meta charset="utf-8" />
        <title>سوابق پرداخت‌ها</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          body {
            font-family: Tahoma, Arial, sans-serif;
            color: #111827;
            direction: rtl;
          }
          h1 {
            margin: 0 0 14px;
            font-size: 18px;
            text-align: center;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          th, td {
            border: 1px solid #d1d5db;
            padding: 7px 8px;
            text-align: right;
            vertical-align: top;
            word-break: break-word;
          }
          th {
            background: #f3f4f6;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        <h1>سوابق پرداخت‌ها</h1>
        <table>
          <thead>
            <tr>
              <th>ردیف</th>
              <th>شناسه قبض</th>
              <th>شناسه پرداخت</th>
              <th>مبلغ</th>
              <th>تاریخ پرداخت</th>
              <th>کد رهگیری</th>
              <th>وضعیت</th>
              <th>توضیحات</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>
  `;
  const printWindow = window.open("", "_blank", "width=1100,height=800");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => printWindow.print(), 250);
};

const getOwnerId = (owner: any) => {
  if (typeof owner === "number" || typeof owner === "string") {
    return String(owner).trim();
  }

  if (!owner || typeof owner !== "object") return "";

  return firstFilledText(
    owner.Id,
    owner.id,
    owner.MalekId,
    owner.malekId,
    owner.OwnerId,
    owner.ownerId,
    owner.C_Malek,
    owner.c_Malek,
    owner.malek_id,
    owner.owner_id,
  ).replace(emptyDisplay, "");
};

const mapOwner = (owner: any, index: number): OwnerItem => {
  const source = owner && typeof owner === "object" ? owner : {};

  return {
    id: getOwnerId(owner) || String(index + 1),
    firstName: firstFilledText(source.Name, source.firstName, source.name),
    lastName: firstFilledText(source.Family, source.lastName),
    ownerType: firstFilledText(source.NoeMalek, source.ownerType),
    fatherName: firstFilledText(source.Father, source.fatherName),
    birthPlace: firstFilledText(
      source.Sodor,
      source.birthPlace,
      source.issuePlace,
    ),
  };
};

export function ModernTollPage({ isDark, toggleTheme }: ModernTollPageProps) {
  const [propertyItems, setPropertyItems] = useState<LocalPropertyItem[]>([]);
  const [selectedProperty, setSelectedProperty] =
    useState<LocalPropertyItem | null>(null);
  const [owners, setOwners] = useState<OwnerItem[]>([]);
  const [feesRight, setFeesRight] = useState<LabelValue[]>([]);
  const [feesLeft, setFeesLeft] = useState<LabelValue[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [paymentReports, setPaymentReports] = useState<PaymentReportItem[]>([]);
  const [isPaymentReportsLoading, setIsPaymentReportsLoading] = useState(false);
  const [paymentReportsError, setPaymentReportsError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({
    title: "",
    description: "",
  });

  // وضعیت فیلدهای ورودی جستجو
  const [searchInputs, setSearchInputs] = useState<RenewalCodes>({
    region: "",
    neighborhood: "",
    block: "",
    property: "",
    building: "",
    apartment: "",
    guild: "",
  });

  const [error, setError] = useState("");
  const [paymentIdentifiers, setPaymentIdentifiers] =
    useState<PaymentIdentifiers | null>(null);
  const [paymentError, setPaymentError] = useState("");
  const [paymentErrorBillIndex, setPaymentErrorBillIndex] = useState<
    number | null
  >(null);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [isRenovationLoading, setIsRenovationLoading] = useState(true);
  const [renovationBills, setRenovationBills] = useState<RenovationBill[]>([]);
  const [renovationServiceBill, setRenovationServiceBill] =
    useState<RenovationBill | null>(null);
  const [renovationServices, setRenovationServices] = useState<LabelValue[]>(
    [],
  );
  const [payingBillIndex, setPayingBillIndex] = useState<number | null>(null);
  const renovationRequestIdRef = useRef(0);
  const paymentAttemptIdRef = useRef(0);
  const propertyCodeSetRef = useRef<Set<string>>(new Set());

  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  const normalizeCode = (code = ""): string => {
    const segments = code
      .split("-")
      .map((part) => part.trim())
      .filter((part) => part !== "");

    const normalized = segments.length > 7 ? segments.slice(-7) : [...segments];
    while (normalized.length < 7) {
      normalized.push("");
    }
    return normalized.join("-");
  };

  const splitCode = (code = ""): RenewalCodes => {
    const parts = normalizeCode(code).split("-");
    return {
      region: parts[0] ?? "",
      neighborhood: parts[1] ?? "",
      block: parts[2] ?? "",
      property: parts[3] ?? "",
      building: parts[4] ?? "",
      apartment: parts[5] ?? "",
      guild: parts[6] ?? "",
    };
  };

  const codeNosazi = normalizeCode(
    `${searchInputs.region}-${searchInputs.neighborhood}-${searchInputs.block}-${searchInputs.property}-${searchInputs.building}-${searchInputs.apartment}-${searchInputs.guild}`,
  );

  const getComparableCode = (code: string | null | undefined) =>
    normalizeRenewalCode(code);

  const handleOpenHelp = (title: string, description: string) => {
    setModalContent({ title, description });
    setIsModalOpen(true);
  };

  // هندلر تغییر مقادیر ورودی
  const handleInputChange = (key: RenewalCodeKey, value: string) => {
    setSearchInputs((prev) => ({ ...prev, [key]: value }));
  };

  const loadRenovationData = async (propertyId: string, code: string) => {
    setRenovationServices([]);
    setRenovationServiceBill(null);
    if (!token) {
      setIsRenovationLoading(false);
      return;
    }
    const requestId = ++renovationRequestIdRef.current;
    setIsRenovationLoading(true);
    setPaymentIdentifiers(null);
    setPaymentError("");
    setPaymentErrorBillIndex(null);
    try {
      const normalizedCode = normalizeCode(normalizeRenewalCode(code));
      const comparableRequestedCode = getComparableCode(normalizedCode);

      if (
        !comparableRequestedCode ||
        !propertyCodeSetRef.current.has(comparableRequestedCode)
      ) {
        throw new Error(
          "کد نوسازی واردشده در پرونده‌های زیرمجموعه شما وجود ندارد.",
        );
      }

      const headers = {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      };
      const ownersRes = await apiFetch(
        `/api/owners?codeNosazi=${encodeURIComponent(normalizedCode)}`,
        { headers },
      );
      const ownersData: ApiResponse = ownersRes.ok
        ? await ownersRes.json()
        : { IsSuccess: false, IsFailure: true };
      const ownersValue = isApiSuccess(ownersData)
        ? getApiValue(ownersData)
        : null;
      let rawOwners = asArray(ownersValue);
      if (requestId !== renovationRequestIdRef.current) return;
      setOwners(rawOwners.map(mapOwner));

      const ownerId =
        rawOwners.map(getOwnerId).find(Boolean) || String(propertyId).trim();

      const renovationRes = await renovationBillApiFetch(
        `/Api/PaymentAvarez/ReceiveBill?codeNosazi=${encodeURIComponent(normalizedCode)}&ownerId=${encodeURIComponent(ownerId || "1")}`,
        { headers },
      );
      if (!renovationRes.ok) {
        throw new Error("خطا در دریافت قبوض عوارض نوسازی.");
      }
      const renovationValue = await renovationRes.json();
      const receivedBills = unwrapRenovationBillItems(renovationValue).map(
        normalizeRenovationBill,
      );
      if (requestId !== renovationRequestIdRef.current) return;

      const explicitlyMatchedBills = receivedBills.filter((bill) => {
        const responseCode = getComparableCode(bill.CodeNosazi);
        return (
          responseCode === comparableRequestedCode &&
          propertyCodeSetRef.current.has(responseCode)
        );
      });
      const codeLessBills = receivedBills.filter(
        (bill) => !getComparableCode(getExplicitBillCode(bill)),
      );
      const bills =
        explicitlyMatchedBills.length > 0
          ? explicitlyMatchedBills
          : codeLessBills.map((bill) => ({
              ...bill,
              CodeNosazi: normalizedCode,
            }));
      const displayableBills = bills.filter(isDisplayableRenovationBill);
      const tollBill =
        displayableBills.find((bill) => getBillType(bill) === 1) ?? null;
      const serviceBill =
        displayableBills.find((bill) => getBillType(bill) === 2) ?? null;
      const tollBills = tollBill ? [tollBill] : [];

      setRenovationBills(tollBills);
      setRenovationServiceBill(serviceBill);
      setRenovationServices(serviceBill ? billRows(serviceBill) : []);
      const feePairs = tollBill ? billRows(tollBill) : [];
      setFeesRight(feePairs.filter((_: unknown, i: number) => i % 2 === 0));
      setFeesLeft(feePairs.filter((_: unknown, i: number) => i % 2 === 1));
      setPaymentIdentifiers(
        tollBill ? extractPaymentIdentifiers(tollBill) : null,
      );

      setHistoryItems(
        tollBills.map((item, index) => ({
          id: String(item.ParvandeNo ?? index + 1),
          date: item.DateSodor ?? "—",
          amount: `${Number(item.Price || 0).toLocaleString("fa-IR")} ریال`,
          status: item.PaymentStatus ? "پرداخت شده" : "پرداخت نشده",
        })),
      );
      setOwners(rawOwners.map(mapOwner));
    } catch (loadError) {
      if (requestId !== renovationRequestIdRef.current) return;
      setError(
        loadError instanceof Error
          ? loadError.message
          : "خطا در دریافت اطلاعات نوسازی.",
      );
      setRenovationBills([]);
      setRenovationServiceBill(null);
      setRenovationServices([]);
      setFeesRight([]);
      setFeesLeft([]);
      setHistoryItems([]);
      setPaymentIdentifiers(null);
    } finally {
      if (requestId === renovationRequestIdRef.current) {
        setIsRenovationLoading(false);
      }
    }
  };

  // هندلر کلیک روی یک ملک از لیست زیرمجموعه
  const selectPropertyFromList = (property: LocalPropertyItem) => {
    renovationRequestIdRef.current += 1;
    paymentAttemptIdRef.current += 1;
    setSearchInputs(property.codes);
    setSelectedProperty(property);
    setOwners([]);
    setFeesRight([]);
    setFeesLeft([]);
    setRenovationBills([]);
    setRenovationServices([]);
    setHistoryItems([]);
    setPaymentIdentifiers(null);
    setPaymentError("");
    setIsPaymentLoading(false);
    setIsRenovationLoading(false);
    setError("");
  };

  const handlePropertyTreeSelect = (
    property: TreePropertyItem,
    treeItem: PropertyTreeItem,
  ) => {
    const codes: RenewalCodes = {
      region: "",
      neighborhood: "",
      block: "",
      property: "",
      building: "",
      apartment: "",
      guild: "",
    };

    const selectedFullCode = treeItem.fullCode || property.fullCode;

    // Parse the fullCode to extract codes
    const parts = treeItem.fullCode
      .split("-")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 7) {
      codes.region = parts[0];
      codes.neighborhood = parts[1];
      codes.block = parts[2];
      codes.property = parts[3];
      codes.building = parts[4];
      codes.apartment = parts[5];
      codes.guild = parts[6];
    }

    const prop: LocalPropertyItem = {
      id: treeItem.id,
      fullCode: treeItem.fullCode,
      ownerName: property.description,
      description: treeItem.text,
      codes: codes,
    };

    mapRef.current?.selectMelkByCodeNosazi(selectedFullCode);
    selectPropertyFromList(prop);
    void loadRenovationData(prop.id, prop.fullCode);
  };

  const loadPaymentReports = useCallback(
    async (signal?: AbortSignal) => {
      if (!token) {
        setPaymentReports([]);
        setPaymentReportsError("");
        setIsPaymentReportsLoading(false);
        return;
      }

      setIsPaymentReportsLoading(true);
      setPaymentReportsError("");
      try {
        const records = await fetchPaymentReports(signal);
        if (signal?.aborted) return;
        setPaymentReports(records.map(normalizePaymentReport));
      } catch (reportError) {
        if (
          reportError instanceof DOMException &&
          reportError.name === "AbortError"
        ) {
          return;
        }
        setPaymentReports([]);
        setPaymentReportsError(
          reportError instanceof Error
            ? reportError.message
            : "دریافت سوابق پرداخت ناموفق بود.",
        );
      } finally {
        if (!signal?.aborted) setIsPaymentReportsLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadPaymentReports(controller.signal);
    return () => controller.abort();
  }, [loadPaymentReports]);

  useEffect(() => {
    const loadProperties = async () => {
      const nationalCode = localStorage.getItem("user-national-code");
      if (!token || !nationalCode) {
        setIsRenovationLoading(false);
        return;
      }
      try {
        const data = await fetchCurrentUserPropertyFiles(token);

        if (!isApiSuccess(data)) {
          setIsRenovationLoading(false);
          return;
        }

        const rawList = getPropertyFileList(data);
        const mapped: LocalPropertyItem[] = flattenApiPropertyFiles(
          rawList,
        ).map((item: any, index: number) => {
          const cleanedCode = normalizeCode(
            item.codeN ?? item.fullCode ?? item.codeNosazi ?? "",
          );
          return {
            id: String(item.Id ?? item.shop ?? index + 1),
            fullCode: cleanedCode || "—",
            ownerName: item.ownerName ?? item.tvItems?.[0]?.Text ?? "—",
            description:
              item.tvItems?.[0]?.Text?.trim() ?? item.codeN ?? "بدون توضیحات",
            codes: splitCode(cleanedCode),
          };
        });
        propertyCodeSetRef.current = new Set(
          mapped
            .map((item) => getComparableCode(item.fullCode))
            .filter(Boolean),
        );
        setPropertyItems(mapped);

        // انتخاب خودکار آیتم اول - تلاش برای بازیابی ملک انتخاب شده از localStorage
        if (mapped.length > 0) {
          // Try to restore previously selected property from localStorage
          const storedFullCode = getSelectedPropertyFullCode();
          let selectedProp: LocalPropertyItem | null = null;

          if (storedFullCode) {
            const normalizedStoredCode = normalizeRenewalCode(storedFullCode);
            // Find matching property by fullCode
            selectedProp =
              mapped.find(
                (item) =>
                  normalizeRenewalCode(item.fullCode) === normalizedStoredCode,
              ) ?? null;
          }

          // If no stored property found, use the first one
          const propertyToSelect = selectedProp ?? mapped[0];
          mapRef.current?.selectMelkByCodeNosazi(propertyToSelect.fullCode);
          setSelectedProperty(propertyToSelect);
          setSearchInputs(propertyToSelect.codes);
          void loadRenovationData(
            propertyToSelect.id,
            propertyToSelect.fullCode,
          );
        } else {
          setIsRenovationLoading(false);
        }
      } catch {
        setError("خطا در دریافت پرونده‌های زیرمجموعه.");
        setIsRenovationLoading(false);
      }
    };
    void loadProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSearch = async () => {
    paymentAttemptIdRef.current += 1;
    setIsPaymentLoading(false);
    setError("");
    setOwners([]);
    setFeesRight([]);
    setFeesLeft([]);
    setRenovationBills([]);
    setRenovationServices([]);
    setHistoryItems([]);
    setPaymentIdentifiers(null);
    setPaymentError("");

    const comparableSearchCode = getComparableCode(codeNosazi);
    const matchedProperty = propertyItems.find(
      (item) => getComparableCode(item.fullCode) === comparableSearchCode,
    );

    if (!matchedProperty) {
      renovationRequestIdRef.current += 1;
      setSelectedProperty(null);
      setIsRenovationLoading(false);
      setError("کد نوسازی واردشده در پرونده‌های زیرمجموعه شما وجود ندارد.");
      return;
    }

    setSelectedProperty(matchedProperty);
    try {
      await loadRenovationData(matchedProperty.id, codeNosazi);
    } catch {
      setError("خطا در دریافت اطلاعات نوسازی.");
    }
  };

  const handlePayment = async (bill?: RenovationBill, billIndex = 0) => {
    if (isPaymentLoading) return;
    if (!token) {
      setPaymentErrorBillIndex(billIndex);
      setPaymentError("برای پرداخت باید وارد حساب کاربری شوید.");
      return;
    }
    const identifiers = bill
      ? extractPaymentIdentifiers(bill)
      : paymentIdentifiers;
    if (!identifiers) {
      setPaymentErrorBillIndex(billIndex);
      setPaymentError(
        "شناسه قبض یا شناسه پرداخت در اطلاعات نوسازی موجود نیست؛ ابتدا پرونده را جستجو کنید.",
      );
      return;
    }

    setPaymentError("");
    setPaymentErrorBillIndex(null);
    setIsPaymentLoading(true);
    setPayingBillIndex(billIndex);
    const attemptId = ++paymentAttemptIdRef.current;
    try {
      const { refId, redirectUrl } = await requestPaymentToken(
        identifiers,
        token,
      );
      if (attemptId !== paymentAttemptIdRef.current) return;
      redirectToPaymentGateway(refId, redirectUrl);
    } catch (paymentRequestError) {
      if (attemptId !== paymentAttemptIdRef.current) return;
      setPaymentError(
        paymentRequestError instanceof Error
          ? paymentRequestError.message
          : "شروع عملیات پرداخت انجام نشد.",
      );
      setPaymentErrorBillIndex(billIndex);
      setIsPaymentLoading(false);
      setPayingBillIndex(null);
    }
  };

  const HelpButton = ({ title, desc }: { title: string; desc: string }) => (
    <button
      type="button"
      onClick={() => handleOpenHelp(title, desc)}
      className="inline-flex items-center gap-1 rounded-lg border border-primary/35 bg-[var(--primary-soft)] px-2.5 py-1 text-[10px] font-bold text-primary transition-colors hover:bg-primary/10 md:text-xs"
    >
      <Info className="h-3.5 w-3.5" /> راهنما
    </button>
  );

  const currentFeeRows = mergePairs(feesRight, feesLeft);
  const hasCurrentFees = currentFeeRows.length > 0;
  const hasRenovationServices = renovationServices.length > 0;
  const servicePaymentIdentifiers = renovationServiceBill
    ? extractPaymentIdentifiers(renovationServiceBill)
    : null;
  const isCurrentPaymentLoading = isPaymentLoading && payingBillIndex === 0;
  const isServicePaymentLoading = isPaymentLoading && payingBillIndex === 1;
  const canStartPayment = Boolean(
    token &&
    paymentIdentifiers &&
    !isPaymentLoading &&
    !renovationBills[0]?.PaymentStatus,
  );
  const canStartServicePayment = Boolean(
    token &&
    servicePaymentIdentifiers &&
    !isPaymentLoading &&
    !renovationServiceBill?.PaymentStatus,
  );
  const paymentHint = !token
    ? "برای پرداخت، ابتدا وارد حساب کاربری شوید."
    : !paymentIdentifiers
      ? "شناسه قبض و شناسه پرداخت برای این پرونده دریافت نشده است."
      : "پس از دریافت توکن، به درگاه امن آسان‌پرداخت منتقل می‌شوید.";
  const servicePaymentHint = !token
    ? "برای پرداخت، ابتدا وارد حساب کاربری شوید."
    : !servicePaymentIdentifiers
      ? "شناسه قبض و شناسه پرداخت برای این خدمت دریافت نشده است."
      : "پس از دریافت توکن، به درگاه امن آسان‌پرداخت منتقل می‌شوید.";
  const currentPaymentError = paymentErrorBillIndex === 0 ? paymentError : "";
  const servicePaymentError = paymentErrorBillIndex === 1 ? paymentError : "";

  // GIS Parameters
  const mapRef = useRef<MapHandle>(null);
  const fullCode = codeNosazi;
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-background text-foreground transition-colors duration-300"
    >
      {/* مودال راهنما */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-background/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
                <h3 className="flex items-center gap-2 text-base font-bold text-primary">
                  <Info className="h-5 w-5" />
                  {modalContent.title}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 text-sm leading-7 text-foreground/80">
                {modalContent.description}
              </div>
              <div className="px-6 py-4 text-left">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground shadow-lg transition-transform active:scale-95"
                >
                  فهمیدم
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* هدر */}
      <motion.header
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        className="fixed inset-x-0 top-0 z-50 px-2 pt-2 md:px-4 md:pt-3"
      >
        <div className="container mx-auto px-0 md:px-2 lg:px-6">
          <div className="nav-shell">
            <div className="flex h-16 items-center justify-between gap-2 px-3 md:h-20 md:px-4">
              <Link
                to="/"
                className="header-action-btn inline-flex items-center gap-2 px-3"
              >
                <ArrowRight className="hidden md:block h-4 w-4" />
                <span className="block md:hidden text-sm">بازگشت</span>
              </Link>
              <h1 className="text-sm font-bold text-foreground md:text-base">
                عوارض نوسازی
              </h1>
              <button onClick={toggleTheme} className="header-action-btn">
                {isDark ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="section-decor px-3 pb-12 pt-10 md:pb-20 md:pt-10 lg:px-6">
        <div className="container mx-auto max-w-6xl space-y-5">
          <div className="rounded-2xl border border-primary/25 bg-[var(--primary-soft)] px-4 py-3 text-xs text-primary md:text-sm">
            کاربر گرامی، لطفاً پس از انتخاب ملک خود دکمه جستجو را بزنید.
          </div>

          {/* بخش جستجو */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="soft-card mesh-panel overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">جستجو</h2>
              </div>
              <HelpButton
                title="جستجو"
                desc="کد نوسازی ۷ بخشی خود را وارد کنید."
              />
            </div>
            <div className="grid grid-cols-2 gap-2 p-4 md:grid-cols-8">
              <button
                onClick={handleSearch}
                className="flex h-11 items-center justify-center rounded-xl bg-emerald-600 text-sm font-semibold text-white transition-all hover:bg-emerald-700 active:scale-95 shadow-lg shadow-emerald-600/20"
              >
                <Search className="ml-1.5 h-4 w-4" /> جستجو
              </button>

              {guildCodeFields.map((field) => (
                <div key={field.key} className="relative">
                  <input
                    value={searchInputs[field.key]}
                    onChange={(e) =>
                      handleInputChange(field.key, e.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-border/70 bg-card px-2 text-center text-sm font-medium outline-none focus:border-primary transition-colors"
                    dir="ltr"
                  />
                  <span className="absolute -top-2 right-3 bg-card px-1 text-[9px] text-muted-foreground">
                    {field.label}
                  </span>
                </div>
              ))}
            </div>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="soft-card mesh-panel"
          >
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">
                  پرونده‌های زیرمجموعه
                </h2>
              </div>
              <HelpButton
                title="زیرمجموعه"
                desc="لیست املاک شما در این بخش نمایش داده می‌شود."
              />
            </div>
            <div className="p-4">
              <PropertyTreeList
                onPropertySelect={handlePropertyTreeSelect}
                compact
              />
            </div>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="soft-card mesh-panel overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">مالکین</h2>
              </div>
              <HelpButton
                title="مالکین"
                desc="در این جدول اطلاعات مالک یا مالکین پرونده انتخاب‌شده نمایش داده می‌شود. برای به‌روزرسانی جدول، پرونده را انتخاب کنید و جستجو را بزنید."
              />
            </div>
            <div className="responsive-table-shell p-3 sm:p-4">
              <table className="w-full min-w-[42rem] text-right text-[11px] md:text-xs">
                <thead>
                  <tr className="bg-[var(--primary-soft)] text-primary">
                    <th className="border border-border/50 p-2 text-center">
                      #
                    </th>
                    <th className="border border-border/50 p-2">نام</th>
                    <th className="border border-border/50 p-2">
                      نام خانوادگی
                    </th>
                    <th className="border border-border/50 p-2">نوع مالک</th>
                    <th className="border border-border/50 p-2">نام پدر</th>
                    <th className="border border-border/50 p-2">محل صدور</th>
                  </tr>
                </thead>
                <tbody>
                  {owners.map((owner, i) => (
                    <tr key={i} className="transition-colors hover:bg-muted/30">
                      <td className="border border-border/50 p-2 text-center font-bold">
                        {owner.id}
                      </td>
                      <td className="border border-border/50 p-2">
                        {owner.firstName}
                      </td>
                      <td className="border border-border/50 p-2">
                        {owner.lastName}
                      </td>
                      <td className="border border-border/50 p-2 text-muted-foreground">
                        {owner.ownerType}
                      </td>
                      <td className="border border-border/50 p-2 text-muted-foreground">
                        {owner.fatherName}
                      </td>
                      <td className="border border-border/50 p-2 text-muted-foreground">
                        {owner.birthPlace}
                      </td>
                    </tr>
                  )) || (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-4 text-center text-muted-foreground"
                      >
                        ابتدا جستجو کنید
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.article>

          {/* عوارض نوسازی جاری */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="soft-card mesh-panel"
          >
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">
                  عوارض نوسازی جاری
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <HelpButton
                  title="عوارض نوسازی جاری"
                  desc="پس از جستجو، اطلاعات قبض، مبلغ عوارض، دیرکرد و وضعیت پرداخت در این بخش نمایش داده می‌شود. خروجی PDF فقط وقتی داده دریافت شده باشد فعال است."
                />
                {hasCurrentFees && (
                  <button
                    type="button"
                    onClick={() =>
                      exportPairsToPdf(currentFeeRows, "عوارض نوسازی جاری")
                    }
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-sky-500/35 bg-sky-500/10 px-3 text-xs font-bold text-sky-700 transition-colors hover:bg-sky-500/15 dark:text-sky-300"
                  >
                    <FileText className="h-4 w-4" />
                    خروجی پی دی اف
                  </button>
                )}
              </div>
            </div>
            <div className="p-4">
              {isRenovationLoading ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-primary/20 bg-[var(--primary-soft)] text-primary"
                >
                  <LoaderCircle className="h-9 w-9 animate-spin" />
                  <span className="text-xs font-bold md:text-sm">
                    در حال دریافت اطلاعات عوارض نوسازی...
                  </span>
                </div>
              ) : renovationBills.length === 0 ? (
                <div className="flex min-h-40 items-center justify-center rounded-2xl border border-border/70 bg-muted/20 px-4 text-center text-xs text-muted-foreground md:text-sm">
                  {error ||
                    "قبض قابل نمایشی برای کد نوسازی انتخاب‌شده دریافت نشد."}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-x-8 gap-y-0 md:grid-cols-2">
                    <div className="space-y-0">
                      {(feesRight.length
                        ? feesRight
                        : Array(9).fill({ label: "—", value: "—" })
                      ).map((field, i) => (
                        <div
                          key={i}
                          className="flex justify-between border-b border-border/30 py-2.5 text-xs md:text-sm"
                        >
                          <span className="text-muted-foreground">
                            {field.label} :
                          </span>
                          <span className="font-medium text-foreground/80">
                            {field.value}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-0">
                      {(feesLeft.length
                        ? feesLeft
                        : Array(9).fill({ label: "—", value: "—" })
                      ).map((field, i) => (
                        <div
                          key={i}
                          className="flex justify-between border-b border-border/30 py-2.5 text-xs md:text-sm"
                        >
                          <span className="text-muted-foreground">
                            {field.label} :
                          </span>
                          <span className="font-medium text-foreground/80">
                            {field.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4 sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                          <Wallet className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-foreground">
                            پرداخت آنلاین عوارض
                          </h3>
                          <p className="mt-1 text-[11px] leading-5 text-muted-foreground sm:text-xs">
                            {paymentHint}
                          </p>
                          {paymentIdentifiers && (
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-foreground/70 sm:text-[11px]">
                              <span>
                                شناسه قبض:{" "}
                                <bdi dir="ltr">{paymentIdentifiers.billId}</bdi>
                              </span>
                              <span>
                                شناسه پرداخت:{" "}
                                <bdi dir="ltr">
                                  {paymentIdentifiers.paymentId}
                                </bdi>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handlePayment(renovationBills[0], 0)}
                        disabled={!canStartPayment}
                        aria-busy={isPaymentLoading}
                        className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-muted-foreground/35 disabled:shadow-none sm:w-auto"
                      >
                        {isCurrentPaymentLoading ? (
                          <LoaderCircle className="h-5 w-5 animate-spin" />
                        ) : (
                          <CreditCard className="h-5 w-5" />
                        )}
                        {renovationBills[0]?.PaymentStatus
                          ? "پرداخت شده"
                          : isCurrentPaymentLoading
                            ? "در حال اتصال به درگاه..."
                            : "پرداخت عوارض"}
                      </button>
                    </div>

                    {currentPaymentError && (
                      <div
                        role="alert"
                        className="mt-3 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs leading-6 text-destructive"
                      >
                        {currentPaymentError}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.article>

          {/* سوابق پرداخت‌ها */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="soft-card mesh-panel"
          >
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">
                  سوابق پرداخت‌ها
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <HelpButton
                  title="سوابق پرداخت‌ها"
                  desc="جدولی شامل سوابق پرداخت‌ها از سرویس گزارش پرداخت‌ها. خروجی PDF تمام رکوردها را شامل می‌شود."
                />
                <button
                  type="button"
                  onClick={() => exportPaymentReportsToPdf(paymentReports)}
                  disabled={
                    isPaymentReportsLoading || paymentReports.length === 0
                  }
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-sky-500/35 bg-sky-500/10 px-3 text-xs font-bold text-sky-700 transition-colors hover:bg-sky-500/15 dark:text-sky-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText className="h-4 w-4" />
                  خروجی پی دی اف
                </button>
              </div>
            </div>

            <div className="responsive-table-shell p-3 sm:p-4">
              {isPaymentReportsLoading ? (
                <div className="p-6 text-center text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <LoaderCircle className="h-4 w-4 animate-spin" /> در حال
                    دریافت سوابق پرداخت...
                  </span>
                </div>
              ) : paymentReportsError ? (
                <div className="p-4 text-center text-destructive text-xs">
                  {paymentReportsError}
                </div>
              ) : paymentReports.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-xs">
                  هیچ رکوردی برای سوابق پرداخت دریافت نشد.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[48rem] text-right text-[11px] md:text-xs">
                    <thead>
                      <tr className="bg-[var(--primary-soft)] text-primary">
                        <th className="border border-border/50 p-2 text-center">
                          #
                        </th>
                        <th className="border border-border/50 p-2">
                          شناسه قبض
                        </th>
                        <th className="border border-border/50 p-2">
                          شناسه پرداخت
                        </th>
                        <th className="border border-border/50 p-2">مبلغ</th>
                        <th className="border border-border/50 p-2">
                          تاریخ پرداخت
                        </th>
                        <th className="border border-border/50 p-2">
                          کد رهگیری
                        </th>
                        <th className="border border-border/50 p-2">وضعیت</th>
                        <th className="border border-border/50 p-2">توضیحات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentReports.map((r, i) => (
                        <tr
                          key={`${r.id}-${i}`}
                          className="transition-colors hover:bg-muted/20"
                        >
                          <td className="border border-border/50 p-2 text-center font-bold">
                            {String(i + 1)}
                          </td>
                          <td className="border border-border/50 p-2">
                            {r.billId}
                          </td>
                          <td className="border border-border/50 p-2">
                            {r.paymentId}
                          </td>
                          <td className="border border-border/50 p-2">
                            {r.amount}
                          </td>
                          <td className="border border-border/50 p-2">
                            {r.paymentDate}
                          </td>
                          <td className="border border-border/50 p-2">
                            {r.trackingCode}
                          </td>
                          <td className="border border-border/50 p-2">
                            {r.status}
                          </td>
                          <td className="border border-border/50 p-2">
                            {r.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.article>

          {/* خدمات نوسازی */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="soft-card mesh-panel overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">
                  خدمات نوسازی
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <HelpButton
                  title="خدمات نوسازی"
                  desc="خدمات و مبالغ خدمات نوسازی مربوط به پرونده انتخاب‌شده در این جدول نمایش داده می‌شود."
                />
                {hasRenovationServices && (
                  <button
                    type="button"
                    onClick={() =>
                      exportPairsToPdf(renovationServices, "خدمات نوسازی")
                    }
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-sky-500/35 bg-sky-500/10 px-3 text-xs font-bold text-sky-700 transition-colors hover:bg-sky-500/15 dark:text-sky-300"
                  >
                    <FileText className="h-4 w-4" />
                    خروجی پی دی اف
                  </button>
                )}
              </div>
            </div>
            <div className="responsive-table-shell p-3 sm:p-4">
              <table className="w-full min-w-[480px] border-separate border-spacing-0 text-xs md:text-sm">
                <thead>
                  <tr className="bg-muted/40 text-muted-foreground">
                    <th className="rounded-r-xl p-3 text-right font-medium">
                      عنوان خدمت
                    </th>
                    <th className="rounded-l-xl p-3 text-right font-medium">
                      مقدار / مبلغ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isRenovationLoading ? (
                    <tr>
                      <td
                        colSpan={2}
                        className="p-5 text-center text-muted-foreground"
                      >
                        <span className="inline-flex items-center gap-2">
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                          در حال دریافت خدمات نوسازی...
                        </span>
                      </td>
                    </tr>
                  ) : renovationServices.length > 0 ? (
                    renovationServices.map((service, index) => (
                      <tr
                        key={`${service.label}-${index}`}
                        className="border-b border-border/40 transition-colors hover:bg-muted/20"
                      >
                        <td className="p-3 text-muted-foreground text-right">
                          {service.label} :
                        </td>
                        <td className="p-3 font-medium text-foreground/80">
                          {service.value}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={2}
                        className="p-5 text-center text-muted-foreground"
                      >
                        رکورد خدمات نوسازی برای این کد دریافت نشد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {hasRenovationServices && renovationServiceBill && (
                <div className="mt-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                        <Wallet className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-foreground">
                          پرداخت آنلاین خدمات
                        </h3>
                        <p className="mt-1 text-[11px] leading-5 text-muted-foreground sm:text-xs">
                          {servicePaymentHint}
                        </p>
                        {servicePaymentIdentifiers && (
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-foreground/70 sm:text-[11px]">
                            <span>
                              شناسه قبض:{" "}
                              <bdi dir="ltr">
                                {servicePaymentIdentifiers.billId}
                              </bdi>
                            </span>
                            <span>
                              شناسه پرداخت:{" "}
                              <bdi dir="ltr">
                                {servicePaymentIdentifiers.paymentId}
                              </bdi>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePayment(renovationServiceBill, 1)}
                      disabled={!canStartServicePayment}
                      aria-busy={isServicePaymentLoading}
                      className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-muted-foreground/35 disabled:shadow-none sm:w-auto"
                    >
                      {isServicePaymentLoading ? (
                        <LoaderCircle className="h-5 w-5 animate-spin" />
                      ) : (
                        <CreditCard className="h-5 w-5" />
                      )}
                      {renovationServiceBill.PaymentStatus
                        ? "پرداخت شده"
                        : isServicePaymentLoading
                          ? "در حال اتصال به درگاه..."
                          : "پرداخت خدمات"}
                    </button>
                  </div>

                  {servicePaymentError && (
                    <div
                      role="alert"
                      className="mt-3 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs leading-6 text-destructive"
                    >
                      {servicePaymentError}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.article>

          {/* سوابق نوسازی */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="soft-card mesh-panel"
          >
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">
                  سوابق نوسازی جاری
                </h2>
              </div>
              <HelpButton
                title="سوابق نوسازی"
                desc="در این قسمت سوابق پرداخت یا رکوردهای قبلی مرتبط با پرونده انتخاب‌شده نمایش داده می‌شود. اگر موردی وجود نداشته باشد پیام خالی بودن داده نشان داده می‌شود."
              />
            </div>
            <div className="p-4">
              {historyItems.length > 0 ? (
                <div className="space-y-2">
                  {historyItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between rounded-lg border p-3 text-xs"
                    >
                      <span>تاریخ: {item.date}</span>
                      <span>مبلغ: {item.amount}</span>
                      <span className="text-emerald-500">{item.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center text-xs text-destructive">
                  موردی برای نمایش وجود ندارد.
                </div>
              )}
              {error && (
                <div className="mt-3 text-xs text-destructive">{error}</div>
              )}
            </div>
          </motion.article>

          {/* نقشه */}
          <motion.article
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="soft-card mesh-panel group relative h-64 overflow-hidden sm:h-80 md:h-[400px]"
          >
            <button
              type="button"
              onClick={() =>
                handleOpenHelp(
                  "نقشه ملک",
                  "این قسمت موقعیت ملک را نشان می‌دهد. با کلیک کردن روی هر ملک، اطلاعات اصلی ملک روی نقشه نمایش داده می‌شود و دکمه‌های بزرگنمایی و بازگشت برای کنترل نما قرار دارند.",
                )
              }
              className="absolute right-3 top-3 z-20 inline-flex items-center gap-1 rounded-lg border bor                                                                                                                                                                                                                                                                                                         der-primary/35 bg-card/90 px-2.5 py-1 text-[10px] font-bold text-primary shadow-lg transition-colors hover:bg-card md:text-xs"
            >
              <Info className="h-3.5 w-3.5" /> راهنما
            </button>
            <div className="absolute inset-0 bg-slate-800">
              <Map ref={mapRef} autoSelectCode={fullCode} />
              {/* {activeProperty && (
                <div className="absolute bottom-4 left-1/2 w-56 -translate-x-1/2 space-y-1.5 rounded-2xl border border-border bg-card/95 p-3 text-xs shadow-xl backdrop-blur-md sm:bottom-8 sm:w-64 sm:space-y-2 sm:p-4">
                  <div className="mb-2 flex justify-between border-b border-border/50 pb-2">
                    <span className="text-sm font-bold text-foreground">
                      اطلاعات ملک
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-foreground">کد نوسازی</span>
                    <span className="text-[10px] text-muted-foreground sm:text-xs">
                      {Object.values(activeProperty.codes).join("-")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-foreground">نام مالک</span>
                    <span className="text-muted-foreground">
                      {activeProperty.owner.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-foreground">مساحت</span>
                    <span className="text-muted-foreground">
                      {activeProperty.registration.map.area}
                    </span>
                  </div>
                </div>*/}
            </div>
            {mapRef.current?.mapLockExtent() && (
              <div className="absolute left-3 top-2 flex flex-col gap-2">
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-card/90 shadow-lg sm:h-9 sm:w-9"
                  onClick={() => mapRef.current?.zoomIn()}
                  title="بزرگ‌نمایی"
                >
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-card/90 shadow-lg sm:h-9 sm:w-9"
                  onClick={() => mapRef.current?.zoomOut()}
                  title="کوچک‌نمایی"
                >
                  <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-card/90 shadow-lg sm:h-9 sm:w-9"
                  onClick={() => mapRef.current?.goHome()}
                  title="بازگشت به نمای اصلی"
                >
                  <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-card/90 shadow-lg sm:h-9 sm:w-9"
                  onClick={() => mapRef.current?.toggleBasemap()}
                  title="تغییر نقشه زمینه"
                >
                  <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </div>
            )}
            {mapRef.current?.mapLockExtent() && (
              <div className="absolute right-3 top-12 flex flex-col gap-2">
                {/*<div className="absolute right-3 top-12 flex flex-col gap-2 sm:left-4 sm:top-12">*/}
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-card/90 shadow-lg sm:h-9 sm:w-9"
                  onClick={() => {
                    mapRef.current?.selectMelkByCodeNosazi(fullCode);
                  }}
                  title="موقعیت من"
                >
                  <MapPinHouse className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/90 shadow-lg sm:h-9 sm:w-9 hover:bg-destructive transition-colors"
                  onClick={() => mapRef.current?.clearGraphics()}
                  title="پاک کردن انتخاب"
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </div>
            )}
          </motion.article>
        </div>
      </main>
    </div>
  );
}
