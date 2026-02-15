import React, { useState, useEffect, useRef } from 'react';
import { extractProfileFromText } from '../services/geminiService';
import { FarmerProfile } from '../types';

interface VoiceControlProps {
  onProfileExtracted: (profile: Partial<FarmerProfile>) => void;
}

const VoiceControl: React.FC<VoiceControlProps> = ({ onProfileExtracted }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isComponentMounted = useRef(true);

  // Check for SpeechRecognition support
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const [recognition] = useState(() => {
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-IN';
      return rec;
    }
    return null;
  });

  const startListening = async () => {
    if (isListening || isProcessing) return;
    setError(null);
    setTranscript('');

    if (!recognition) {
      setError("Speech recognition is not supported in this browser. Please try Chrome or Edge.");
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      recognition.start();
      setIsListening(true);
    } catch (err: any) {
      console.error("Microphone access error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("Microphone permission denied. Please allow microphone access in your browser settings.");
      } else {
        setError("Could not start microphone. Ensure no other app is using it.");
      }
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      try {
        recognition.stop();
      } catch (e) {
        console.warn("Speech recognition stop error:", e);
      }
      setIsListening(false);
    }
  };

  useEffect(() => {
    isComponentMounted.current = true;
    if (!recognition) return;

    recognition.onresult = async (event: any) => {
      if (!isComponentMounted.current) return;
      
      const speechToText = event.results[0][0].transcript;
      setTranscript(speechToText);
      setIsListening(false);
      
      setIsProcessing(true);
      try {
        const profile = await extractProfileFromText(speechToText);
        if (isComponentMounted.current) {
          onProfileExtracted(profile);
        }
      } catch (err: any) {
        console.error("Profile extraction failed", err);
        if (isComponentMounted.current) {
          setError(`Error: ${err.message || "Failed to process your request."}`);
        }
      } finally {
        if (isComponentMounted.current) {
          setIsProcessing(false);
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (!isComponentMounted.current) return;
      
      // 'aborted' is often not a user-facing error but a state reset, silent handle it
      if (event.error === 'aborted') {
        setIsListening(false);
        return; 
      }

      console.error("Speech Recognition Error:", event.error);
      setIsListening(false);
      
      switch (event.error) {
        case 'audio-capture':
          setError("Microphone capture failed. Ensure your microphone is plugged in.");
          break;
        case 'not-allowed':
          setError("Microphone access blocked.");
          break;
        case 'no-speech':
          setError("No speech detected. Please try again.");
          break;
        default:
          setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (isComponentMounted.current) {
        setIsListening(false);
      }
    };

    return () => {
      isComponentMounted.current = false;
      if (recognition) {
        try { recognition.abort(); } catch (e) {}
      }
    };
  }, [recognition, onProfileExtracted]);

  return (
    <div className="flex flex-col items-center p-6 bg-white rounded-2xl shadow-sm border border-emerald-100">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-emerald-800">Voice Assistant</h3>
        <p className="text-sm text-slate-500 mt-1">
          "I am a farmer from Punjab with 4 acres of land..."
        </p>
      </div>

      <button
        onClick={isListening ? stopListening : startListening}
        disabled={isProcessing}
        className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-lg ${
          isListening 
            ? 'bg-red-500 text-white mic-active scale-110' 
            : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'
        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label={isListening ? "Stop listening" : "Start listening"}
      >
        {isProcessing ? (
          <i className="fas fa-spinner fa-spin text-3xl"></i>
        ) : (
          <i className={`fas ${isListening ? 'fa-stop' : 'fa-microphone'} text-3xl`}></i>
        )}
      </button>

      <div className="mt-6 w-full space-y-3">
        {isListening && (
          <div className="flex flex-col items-center">
            <div className="flex gap-1 mb-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></span>
            </div>
            <p className="text-emerald-600 font-medium text-sm">Listening for your details...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs text-center">
            <i className="fas fa-exclamation-circle mr-1"></i>
            {error}
          </div>
        )}

        {transcript && !isListening && !isProcessing && (
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 italic text-slate-600 text-xs text-center">
            "{transcript}"
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceControl;