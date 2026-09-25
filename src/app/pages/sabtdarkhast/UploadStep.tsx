import { useState, type ChangeEvent } from "react";
import {
  AlertCircle,
  Check,
  ClipboardList,
  FileText,
  ImageIcon,
  Trash2,
  Upload,
} from "lucide-react";
import { motion } from "motion/react";

interface UploadStepProps {
  onBack: () => void;
  onSubmit: (documents: UploadDocuments) => void;
  uploadError: string;
  isSubmitting: boolean;
}

export interface UploadDocuments {
  nationalCard: File | null;
  propertyDeed: File | null;
  otherFiles: File[];
}

interface SelectedUploadFile {
  file: File;
  name: string;
  size: string;
  preview?: string;
}

const mapFilesForUpload = (fileList: FileList | File[]) =>
  Array.from(fileList).map((file) => ({
    file,
    name: file.name,
    size: `${(file.size / 1024).toFixed(0)} KB`,
    preview: file.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : undefined,
  }));

const mapFileForUpload = (file: File) => mapFilesForUpload([file])[0];

export function UploadStep({
  onBack,
  onSubmit,
  uploadError,
  isSubmitting,
}: UploadStepProps) {
  const [files, setFiles] = useState<SelectedUploadFile[]>([]);
  const [nationalCard, setNationalCard] =
    useState<SelectedUploadFile | null>(null);
  const [propertyDeed, setPropertyDeed] =
    useState<SelectedUploadFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [requiredDocumentsError, setRequiredDocumentsError] = useState("");

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setFiles((prev) => [...prev, ...mapFilesForUpload(e.target.files)]);
  };

  const removeFile = (i: number) =>
    setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = () => {
    const missingDocuments = [
      !nationalCard && "کارت ملی",
      !propertyDeed && "سند ملک",
    ].filter(Boolean);

    if (missingDocuments.length > 0) {
      setRequiredDocumentsError(
        `بارگذاری ${missingDocuments.join(" و ")} الزامی است.`,
      );
      return;
    }

    setRequiredDocumentsError("");
    onSubmit({
      nationalCard: nationalCard?.file ?? null,
      propertyDeed: propertyDeed?.file ?? null,
      otherFiles: files.map((file) => file.file),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      className="space-y-5"
    >
      <motion.article className="soft-card mesh-panel">
        <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
          <ClipboardList className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold">مدارک مورد نیاز</h2>
        </div>
        <div className="p-4">
          <p className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm leading-7 text-foreground">
            بارگذاری کارت ملی و سند ملک برای ثبت نهایی درخواست الزامی است.
          </p>
        </div>
      </motion.article>

      <motion.article className="soft-card mesh-panel">
        <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
          <Upload className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold">آپلود مدارک</h2>
        </div>
        <div className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label
              className={`flex cursor-pointer flex-col gap-3 rounded-2xl border p-4 transition-colors hover:bg-muted/30 ${
                requiredDocumentsError && !nationalCard
                  ? "border-destructive/70"
                  : "border-border/60"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-foreground">
                  کارت ملی <span className="text-destructive">*</span>
                </span>
                <span className="text-[10px] text-muted-foreground">
                  تصویر یا PDF
                </span>
              </div>
              {nationalCard ? (
                <div className="flex items-center gap-2 rounded-xl bg-primary/5 p-3">
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate text-xs">
                    {nationalCard.name}
                  </span>
                  <button
                    type="button"
                    aria-label="حذف کارت ملی"
                    onClick={(event) => {
                      event.preventDefault();
                      setNationalCard(null);
                    }}
                    className="rounded-lg p-1.5 text-destructive/60 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <span className="rounded-xl border border-dashed border-border/70 px-3 py-4 text-center text-xs text-muted-foreground">
                  برای انتخاب فایل کلیک کنید
                </span>
              )}
              <input
                type="file"
                required
                accept="image/*,.pdf"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setNationalCard(mapFileForUpload(file));
                  setRequiredDocumentsError("");
                  event.target.value = "";
                }}
              />
            </label>

            <label
              className={`flex cursor-pointer flex-col gap-3 rounded-2xl border p-4 transition-colors hover:bg-muted/30 ${
                requiredDocumentsError && !propertyDeed
                  ? "border-destructive/70"
                  : "border-border/60"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-foreground">
                  سند ملک <span className="text-destructive">*</span>
                </span>
                <span className="text-[10px] text-muted-foreground">
                  تصویر یا PDF
                </span>
              </div>
              {propertyDeed ? (
                <div className="flex items-center gap-2 rounded-xl bg-primary/5 p-3">
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate text-xs">
                    {propertyDeed.name}
                  </span>
                  <button
                    type="button"
                    aria-label="حذف سند ملک"
                    onClick={(event) => {
                      event.preventDefault();
                      setPropertyDeed(null);
                    }}
                    className="rounded-lg p-1.5 text-destructive/60 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <span className="rounded-xl border border-dashed border-border/70 px-3 py-4 text-center text-xs text-muted-foreground">
                  برای انتخاب فایل کلیک کنید
                </span>
              )}
              <input
                type="file"
                required
                accept="image/*,.pdf"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setPropertyDeed(mapFileForUpload(file));
                  setRequiredDocumentsError("");
                  event.target.value = "";
                }}
              />
            </label>
          </div>

          <div className="pt-1 text-xs font-semibold text-foreground">
            سایر مدارک (اختیاری)
          </div>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              setFiles((prev) => [
                ...prev,
                ...mapFilesForUpload(e.dataTransfer.files),
              ]);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 transition-all sm:p-8 ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border/50 hover:border-primary/40 hover:bg-muted/30"
            }`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 sm:h-12 sm:w-12">
              <ImageIcon className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">
                فایل را اینجا رها کنید
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                یا کلیک کنید برای انتخاب
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground/60">
                PNG، JPG، PDF - حداکثر ۱۰ مگابایت
              </p>
            </div>
            <input
              type="file"
              multiple
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          {(requiredDocumentsError || uploadError) && (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              {requiredDocumentsError || uploadError}
            </p>
          )}

          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file, i) => (
                <motion.div
                  key={`${file.name}-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 p-3"
                >
                  {file.preview ? (
                    <img
                      src={file.preview}
                      alt=""
                      className="h-10 w-10 flex-shrink-0 rounded-lg border border-border/50 object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">
                      {file.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {file.size}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="flex-shrink-0 rounded-lg p-1.5 text-destructive/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.article>

      <div className="flex flex-col items-stretch justify-start gap-3 pt-2 sm:flex-row sm:items-center">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="rounded-xl bg-emerald-600 px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="flex items-center justify-center gap-2">
            <Check className="h-4 w-4" />
            {isSubmitting ? "در حال ارسال..." : "ثبت نهایی"}
          </span>
        </button>
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="rounded-xl border border-border/60 bg-card px-6 py-2.5 text-sm font-semibold text-foreground transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          بازگشت
        </button>
      </div>
    </motion.div>
  );
}
