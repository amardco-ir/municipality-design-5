import { AnimatePresence, motion } from "motion/react";
import {
  Layers,
  Loader2,
  LockKeyhole,
  MapPinned,
  Printer,
  RefreshCw,
  Route,
  Save,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  emptyMapSettings,
  fetchMapSettings,
  saveMapSettings,
  type MapSettings,
} from "../../data/adminMaps";

type Message = { type: "success" | "error"; text: string } | null;

const inputClass =
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-colors focus:border-primary placeholder:text-muted-foreground/50";

function Field({
  label,
  children,
  span,
}: {
  label: string;
  children: ReactNode;
  span?: "full";
}) {
  return (
    <label
      className={`flex min-w-0 flex-col gap-1.5 ${
        span === "full" ? "md:col-span-2" : ""
      }`}
    >
      <span className="text-[11px] font-bold text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function MessageLine({ message }: { message: Message }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.p
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          className={`text-xs font-medium ${
            message.type === "error" ? "text-destructive" : "text-emerald-600"
          }`}
        >
          {message.text}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

function CurrentSettingsTable({
  rows,
  isLoading,
}: {
  rows: { label: string; value: string | boolean | undefined }[];
  isLoading: boolean;
}) {
  const hasValue = rows.some(
    (row) =>
      row.value !== null && row.value !== undefined && String(row.value) !== "",
  );

  return (
    <div className="rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <MapPinned className="h-4 w-4 text-primary" />
        </div>
        <span className="font-bold text-foreground">اطلاعات فعلی نقشه</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !hasValue ? (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
          اطلاعاتی برای تنظیمات نقشه دریافت نشد.
        </div>
      ) : (
        <div className="responsive-table-shell p-3 sm:p-5">
          <table className="w-full min-w-[520px] border-separate border-spacing-0 overflow-hidden rounded-xl border border-border text-sm">
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-border last:border-b-0">
                  <th className="w-48 border-b border-border bg-muted/60 px-4 py-3 text-right text-xs font-bold text-muted-foreground last:border-b-0">
                    {row.label}
                  </th>
                  <td
                    className="border-b border-border px-4 py-3 text-left font-mono text-xs text-foreground last:border-b-0"
                    dir="ltr"
                  >
                    <span className="block max-w-3xl break-all">
                      {typeof row.value === "boolean"
                        ? row.value
                          ? "true"
                          : "false"
                        : row.value || "-"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AdminMapSettingsPage() {
  const [form, setForm] = useState<MapSettings>(emptyMapSettings);
  const [currentSettings, setCurrentSettings] =
    useState<MapSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const loadSettings = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    try {
      const settings = await fetchMapSettings(signal);
      setCurrentSettings(settings);
      setForm(settings);
      setMessage(null);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "دریافت تنظیمات نقشه ناموفق بود.",
      });
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadSettings(controller.signal);
    return () => controller.abort();
  }, [loadSettings]);

  const updateForm = <Key extends keyof MapSettings>(
    key: Key,
    value: MapSettings[Key],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const payload: MapSettings = {
        customBaseMapUrl: form.customBaseMapUrl.trim(),
        melkLayerUrl: form.melkLayerUrl.trim(),
        geometryServiceAddress: form.geometryServiceAddress.trim(),
        printServiceAddress: form.printServiceAddress.trim(),
        arseLayerId: form.arseLayerId.trim(),
        lockExtent: form.lockExtent,
      };
      await saveMapSettings(payload);
      setMessage({
        type: "success",
        text: "تنظیمات نقشه با موفقیت ذخیره شد.",
      });
      await loadSettings();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "ذخیره تنظیمات نقشه ناموفق بود.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">تنظیمات نقشه</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            آدرس نقشه پایه، لایه ملک، سرویس‌های هندسه و چاپ و شناسه لایه عرصه را مدیریت کنید.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadSettings()}
          disabled={isLoading}
          className="inline-flex h-10 w-fit items-center gap-2 rounded-xl border border-border px-4 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          بروزرسانی
        </button>
      </div>

      <CurrentSettingsTable
        isLoading={isLoading}
        rows={[
          {
            label: "آدرس نقشه پایه اختصاصی",
            value: currentSettings?.customBaseMapUrl,
          },
          { label: "آدرس لایه ملک", value: currentSettings?.melkLayerUrl },
          {
            label: "آدرس سرویس هندسه",
            value: currentSettings?.geometryServiceAddress,
          },
          {
            label: "آدرس سرویس چاپ",
            value: currentSettings?.printServiceAddress,
          },
          { label: "شناسه لایه عرصه", value: currentSettings?.arseLayerId },
          { label: "قفل محدوده نقشه", value: currentSettings?.lockExtent },
        ]}
      />

      <div className="rounded-2xl border border-border/70 bg-card shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <MapPinned className="h-4 w-4 text-primary" />
          </div>
          <span className="font-bold text-foreground">ثبت تنظیمات نقشه</span>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="آدرس نقشه پایه اختصاصی" span="full">
              <div className="relative">
                <MapPinned className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={form.customBaseMapUrl}
                  onChange={(event) =>
                    updateForm("customBaseMapUrl", event.target.value)
                  }
                  className={`${inputClass} pr-10`}
                  dir="ltr"
                />
              </div>
            </Field>
            <Field label="آدرس لایه ملک" span="full">
              <div className="relative">
                <Layers className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={form.melkLayerUrl}
                  onChange={(event) =>
                    updateForm("melkLayerUrl", event.target.value)
                  }
                  className={`${inputClass} pr-10`}
                  dir="ltr"
                />
              </div>
            </Field>
            <Field label="آدرس سرویس هندسه" span="full">
              <div className="relative">
                <Route className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={form.geometryServiceAddress}
                  onChange={(event) =>
                    updateForm("geometryServiceAddress", event.target.value)
                  }
                  className={`${inputClass} pr-10`}
                  dir="ltr"
                />
              </div>
            </Field>
            <Field label="آدرس سرویس چاپ" span="full">
              <div className="relative">
                <Printer className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={form.printServiceAddress}
                  onChange={(event) =>
                    updateForm("printServiceAddress", event.target.value)
                  }
                  className={`${inputClass} pr-10`}
                  dir="ltr"
                />
              </div>
            </Field>
            <Field label="شناسه لایه عرصه">
              <div className="relative">
                <Layers className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={form.arseLayerId}
                  onChange={(event) =>
                    updateForm("arseLayerId", event.target.value)
                  }
                  className={`${inputClass} pr-10`}
                  dir="ltr"
                />
              </div>
            </Field>
            <Field label="قفل محدوده نقشه">
              <button
                type="button"
                onClick={() => updateForm("lockExtent", !form.lockExtent)}
                className={`flex h-11 w-full items-center justify-between rounded-xl border px-3.5 text-sm font-bold transition-colors ${
                  form.lockExtent
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground"
                }`}
                aria-pressed={form.lockExtent}
              >
                <span className="flex items-center gap-2">
                  <LockKeyhole className="h-4 w-4" />
                  {form.lockExtent ? "قفل است" : "قفل نیست"}
                </span>
                <span
                  className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                    form.lockExtent ? "bg-primary" : "bg-muted-foreground/30"
                  } ${form.lockExtent ? "justify-end" : "justify-start"}`}
                  dir="ltr"
                >
                  <span
                    className={`h-5 w-5 rounded-full bg-white shadow-sm transition-colors ${
                      form.lockExtent ? "shadow-primary/20" : "shadow-black/10"
                    }`}
                  />
                </span>
              </button>
            </Field>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              ذخیره تنظیمات
            </button>
            <MessageLine message={message} />
          </div>
        </form>
      </div>
    </div>
  );
}
