import { ConsultationResult, Message } from "@/types/consultation";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/catholic-orchestrator`;

export async function consultOrchestrator(
  question: string,
  conversationHistory: Message[] = []
): Promise<ConsultationResult> {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      question,
      conversationHistory: conversationHistory.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = typeof errorData.error === "string" ? errorData.error : "";

    if (response.status === 429) {
      throw new Error("Limite de requêtes atteinte. Veuillez réessayer dans quelques instants.");
    }
    if (response.status === 402) {
      throw new Error("Crédits épuisés. Veuillez recharger votre compte.");
    }

    if (/payment required|not enough credits/i.test(errorMessage)) {
      throw new Error("Crédits épuisés. Veuillez recharger votre compte.");
    }

    throw new Error(errorData.error || "Erreur lors de la consultation");
  }

  return response.json();
}
