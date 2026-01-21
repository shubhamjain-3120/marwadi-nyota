import { useState, useCallback, useRef } from "react";

/**
 * Custom hook for browser speech recognition
 * Uses the Web Speech API (SpeechRecognition)
 */
export default function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const recognitionRef = useRef(null);
  const callbackRef = useRef(null);

  // Check if speech recognition is supported
  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // Start listening for speech
  const startListening = useCallback(
    (fieldId, onResult) => {
      if (!isSupported) {
        alert("Voice input is not supported in this browser");
        return;
      }

      // Stop any existing recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      // Configure recognition - use English (India) for transliteration in English alphabets
      recognition.lang = "en-IN";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      // Store callback
      callbackRef.current = onResult;

      recognition.onstart = () => {
        setIsListening(true);
        setActiveField(fieldId);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        // Capitalize first letter
        const capitalizedTranscript = transcript.charAt(0).toUpperCase() + transcript.slice(1);
        if (callbackRef.current) {
          callbackRef.current(capitalizedTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        setActiveField(null);

        if (event.error === "not-allowed") {
          alert("Microphone access denied. Please allow microphone access.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setActiveField(null);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    },
    [isSupported]
  );

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  return {
    isListening,
    activeField,
    startListening,
    stopListening,
    isSupported,
  };
}
