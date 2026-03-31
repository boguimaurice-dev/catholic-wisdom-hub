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
      className="mt-12 max-w-2xl mx-auto px-4"
    >
      <div className="flex items-center justify-center gap-2 mb-4">
        <HelpCircle className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-serif text-sm uppercase tracking-widest text-muted-foreground">
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
            <AccordionTrigger className="text-left text-sm font-serif text-foreground/90 hover:text-primary hover:no-underline py-3.5">
              {t(`faq.${key}`)}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
              {t(`faq.a${key.slice(1)}`)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </motion.div>
  );
}
