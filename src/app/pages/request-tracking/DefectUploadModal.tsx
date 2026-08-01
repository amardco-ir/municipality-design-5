import { useEffect, useState, type ChangeEvent, type DragEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  Check,
  FileText,
  LoaderCircle,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { apiFetch } from "../../data/api";
import {
  getApiErrorMessage,
  getApiValue,
  isApiSuccess,
  normalizeApiResponse,
  type ApiResponse,
} from "../../utils/apiResponseHandler";

interface LackDocumentItem {
  id: string;
  title: string;
  description: string;
  isDefense: boolean;
}

interface DefectUploadModalProps {
  isOpen: boolean;
  requestId: string;
  shop: string;
  codeN: string;
  codeNodeTree: string;
  onClose: () => void;
}

const textValue = (value: unknown) =>
  value === null || value === undefined ? "" : String(value).trim();

const firstText = (...values: unknown[]) =>
  values.map(textValue).find(Boolean) ?? "";

const numberValue = (value: unknown) => {
  const normalized = textValue(value)
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
  const match = normalized.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

const getList = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];

  const nested =
    value.Value ??
    value.value ??
    value.items ??
    value.Items ??
    value.data ??
    value.Data ??
    value.result ??
    value.Result;

  if (Array.isArray(nested)) return nested;
  if (nested && typeof nested === "object") return [nested];
  return [value];
};

const mapLackDocuments = (value: any): LackDocumentItem[] =>
  getList(value).map((item: any, index: number) => ({
    id: firstText(item.id, item.Id, item.code, item.Code, index + 1),
    title:
      firstText(
        item.title,
        item.Title,
        item.name,
        item.Name,
        item.documentTitle,
        item.DocumentTitle,
        item.madarek,
        item.Madarek,
        item.sharh,
        item.Sharh,
        item.tozihat,
        item.Tozihat,
      ) || `مدرک ${index + 1}`,
    description: firstText(
      item.description,
      item.Description,
      item.tozihat,
      item.Tozihat,
      item.comment,
      item.Comment,
    ),
    isDefense: Boolean(item.IsDefense ?? item.isDefense ?? item.defense),
  }));

const getDefectIsDefense = (value: any) => {
  const list = getList(value);
  const values = list.length ? list : [value];

  return values.some((item: any) => {
    if (typeof item === "boolean") return item;
    if (typeof item === "number") return item === 1;
    if (typeof item === "string") {
      const normalized = item.trim().toLowerCase();
      return normalized === "true" || normalized === "1" || normalized.includes("دفاع");
    }
    if (!item || typeof item !== "object") return false;

    return Boolean(
      item.IsDefense ??
        item.isDefense ??
        item.IsDefence ??
        item.isDefence ??
        item.defense ??
        item.defence ??
        item.isDefectDefense,
    );
  });
};

const getAuthHeaders = () => {
  const token = localStorage
    .getItem("auth-token")
    ?.trim()
    .replace(/^Bearer\s+/i, "");

  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const readResponse = async (response: Response, fallbackMessage: string) => {
  const raw = await response.json().catch(() => null);
  const data: ApiResponse = normalizeApiResponse(raw);

  if (!response.ok || !isApiSuccess(data)) {
    throw new Error(isApiSuccess(data) ? fallbackMessage : getApiErrorMessage(data));
  }

  return data;
};

const fileSize = (size: number) => {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} کیلوبایت`;
  return `${(size / (1024 * 1024)).toFixed(1)} مگابایت`;
};

export function DefectUploadModal({
  isOpen,
  requestId,
  shop,
  codeN,
  codeNodeTree,
  onClose,
}: DefectUploadModalProps) {
  const [documents, setDocuments] = useState<LackDocumentItem[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [defectIsDefense, setDefectIsDefense] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isLoadingDefect, setIsLoadingDefect] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [isUploaded, setIsUploaded] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setDocuments([]);
    setSelectedDocumentId("");
    setDefectIsDefense(false);
    setFiles([]);
    setError("");
    setIsUploaded(false);

    const shod = numberValue(requestId);
    if (!shod) {
      setError("شماره درخواست برای دریافت کسری مدارک معتبر نیست.");
      return;
    }

    let isActive = true;
    const fetchDocuments = async () => {
      setIsLoadingDocuments(true);
      try {
        const response = await apiFetch(
          `/api/request/Lack?shod=${encodeURIComponent(String(shod))}`,
          { method: "GET", headers: getAuthHeaders() },
        );
        const data = await readResponse(response, "خطا در دریافت کسری مدارک.");
        if (isActive) setDocuments(mapLackDocuments(getApiValue(data)));
      } catch (loadError) {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "خطا در دریافت کسری مدارک.",
          );
        }
      } finally {
        if (isActive) setIsLoadingDocuments(false);
      }
    };

    void fetchDocuments();
    return () => {
      isActive = false;
    };
  }, [isOpen, requestId]);

  const handleDocumentSelect = async (documentId: string) => {
    setSelectedDocumentId(documentId);
    setDefectIsDefense(false);
    setError("");

    const id = numberValue(documentId);
    if (!id) return;

    setIsLoadingDefect(true);
    try {
      const response = await apiFetch(
        `/api/request/Defect?id=${encodeURIComponent(String(id))}`,
        { method: "GET", headers: getAuthHeaders() },
      );
      const data = await readResponse(response, "خطا در دریافت وضعیت نقص مدارک.");
      setDefectIsDefense(getDefectIsDefense(getApiValue(data)));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "خطا در دریافت وضعیت نقص مدارک.",
      );
    } finally {
      setIsLoadingDefect(false);
    }
  };

  const addFiles = (fileList: FileList | File[]) => {
    setFiles((current) => [...current, ...Array.from(fileList)]);
    setError("");
    setIsUploaded(false);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) addFiles(event.target.files);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
  };

  const handleUpload = async () => {
    const shod = numberValue(requestId);
    const shopNumber = numberValue(shop);

    if (files.length === 0) {
      setError("لطفاً حداقل یک فایل برای آپلود انتخاب کنید.");
      return;
    }
    if (!shod || !shopNumber || !codeN.trim() || !codeNodeTree.trim()) {
      setError("اطلاعات پرونده برای آپلود مدارک کامل نیست.");
      return;
    }

    setError("");
    setIsUploading(true);
    try {
      const isDefense =
        defectIsDefense || documents.some((document) => document.isDefense);

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("Shop", String(shopNumber));
        formData.append("Shod", String(shod));
        formData.append("CodeN", codeN);
        formData.append("CodeNodeTree", codeNodeTree);
        formData.append("IsDefense", String(isDefense));

        const response = await apiFetch("/api/archive/upload", {
          method: "POST",
          headers: getAuthHeaders(),
          body: formData,
        });
        await readResponse(response, "خطا در آپلود مدارک.");
      }

      setFiles([]);
      setIsUploaded(true);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "خطا در آپلود مدارک.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            dir="rtl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/70 bg-card px-4 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-2">
                <Upload className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <h2 className="text-sm font-bold">آپلود کسری مدارک</h2>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    درخواست شماره <bdi dir="ltr">{requestId}</bdi>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="بستن"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-4 sm:p-5">
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xs font-bold text-foreground">کسری مدارک</h3>
                  {isLoadingDocuments && (
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      در حال دریافت
                    </span>
                  )}
                </div>

                {!isLoadingDocuments && documents.length === 0 && !error && (
                  <p className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                    کسری مدرکی برای این درخواست اعلام نشده است.
                  </p>
                )}

                <div className="grid gap-2 sm:grid-cols-2">
                  {documents.map((document) => (
                    <label
                      key={document.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-xs transition-colors ${
                        selectedDocumentId === document.id
                          ? "border-primary/60 bg-primary/5"
                          : "border-border/70 bg-card hover:border-primary/35"
                      }`}
                    >
                      <input
                        type="radio"
                        name="lack-document"
                        checked={selectedDocumentId === document.id}
                        onChange={() => void handleDocumentSelect(document.id)}
                        className="mt-0.5 h-4 w-4 accent-primary"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-foreground">
                          {document.title}
                        </span>
                        {document.description && (
                          <span className="mt-1 block leading-5 text-muted-foreground">
                            {document.description}
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>

                {selectedDocumentId && (
                  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    {isLoadingDefect ? (
                      <>
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        در حال بررسی وضعیت نقص مدرک...
                      </>
                    ) : (
                      <>وضعیت مدرک: {defectIsDefense ? "دفاعی" : "عادی"}</>
                    )}
                  </p>
                )}
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-bold text-foreground">فایل‌های مدارک</h3>
                <label
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-border/70 hover:border-primary/40 hover:bg-muted/20"
                  }`}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      فایل‌ها را اینجا رها کنید یا برای انتخاب کلیک کنید
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      امکان انتخاب چند فایل وجود دارد
                    </p>
                  </div>
                  <input type="file" multiple className="hidden" onChange={handleFileChange} />
                </label>

                {files.length > 0 && (
                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <div
                        key={`${file.name}-${file.lastModified}-${index}`}
                        className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/15 px-3 py-2.5"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-foreground">
                            {file.name}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {fileSize(file.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setFiles((current) =>
                              current.filter((_, fileIndex) => fileIndex !== index),
                            )
                          }
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-destructive transition-colors hover:bg-destructive/10"
                          aria-label={`حذف ${file.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {error && (
                <p className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs leading-6 text-destructive">
                  <AlertCircle className="mt-1 h-3.5 w-3.5 shrink-0" />
                  {error}
                </p>
              )}

              {isUploaded && (
                <p className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <Check className="h-4 w-4" />
                  مدارک با موفقیت آپلود شدند.
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isUploading}
                  className="h-10 rounded-xl border border-border bg-card px-5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
                >
                  بستن
                </button>
                <button
                  type="button"
                  onClick={() => void handleUpload()}
                  disabled={isUploading || isLoadingDefect}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUploading ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {isUploading ? "در حال آپلود..." : "آپلود مدارک"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
