import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_ITEMS = [
  {
    q: "Qu'est-ce que l'Assistant Catholique ?",
    a: "C'est un outil d'intelligence artificielle qui consulte 8 experts spécialisés (théologie, droit canon, liturgie, Bible, morale, histoire, patristique et vie monastique) pour répondre à vos questions sur la foi catholique avec rigueur et nuance.",
  },
  {
    q: "Les réponses sont-elles fiables ?",
    a: "Les réponses s'appuient sur les sources du Magistère, des Pères de l'Église et de la Tradition. Cependant, elles ne remplacent pas l'accompagnement d'un prêtre ou d'un directeur spirituel. Elles constituent un premier éclairage pour approfondir votre réflexion.",
  },
  {
    q: "Comment fonctionne la consultation des experts ?",
    a: "Lorsque vous posez une question, un orchestrateur analyse votre demande et sélectionne les experts les plus pertinents. Chacun apporte sa contribution spécialisée, puis une synthèse harmonieuse est produite pour vous offrir une réponse complète.",
  },
  {
    q: "Puis-je utiliser la fonctionnalité vocale ?",
    a: "Oui ! Cliquez sur l'icône de microphone à côté du champ de saisie pour dicter votre question. Vous pouvez aussi écouter les réponses en cliquant sur l'icône de haut-parleur qui apparaît sur chaque réponse de l'assistant.",
  },
  {
    q: "Mon historique est-il sauvegardé ?",
    a: "Oui, toutes vos consultations sont sauvegardées dans votre espace personnel. Accédez-y via le bouton « Historique » en haut de la page pour retrouver vos échanges précédents.",
  },
];

export function FAQ() {
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
          Questions fréquentes
        </h3>
      </div>
      <div className="ornament" />
      <Accordion type="single" collapsible className="w-full">
        {FAQ_ITEMS.map((item, idx) => (
          <AccordionItem
            key={idx}
            value={`faq-${idx}`}
            className="border-b border-border/50"
          >
            <AccordionTrigger className="text-left text-sm font-serif text-foreground/90 hover:text-primary hover:no-underline py-3.5">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </motion.div>
  );
}
