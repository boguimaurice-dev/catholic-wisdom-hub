import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { BookOpen, GraduationCap, Church, Search } from "lucide-react";

type Case = { title: string; desc: string; icon: typeof BookOpen };

const ICONS = [Church, GraduationCap, Search, BookOpen];

const CONTENT: Record<Language, { eyebrow: string; title: string; desc: string; note: string; items: { title: string; desc: string }[] }> = {
  fr: {
    eyebrow: "✦ Cas d'usage ✦",
    title: "À qui s'adresse le Scriptorium",
    desc: "Une plateforme conçue pour le travail théologique sérieux, quel que soit votre niveau.",
    note: "Plateforme récente : nous ne publions aucun témoignage tant que nos premiers utilisateurs ne nous en auront pas confié, vérifiés et nominatifs.",
    items: [
      { title: "Préparation d'homélies", desc: "Croisez Écriture, liturgie du jour et Pères de l'Église pour nourrir une prédication enracinée." },
      { title: "Catéchèse et formation", desc: "Obtenez des explications ajustées au niveau de votre auditoire, du grand public au séminaire." },
      { title: "Recherche universitaire", desc: "Consultez une chaire précise, filtrez par période et sources, exportez vos synthèses référencées." },
      { title: "Approfondissement personnel", desc: "Posez vos questions de foi et recevez une réponse fidèle au Magistère, avec ses sources." },
    ],
  },
  en: {
    eyebrow: "✦ Use cases ✦",
    title: "Who the Scriptorium is for",
    desc: "A platform built for serious theological work, whatever your level.",
    note: "We are a young platform: we publish no testimonials until real, named users entrust them to us.",
    items: [
      { title: "Homily preparation", desc: "Cross Scripture, the day's liturgy and the Church Fathers for rooted preaching." },
      { title: "Catechesis and formation", desc: "Get explanations tuned to your audience, from general public to seminary level." },
      { title: "Academic research", desc: "Consult a specific chair, filter by period and sources, export referenced syntheses." },
      { title: "Personal study", desc: "Ask your questions of faith and receive an answer faithful to the Magisterium, with its sources." },
    ],
  },
  es: {
    eyebrow: "✦ Casos de uso ✦",
    title: "Para quién es el Scriptorium",
    desc: "Una plataforma pensada para el trabajo teológico serio, sea cual sea su nivel.",
    note: "Plataforma reciente: no publicamos testimonios hasta que usuarios reales y verificados nos los confíen.",
    items: [
      { title: "Preparación de homilías", desc: "Cruce Escritura, liturgia del día y Padres de la Iglesia para una predicación enraizada." },
      { title: "Catequesis y formación", desc: "Explicaciones ajustadas al nivel de su auditorio, del gran público al seminario." },
      { title: "Investigación universitaria", desc: "Consulte una cátedra concreta, filtre por período y fuentes, exporte síntesis referenciadas." },
      { title: "Estudio personal", desc: "Plantee sus preguntas de fe y reciba una respuesta fiel al Magisterio, con sus fuentes." },
    ],
  },
  pt: {
    eyebrow: "✦ Casos de uso ✦",
    title: "Para quem é o Scriptorium",
    desc: "Uma plataforma criada para o trabalho teológico sério, seja qual for o seu nível.",
    note: "Plataforma recente: não publicamos testemunhos enquanto utilizadores reais e verificados não no-los confiarem.",
    items: [
      { title: "Preparação de homilias", desc: "Cruze Escritura, liturgia do dia e Padres da Igreja para uma pregação enraizada." },
      { title: "Catequese e formação", desc: "Explicações ajustadas ao nível do seu auditório, do grande público ao seminário." },
      { title: "Investigação universitária", desc: "Consulte uma cátedra específica, filtre por período e fontes, exporte sínteses referenciadas." },
      { title: "Estudo pessoal", desc: "Coloque as suas questões de fé e receba uma resposta fiel ao Magistério, com as suas fontes." },
    ],
  },
};

export function LandingUseCases() {
  const { language } = useLanguage();
  const content = CONTENT[language] || CONTENT.fr;
  const cases: Case[] = content.items.map((item, i) => ({ ...item, icon: ICONS[i] }));

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
            {content.eyebrow}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold mb-5">{content.title}</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{content.desc}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cases.map((c, index) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full border-border/30 bg-card/80 backdrop-blur-sm hover:shadow-lg transition-all">
                <CardContent className="p-7 flex items-start gap-4">
                  <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
                    <c.icon className="h-5 w-5 text-secondary" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-foreground mb-2">{c.title}</h3>
                    <p className="text-muted-foreground leading-relaxed text-[15px]">{c.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground/80 italic mt-8 max-w-2xl mx-auto">
          {content.note}
        </p>
      </div>
    </section>
  );
}
