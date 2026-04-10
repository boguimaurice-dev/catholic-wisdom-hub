import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { BookOpen, Users, Shield, Mic, MessageCircle, Globe } from "lucide-react";

const featureKeys = [
  { icon: Users, key: "experts", color: "from-accent/15 to-accent/5" },
  { icon: BookOpen, key: "sources", color: "from-secondary/15 to-secondary/5" },
  { icon: Mic, key: "voice", color: "from-accent/15 to-accent/5" },
  { icon: Shield, key: "fidelity", color: "from-secondary/15 to-secondary/5" },
  { icon: MessageCircle, key: "chatbot", color: "from-accent/15 to-accent/5" },
  { icon: Globe, key: "accessible", color: "from-secondary/15 to-secondary/5" },
];

export function LandingFeatures() {
  const { t } = useLanguage();

  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/20 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/30 to-transparent" />
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-secondary text-sm font-semibold uppercase tracking-[0.2em] mb-3 block">
            ✦ {t("landing.featuresTitle")} ✦
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold mb-5">
            {t("landing.featuresTitle")}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            {t("landing.featuresDesc")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {featureKeys.map((feature, index) => (
            <motion.div
              key={feature.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
            >
              <Card className="h-full border-border/30 bg-card/80 backdrop-blur-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group overflow-hidden">
                <CardContent className="p-6 relative">
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${feature.color} rounded-bl-full opacity-50 group-hover:opacity-80 transition-opacity`} />
                  <div className="relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/15 to-secondary/10 flex items-center justify-center mb-5 shadow-sm group-hover:shadow-md transition-shadow">
                      <feature.icon className="h-7 w-7 text-accent" />
                    </div>
                    <h3 className="text-lg font-serif font-bold mb-2 text-foreground">
                      {t(`features.${feature.key}.title`)}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {t(`features.${feature.key}.desc`)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
