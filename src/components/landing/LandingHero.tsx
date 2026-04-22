import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChevronRight, BookOpen, Users, Shield } from "lucide-react";

export function LandingHero() {
  const { t } = useLanguage();

  return (
    <section className="pt-28 pb-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-gradient-to-b from-secondary/8 via-accent/3 to-transparent" />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-secondary/5 blur-3xl" />
      <div className="absolute top-40 right-0 w-64 h-64 rounded-full bg-accent/5 blur-3xl" />

      <div className="max-w-5xl mx-auto text-center relative z-10">
        {/* Ornamental cross */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8 flex justify-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-secondary/20 flex items-center justify-center shadow-lg shadow-accent/10">
            <span className="text-3xl text-accent">✦</span>
          </div>
        </motion.div>

        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-serif font-bold leading-[1.1] mb-6 tracking-tight">
          {t("landing.heroTitle1")}{" "}
          <span className="text-accent relative">
            {t("landing.heroTitle2")}
            <svg className="absolute -bottom-2 left-0 w-full h-3 text-secondary/40" viewBox="0 0 200 12" fill="none">
              <path d="M2 10C50 2 150 2 198 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </span>{" "}
          {t("landing.heroTitle3")}
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
          {t("landing.heroDesc")}
        </p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <Link to="/auth">
            <Button size="lg" className="text-base px-10 py-7 gap-2 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 rounded-xl">
              {t("landing.startFree")}
              <ChevronRight className="h-5 w-5" />
            </Button>
          </Link>
          <a href="#features">
            <Button variant="outline" size="lg" className="text-base px-10 py-7 rounded-xl border-border/60">
              {t("landing.discoverFeatures")}
            </Button>
          </a>
        </motion.div>

        {/* Stats with cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="grid grid-cols-3 gap-4 sm:gap-6 max-w-3xl mx-auto"
        >
          {[
            { value: "8", label: t("landing.expertsAI"), icon: Users },
            { value: "2000+", label: t("landing.yearsDoctrine"), icon: BookOpen },
            { value: "24/7", label: t("landing.availability"), icon: Shield },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              whileHover={{ y: -4 }}
              className="bg-card/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-border/30 shadow-sm hover:shadow-md transition-all"
            >
              <stat.icon className="h-5 w-5 text-secondary mx-auto mb-2 opacity-70" />
              <div className="text-2xl sm:text-3xl font-serif font-bold text-accent">{stat.value}</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
