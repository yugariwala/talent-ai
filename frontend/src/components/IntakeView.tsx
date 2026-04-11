import React, { useState, useRef, useEffect } from "react";
import { apiFetch } from "../lib/api";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Send, Bot, User, Briefcase, CheckCircle2, Sparkles, Loader2 } from "lucide-react";

export type CriteriaCard = {
  role_name?: string;
  must_haves?: string[];
  nice_to_haves?: string[];
  weights?: Record<string, string>;
  [key: string]: any;
};

interface IntakeViewProps {
  jobId: string;
  onComplete: (criteriaCard: CriteriaCard) => void;
}

type Message =
  | { type: "user"; text: string }
  | { type: "assistant"; text: string }
  | { type: "question"; question: string; options: string[] }
  | { type: "criteria_card"; criteria: CriteriaCard };

export function IntakeView({ jobId, onComplete }: IntakeViewProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      type: "assistant",
      text: "Describe the role you're hiring for. Paste a job description or write in your own words.",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [qaLog, setQaLog] = useState<{ question: string; answer: string }[]>([]);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState<"jd_input" | "qa" | "complete" | "processing">("jd_input");

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      const scrollElt = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElt) {
        scrollElt.scrollTop = scrollElt.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const currentMessages = [...messages];
    const lastMessage = currentMessages[currentMessages.length - 1];

    let newQaLog = [...qaLog];
    if (lastMessage && lastMessage.type === "question") {
      newQaLog.push({ question: lastMessage.question, answer: text });
      setQaLog(newQaLog);
    }

    setMessages((prev) => [...prev, { type: "user", text }]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await apiFetch(`/api/v1/jobs/${jobId}/jd-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, qa_log: newQaLog, question_number: questionNumber }),
      });

      if (response.type === "question") {
        setMessages((prev) => [
          ...prev,
          { type: "question", question: response.question.question, options: response.question.options || [] },
        ]);
        setQuestionNumber(response.question_number);
        if (phase === "jd_input") setPhase("qa");
      } else if (response.type === "criteria_card") {
        setMessages((prev) => [
          ...prev,
          { type: "assistant", text: "Based on what you've told me, here's the evaluation criteria I've generated:" },
          { type: "criteria_card", criteria: response.criteria_card },
        ]);
        setPhase("complete");
      } else if (response.type === "assistant" || response.message) {
        setMessages((prev) => [...prev, { type: "assistant", text: response.text || response.message }]);
      }
    } catch (err) {
      console.error("Chat API error:", err);
      setMessages((prev) => [...prev, { type: "assistant", text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmCriteria = async (criteria: CriteriaCard) => {
    setIsLoading(true);
    setPhase("processing");
    try {
      await apiFetch(`/api/v1/jobs/${jobId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ criteria_card: criteria }),
      });
      onComplete(criteria);
    } catch (err) {
      console.error("Confirm error:", err);
      setPhase("complete"); // fallback
      setMessages((prev) => [...prev, { type: "assistant", text: "Failed to confirm criteria. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  return (
    <Card className="flex flex-col h-full max-h-[800px] w-full max-w-2xl mx-auto shadow-[0_0_50px_-12px_rgba(0,210,255,0.15)] border-white/10 bg-white/5 backdrop-blur-md overflow-hidden rounded-2xl relative transition-all duration-500">
      <div className="absolute inset-0 bg-gradient-to-br from-[#00D2FF]/5 via-transparent to-transparent pointer-events-none" />
      
      <CardHeader className="border-b border-white/10 bg-transparent backdrop-blur-md relative z-10 p-6">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-white/10 rounded-xl shadow-[0_0_20px_rgba(0,210,255,0.2)]">
            <Sparkles className="w-6 h-6 text-[#00D2FF]" />
          </div>
          <div>
            <CardTitle className="text-3xl font-extrabold tracking-tight text-white mb-1">AI Intake Assistant</CardTitle>
            <p className="text-sm text-gray-400">
              {phase === "jd_input" && "Describe your open role clearly."}
              {phase === "qa" && "Clarifying details to build an accurate score card."}
              {phase === "complete" && "Please confirm the criteria to proceed."}
              {phase === "processing" && "Processing your criteria..."}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-grow p-0 overflow-hidden relative z-10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20" ref={scrollRef}>
        <ScrollArea className="h-full w-full p-6" >
          <div className="flex flex-col space-y-6 pb-24">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex w-full animate-in fade-in slide-in-from-bottom-3 duration-500 ${
                  msg.type === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.type === "user" ? (
                  <div className="flex flex-col items-end max-w-[80%]">
                    <div className="flex items-center mb-1.5 space-x-2">
                      <span className="text-xs font-medium text-gray-400 mr-1">You</span>
                      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                        <User className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                    <div className="bg-white text-black font-medium px-5 py-3.5 rounded-2xl rounded-br-none shadow-[0_0_15px_rgba(255,255,255,0.1)] text-sm leading-relaxed">
                      {msg.text}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-start max-w-[85%]">
                    <div className="flex items-center mb-1.5 space-x-2">
                      <div className="w-6 h-6 rounded-full bg-[#00D2FF]/20 text-[#00D2FF] flex items-center justify-center border border-[#00D2FF]/40 shadow-[0_0_10px_rgba(0,210,255,0.2)]">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-medium text-gray-400 mr-1">Intake AI</span>
                    </div>

                    {msg.type === "assistant" && (
                      <div className="bg-black/40 border border-white/10 text-white px-5 py-3.5 rounded-2xl rounded-bl-none shadow-[0_0_20px_rgba(0,210,255,0.05)] backdrop-blur-sm text-sm leading-relaxed">
                        {msg.text}
                      </div>
                    )}

                    {msg.type === "question" && (
                      <div className="bg-white/5 border border-[#00D2FF]/30 shadow-[0_0_30px_rgba(0,210,255,0.1)] p-5 rounded-2xl rounded-bl-none w-full relative overflow-hidden backdrop-blur-md">
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#00D2FF] shadow-[0_0_10px_#00D2FF]" />
                        <div className="space-y-4">
                          <p className="text-sm font-medium leading-relaxed text-white">{msg.question}</p>
                          {msg.options && msg.options.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                              {msg.options.map((opt, i) => (
                                <Button
                                  key={i}
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full bg-transparent text-white border-white/20 hover:bg-white/10 hover:border-white/40 shadow-[0_0_10px_rgba(255,255,255,0.05)] hover:scale-[1.02] transition-transform duration-300"
                                  onClick={() => sendMessage(opt)}
                                  disabled={isLoading || phase === "complete" || phase === "processing"}
                                >
                                  {opt}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {msg.type === "criteria_card" && (
                      <div className="mt-2 w-full animate-in zoom-in-95 duration-500">
                        <Card className="border-white/20 shadow-[0_0_40px_rgba(0,210,255,0.15)] bg-white/5 backdrop-blur-xl overflow-hidden rounded-2xl">
                          <div className="bg-white/10 border-b border-white/10 p-5 flex items-center space-x-3 text-white">
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                            <h3 className="font-semibold text-lg tracking-tight">
                              Evaluation Criteria Generated ✓
                            </h3>
                          </div>
                          <CardContent className="p-6 space-y-6">
                            {msg.criteria.must_haves && msg.criteria.must_haves.length > 0 && (
                              <div className="space-y-3">
                                <h4 className="text-sm font-semibold flex items-center text-white">
                                  Must Haves
                                </h4>
                                <ul className="space-y-2">
                                  {msg.criteria.must_haves.map((item, idx) => (
                                    <li key={idx} className="flex items-start text-sm text-gray-300 font-medium">
                                      <CheckCircle2 className="w-4 h-4 mr-2 text-green-400 mt-0.5 shrink-0" />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {msg.criteria.nice_to_haves && msg.criteria.nice_to_haves.length > 0 && (
                              <div className="space-y-3">
                                <h4 className="text-sm font-semibold flex items-center text-gray-400">
                                  Nice to Haves
                                </h4>
                                <ul className="space-y-2">
                                  {msg.criteria.nice_to_haves.map((item, idx) => (
                                    <li key={idx} className="flex items-start text-sm text-gray-400 font-medium opacity-80">
                                      <Sparkles className="w-4 h-4 mr-2 text-yellow-500 mt-0.5 shrink-0 outline-none" />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {msg.criteria.weights && Object.keys(msg.criteria.weights).length > 0 && (
                               <div className="space-y-3 pt-2 border-t border-white/10">
                                <h4 className="text-sm font-semibold flex items-center text-gray-300">
                                  Dimension Weights
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {Object.entries(msg.criteria.weights).map(([dim, weight], idx) => (
                                    <Badge key={idx} variant="secondary" className="px-3 py-1.5 text-xs bg-[#00D2FF]/10 border border-[#00D2FF]/30 text-[#00D2FF] rounded-full font-medium shadow-[0_0_10px_rgba(0,210,255,0.1)]">
                                      {dim} {weight as string}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                          <CardFooter className="p-5 border-t border-white/10 bg-black/20">
                             <Button 
                               onClick={() => confirmCriteria(msg.criteria)}
                               disabled={isLoading || phase === "processing"}
                               className="w-full rounded-full bg-white text-black font-semibold hover:bg-gray-200 transition-transform hover:scale-[1.02] duration-300 shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center justify-center py-5"
                             >
                               {isLoading && phase === "processing" ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                               {phase === "processing" ? "Processing..." : "Confirm and Start Processing"}
                             </Button>
                          </CardFooter>
                        </Card>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && phase !== "processing" && (
              <div className="flex w-full justify-start animate-in fade-in">
                <div className="flex items-center space-x-2 mt-1">
                   <div className="w-6 h-6 rounded-full bg-[#00D2FF]/20 text-[#00D2FF] flex items-center justify-center border border-[#00D2FF]/40 shadow-[0_0_10px_rgba(0,210,255,0.2)]">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  <div className="bg-black/40 border border-white/10 text-white px-4 py-3 rounded-2xl rounded-bl-none shadow-[0_0_20px_rgba(0,210,255,0.05)] backdrop-blur-sm flex space-x-1.5 items-center">
                     <span className="w-1.5 h-1.5 rounded-full bg-[#00D2FF] animate-bounce [animation-delay:-0.3s] shadow-[0_0_8px_#00D2FF]" />
                     <span className="w-1.5 h-1.5 rounded-full bg-[#00D2FF] animate-bounce [animation-delay:-0.15s] shadow-[0_0_8px_#00D2FF]" />
                     <span className="w-1.5 h-1.5 rounded-full bg-[#00D2FF] animate-bounce shadow-[0_0_8px_#00D2FF]" />
                  </div>
                </div>
              </div>
            )}
            
            {/* Invisible div for scrolling */}
            <div className="h-4" />
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="p-5 border-t border-white/10 bg-transparent backdrop-blur-md relative z-10 w-full shrink-0 flex-col items-stretch space-y-2">
        {phase === "qa" && (
          <div className="text-center w-full pb-1">
            <span className="text-xs text-gray-500 font-medium tracking-wide">
              Question {questionNumber || 1} of ~6 — type 'proceed' to skip remaining
            </span>
          </div>
        )}
        <div className="flex w-full items-center space-x-3 bg-white/5 p-2 rounded-full border border-white/10 focus-within:ring-2 focus-within:ring-[#00D2FF]/50 focus-within:border-[#00D2FF]/50 transition-all shadow-[0_0_20px_rgba(0,210,255,0.05)]">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              phase === "processing" 
                ? "Processing your request..."
                : phase === "complete"
                ? "Criteria generation complete. Review above."
                : "Type your response..."
            }
            disabled={isLoading || phase === "complete" || phase === "processing"}
            className="flex-grow border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent px-5 text-base shadow-none h-11 text-white placeholder:text-gray-500"
          />
          <Button 
            size="icon" 
            onClick={() => sendMessage(inputValue)} 
            disabled={!inputValue.trim() || isLoading || phase === "complete" || phase === "processing"}
            className="rounded-full w-11 h-11 shrink-0 bg-white hover:bg-gray-200 text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-transform hover:scale-105 active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:hover:scale-100"
          >
            {isLoading && phase !== "complete" && phase !== "processing" ? <Loader2 className="w-5 h-5 animate-spin text-black" /> : <Send className="w-5 h-5 ml-0.5 text-black" />}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
