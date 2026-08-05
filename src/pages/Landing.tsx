import { useEffect } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { LandingPricing } from "@/components/LandingPricing";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingUseCases } from "@/components/landing/LandingUseCases";
import { LandingCTA } from "@/components/landing/LandingCTA";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { prefetchWeek } from "@/lib/liturgyCache";
import { Seo } from "@/components/Seo";

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
      <Seo
        title="Scriptorium — Assistant de recherche théologique catholique"
        description="Explorez la Bible, le Catéchisme et la Patristique avec Scriptorium, l'assistant IA fidèle au Magistère et ses 8 chaires théologiques virtuelles."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: ["q1", "q2", "q3", "q4", "q5"].map((k) => ({
            "@type": "Question",
            name: t(`faq.${k}`),
            acceptedAnswer: { "@type": "Answer", text: t(`faq.a${k.slice(1)}`) },
          })),
        }}
      />
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
            <p className="mt-8 text-sm text-muted-foreground/80 max-w-xl mx-auto">
              {t("landing.pricingInstitutionalPre")}
              <a
                href="mailto:scriptorium@mbbm.tech?subject=Demande d'offre institutionnelle - Scriptorium"
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary underline underline-offset-4 decoration-secondary/50 hover:decoration-secondary transition-colors"
              >
                {t("landing.pricingInstitutionalLink")}
              </a>
              {t("landing.pricingInstitutionalPost")}
            </p>

          </motion.div>
        </div>
      </section>

      <LandingUseCases />
      <LandingCTA />
      <LandingFooter />
    </div>
  );
}
