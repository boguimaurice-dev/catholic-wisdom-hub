import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChevronRight, Heart } from "lucide-react";

export function LandingCTA() {
  const { t } = useLanguage();

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/8 via-secondary/5 to-accent/8" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-secondary/5 blur-3xl" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-3xl mx-auto text-center relative z-10"
      >
        <Heart className="h-10 w-10 mx-auto mb-6 text-accent/60" />
        <h2 className="text-3xl sm:text-4xl font-serif font-bold mb-5">
          {t("landing.ctaTitle") || "Prêt à approfondir votre foi ?"}
        </h2>
        <p className="text-muted-foreground text-lg mb-10 leading-relaxed max-w-xl mx-auto">
          {t("landing.ctaDesc") || "Rejoignez des milliers de fidèles qui explorent la richesse de l'enseignement catholique."}
        </p>
        <Link to="/auth">
          <Button size="lg" className="text-base px-12 py-7 gap-2 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 rounded-xl">
            {t("landing.startFree")}
            <ChevronRight className="h-5 w-5" />
          </Button>
        </Link>
      </motion.div>
    </section>
  );
}
