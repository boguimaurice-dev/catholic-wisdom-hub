import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { Star, Quote } from "lucide-react";

const testimonialKeys = ["t1", "t2", "t3", "t4"];
const testimonialRatings = [5, 5, 5, 4];

export function LandingTestimonials() {
  const { t } = useLanguage();

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-secondary text-sm font-semibold uppercase tracking-[0.2em] mb-3 block">
            ✦ Témoignages ✦
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold mb-5">
            {t("landing.testimonialsTitle")}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t("landing.testimonialsDesc")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testimonialKeys.map((key, index) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full border-border/30 bg-card/80 backdrop-blur-sm hover:shadow-lg transition-all group">
                <CardContent className="p-7 relative">
                  <Quote className="absolute top-5 right-5 h-8 w-8 text-secondary/15 group-hover:text-secondary/25 transition-colors" />
                  <div className="flex items-center gap-1 mb-5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < testimonialRatings[index] ? "text-secondary fill-secondary" : "text-muted/40"}`}
                      />
                    ))}
                  </div>
                  <p className="text-foreground mb-6 leading-relaxed italic text-[15px]">
                    « {t(`testimonials.${key}.text`)} »
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent/20 to-secondary/20 flex items-center justify-center text-accent font-serif font-bold text-sm">
                      {(t(`testimonials.${key}.name`) as string)?.charAt(0) || "?"}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-foreground">{t(`testimonials.${key}.name`)}</div>
                      <div className="text-muted-foreground text-xs">{t(`testimonials.${key}.role`)}</div>
                    </div>
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
