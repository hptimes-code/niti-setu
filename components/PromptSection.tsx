import React, { useState, useEffect, useRef } from 'react';
import { getChatResponse, extractProfileFromText } from '../services/geminiService';
import { FarmerProfile } from '../types';

interface PromptSectionProps {
  currentProfile: Partial<FarmerProfile>;
  onProfileUpdate: (updates: Partial<FarmerProfile>) => void;
}

const PromptSection: React.FC<PromptSectionProps> = ({ currentProfile, onProfileUpdate }) => {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const [recognition] = useState(() => SpeechRecognition ? new SpeechRecognition() : null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || prompt;
    if (!textToSend.trim()) return;

    const userMessage = { role: 'user' as const, text: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setPrompt('');
    setIsProcessing(true);
    setError(null);

    try {
      // 1. Attempt extraction
      const updates = await extractProfileFromText(textToSend);
      let extractionNote = "";
      
      if (Object.keys(updates).length > 0) {
        onProfileUpdate(updates);
        if (updates.name || updates.state) {
          extractionNote = " I've noted those details in your profile.";
        }
      }

      // 2. Extra safety delay to ensure rate limit doesn't trigger
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 3. Get Chat response
      const aiResponse = await getChatResponse(textToSend, currentProfile);
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: (aiResponse || "Understood. How else can I help?") + extractionNote 
      }]);
    } catch (err) {
      console.error(err);
      setError("AI is busy. Please try again in a few seconds.");
    } finally {
      setIsProcessing(false);
    }
  };

  const startVoice = async () => {
    if (!recognition) {
      setError("Speech recognition not supported.");
      return;
    }
    setError(null);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsListening(true);
      recognition.start();
    } catch (err) {
      setError("Microphone access denied.");
    }
  };

  useEffect(() => {
    if (!recognition) return;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      handleSend(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
  }, [recognition]);

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
      <div className="bg-emerald-900 p-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-emerald-900">
            <i className="fas fa-robot"></i>
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight">AI Assistant</h3>
            <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-widest">Ready</p>
          </div>
        </div>
        <button onClick={() => setMessages([])} className="text-emerald-400 hover:text-white transition">
          <i className="fas fa-trash-alt"></i>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-2xl">
              <i className="fas fa-comment-dots"></i>
            </div>
            <div>
              <h4 className="font-black text-slate-800 uppercase text-sm tracking-tight">How can I help you?</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">Ask about schemes or update your farm details.</p>
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${
              m.role === 'user' 
                ? 'bg-emerald-600 text-white rounded-br-none' 
                : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-white p-3 rounded-2xl rounded-bl-none border border-slate-100 shadow-sm flex gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        {error && <div className="text-[10px] text-red-500 font-bold mb-2 uppercase tracking-widest">{error}</div>}
        <div className="flex items-center gap-2">
          <button
            onClick={isListening ? () => recognition?.stop() : startVoice}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-600'
            }`}
          >
            <i className={`fas ${isListening ? 'fa-stop' : 'fa-microphone'}`}></i>
          </button>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Write your message here..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          />
          <button
            onClick={() => handleSend()}
            disabled={!prompt.trim() || isProcessing}
            className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center hover:bg-emerald-700 transition disabled:opacity-50"
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptSection;