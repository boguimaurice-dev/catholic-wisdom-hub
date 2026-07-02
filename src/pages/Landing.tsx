import { useEffect } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { LandingPricing } from "@/components/LandingPricing";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingTestimonials } from "@/components/landing/LandingTestimonials";
import { LandingCTA } from "@/components/landing/LandingCTA";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { prefetchWeek } from "@/lib/liturgyCache";

export default function Landing() {
  const { t, language } = useLanguage();

  // Prefetch the whole week of liturgy in the background so /liturgy works offline.
  useEffect(() => {
    const ctrl = new AbortController();
    prefetchWeek(language, 7, ctrl.signal);
    const onOnline = () => prefetchWeek(language, 7, ctrl.signal);
    window.addEventListener("online", onOnline);
    return () => { ctrl.abort(); window.removeEventListener("online", onOnline); };
  }, [language]);



  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingHeader />
      <LandingHero />
      <LandingFeatures />

      {/* Pricing */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/30 to-transparent" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-secondary text-sm font-semibold uppercase tracking-[0.2em] mb-3 block">
              ✦ Tarifs ✦
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold mb-5">
              {t("landing.pricingTitle")}
            </h2>
            <p className="text-muted-foreground text-lg mb-12 max-w-2xl mx-auto">
              {t("landing.pricingDesc")}
            </p>
            <LandingPricing />
          </motion.div>
        </div>
      </section>

      <LandingTestimonials />
      <LandingCTA />
      <LandingFooter />
    </div>
  );
}
