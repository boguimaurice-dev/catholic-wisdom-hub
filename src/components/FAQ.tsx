import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLanguage } from "@/contexts/LanguageContext";

const FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5"];

export function FAQ() {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mx-auto mt-10 w-full max-w-2xl px-0 sm:mt-12 sm:px-4"
    >
      <div className="flex items-center justify-center gap-2 mb-4">
        <HelpCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
        <h3 className="font-serif text-sm font-semibold uppercase tracking-widest text-muted-foreground sm:text-base">
          {t("faq.title")}
        </h3>
      </div>
      <div className="ornament" />
      <Accordion type="single" collapsible className="w-full">
        {FAQ_KEYS.map((key, idx) => (
          <AccordionItem
            key={idx}
            value={`faq-${idx}`}
            className="border-b border-border/50"
          >
            <AccordionTrigger className="min-h-12 py-3.5 text-left text-base font-serif leading-relaxed text-foreground/90 hover:text-primary hover:no-underline sm:text-sm">
              {t(`faq.${key}`)}
            </AccordionTrigger>
            <AccordionContent className="pb-4 text-base leading-relaxed text-muted-foreground sm:text-sm">
              {t(`faq.a${key.slice(1)}`)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </motion.div>
  );
}
