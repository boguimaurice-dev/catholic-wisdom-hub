export interface Expert {
  key: string;
  name: string;
  title: string;
  icon: string;
  color: string;
}

export interface ExpertContribution {
  expert: string;
  name: string;
  title: string;
  response: string;
}

export interface ConsultationResult {
  success: boolean;
  errorType?: string;
  analysis: {
    selectedExperts: Expert[];
    reason: string;
  };
  expertContributions: ExpertContribution[];
  synthesis: string;
  error?: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  isConsultation?: boolean;
  consultationResult?: ConsultationResult;
}

export const EXPERTS_CONFIG: Record<string, Expert> = {
  theologien: {
    key: "theologien",
    name: "Théologien",
    title: "Doctrine et enseignement de l’Église",
    icon: "📖",
    color: "bg-amber-100 border-amber-400 text-amber-900 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-100",
  },
  liturgiste: {
    key: "liturgiste",
    name: "Liturgiste",
    title: "Célébrations et année liturgique",
    icon: "⛪",
    color: "bg-purple-100 border-purple-400 text-purple-900 dark:bg-purple-950 dark:border-purple-700 dark:text-purple-100",
  },
  spiritualite: {
    key: "spiritualite",
    name: "Spécialiste de spiritualité",
    title: "Prière et discernement spirituel",
    icon: "🕯️",
    color: "bg-indigo-100 border-indigo-400 text-indigo-900 dark:bg-indigo-950 dark:border-indigo-700 dark:text-indigo-100",
  },
  historien: {
    key: "historien",
    name: "Historien de l’Église",
    title: "Histoire et tradition chrétiennes",
    icon: "📜",
    color: "bg-stone-100 border-stone-400 text-stone-900 dark:bg-stone-950 dark:border-stone-700 dark:text-stone-100",
  },
  bibliste: {
    key: "bibliste",
    name: "Bibliste",
    title: "Écriture sainte et exégèse",
    icon: "📕",
    color: "bg-red-100 border-red-400 text-red-900 dark:bg-red-950 dark:border-red-700 dark:text-red-100",
  },
  linguiste: {
    key: "linguiste",
    name: "Linguiste et exégète",
    title: "Langues et contexte des textes",
    icon: "🔤",
    color: "bg-teal-100 border-teal-400 text-teal-900 dark:bg-teal-950 dark:border-teal-700 dark:text-teal-100",
  },
  patristique: {
    key: "patristique",
    name: "Spécialiste des Pères de l’Église",
    title: "Patristique et premiers siècles",
    icon: "📜",
    color: "bg-orange-100 border-orange-400 text-orange-900 dark:bg-orange-950 dark:border-orange-700 dark:text-orange-100",
  },
  monastique: {
    key: "monastique",
    name: "Spécialiste de vie monastique",
    title: "Tradition monastique et règle de vie",
    icon: "🏛️",
    color: "bg-emerald-100 border-emerald-400 text-emerald-900 dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-100",
  },
};
