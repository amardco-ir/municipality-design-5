import { useEffect, useState } from "react";
import {
  Facebook,
  Instagram,
  Mail,
  Mailbox,
  MapPin,
  Phone,
  Twitter,
} from "lucide-react";
import { Link } from "react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { useAuthModal } from "./AuthContext";
import { serviceItems } from "../data/services";
import {
  emptySiteInformation,
  fetchFooterInformation,
  resolveInformationImageSrc,
  type SiteInformation,
} from "../data/siteInformation";

const fallbackLogoSrc = "/images/Amard Logo 01.JPG";
const fallbackEnamadLogoSrc =
  "https://trustseal.enamad.ir/logo.aspx?id=585219&Code=VUanmSEzsP0cIy8f9V0c55elh5bdyxC7";

const fallbackFooterInformation: SiteInformation = {
  ...emptySiteInformation,
  title: "شرکت آمارد",
  tel: "011-43270941-3",
  email: "info@amardco.com",
  address: "مازندران، آمل، بلوار آزادگان، نبش آزادگان 12، ساختمان آمارد",
  postalCode: "4613673420",
  description:
    "شرکت نرم افزاری تحلیلگران آمارد با هدف فعالیت در زمینه طراحی و تولید نرم افزار بنیان گذاشته شد و طراحی و تولید نرم افزارهای کاربردی را به عنوان فعالیت اصلی خود دنبال نموده است.",
};

export function Footer() {
  const [information, setInformation] = useState<SiteInformation>(
    fallbackFooterInformation,
  );

  const { isAuthenticated, setIsLoginModalOpen } = useAuthModal();
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setInformation(fallbackFooterInformation);
      return undefined;
    }

    const controller = new AbortController();

    fetchFooterInformation(controller.signal)
      .then((data) => {
        setInformation({
          ...fallbackFooterInformation,
          ...data,
          title: data.title || fallbackFooterInformation.title,
          logo: data.logo ?? null,
        });
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [isAuthenticated]);

  const footerLinks = {
    support: [
      { label: "راهنما", href: "/guide" },
      { label: "سوالات متداول", href: "/faq" },
      { label: "پشتیبانی", href: "/support" },
      { label: "تماس با ما", href: "/contact" },
    ],
  };

  const visibleInformation = isAuthenticated
    ? information
    : fallbackFooterInformation;
  const logoSrc = resolveInformationImageSrc(
    visibleInformation.logo,
    fallbackLogoSrc,
  );
  const enamadValue = visibleInformation.enamad?.trim() ?? fallbackEnamadLogoSrc;

  useEffect(() => {
    console.log("Enamad data:", {
      raw: visibleInformation.enamad,
      trimmed: enamadValue,
      length: enamadValue.length,
      isHTML: /<\s*(a|img|script|iframe|div|span)\b/i.test(enamadValue),
    });
  }, [visibleInformation.enamad, enamadValue]);

  const isEnamadMarkup = /<\s*(a|img|script|iframe|div|span)\b/i.test(
    enamadValue,
  );
  const enamadSrc = !isEnamadMarkup
    ? resolveInformationImageSrc(enamadValue, fallbackEnamadLogoSrc)
    : "";

  return (
    <footer
      id="contact"
      className="relative overflow-hidden bg-[#0d1f24] text-white"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(67,150,182,0.18),transparent_36%)]" />
      <div className="container relative z-10 mx-auto px-4 py-12 md:px-6 md:py-16 lg:px-8">
        <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12 lg:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden p-2">
                <img
                  src={logoSrc}
                  alt={visibleInformation.title}
                  className="h-full w-full object-contain"
                />
              </div>
              <h3 className="text-base font-bold leading-7">
                {visibleInformation.title}
              </h3>
            </div>
            <p className="mb-6 text-sm leading-7 text-white/90">
              {visibleInformation.description}
            </p>
            <div className="flex items-center gap-3">
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/12 transition-colors hover:bg-white/20"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/12 transition-colors hover:bg-white/20"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/12 transition-colors hover:bg-white/20"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-bold md:mb-6">خدمات</h4>
            <ul className="space-y-3">
              {serviceItems.map((service) => (
                <li key={service.title}>
                  <Link
                    to={service.href}
                    className="text-sm text-white/85 transition-colors hover:text-white"
                    onClick={(e) => {
                      if (!isAuthenticated) {
                        e.preventDefault();
                        setIsAuthPromptOpen(true);
                      }
                    }}
                  >
                    {service.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-bold md:mb-6">پشتیبانی</h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-white/85 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-bold md:mb-6">ارتباط با ما</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="text-sm text-white/90" dir="ltr">
                  {visibleInformation.tel}
                </p>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="text-sm text-white/90">
                  {visibleInformation.email}
                </p>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm leading-7 text-white/90">
                    {visibleInformation.address}
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Mailbox className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="text-sm text-white/90" dir="ltr">
                  {visibleInformation.postalCode}
                </p>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8">
          <div className="flex flex-col-reverse items-center justify-between gap-6 md:flex-row">
            <div className="flex w-full flex-col items-center gap-4 md:w-auto md:items-start">
              <div className="flex min-h-[88px] w-full max-w-[180px] items-center justify-center rounded-xl border border-white/24 bg-white p-3 shadow-xl shadow-black/15">
                {isEnamadMarkup ? (
                  <div
                    className="flex w-full items-center justify-center overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: enamadValue }}
                  />
                ) : (
                  <img
                    src={enamadSrc}
                    alt="نماد اعتماد الکترونیکی"
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                )}
              </div>
            </div>

            <div className="flex flex-1 flex-col items-center gap-4 md:items-end">
              <p className="text-center text-sm text-white/80 md:text-right">
                © 1405 {visibleInformation.title}. تمامی حقوق محفوظ است.
              </p>
              <p className="text-center text-sm text-white/80 md:text-right">
                طراحی شده توسط شرکت تحلیلگران آمارد
              </p>
            </div>
          </div>
        </div>
      </div>
      {isAuthPromptOpen && (
        <Dialog open={isAuthPromptOpen} onOpenChange={setIsAuthPromptOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>برای وارد شدن ابتدا لاگین کنید</DialogTitle>
            </DialogHeader>
            <DialogDescription>
              برای استفاده از این خدمت باید ابتدا وارد حساب کاربری خود شوید.
            </DialogDescription>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setIsAuthPromptOpen(false)}
                className="rounded-xl px-4 py-2 text-sm bg-white/6"
              >
                بستن
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAuthPromptOpen(false);
                  setIsLoginModalOpen(true);
                }}
                className="btn-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                ورود
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </footer>
  );
}
