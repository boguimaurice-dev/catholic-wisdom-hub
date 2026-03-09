import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, BookOpen, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AgentsGrid } from "@/components/AgentCard";
import { ConsultationDocument } from "@/components/ConsultationDocument";
import { consultOrchestrator } from "@/services/orchestrator";
import { Message, ConsultationResult } from "@/types/consultation";
import { toast } from "sonner";

export default function Index() {
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
      setCurrentPhase("Analyse de la question par Monseigneur l'Orchestrateur...");
      
      // Simulate phase progression for UX
      setTimeout(() => setCurrentPhase("Sélection des experts pertinents..."), 1000);

      const result = await consultOrchestrator(question, messages);

      if (result.success) {
        // Show which experts are being consulted
        const expertKeys = result.analysis.selectedExperts.map(e => e.key);
        setActiveExperts(expertKeys);
        setCurrentPhase(`Consultation de ${expertKeys.length} expert(s)...`);

        // Animate experts being consulted
        for (const key of expertKeys) {
          await new Promise(r => setTimeout(r, 500));
          setConsultedExperts(prev => [...prev, key]);
        }

        setCurrentPhase("Synthèse en cours...");
        await new Promise(r => setTimeout(r, 800));

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: result.synthesis,
            isConsultation: true,
            consultationResult: result,
          },
        ]);
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
      <header className="bg-gradient-to-r from-primary via-primary/90 to-primary text-white py-4 px-4 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl sm:text-4xl">✝️</span>
              <div>
                <h1 className="font-serif text-xl sm:text-2xl lg:text-3xl font-bold">
                  Assistant Catholique
                </h1>
                <p className="text-xs sm:text-sm opacity-90 hidden sm:block">
                  Votre guide érudit pour explorer la foi catholique
                </p>
              </div>
            </div>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetConversation}
                className="text-white hover:bg-white/20"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Nouvelle</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Agents Grid */}
      <div className="bg-cream border-b border-primary/20 py-3 px-4">
        <div className="max-w-6xl mx-auto">
          <AgentsGrid 
            activeExperts={activeExperts} 
            consultedExperts={consultedExperts} 
          />
        </div>
      </div>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto pb-32">
        <div className="max-w-4xl mx-auto p-4">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-8 sm:py-16"
            >
              <BookOpen className="w-16 h-16 sm:w-20 sm:h-20 mx-auto text-primary/40 mb-4" />
              <h2 className="font-serif text-xl sm:text-2xl text-primary mb-2">
                Bienvenue, cher ami
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto text-sm sm:text-base px-4">
                Posez votre question sur la foi catholique. Nos experts en théologie, 
                liturgie, spiritualité, histoire, Bible et exégèse sont à votre service.
              </p>
              <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto px-4">
                {[
                  "Qu'est-ce que la Trinité ?",
                  "Comment prier le chapelet ?",
                  "Que signifie l'Eucharistie ?",
                  "Qui est Saint Augustin ?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="p-3 text-left text-sm bg-white rounded-lg border border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              <AnimatePresence>
                {messages.map((message, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${
                      message.role === "user" ? "ml-auto max-w-[85%] sm:max-w-[80%]" : "max-w-full"
                    }`}
                  >
                    {message.role === "user" ? (
                      <div className="bg-primary text-white p-3 sm:p-4 rounded-2xl rounded-br-sm">
                        <p className="text-sm sm:text-base">{message.content}</p>
                      </div>
                    ) : message.isConsultation && message.consultationResult ? (
                      <ConsultationDocument
                        result={message.consultationResult}
                        question={messages[idx - 1]?.content || ""}
                      />
                    ) : (
                      <div className="bg-white border border-primary/20 p-3 sm:p-4 rounded-2xl rounded-bl-sm">
                        <p className="text-sm sm:text-base">{message.content}</p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Loading state */}
              {isLoading && currentPhase && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-primary/10 border border-primary/30 p-4 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-sm sm:text-base text-primary font-medium">
                      {currentPhase}
                    </span>
                  </div>
                </motion.div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-primary/20 p-3 sm:p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-2 sm:gap-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez votre question sur la foi catholique..."
              className="flex-1 min-h-[44px] max-h-32 resize-none text-sm sm:text-base"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="h-auto px-4 sm:px-6"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
