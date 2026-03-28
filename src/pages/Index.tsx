import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, BookOpen, RotateCcw, Cross, History, LogOut, Mic, MicOff, Volume2, VolumeX, Heart, CreditCard, AudioLines } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AgentsGrid } from "@/components/AgentCard";
import { ConsultationDocument } from "@/components/ConsultationDocument";
import { FAQ } from "@/components/FAQ";
import { ThemeCards } from "@/components/ThemeCards";
import { consultOrchestrator } from "@/services/orchestrator";
import { Message } from "@/types/consultation";
import { useAuth } from "@/contexts/AuthContext";
import { useVoiceInput, useTTS } from "@/hooks/useVoice";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Chatbot } from "@/components/Chatbot";


export default function Index() {
  const { user, signOut } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeExperts, setActiveExperts] = useState<string[]>([]);
  const [consultedExperts, setConsultedExperts] = useState<string[]>([]);
  const [currentPhase, setCurrentPhase] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isListening, startListening, stopListening } = useVoiceInput();
  const { isSpeaking, speak, stop: stopSpeaking } = useTTS();
  const { canConsult, incrementUsage, remainingConsultations, currentPlan } = useSubscription();

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

    if (!canConsult()) {
      toast.error(`Vous avez atteint la limite de ${currentPlan?.max_consultations_per_day || 3} consultations/jour. Passez à un plan supérieur !`);
      return;
    }

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

        await saveConsultation(question, result);
        await incrementUsage();
      } else {
        throw new Error(result.error || "Erreur lors de la consultation");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Une erreur est survenue";

      toast.error(message);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: message,
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
    stopSpeaking();
  };

  const handleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening((text) => setInput(text));
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Decorative background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23996633' fill-opacity='1'%3E%3Cpath d='M40 10v20h-4V10h4zm0 40v20h-4V50h4zM20 30v20h-4V30h4zm40 0v20h-4V30h4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-secondary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-accent/3 blur-3xl" />
      </div>
      {/* Header */}
      <header className="relative overflow-hidden bg-primary text-primary-foreground py-4 px-4 z-10">
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
              {currentPlan && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs bg-primary-foreground/10 px-2.5 py-1 rounded-full border border-primary-foreground/20">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span className="font-medium">
                    {currentPlan.max_consultations_per_day >= 999
                      ? "∞"
                      : `${remainingConsultations()}/${currentPlan.max_consultations_per_day}`}
                  </span>
                </div>
              )}
              <Link to="/pricing">
                <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
                  <CreditCard className="w-4 h-4" />
                  <span className="hidden sm:inline ml-1">Plans</span>
                </Button>
              </Link>
              <Link to="/donation">
                <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
                  <Heart className="w-4 h-4" />
                  <span className="hidden sm:inline ml-1">Soutenir</span>
                </Button>
              </Link>
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
              <ThemeToggle />
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
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-8 sm:py-14"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/15 to-secondary/15 border-2 border-secondary/30 flex items-center justify-center shadow-lg"
                >
                  <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-primary/60" />
                </motion.div>
                <h2 className="font-serif text-2xl sm:text-4xl text-primary mb-2 tracking-wide">
                  Bienvenue, cher ami
                </h2>
                <div className="ornament" />
                <p className="text-muted-foreground max-w-md mx-auto text-sm sm:text-base px-4 leading-relaxed">
                  Explorez la richesse de la foi catholique avec nos <span className="text-secondary font-semibold">8 experts</span> à votre service.
                </p>
              </motion.div>

              <ThemeCards onSelectSuggestion={setInput} />
              <FAQ />
            </>
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
                      <div className="relative group">
                        <ConsultationDocument
                          result={message.consultationResult}
                          question={messages[idx - 1]?.content || ""}
                        />
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => isSpeaking ? stopSpeaking() : speak(message.content)}
                           className="absolute top-3 right-3 gap-1.5 h-8 text-xs font-medium bg-card/80 backdrop-blur-sm border-border hover:bg-accent hover:text-accent-foreground"
                           title={isSpeaking ? "Arrêter la lecture" : "Écouter la réponse"}
                         >
                           {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <AudioLines className="w-3.5 h-3.5" />}
                           {isSpeaking ? "Stop" : "Écouter"}
                         </Button>
                      </div>
                    ) : (
                      <div className="relative group bg-card border border-border p-3.5 sm:p-4 rounded-2xl rounded-bl-sm shadow-sm">
                        <p className="text-sm sm:text-base leading-relaxed">{message.content}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => isSpeaking ? stopSpeaking() : speak(message.content)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 text-muted-foreground hover:text-primary"
                        >
                          {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        </Button>
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
            <Button
              type="button"
              variant={isListening ? "destructive" : "secondary"}
              onClick={handleVoiceInput}
              disabled={isLoading}
              className={`h-11 shrink-0 gap-2 px-3 ${isListening ? "animate-pulse" : ""}`}
              title={isListening ? "Arrêter l'écoute" : "Dicter votre question"}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              <span className="hidden sm:inline text-sm font-medium">{isListening ? "Stop" : "Vocal"}</span>
            </Button>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "🎙️ Parlez maintenant…" : "Posez votre question sur la foi catholique…"}
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
