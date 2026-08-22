import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Phone, Mail, MapPin, ExternalLink } from "lucide-react";
import {
  emptySiteInformation,
  fetchFooterInformation,
  type SiteInformation,
} from "../data/siteInformation";

const fallbackQuickAccessInformation: SiteInformation = {
  ...emptySiteInformation,
  tel: "04137217266",
  email: "faroghghoddossi@gmail.com",
  address: "شهرداری مراغه میدان شهرداری",
};

const buildQuickLinks = (information: SiteInformation) => [
  {
    icon: Phone,
    title: "پشتیبانی تلفنی",
    description: information.tel || fallbackQuickAccessInformation.tel,
    color: "from-primary to-secondary",
    action: "تماس",
  },
  {
    icon: Mail,
    title: "ایمیل پشتیبانی",
    description: information.email || fallbackQuickAccessInformation.email,
    color: "from-primary/90 to-secondary/90",
    action: "ارسال ایمیل",
  },
  {
    icon: MapPin,
    title: "آدرس شهرداری",
    description: information.address || fallbackQuickAccessInformation.address,
    color: "from-secondary/90 to-primary/90",
    action: "مسیریابی",
  },
];

export function QuickAccessSection() {
  const [information, setInformation] = useState<SiteInformation>(
    fallbackQuickAccessInformation,
  );
  const quickLinks = buildQuickLinks(information);

  useEffect(() => {
    const controller = new AbortController();

    fetchFooterInformation(controller.signal)
      .then((data) => {
        setInformation({
          ...fallbackQuickAccessInformation,
          ...data,
        });
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  return (
    <section className="py-12 md:py-20">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 md:mb-16"
        >
          <span className="section-chip mb-3">ارتباط مستقیم</span>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-foreground mb-3 md:mb-4">
            دسترسی سریع
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto px-4">
            سریع‌ترین مسیرهای ارتباطی برای دریافت راهنمایی و خدمات پشتیبانی
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {quickLinks.map((link, index) => (
            <motion.div
              key={link.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="group"
            >
              <div className="soft-card soft-card-hover h-full p-5 md:p-6 relative overflow-hidden">
                <div
                  className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-l ${link.color}`}
                />
                <div
                  className={`absolute -bottom-16 -left-14 w-28 h-28 rounded-full bg-gradient-to-br ${link.color} opacity-20 blur-2xl`}
                />

                <div className="relative z-10">
                  <div
                    className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br ${link.color} flex items-center justify-center mb-4 shadow-lg`}
                  >
                    <link.icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
                  </div>

                  <h3 className="text-base md:text-lg font-bold text-foreground mb-2">
                    {link.title}
                  </h3>
                  <p className="text-xs md:text-sm text-muted-foreground mb-4 leading-relaxed">
                    {link.description}
                  </p>

                  <div className="flex items-center gap-2 text-primary">
                    <span className="text-sm font-semibold">{link.action}</span>
                    <ExternalLink className="w-4 h-4 transition-transform group-hover:-translate-y-0.5 group-hover:-translate-x-0.5" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
