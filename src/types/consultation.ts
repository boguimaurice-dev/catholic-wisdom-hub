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
    name: "Père Thomas d'Aquin",
    title: "Théologien",
    icon: "📖",
    color: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/70 text-amber-900 dark:text-amber-100",
  },
  liturgiste: {
    key: "liturgiste",
    name: "Sœur Marie-Thérèse",
    title: "Liturgiste",
    icon: "⛪",
    color: "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/70 text-purple-900 dark:text-purple-100",
  },
  spiritualite: {
    key: "spiritualite",
    name: "Père Jean de la Croix",
    title: "Maître spirituel",
    icon: "🕯️",
    color: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/70 text-indigo-900 dark:text-indigo-100",
  },
  historien: {
    key: "historien",
    name: "Professeur Henri Marrou",
    title: "Historien de l'Église",
    icon: "📜",
    color: "bg-stone-50 dark:bg-stone-950/40 border-stone-200 dark:border-stone-800/70 text-stone-900 dark:text-stone-100",
  },
  bibliste: {
    key: "bibliste",
    name: "Père Raymond Brown",
    title: "Bibliste",
    icon: "📕",
    color: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/70 text-rose-900 dark:text-rose-100",
  },
  linguiste: {
    key: "linguiste",
    name: "Abbé Marcel Jousse",
    title: "Linguiste exégète",
    icon: "🔤",
    color: "bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800/70 text-teal-900 dark:text-teal-100",
  },
  patristique: {
    key: "patristique",
    name: "Père Irénée de Lyon",
    title: "Patrologue",
    icon: "📜",
    color: "bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800/70 text-orange-900 dark:text-orange-100",
  },
  monastique: {
    key: "monastique",
    name: "Dom Guéranger",
    title: "Vie monastique",
    icon: "🏛️",
    color: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-100",
  },
};
