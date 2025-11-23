import { useState, useEffect, useCallback, useRef } from 'react';
import { SpeechMetrics } from '../types';

export const useSpeech = () => {
  // UI State
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  
  // Internal State (Refs for robustness against closures/re-renders)
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false); // Tracks if we INTEND to be listening (vs browser auto-stop)
  
  // Data Buffers
  // historyRef: Stores text fully committed from previous recognition sessions (e.g. before a silence timeout)
  const historyRef = useRef(''); 
  // transcriptRef: Stores the LIVE full text (History + Current Session) for immediate synchronous access
  const transcriptRef = useRef('');
  
  // Speech Metrics Tracking
  const sessionStartTimeRef = useRef<number | null>(null); // When current session started
  const lastResultTimeRef = useRef<number | null>(null); // Timestamp of last onresult event
  const pauseThreshold = 1.0; // Seconds of silence to count as a pause
  const pausesRef = useRef<number[]>([]); // Array of pause durations
  const resultCountRef = useRef(0); // Count of onresult events

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true; // Keep recording as long as possible
        recognition.interimResults = true; // Show real-time results
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          // Track timing for fluency analysis
          const currentTime = Date.now();
          
          // CRITICAL: Ensure session start time is set (should be set in startListening, but double-check)
          if (sessionStartTimeRef.current === null) {
            sessionStartTimeRef.current = currentTime;
          }
          
          // Detect pauses: if time since last result > threshold, it's a pause
          if (lastResultTimeRef.current !== null) {
            const timeSinceLastResult = (currentTime - lastResultTimeRef.current) / 1000; // Convert to seconds
            if (timeSinceLastResult > pauseThreshold) {
              pausesRef.current.push(timeSinceLastResult);
              console.log(`Pause detected: ${timeSinceLastResult.toFixed(2)}s`);
            }
          }
          
          lastResultTimeRef.current = currentTime;
          resultCountRef.current += 1;
          
          // Web Speech API returns the accumulated results for the CURRENT session in event.results
          // CRITICAL: event.results contains ALL results from the current session, including both
          // final and interim results. Each time onresult fires, it contains the complete
          // cumulative results from the start of the current session.
          
          let currentSessionText = '';
          let lastFinalIndex = -1;
          
          // First pass: find the last final result index
          for (let i = event.results.length - 1; i >= 0; i--) {
            if (event.results[i].isFinal) {
              lastFinalIndex = i;
              break;
            }
          }
          
          // Second pass: build text from all final results + last interim result (if any)
          // CRITICAL: Process ALL final results sequentially to ensure nothing is lost
          for (let i = 0; i < event.results.length; ++i) {
            const result = event.results[i];
            const transcript = result[0].transcript;
            
            if (result.isFinal) {
              // Final result: always include (these are committed, won't change)
              currentSessionText += (currentSessionText ? ' ' : '') + transcript;
            } else if (i === event.results.length - 1 && i > lastFinalIndex) {
              // Last result is interim and comes after all final results
              // This is the "live" text that's still being recognized
              // CRITICAL: Only include the latest interim result (it replaces previous interim)
              // We build: [all final results] + [latest interim result]
              currentSessionText += (currentSessionText ? ' ' : '') + transcript;
            }
            // Skip interim results that are not the last one (they will become final later)
          }
          
          // Combine previous history with current session
          // historyRef contains text from previous sessions (before auto-restart)
          const fullText = (historyRef.current + (historyRef.current ? ' ' : '') + currentSessionText).trim();
          
          // Update Ref for sync access (this is the source of truth)
          transcriptRef.current = fullText;
          // Update State for UI render
          setTranscript(fullText);
        };

        recognition.onend = () => {
          // The engine stopped. Was it intentional?
          if (isListeningRef.current) {
             // NO. It was a silence timeout or network glitch.
             // CRITICAL: Save everything we have so far into history before restarting
             // Use a small delay to ensure any pending onresult events are processed
             setTimeout(() => {
               // Double-check we're still supposed to be listening (user might have stopped)
               if (isListeningRef.current) {
                 // Save current transcript to history
                 historyRef.current = transcriptRef.current;
                 
                 console.log("Auto-restarting speech engine...", "Saved text:", transcriptRef.current);
                 try {
                   recognition.start();
                 } catch (e) {
                   console.warn("Restart failed", e);
                   setIsListening(false);
                 }
               }
             }, 100); // Small delay to catch any final onresult events
          } else {
             // YES. User clicked stop.
             // CRITICAL: Save final text before stopping
             // Use a small delay to ensure any pending onresult events are processed
             setTimeout(() => {
               historyRef.current = transcriptRef.current;
               console.log("Stopped listening. Final text saved:", transcriptRef.current);
               setIsListening(false);
             }, 150); // Slightly longer delay for final save
          }
        };
        
        recognition.onerror = (event: any) => {
            // 'no-speech' is common (silence), ignore it.
            if (event.error !== 'no-speech') {
               console.warn("Speech recognition error", event.error);
               
               // CRITICAL: For certain errors that stop recognition, save current text
               // Errors like 'network', 'audio-capture', 'aborted' can cause loss of text
               const criticalErrors = ['network', 'audio-capture', 'aborted', 'not-allowed'];
               if (criticalErrors.includes(event.error)) {
                 // Save current text before recognition stops
                 setTimeout(() => {
                   if (transcriptRef.current) {
                     historyRef.current = transcriptRef.current;
                     console.log("Saved text due to error:", event.error, "Text:", transcriptRef.current);
                   }
                 }, 100);
               }
            }
        };

        recognitionRef.current = recognition;
      } else {
        setIsSupported(false);
      }
    }
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      console.warn("Recognition not initialized");
      return;
    }
    
    // CRITICAL: Check if already listening by checking recognition state
    // If already listening, don't try to start again (this causes InvalidStateError)
    if (isListeningRef.current) {
      console.log("Already listening (according to ref), skipping start to avoid InvalidStateError");
      return; // Don't try to start if already listening
    }
    
    // Reset speech metrics for new session
    // CRITICAL: Initialize session start time when starting, not waiting for first onresult
    sessionStartTimeRef.current = Date.now();
    lastResultTimeRef.current = null;
    pausesRef.current = [];
    resultCountRef.current = 0;
    
    // Normal start
    try {
      isListeningRef.current = true;
      recognitionRef.current.start();
      setIsListening(true);
      console.log("Listening started successfully");
    } catch(e) {
      // If error is "already started", that means it's actually working
      if (e instanceof Error && (e.message.includes('already started') || e.name === 'InvalidStateError')) {
        console.log("Recognition already started (this is OK, it means it's working)");
        isListeningRef.current = true;
        setIsListening(true);
        return;
      }
      
      console.error("Start failed:", e);
      isListeningRef.current = false;
      setIsListening(false);
      // Retry once after a delay
      setTimeout(() => {
        // Check again before retry
        if (isListeningRef.current) {
          console.log("Already listening before retry, skipping");
          return;
        }
        try {
          isListeningRef.current = true;
          recognitionRef.current.start();
          setIsListening(true);
          console.log("Listening started successfully on retry");
        } catch (retryError) {
          // If error is "already started", that's actually OK
          if (retryError instanceof Error && (retryError.message.includes('already started') || retryError.name === 'InvalidStateError')) {
            console.log("Recognition already started on retry (this is OK)");
            isListeningRef.current = true;
            setIsListening(true);
          } else {
            console.error("Retry also failed:", retryError);
            isListeningRef.current = false;
            setIsListening(false);
          }
        }
      }, 300);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      isListeningRef.current = false; // Mark as intentional stop
      
      // CRITICAL: Save current text immediately before stopping
      // This ensures we capture text even if onend is delayed
      const currentText = transcriptRef.current;
      if (currentText) {
        historyRef.current = currentText;
        transcriptRef.current = currentText;
        setTranscript(currentText);
      }
      
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn("Stop failed", e);
      }
      
      // Note: onend will fire, but since isListeningRef is false, it won't restart.
      // The final text is already saved in transcriptRef and historyRef.
    }
  }, []);

  const resetTranscript = useCallback(() => {
    // CRITICAL: Save current text before resetting (in case it wasn't saved)
    const currentText = transcriptRef.current;
    if (currentText) {
      historyRef.current = currentText;
    }
    
    historyRef.current = '';
    transcriptRef.current = '';
    setTranscript('');
    
    // Reset speech metrics
    sessionStartTimeRef.current = null;
    lastResultTimeRef.current = null;
    pausesRef.current = [];
    resultCountRef.current = 0;
    
    // If we are currently listening, stop it first to avoid state issues
    if (isListeningRef.current && recognitionRef.current) {
        try {
          isListeningRef.current = false; // Mark as stopped before aborting
          recognitionRef.current.stop();
          setIsListening(false);
          // Small delay before abort to ensure stop is processed
          setTimeout(() => {
            try {
              recognitionRef.current.abort();
            } catch (e) {
              console.warn("Abort failed:", e);
            }
          }, 100);
        } catch (e) {
          console.warn("Stop failed in resetTranscript:", e);
          isListeningRef.current = false;
          setIsListening(false);
        }
    }
  }, []);

  // Helper to get text immediately without waiting for State update
  const getTranscript = useCallback(() => transcriptRef.current, []);
  
  // Calculate and return speech metrics
  const getSpeechMetrics = useCallback((): SpeechMetrics | null => {
    if (sessionStartTimeRef.current === null) {
      return null; // No session started
    }
    
    const endTime = lastResultTimeRef.current || Date.now();
    const totalDuration = (endTime - sessionStartTimeRef.current) / 1000; // Convert to seconds
    
    // Calculate pause metrics
    const pauseCount = pausesRef.current.length;
    const pauseDuration = pausesRef.current.reduce((sum, pause) => sum + pause, 0);
    const longestPause = pausesRef.current.length > 0 ? Math.max(...pausesRef.current) : 0;
    
    // Calculate speaking duration (total - pauses)
    const speakingDuration = Math.max(0, totalDuration - pauseDuration);
    
    // Count words in transcript
    const text = transcriptRef.current || '';
    const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    
    // Calculate speaking rate (words per second)
    const averageWordsPerSecond = speakingDuration > 0 ? wordCount / speakingDuration : 0;
    
    // Calculate fluency score (0-1)
    // Factors: speaking rate (ideal: 2-3 words/sec), pause frequency, longest pause
    // Higher score = more fluent
    let fluencyScore = 1.0;
    
    // Penalize for low speaking rate (< 1 word/sec is very slow)
    if (averageWordsPerSecond < 1.0) {
      fluencyScore -= 0.3;
    } else if (averageWordsPerSecond < 1.5) {
      fluencyScore -= 0.2;
    } else if (averageWordsPerSecond < 2.0) {
      fluencyScore -= 0.1;
    }
    
    // Penalize for too many pauses (more than 1 pause per 10 seconds is excessive)
    const pauseFrequency = speakingDuration > 0 ? pauseCount / speakingDuration : 0;
    if (pauseFrequency > 0.1) {
      fluencyScore -= 0.2;
    } else if (pauseFrequency > 0.05) {
      fluencyScore -= 0.1;
    }
    
    // Penalize for very long pauses (> 3 seconds is problematic)
    if (longestPause > 3.0) {
      fluencyScore -= 0.2;
    } else if (longestPause > 2.0) {
      fluencyScore -= 0.1;
    }
    
    // Ensure score is between 0 and 1
    fluencyScore = Math.max(0, Math.min(1, fluencyScore));
    
    return {
      duration: totalDuration,
      pauseCount,
      pauseDuration,
      wordCount,
      averageWordsPerSecond,
      longestPause,
      fluencyScore
    };
  }, []);

  return {
    transcript,
    isListening,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    getTranscript,
    getSpeechMetrics
  };
};

export const useTTS = () => {
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const onEndCallbackRef = useRef<(() => void) | undefined>(undefined);
  const isSpeakingRef = useRef(false);
  
  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!('speechSynthesis' in window)) {
      console.warn("TTS not supported");
      if (onEnd) onEnd();
      return;
    }
    
    console.log("TTS: Speaking text:", text.substring(0, 50) + "...");
    
    // CRITICAL: Stop any previous TTS completely
    if (isSpeakingRef.current) {
      console.log("TTS: Stopping previous speech");
      window.speechSynthesis.cancel();
    }
    
    // Clear any pending callbacks
    if (currentUtteranceRef.current) {
      currentUtteranceRef.current.onend = null;
      currentUtteranceRef.current.onerror = null;
    }
    currentUtteranceRef.current = null;
    onEndCallbackRef.current = undefined;
    isSpeakingRef.current = false;
    
    // Wait a bit to ensure previous TTS is fully stopped
    setTimeout(() => {
      // Double-check: cancel again to be sure
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.0;
      
      // Store reference to prevent duplicate callbacks
      currentUtteranceRef.current = utterance;
      onEndCallbackRef.current = onEnd;
      isSpeakingRef.current = true;
      
      // CRITICAL: Use a flag to prevent duplicate onend callbacks
      let onEndCalled = false;
      
      utterance.onstart = () => {
        console.log("TTS: Started speaking");
      };
      
      utterance.onend = () => {
        console.log("TTS: Finished speaking");
        if (!onEndCalled && onEndCallbackRef.current) {
          onEndCalled = true;
          isSpeakingRef.current = false;
          // Clear reference
          currentUtteranceRef.current = null;
          const callback = onEndCallbackRef.current;
          onEndCallbackRef.current = undefined;
          // Call callback with a small delay to ensure TTS is fully stopped
          setTimeout(() => {
            callback();
          }, 50);
        }
      };
      
      utterance.onerror = (event: any) => {
        console.error("TTS error:", event.error, event);
        // Still call onEnd if there's an error
        if (!onEndCalled && onEndCallbackRef.current) {
          onEndCalled = true;
          isSpeakingRef.current = false;
          currentUtteranceRef.current = null;
          const callback = onEndCallbackRef.current;
          onEndCallbackRef.current = undefined;
          setTimeout(() => {
            callback();
          }, 50);
        }
      };
      
      try {
        window.speechSynthesis.speak(utterance);
        console.log("TTS: Speak called successfully");
      } catch (error) {
        console.error("TTS: Failed to speak:", error);
        isSpeakingRef.current = false;
        if (onEnd && !onEndCalled) {
          onEndCalled = true;
          onEnd();
        }
      }
    }, 100); // Reduced delay - 100ms should be enough
  }, []);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      // CRITICAL: Cancel and clear references
      window.speechSynthesis.cancel();
      if (currentUtteranceRef.current) {
        currentUtteranceRef.current.onend = null;
      }
      currentUtteranceRef.current = null;
      onEndCallbackRef.current = undefined;
    }
  }, []);

  return { speak, stopSpeaking };
};
