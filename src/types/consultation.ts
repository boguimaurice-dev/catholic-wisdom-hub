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
    color: "bg-amber-100 border-amber-400 text-amber-900",
  },
  liturgiste: {
    key: "liturgiste",
    name: "Sœur Marie-Thérèse",
    title: "Liturgiste",
    icon: "⛪",
    color: "bg-purple-100 border-purple-400 text-purple-900",
  },
  spiritualite: {
    key: "spiritualite",
    name: "Père Jean de la Croix",
    title: "Maître spirituel",
    icon: "🕯️",
    color: "bg-indigo-100 border-indigo-400 text-indigo-900",
  },
  historien: {
    key: "historien",
    name: "Professeur Henri Marrou",
    title: "Historien de l'Église",
    icon: "📜",
    color: "bg-stone-100 border-stone-400 text-stone-900",
  },
  bibliste: {
    key: "bibliste",
    name: "Père Raymond Brown",
    title: "Bibliste",
    icon: "📕",
    color: "bg-red-100 border-red-400 text-red-900",
  },
  linguiste: {
    key: "linguiste",
    name: "Abbé Marcel Jousse",
    title: "Linguiste exégète",
    icon: "🔤",
    color: "bg-teal-100 border-teal-400 text-teal-900",
  },
  patristique: {
    key: "patristique",
    name: "Père Irénée de Lyon",
    title: "Patrologue",
    icon: "📜",
    color: "bg-orange-100 border-orange-400 text-orange-900",
  },
  monastique: {
    key: "monastique",
    name: "Dom Guéranger",
    title: "Vie monastique",
    icon: "🏛️",
    color: "bg-emerald-100 border-emerald-400 text-emerald-900",
  },
};
