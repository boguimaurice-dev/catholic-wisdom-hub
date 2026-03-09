import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, BookOpen, RotateCcw, Cross, History, LogOut, User } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AgentsGrid } from "@/components/AgentCard";
import { ConsultationDocument } from "@/components/ConsultationDocument";
import { consultOrchestrator } from "@/services/orchestrator";
import { Message } from "@/types/consultation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SUGGESTIONS = [
  "Qu'est-ce que la Trinité ?",
  "Comment prier le chapelet ?",
  "Que disent les Pères de l'Église sur l'Eucharistie ?",
  "Quelle est la vie quotidienne d'un moine bénédictin ?",
];

export default function Index() {
  const { user, signOut } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeExperts, setActiveExperts] = useState<string[]>([]);
  const [consultedExperts, setConsultedExperts] = useState<string[]>([]);
  const [currentPhase, setCurrentPhase] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentPhase]);

  const saveConsultation = async (question: string, result: any) => {
    if (!user) return;
    await supabase.from("consultations").insert({
      user_id: user.id,
      question,
      synthesis: result.synthesis,
      expert_contributions: result.expertContributions,
      selected_experts: result.analysis.selectedExperts,
      analysis_reason: result.analysis.reason,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const question = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setIsLoading(true);
    setActiveExperts([]);
    setConsultedExperts([]);

    try {
      setCurrentPhase("Analyse de la question par Monseigneur l'Orchestrateur…");
      setTimeout(() => setCurrentPhase("Sélection des experts pertinents…"), 1000);

      const result = await consultOrchestrator(question, messages);

      if (result.success) {
        const expertKeys = result.analysis.selectedExperts.map((e) => e.key);
        setActiveExperts(expertKeys);
        setCurrentPhase(`Consultation de ${expertKeys.length} expert(s)…`);

        for (const key of expertKeys) {
          await new Promise((r) => setTimeout(r, 500));
          setConsultedExperts((prev) => [...prev, key]);
        }

        setCurrentPhase("Synthèse en cours…");
        await new Promise((r) => setTimeout(r, 800));

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: result.synthesis,
            isConsultation: true,
            consultationResult: result,
          },
        ]);

        // Save to database
        await saveConsultation(question, result);
      } else {
        throw new Error(result.error || "Erreur lors de la consultation");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Je suis désolé, une erreur est survenue lors de la consultation. Veuillez réessayer.",
        },
      ]);
    } finally {
      setIsLoading(false);
      setCurrentPhase("");
      setActiveExperts([]);
    }
  };

  const resetConversation = () => {
    setMessages([]);
    setConsultedExperts([]);
    setActiveExperts([]);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="relative overflow-hidden bg-primary text-primary-foreground py-4 px-4">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary/20 border-2 border-secondary flex items-center justify-center">
                <Cross className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <h1 className="font-serif text-lg sm:text-2xl font-bold tracking-wide">
                  Assistant Catholique
                </h1>
                <p className="text-xs opacity-80 hidden sm:block font-light">
                  8 experts à votre service
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/history">
                <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
                  <History className="w-4 h-4" />
                  <span className="hidden sm:inline ml-1">Historique</span>
                </Button>
              </Link>
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={resetConversation} className="text-primary-foreground hover:bg-primary-foreground/10">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={signOut} className="text-primary-foreground hover:bg-primary-foreground/10">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Agents Grid */}
      <div className="bg-cream border-b border-border py-3 px-4">
        <div className="max-w-6xl mx-auto">
          <AgentsGrid activeExperts={activeExperts} consultedExperts={consultedExperts} />
        </div>
      </div>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto pb-36">
        <div className="max-w-4xl mx-auto p-4">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-10 sm:py-20"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-primary/50" />
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl text-primary mb-3">
                Bienvenue, cher ami
              </h2>
              <div className="ornament" />
              <p className="text-muted-foreground max-w-lg mx-auto text-sm sm:text-base px-4 leading-relaxed">
                Posez votre question sur la foi catholique. Nos 8 experts sont à votre service.
              </p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto px-4">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="p-3.5 text-left text-sm bg-card rounded-xl border border-border hover:border-secondary hover:shadow-md transition-all group"
                  >
                    <span className="text-secondary mr-2 group-hover:mr-3 transition-all">→</span>
                    {suggestion}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-5">
              <AnimatePresence>
                {messages.map((message, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${message.role === "user" ? "ml-auto max-w-[85%] sm:max-w-[75%]" : "max-w-full"}`}
                  >
                    {message.role === "user" ? (
                      <div className="bg-primary text-primary-foreground p-3.5 sm:p-4 rounded-2xl rounded-br-sm shadow-lg">
                        <p className="text-sm sm:text-base leading-relaxed">{message.content}</p>
                      </div>
                    ) : message.isConsultation && message.consultationResult ? (
                      <ConsultationDocument
                        result={message.consultationResult}
                        question={messages[idx - 1]?.content || ""}
                      />
                    ) : (
                      <div className="bg-card border border-border p-3.5 sm:p-4 rounded-2xl rounded-bl-sm shadow-sm">
                        <p className="text-sm sm:text-base leading-relaxed">{message.content}</p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading && currentPhase && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-secondary/30 p-4 rounded-xl shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary/15 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-secondary" />
                    </div>
                    <span className="text-sm sm:text-base text-foreground font-medium">{currentPhase}</span>
                  </div>
                </motion.div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-3 sm:p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-2 sm:gap-3 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez votre question sur la foi catholique…"
              className="flex-1 min-h-[44px] max-h-32 resize-none text-sm sm:text-base bg-card border-border focus:border-secondary focus:ring-secondary/30"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !input.trim()} className="h-11 px-4 sm:px-5 shadow-md">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
