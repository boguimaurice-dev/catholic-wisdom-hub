import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Cross, BookOpen, Users, Shield, Mic, MessageCircle,
  Star, ChevronRight, Heart, Sparkles, Globe
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "8 Experts Théologiques",
    description: "Un panel d'experts couvrant la Bible, le Catéchisme, la Patristique, la Liturgie et plus encore."
  },
  {
    icon: BookOpen,
    title: "Sources Authentiques",
    description: "Chaque réponse est fondée sur les textes officiels de l'Église catholique."
  },
  {
    icon: Mic,
    title: "Dictée & Lecture Vocale",
    description: "Posez vos questions à la voix et écoutez les réponses grâce à la synthèse vocale."
  },
  {
    icon: Shield,
    title: "Fidélité au Magistère",
    description: "Un orchestrateur IA garantit la cohérence doctrinale de chaque consultation."
  },
  {
    icon: MessageCircle,
    title: "Chatbot Assistant",
    description: "Un assistant IA disponible 24h/24 pour répondre à vos questions de foi."
  },
  {
    icon: Globe,
    title: "Accessible Partout",
    description: "Consultez depuis n'importe quel appareil, à tout moment, où que vous soyez."
  },
];

const testimonials = [
  {
    name: "Père Jean-Marie",
    role: "Curé de paroisse",
    text: "Un outil remarquable pour préparer mes homélies. Les analyses croisées des experts me font gagner un temps précieux.",
    rating: 5,
  },
  {
    name: "Sœur Thérèse",
    role: "Religieuse enseignante",
    text: "Mes élèves adorent poser des questions et découvrir la richesse de la foi catholique de manière interactive.",
    rating: 5,
  },
  {
    name: "Marc D.",
    role: "Catéchiste laïc",
    text: "Enfin un outil fiable qui cite ses sources ! Je l'utilise chaque semaine pour préparer mes séances de catéchèse.",
    rating: 5,
  },
  {
    name: "Claire L.",
    role: "Étudiante en théologie",
    text: "La qualité des réponses est impressionnante. C'est comme avoir accès à une bibliothèque théologique complète.",
    rating: 4,
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cross className="h-6 w-6 text-accent" />
            <span className="font-serif text-xl font-bold text-foreground">
              Assistant Catholique
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/auth">
              <Button variant="outline" size="sm">Connexion</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Commencer</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/10 via-transparent to-transparent" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 bg-secondary/15 border border-secondary/30 rounded-full px-4 py-1.5 mb-8">
              <Sparkles className="h-4 w-4 text-secondary" />
              <span className="text-sm font-medium text-secondary">Propulsé par l'Intelligence Artificielle</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold leading-tight mb-6">
              Explorez la foi catholique{" "}
              <span className="text-accent">avec 8 experts</span>{" "}
              théologiques
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
              Posez n'importe quelle question sur la foi, la morale, la liturgie ou l'histoire de l'Église.
              Recevez une réponse complète, documentée et fidèle au Magistère.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth">
                <Button size="lg" className="text-base px-8 py-6 gap-2">
                  Commencer gratuitement
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </Link>
              <a href="#features">
                <Button variant="outline" size="lg" className="text-base px-8 py-6">
                  Découvrir les fonctionnalités
                </Button>
              </a>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto"
          >
            {[
              { value: "8", label: "Experts IA" },
              { value: "2000+", label: "Ans de doctrine" },
              { value: "24/7", label: "Disponibilité" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-serif font-bold text-accent">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-serif font-bold mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Une plateforme complète pour approfondir votre connaissance de la foi catholique.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow border-border/50 bg-card">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-accent" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-serif font-bold mb-4">
              Ce que disent nos utilisateurs
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Des milliers de fidèles, prêtres et catéchistes font déjà confiance à notre plateforme.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full border-border/50 bg-card">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-1 mb-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < testimonial.rating ? "text-secondary fill-secondary" : "text-muted"}`}
                        />
                      ))}
                    </div>
                    <p className="text-foreground mb-4 leading-relaxed italic">
                      "{testimonial.text}"
                    </p>
                    <div>
                      <div className="font-semibold text-sm">{testimonial.name}</div>
                      <div className="text-muted-foreground text-xs">{testimonial.role}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-serif font-bold mb-4">
              Commencez gratuitement
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              3 consultations gratuites par jour. Passez au Premium pour en profiter davantage.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {[
                { name: "Basique", price: "Gratuit", desc: "3 consultations/jour" },
                { name: "Premium", price: "2 500 XOF", desc: "15 consultations/jour", highlight: true },
                { name: "Elite", price: "5 000 XOF", desc: "Consultations illimitées" },
              ].map((plan) => (
                <Card
                  key={plan.name}
                  className={`border-border/50 ${plan.highlight ? "ring-2 ring-secondary shadow-lg" : ""}`}
                >
                  <CardContent className="p-6 text-center">
                    <div className="font-semibold text-sm text-muted-foreground mb-1">{plan.name}</div>
                    <div className="text-2xl font-serif font-bold mb-1">{plan.price}</div>
                    <div className="text-xs text-muted-foreground">{plan.desc}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Link to="/auth" className="inline-block mt-8">
              <Button size="lg" className="gap-2">
                <Heart className="h-4 w-4" />
                Créer un compte gratuit
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Cross className="h-5 w-5 text-accent" />
            <span className="font-serif font-semibold">Assistant Catholique</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Assistant de Recherche Catholique. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}
