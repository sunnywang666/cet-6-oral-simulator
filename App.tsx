import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Play, BookOpen, User, Users, FileText, Ear, Volume2, UserCircle2, AlertCircle, Sparkles, CheckCircle2, GraduationCap, BrainCircuit, PauseCircle, SkipForward, History, Download, Trash2, ChevronLeft, Eye } from 'lucide-react';
import { ExamStage, Message, Part2Data, Part3Data, ExamResult, ExamMode, RealExamTopic, ExamRecord, ExamType, PracticePart } from './types';
import { GeminiService, REAL_EXAM_TOPICS } from './services/geminiService';
import { StorageService } from './services/storageService';
import { PunctuationService } from './services/punctuationService';
import { useSpeech, useTTS } from './hooks/useSpeech';
import Timer from './components/Timer';
import Visualizer from './components/Visualizer';

// Helper for beep sound
const playBeep = () => {
  if (typeof window === 'undefined') return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 800;
  gain.gain.value = 0.1;
  osc.start();
  setTimeout(() => osc.stop(), 200);
};

const App: React.FC = () => {
  // --- STATE ---
  const [stage, setStage] = useState<ExamStage>(ExamStage.MODE_SELECTION);
  const [examMode, setExamMode] = useState<ExamMode>(ExamMode.REAL);
  const [examType, setExamType] = useState<ExamType | null>(null);
  const [practicePart, setPracticePart] = useState<PracticePart | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // UI States
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // UI State: "Uploading/Thinking"

  // Data State
  const [realTopic, setRealTopic] = useState<RealExamTopic | undefined>(undefined);
  const [part2Data, setPart2Data] = useState<Part2Data | null>(null);
  const [part3Data, setPart3Data] = useState<Part3Data | null>(null);
  const [part5Question, setPart5Question] = useState<string>("");
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  
  // History State
  const [historyRecords, setHistoryRecords] = useState<ExamRecord[]>([]);
  const [isViewingHistoryRecord, setIsViewingHistoryRecord] = useState(false); // If true, Report view shows a past record
  const [viewingRecordTranscript, setViewingRecordTranscript] = useState<Message[]>([]); // Full transcript of the record being viewed

  // Part 4 Specific State
  const [part4Turn, setPart4Turn] = useState<'ai' | 'user'>('user'); // Default to User starts
  const [part4GlobalTimerActive, setPart4GlobalTimerActive] = useState(false);

  // Hooks
  const { transcript, isListening, startListening, stopListening, resetTranscript, getTranscript, getSpeechMetrics, isSupported } = useSpeech();
  const { speak, stopSpeaking } = useTTS();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, transcript]);

  const addMessage = (role: 'user' | 'ai' | 'system', text: string, speechMetrics?: import('./types').SpeechMetrics) => {
    setMessages(prev => [...prev, { 
      role, 
      text, 
      timestamp: Date.now(),
      ...(speechMetrics && { speechMetrics })
    }]);
  };

  // --- CENTRALIZED STATE TRANSITION LOGIC ---

  /**
   * CRITICAL: Hard Stop Logic.
   * When Timer fires, this function is called.
   * It forces audio stop, sets processing UI, and determines next step.
   */
  const handleTimerFinish = () => {
    // CRITICAL: Capture current stage and part4Turn immediately to avoid closure issues
    const currentStage = stage;
    const currentPart4Turn = part4Turn;
    
    console.log("Timer finished for stage:", currentStage);
    
    // 1. First, get current text BEFORE stopping (in case stop clears it)
    const textBeforeStop = getTranscript();
    console.log("Text before stop:", textBeforeStop);
    
    // 2. Hard Stop: Kill Audio (this will trigger onend which saves text)
    stopListening();
    setIsTimerActive(false);

    // 3. Wait longer to ensure all recognition events are processed and text is saved
    setTimeout(() => {
      // Get text again after stop (should have final saved text)
      let currentText = getTranscript();
      console.log("Text after stop (first check):", currentText);
      
      // If we got text before stop but not after, use the before-stop text
      if (textBeforeStop && textBeforeStop.trim() && (!currentText || !currentText.trim())) {
        console.log("Using text from before stop:", textBeforeStop);
        currentText = textBeforeStop;
      }
      
      // Final check after another delay
      setTimeout(() => {
        const finalText = getTranscript();
        if (finalText && finalText.trim() && (!currentText || !currentText.trim())) {
          console.log("Using final text after additional delay:", finalText);
          currentText = finalText;
        }
        
        console.log("Final captured text for stage", currentStage, ":", currentText);
        
        // 4. Transition to Processing State
        setStage(ExamStage.PROCESSING);
        setIsProcessing(true);

        // 5. Decide Next Step based on previous Stage (Async delay for UX)
        // CRITICAL: Use captured currentStage instead of stage to avoid closure issues
        setTimeout(async () => {
            // For Parts 1, 2, 3 - we add message then reset.
            // For Part 4, timer means TOTAL time up.
            // For Part 5, we must save then finish.

            switch(currentStage) {
                case ExamStage.PART1_SELF_INTRO:
                    if(currentText && currentText.trim()) {
                      // Add punctuation before saving
                      const processedText = PunctuationService.addPunctuation(currentText);
                      const metrics = getSpeechMetrics();
                      console.log("Adding Part 1 message (original):", currentText);
                      console.log("Adding Part 1 message (with punctuation):", processedText);
                      console.log("Part 1 speech metrics:", metrics);
                      addMessage('user', `[Part 1] ${processedText}`, metrics || undefined);
                    } else {
                      console.warn("Part 1: No text to save");
                    }
                    // If practice mode, finish directly; otherwise continue to Part 2
                    if (examType === ExamType.PRACTICE && practicePart === PracticePart.PART1) {
                      await finishExam();
                    } else {
                      await startPart2();
                    }
                    break;
                case ExamStage.PART2_SHORT_QA:
                    if(currentText && currentText.trim()) {
                      const processedText = PunctuationService.addPunctuation(currentText);
                      const metrics = getSpeechMetrics();
                      console.log("Adding Part 2 message (with punctuation):", processedText);
                      console.log("Part 2 speech metrics:", metrics);
                      addMessage('user', `[Part 2] ${processedText}`, metrics || undefined);
                    } else {
                      console.warn("Part 2: No text to save");
                    }
                    if (examType === ExamType.PRACTICE && practicePart === PracticePart.PART2) {
                      await finishExam();
                    } else {
                      await startPart3();
                    }
                    break;
                case ExamStage.PART3_PREP:
                     // Prep finished, start speaking immediately
                     // For practice mode Part 3, we need to handle this differently
                     if (examType === ExamType.PRACTICE && practicePart === PracticePart.PART3) {
                       startPart3Speaking();
                     } else {
                       startPart3Speaking();
                     }
                     break;
                case ExamStage.PART3_PRESENTATION:
                    if(currentText && currentText.trim()) {
                      const processedText = PunctuationService.addPunctuation(currentText);
                      const metrics = getSpeechMetrics();
                      console.log("Adding Part 3 message (with punctuation):", processedText);
                      console.log("Part 3 speech metrics:", metrics);
                      addMessage('user', `[Part 3] ${processedText}`, metrics || undefined);
                    } else {
                      console.warn("Part 3: No text to save");
                    }
                    if (examType === ExamType.PRACTICE && practicePart === PracticePart.PART3) {
                      await finishExam();
                    } else {
                      await startPart4();
                    }
                    break;
                case ExamStage.PART4_PAIR_DISCUSSION:
                    // If global timer finishes
                    // CRITICAL: Stop listening if still active
                    stopListening();
                    // Don't add "currentText" here blindly, Part 4 handles its own chat messages during turns
                    // But if user was speaking when time ran out:
                    if(currentPart4Turn === 'user' && currentText && currentText.trim()) {
                        const processedText = PunctuationService.addPunctuation(currentText);
                        const metrics = getSpeechMetrics();
                        console.log("Adding Part 4 End message (with punctuation):", processedText);
                        console.log("Part 4 End speech metrics:", metrics);
                        addMessage('user', `[Part 4 End] ${processedText}`, metrics || undefined);
                    } else {
                      console.warn("Part 4: No text to save or not user turn");
                    }
                    if (examType === ExamType.PRACTICE && practicePart === PracticePart.PART4) {
                      await finishExam();
                    } else {
                      await startPart5();
                    }
                    break;
                case ExamStage.PART5_IN_DEPTH_QA:
                    // CRITICAL: Save Part 5 text BEFORE finishing
                    if(currentText && currentText.trim()) {
                        const processedText = PunctuationService.addPunctuation(currentText);
                        const metrics = getSpeechMetrics();
                        console.log("Saving Part 5 transcript (with punctuation):", processedText);
                        console.log("Part 5 speech metrics:", metrics);
                        addMessage('user', `[Part 5] ${processedText}`, metrics || undefined);
                    } else {
                        console.warn("No Part 5 text detected. Final transcript:", currentText);
                    }
                    await finishExam();
                    break;
                default:
                    break;
            }
            setIsProcessing(false);
        }, 1500); // 1.5s "Uploading" delay
      }, 300); // Additional delay to catch final text
    }, 300); // Wait longer for final recognition events
  };

  // --- ACTIONS & FLOW ---

  const selectMode = (mode: ExamMode) => {
      setExamMode(mode);
      if (mode === ExamMode.REAL) {
          // Pick random topic immediately
          const topic = GeminiService.getRandomRealTopic();
          setRealTopic(topic);
      } else {
          setRealTopic(undefined);
      }
      // Go to exam type selection instead of directly to onboarding
      setStage(ExamStage.EXAM_TYPE_SELECTION);
  };

  const selectExamType = (type: ExamType) => {
      setExamType(type);
      if (type === ExamType.PRACTICE) {
          // For practice, go to part selection
          setStage(ExamStage.PRACTICE_PART_SELECTION);
      } else {
          // For full exam, go to onboarding
          setStage(ExamStage.ONBOARDING);
      }
  };

  const selectPracticePart = (part: PracticePart) => {
      setPracticePart(part);
      setStage(ExamStage.ONBOARDING);
  };

  const openHistory = () => {
    const records = StorageService.getRecords();
    setHistoryRecords(records);
    setStage(ExamStage.HISTORY);
  };

  // Start Exam or Practice
  const startExam = async () => {
    // If practice mode, start directly at selected part
    if (examType === ExamType.PRACTICE && practicePart) {
        switch(practicePart) {
            case PracticePart.PART1:
                await startPart1Practice();
                return;
            case PracticePart.PART2:
                await startPart2Practice();
                return;
            case PracticePart.PART3:
                await startPart3Practice();
                return;
            case PracticePart.PART4:
                await startPart4Practice();
                return;
            case PracticePart.PART5:
                await startPart5Practice();
                return;
        }
    }
    
    // Full exam - start from Part 1
    await startPart1Full();
  };

  // Practice functions
  const startPart1Practice = async () => {
    stopListening();
    stopSpeaking();
    resetTranscript();
    setMessages([]);
    setExamResult(null);
    setIsViewingHistoryRecord(false);
    setStage(ExamStage.PART1_SELF_INTRO);
    const instruction = "Part 1 Practice: Please make a brief self-introduction.";
    speak(instruction, () => {
      stopSpeaking();
      setTimeout(() => {
        setIsTimerActive(true);
        setTimeout(() => {
          startListening();
        }, 150);
      }, 100);
    });
  };

  const startPart2Practice = async () => {
    stopListening();
    stopSpeaking();
    resetTranscript();
    const data = await GeminiService.getPart2Data(examMode, realTopic);
    setPart2Data(data);
    setStage(ExamStage.PART2_SHORT_QA);
    speak(`Part 2 Practice. Topic: ${data.topic}. Question: ${data.question}`, () => {
      stopSpeaking();
      setTimeout(() => {
        setIsTimerActive(true);
        setTimeout(() => {
          startListening();
        }, 150);
      }, 100);
    });
  };

  const startPart3Practice = async () => {
    stopListening();
    stopSpeaking();
    resetTranscript();
    const data = await GeminiService.getPart3Data(examMode, realTopic);
    setPart3Data(data);
    setStage(ExamStage.PART3_PREP);
    speak(`Part 3 Practice. Please read the card and prepare for 1 minute.`, () => {
      stopSpeaking();
      setTimeout(() => {
        setIsTimerActive(true);
      }, 100);
    });
  };

  const startPart4Practice = async () => {
    stopListening();
    stopSpeaking();
    resetTranscript();
    setStage(ExamStage.PART4_PAIR_DISCUSSION);
    const topicText = examMode === ExamMode.REAL 
        ? (realTopic?.part4Topic || "Discussion")
        : (part2Data?.topic || "Current Events");
    const intro = `Part 4 Practice. Pair Discussion. We will discuss: "${topicText}". You are Candidate A. Please start the discussion.`;
    speak(intro, () => {
      stopSpeaking();
      setPart4GlobalTimerActive(true);
      setTimeout(() => {
        handlePart4UserTurn();
      }, 200);
    });
  };

  const startPart5Practice = async () => {
    stopListening();
    stopSpeaking();
    resetTranscript();
    setStage(ExamStage.PART5_IN_DEPTH_QA);
    const q = await GeminiService.getPart5Question(examMode, realTopic, part2Data?.topic);
    setPart5Question(q);
    setTimeout(() => {
      speak(`Part 5 Practice. Please listen to the question carefully. ${q}`, () => {
        stopSpeaking();
        setTimeout(() => {
          setIsTimerActive(true);
          setTimeout(() => {
            startListening();
          }, 150);
        }, 100);
      });
    }, 500);
  };

  // 1. Start Full Exam -> Part 1
  const startPart1Full = async () => {
    // CRITICAL: Stop any existing listening and TTS first
    stopListening();
    stopSpeaking();
    
    resetTranscript();
    setMessages([]); // Clear current session messages
    setExamResult(null);
    setIsViewingHistoryRecord(false);
    setStage(ExamStage.PART1_SELF_INTRO);
    const instruction = "Welcome to the CET-6 Oral Exam. Part 1. Please make a brief self-introduction.";
    
    speak(instruction, () => {
      // CRITICAL: Ensure TTS is fully stopped before starting recording
      stopSpeaking();
      setTimeout(() => {
        console.log("Part 1: Starting timer and listening...");
        setIsTimerActive(true);
        // Add a small delay to ensure TTS is completely stopped
        setTimeout(() => {
          startListening();
          // Verify listening started
          setTimeout(() => {
            if (!isListening) {
              console.warn("Part 1: Listening did not start, retrying...");
              startListening();
            }
          }, 200);
        }, 150);
      }, 100);
    });
  };

  // 2. Part 2: Short Q&A
  const startPart2 = async () => {
    // CRITICAL: Stop any existing listening and TTS first
    stopListening();
    stopSpeaking();
    
    resetTranscript();
    // Prepare Data
    const data = await GeminiService.getPart2Data(examMode, realTopic);
    setPart2Data(data);

    setStage(ExamStage.PART2_SHORT_QA);
    
    speak(`Part 2. Topic: ${data.topic}. Question: ${data.question}`, () => {
       // CRITICAL: Ensure TTS is fully stopped before starting recording
       stopSpeaking();
       setTimeout(() => {
         console.log("Part 2: Starting timer and listening...");
         setIsTimerActive(true);
         setTimeout(() => {
           startListening();
           setTimeout(() => {
             if (!isListening) {
               console.warn("Part 2: Listening did not start, retrying...");
               startListening();
             }
           }, 200);
         }, 150);
       }, 100);
    });
  };

  // 3. Part 3: Presentation
  const startPart3 = async () => {
    resetTranscript();
    const data = await GeminiService.getPart3Data(examMode, realTopic);
    setPart3Data(data);
    setStage(ExamStage.PART3_PREP);
    
    // CRITICAL: Stop any existing TTS before speaking
    stopSpeaking();
    speak(`Part 3. Individual Presentation. Please read the card and prepare for 1 minute.`, () => {
       // CRITICAL: Ensure TTS is fully stopped before starting timer
       stopSpeaking();
       setTimeout(() => {
         setIsTimerActive(true); // Prep timer
       }, 100);
    });
  };

  const startPart3Speaking = () => {
    // CRITICAL: Stop any existing listening and TTS first
    stopListening();
    stopSpeaking();
    
    resetTranscript();
    setStage(ExamStage.PART3_PRESENTATION);
    playBeep();
    
    speak("Time is up. Please start your presentation.", () => {
      // CRITICAL: Ensure TTS is fully stopped before starting recording
      stopSpeaking();
      setTimeout(() => {
        console.log("Part 3: Starting timer and listening...");
        setIsTimerActive(true); // Speaking timer
        setTimeout(() => {
          startListening();
          setTimeout(() => {
            if (!isListening) {
              console.warn("Part 3: Listening did not start, retrying...");
              startListening();
            }
          }, 200);
        }, 150);
      }, 100);
    });
  };

  // 4. Part 4: Pair Discussion
  const startPart4 = async () => {
    // CRITICAL: Stop any existing listening and TTS first
    stopListening();
    stopSpeaking();
    
    // CRITICAL: Clear any leakage from Part 3 immediately
    resetTranscript(); 
    setStage(ExamStage.PART4_PAIR_DISCUSSION);
    
    // Determine Topic text
    const topicText = examMode === ExamMode.REAL 
        ? (realTopic?.part4Topic || "Discussion")
        : (part2Data?.topic || "Current Events");

    // Randomly assign role
    const userStarts = Math.random() > 0.5;
    const startRole = userStarts ? 'Candidate A' : 'Candidate B';
    const partnerRole = userStarts ? 'Candidate B' : 'Candidate A';
    
    const intro = `Part 4. Pair Discussion. We will discuss: "${topicText}". You are ${startRole}. Your partner is ${partnerRole}. ${userStarts ? 'Please start the discussion.' : 'I will start.'}`;
    
    console.log("Part 4 starting. User starts:", userStarts, "Role:", startRole);
    
    // CRITICAL: If user starts (Candidate A), start listening immediately after intro
    // Use a closure to capture the stage value to avoid React state update delay
    const currentStage = ExamStage.PART4_PAIR_DISCUSSION; // We just set it above
    speak(intro, () => {
       console.log("Part 4 intro finished. User starts:", userStarts, "Stage:", currentStage);
       // CRITICAL: Ensure TTS is fully stopped
       stopSpeaking();
       setPart4GlobalTimerActive(true);
       
       if (userStarts) {
           // CRITICAL: Candidate A should start immediately - use direct approach
           // Don't rely on handlePart4UserTurn's stage check since React state updates are async
           console.log("User starts (Candidate A) - starting listening immediately...");
           // Set turn to user first
           setPart4Turn('user');
           
           // CRITICAL: Ensure clean state - stop everything first
           stopListening();
           stopSpeaking(); // Double-check TTS is stopped
           resetTranscript();
           
           // Start listening with proper delays to ensure clean state
           setTimeout(() => {
             // Double-check: stop again to be absolutely sure
             stopListening();
             setTimeout(() => {
               try {
                 console.log("Directly starting listening for Candidate A...");
                 startListening();
                 // Verify it started - use a longer delay to account for state update
                 setTimeout(() => {
                   // Check again after state has time to update
                   setTimeout(() => {
                     if (!isListening) {
                       console.warn("Candidate A: Listening did not start, retrying...");
                       stopListening(); // Ensure clean state
                       setTimeout(() => {
                         startListening();
                         setTimeout(() => {
                           if (!isListening) {
                             console.error("Candidate A: Listening failed after retry");
                             // Last resort: try handlePart4UserTurn but bypass stage check
                             setPart4Turn('user');
                             stopListening();
                             resetTranscript();
                             setTimeout(() => {
                               startListening();
                             }, 200);
                           } else {
                             console.log("Candidate A: Listening started on retry");
                           }
                         }, 300);
                       }, 150);
                     } else {
                       console.log("Candidate A: Listening started successfully");
                     }
                   }, 100); // Additional check delay
                 }, 300); // Initial check delay
               } catch (error) {
                 console.error("Failed to start listening for Candidate A:", error);
                 // Fallback: try again after delay
                 setTimeout(() => {
                   stopListening();
                   resetTranscript();
                   setTimeout(() => {
                     startListening();
                   }, 200);
                 }, 200);
               }
             }, 250); // Delay after stop
           }, 250); // Initial delay
       } else {
           // Pass NULL to indicate AI initiates completely fresh
           console.log("AI starts (Candidate B) - AI will speak first...");
           setTimeout(() => {
             handlePart4AITurn(null);
           }, 200);
       }
    });
  };

  const handlePart4UserTurn = () => {
    // CRITICAL: Don't block on stage check - React state updates are async
    // If we're called, we should try to start listening
    // Only warn if stage is clearly wrong (not just async update delay)
    if (stage !== ExamStage.PART4_PAIR_DISCUSSION && stage !== ExamStage.ONBOARDING) {
      console.warn("handlePart4UserTurn called but stage is not PART4_PAIR_DISCUSSION:", stage);
      // Don't return - still try to start listening in case it's just a timing issue
    }
    
    console.log("handlePart4UserTurn called");
    setPart4Turn('user');
    
    // CRITICAL: Stop any existing listening first to ensure clean state
    stopListening();
    
    // Clear buffer for new turn after stopping
    resetTranscript();
    
    // CRITICAL: Add a small delay to ensure previous recognition is fully stopped
    // before starting a new one
    setTimeout(() => {
      console.log("Starting listening for Part 4 user turn...");
      try {
        startListening();
        
        // Verify that listening started successfully
        setTimeout(() => {
          if (!isListening) {
            console.warn("Listening did not start on first attempt, retrying...");
            // Force stop and retry
            stopListening();
            setTimeout(() => {
              try {
                startListening();
                console.log("Retry attempt completed");
              } catch (retryError) {
                console.error("Retry failed:", retryError);
              }
            }, 100);
          } else {
            console.log("Listening started successfully for Part 4");
          }
        }, 200);
      } catch (error) {
        console.error("Failed to start listening in Part 4:", error);
        // Retry after a delay
        setTimeout(() => {
          try {
            stopListening();
            setTimeout(() => {
              startListening();
              console.log("Retry after error completed");
            }, 100);
          } catch (retryError) {
            console.error("Retry failed:", retryError);
          }
        }, 300);
      }
    }, 150); // Reduced delay
  };

  // Manually triggered "Done" button for Part 4
  const manualFinishPart4UserTurn = () => {
      if (stage !== ExamStage.PART4_PAIR_DISCUSSION) return;

      // 1. Stop listening first (this will save text in onend)
      stopListening();
      
      // 2. Wait a moment for final recognition events, then capture text
      setTimeout(() => {
        const currentText = getTranscript();
        console.log("Part 4 user turn finished. Captured text:", currentText);
        
        // 3. Save to history explicitly (Crucial for Part 4 record)
        if(currentText && currentText.trim().length > 0) {
            const processedText = PunctuationService.addPunctuation(currentText);
            const metrics = getSpeechMetrics();
            console.log("Part 4 User turn speech metrics:", metrics);
            addMessage('user', `[Part 4 User]: ${processedText}`, metrics || undefined);
            // 4. Pass the TEXT directly to AI Turn so it knows what to reply to immediately
            handlePart4AITurn(currentText);
        } else {
            // User said nothing?
            handlePart4AITurn("..."); 
        }
      }, 200); // Wait for final recognition events
  };

  const handlePart4Interrupt = () => {
      // CRITICAL: If user was already speaking when interrupting, save that text first
      if (isListening) {
        const interruptedText = getTranscript();
        if (interruptedText && interruptedText.trim()) {
          console.log("Saving interrupted text:", interruptedText);
          const metrics = getSpeechMetrics();
          console.log("Part 4 Interrupt speech metrics:", metrics);
          addMessage('user', `[Part 4 User]: ${interruptedText}`, metrics || undefined);
        }
        stopListening();
      }
      
      stopSpeaking(); // Stop AI TTS
      setPart4Turn('user'); // Force state to user
      
      // Need a small delay to ensure audio is clear before listening
      setTimeout(() => {
          handlePart4UserTurn(); // Start listening
      }, 200);
  };

  const handlePart4AITurn = async (lastUserText: string | null) => {
    if (stage !== ExamStage.PART4_PAIR_DISCUSSION) return;

    setPart4Turn('ai');
    
    let responseText = "";
    const topicContext = examMode === ExamMode.REAL 
        ? (realTopic?.part4Topic || "General") 
        : (part2Data?.topic || "General");

    // Create context only from Part 4 messages to avoid confusing the AI with previous parts
    const part4History = messages.filter(m => m.text.includes('[Part 4') || m.role === 'system');
    const historyContext = part4History.slice(-6);
    
    // Generate response with specific focus on last user text
    responseText = await GeminiService.generatePart4Turn(historyContext, topicContext, lastUserText || undefined);

    // Add AI response to history
    addMessage('ai', `[Part 4 Partner]: ${responseText}`);

    // CRITICAL: Stop any existing TTS before speaking
    stopSpeaking();
    speak(responseText, () => {
      // CRITICAL: AI finished speaking, automatically switch to user turn
      // No need to wait for user to click button
      console.log("AI finished speaking, automatically switching to user turn");
      stopSpeaking();
      
      // CRITICAL: Automatically start user turn after AI finishes
      // Use a closure to capture the current stage value
      const currentStage = stage;
      setTimeout(() => {
        // Double-check we're still in Part 4 (use captured value to avoid closure issues)
        if (currentStage === ExamStage.PART4_PAIR_DISCUSSION) {
          console.log("Auto-switching to user turn after AI finished");
          // Set turn to user
          setPart4Turn('user');
          
          // CRITICAL: Ensure clean state - stop everything first
          stopListening();
          stopSpeaking(); // Double-check TTS is stopped
          resetTranscript();
          
          // Start listening for user with proper delays
          setTimeout(() => {
            // Double-check: stop again to be absolutely sure
            stopListening();
            setTimeout(() => {
              try {
                console.log("Starting listening after AI turn...");
                startListening();
                // Verify it started - use longer delays to account for state update
                setTimeout(() => {
                  // Check again after state has time to update
                  setTimeout(() => {
                    if (!isListening) {
                      console.warn("Listening did not start after AI turn, retrying...");
                      stopListening(); // Ensure clean state
                      setTimeout(() => {
                        startListening();
                        setTimeout(() => {
                          if (!isListening) {
                            console.error("Listening failed after AI turn, using fallback");
                            handlePart4UserTurn();
                          } else {
                            console.log("Listening started successfully after AI turn (retry)");
                          }
                        }, 300);
                      }, 150);
                    } else {
                      console.log("Listening started successfully after AI turn");
                    }
                  }, 100); // Additional check delay
                }, 300); // Initial check delay
              } catch (error) {
                console.error("Failed to start listening after AI turn:", error);
                // If error is "already started", that's actually OK - it means it's working
                if (error instanceof Error && error.message.includes('already started')) {
                  console.log("Listening already started (this is OK)");
                } else {
                  // Fallback
                  setTimeout(() => handlePart4UserTurn(), 200);
                }
              }
            }, 250); // Delay after stop
          }, 250); // Initial delay
        } else {
          console.warn("Stage changed, not switching to user turn");
        }
      }, 300); // Longer delay to ensure TTS is fully stopped
    });
  };

  // 5. Part 5: In-Depth Question (Blind)
  const startPart5 = async () => {
    resetTranscript();
    setStage(ExamStage.PART5_IN_DEPTH_QA);
    
    // Generate question FIRST
    const q = await GeminiService.getPart5Question(examMode, realTopic, part2Data?.topic);
    setPart5Question(q);

    // Small delay to ensure UI is rendered and TTS queue is clear
    // CRITICAL: Stop any existing listening and TTS before speaking
    stopListening();
    stopSpeaking();
    
    setTimeout(() => {
        speak(`Part 5. Please listen to the question carefully. ${q}`, () => {
           // CRITICAL: Ensure TTS is fully stopped before starting recording
           stopSpeaking();
           setTimeout(() => {
             console.log("Part 5: Starting timer and listening...");
             setIsTimerActive(true);
             setTimeout(() => {
               startListening();
               setTimeout(() => {
                 if (!isListening) {
                   console.warn("Part 5: Listening did not start, retrying...");
                   startListening();
                 }
               }, 200);
             }, 150);
           }, 100);
        });
    }, 500);
  };

  // Report & Save
  const finishExam = async () => {
    console.log("finishExam called. Current stage:", stage);
    
    // CRITICAL: Stop listening and TTS first
    stopListening();
    stopSpeaking();
    setIsTimerActive(false);
    
    // CRITICAL: Before finishing, save any current text that hasn't been saved yet
    // This is important when user clicks "End Exam" before timer finishes
    setTimeout(() => {
      const currentText = getTranscript();
      console.log("Current transcript before finishing:", currentText);
      
      // Save current text based on current stage
      const currentStage = stage;
      let textSaved = false;
      
      // CRITICAL: Use setMessages with function to get latest messages and check/save text
      setMessages(currentMessages => {
        console.log("Current messages in finishExam:", currentMessages);
        
        if (currentText && currentText.trim()) {
          switch(currentStage) {
            case ExamStage.PART1_SELF_INTRO:
              // Check if Part 1 text is already saved
              const part1Exists = currentMessages.some(m => m.text.includes('[Part 1]'));
              if (!part1Exists) {
                const processedText = PunctuationService.addPunctuation(currentText);
                const metrics = getSpeechMetrics();
                console.log("Saving Part 1 text on early finish (with punctuation):", processedText);
                console.log("Part 1 speech metrics:", metrics);
                textSaved = true;
                return [...currentMessages, { role: 'user' as const, text: `[Part 1] ${processedText}`, timestamp: Date.now(), ...(metrics && { speechMetrics: metrics }) }];
              }
              break;
            case ExamStage.PART2_SHORT_QA:
              const part2Exists = currentMessages.some(m => m.text.includes('[Part 2]'));
              if (!part2Exists) {
                const processedText = PunctuationService.addPunctuation(currentText);
                const metrics = getSpeechMetrics();
                console.log("Saving Part 2 text on early finish (with punctuation):", processedText);
                console.log("Part 2 speech metrics:", metrics);
                textSaved = true;
                return [...currentMessages, { role: 'user' as const, text: `[Part 2] ${processedText}`, timestamp: Date.now(), ...(metrics && { speechMetrics: metrics }) }];
              }
              break;
            case ExamStage.PART3_PRESENTATION:
              const part3Exists = currentMessages.some(m => m.text.includes('[Part 3]'));
              if (!part3Exists) {
                const processedText = PunctuationService.addPunctuation(currentText);
                const metrics = getSpeechMetrics();
                console.log("Saving Part 3 text on early finish (with punctuation):", processedText);
                console.log("Part 3 speech metrics:", metrics);
                textSaved = true;
                return [...currentMessages, { role: 'user' as const, text: `[Part 3] ${processedText}`, timestamp: Date.now(), ...(metrics && { speechMetrics: metrics }) }];
              }
              break;
            case ExamStage.PART4_PAIR_DISCUSSION:
              // Part 4 handles its own messages, but if user is speaking, save it
              if (part4Turn === 'user') {
                const part4EndExists = currentMessages.some(m => m.text.includes('[Part 4 End]'));
                if (!part4EndExists) {
                  const processedText = PunctuationService.addPunctuation(currentText);
                  const metrics = getSpeechMetrics();
                  console.log("Saving Part 4 text on early finish (with punctuation):", processedText);
                  console.log("Part 4 speech metrics:", metrics);
                  textSaved = true;
                  return [...currentMessages, { role: 'user' as const, text: `[Part 4 End] ${processedText}`, timestamp: Date.now(), ...(metrics && { speechMetrics: metrics }) }];
                }
              }
              break;
            case ExamStage.PART5_IN_DEPTH_QA:
              const part5Exists = currentMessages.some(m => m.text.includes('[Part 5]'));
              if (!part5Exists) {
                const processedText = PunctuationService.addPunctuation(currentText);
                const metrics = getSpeechMetrics();
                console.log("Saving Part 5 text on early finish (with punctuation):", processedText);
                console.log("Part 5 speech metrics:", metrics);
                textSaved = true;
                return [...currentMessages, { role: 'user' as const, text: `[Part 5] ${processedText}`, timestamp: Date.now(), ...(metrics && { speechMetrics: metrics }) }];
              }
              break;
          }
        }
        
        // No changes needed, return current messages
        return currentMessages;
      });
      
      // Wait a bit more to ensure message is added, then get final messages
      setTimeout(() => {
        // CRITICAL: Use setMessages with function to get the LATEST messages (after any updates)
        setMessages(finalMessages => {
          console.log("Final messages for report:", finalMessages);
          console.log("Messages count:", finalMessages.length);
          
          // Check if we have any messages to generate report
          if (finalMessages.length === 0) {
            console.warn("No messages found, cannot generate report");
            // Still show report with error message
            setStage(ExamStage.REPORT);
            setIsViewingHistoryRecord(false);
            setExamResult({
              totalGrade: "D",
              part1Feedback: { originalText: "", feedback: "No responses recorded. Please complete at least one part of the exam.", score: 0 },
              part2Feedback: { originalText: "", feedback: "No responses recorded.", score: 0 },
              part3Feedback: { originalText: "", feedback: "No responses recorded.", score: 0 },
              part4Feedback: { originalText: "", feedback: "No responses recorded.", score: 0 },
              part5Feedback: { originalText: "", feedback: "No responses recorded.", score: 0 },
              highFreqErrors: ["No exam data available"],
              generalAdvice: "Please complete at least one part of the exam before finishing."
            });
            return finalMessages;
          }
          
          // Set processing state first
          setStage(ExamStage.PROCESSING);
          setIsProcessing(true);
          setIsViewingHistoryRecord(false); // This is a live result
          
          // Generate Result with error handling
          (async () => {
            try {
              console.log("Starting report generation...");
              // For practice mode, only evaluate the practiced part
              const practicePartToEvaluate = (examType === ExamType.PRACTICE && practicePart) ? practicePart : undefined;
              const res = await GeminiService.generateReport(finalMessages, practicePartToEvaluate);
              console.log("Report generated successfully:", res);
              
              setExamResult(res);
              
              // --- AUTO SAVE ---
              const topicName = examMode === ExamMode.REAL 
                  ? (realTopic?.name || "Unknown Real Topic") 
                  : (part2Data?.topic || "AI Generated Topic");

              const newRecord: ExamRecord = {
                  id: Math.random().toString(36).substr(2, 9),
                  timestamp: Date.now(),
                  mode: examMode,
                  topicName: topicName,
                  result: res,
                  fullTranscript: finalMessages,
                  examType: examType || undefined,
                  practicePart: (examType === ExamType.PRACTICE && practicePart) ? practicePart : undefined
              };
              
              StorageService.saveRecord(newRecord);
              console.log("Exam saved successfully with", finalMessages.length, "messages");
              console.log("Messages content:", finalMessages.map(m => m.text));
              
              // Switch to report stage after result is set
              setStage(ExamStage.REPORT);
              setIsProcessing(false);
            } catch (error) {
              console.error("Error generating report:", error);
              // Show error in report
              setExamResult({
                totalGrade: "C",
                part1Feedback: { originalText: "", feedback: `Error generating report: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`, score: 0 },
                part2Feedback: { originalText: "", feedback: "Error", score: 0 },
                part3Feedback: { originalText: "", feedback: "Error", score: 0 },
                part4Feedback: { originalText: "", feedback: "Error", score: 0 },
                part5Feedback: { originalText: "", feedback: "Error", score: 0 },
                highFreqErrors: ["Report generation failed"],
                generalAdvice: "An error occurred while generating the report. Please check your API key and try again."
              });
              setStage(ExamStage.REPORT);
              setIsProcessing(false);
            }
          })();
          
          // Return unchanged (we're just using this to get latest value)
          return finalMessages;
        });
      }, textSaved ? 300 : 200); // Wait longer if we just saved text
    }, 300); // Wait for text to be captured
  };

  // Reset State for New Exam (Replaces window.location.reload)
  const resetExamState = () => {
    stopSpeaking();
    stopListening();
    resetTranscript();
    setIsTimerActive(false);
    setIsProcessing(false);
    setMessages([]);
    setExamResult(null);
    setPart2Data(null);
    setPart3Data(null);
    setPart5Question("");
    setRealTopic(undefined);
    setPart4GlobalTimerActive(false);
    setPart4Turn('user');
    setExamType(null);
    setPracticePart(null);
    setIsViewingHistoryRecord(false);
    setViewingRecordTranscript([]);
    setStage(ExamStage.MODE_SELECTION);
  };

  // --- RENDERING ---

  const renderModeSelection = () => (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8 pb-10">
          <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold text-slate-800">CET-6 Simulator</h1>
              <p className="text-slate-500">Choose your examination mode</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 w-full max-w-3xl px-4">
              {/* Real Mode */}
              <button 
                onClick={() => selectMode(ExamMode.REAL)}
                className="group relative bg-white p-8 rounded-2xl shadow-lg border-2 border-transparent hover:border-blue-500 transition-all text-left flex flex-col gap-4"
              >
                 <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                    <BookOpen size={24} />
                 </div>
                 <div>
                     <h3 className="text-xl font-bold text-slate-800">Real Exam Mode</h3>
                     <p className="text-sm text-slate-500 mt-1">Questions from the "Core Knowledge Base". Fixed topics (e.g. Money, Spring Festival).</p>
                 </div>
                 <div className="mt-auto pt-4 flex items-center text-blue-600 font-medium text-sm">
                    Start Real Mode <CheckCircle2 size={16} className="ml-2"/>
                 </div>
              </button>

              {/* Sim Mode */}
              <button 
                onClick={() => selectMode(ExamMode.SIMULATION)}
                className="group relative bg-white p-8 rounded-2xl shadow-lg border-2 border-transparent hover:border-purple-500 transition-all text-left flex flex-col gap-4"
              >
                 <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                    <Sparkles size={24} />
                 </div>
                 <div>
                     <h3 className="text-xl font-bold text-slate-800">AI Simulation Mode</h3>
                     <p className="text-sm text-slate-500 mt-1">AI mimics the CET-6 style to generate fresh, never-before-seen topics.</p>
                 </div>
                 <div className="mt-auto pt-4 flex items-center text-purple-600 font-medium text-sm">
                    Start AI Sim <CheckCircle2 size={16} className="ml-2"/>
                 </div>
              </button>
          </div>

          {/* History Link */}
          <button onClick={openHistory} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mt-8">
             <History size={18} /> View Past Exams
          </button>
      </div>
  );

  const renderHistory = () => (
      <div className="max-w-4xl mx-auto pt-8 pb-20">
          <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-3">
                   <button onClick={() => setStage(ExamStage.MODE_SELECTION)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                       <ChevronLeft size={24} className="text-slate-600"/>
                   </button>
                   <h1 className="text-2xl font-bold text-slate-800">Exam History</h1>
               </div>
               {historyRecords.length > 0 && (
                   <button 
                     onClick={() => {
                         if(confirm('Clear all history?')) {
                             StorageService.clearAll();
                             setHistoryRecords([]);
                         }
                     }} 
                     className="text-sm text-red-500 hover:text-red-700 px-3 py-1"
                   >
                       Clear All
                   </button>
               )}
          </div>

          {historyRecords.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                  <History size={48} className="mx-auto mb-4 opacity-50"/>
                  <p>No saved exams found.</p>
              </div>
          ) : (
              <div className="grid gap-4">
                  {historyRecords.map((record) => (
                      <div key={record.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:shadow-md">
                          <div>
                              <div className="flex items-center gap-3 mb-1">
                                  <span className={`text-xs font-bold px-2 py-1 rounded ${record.mode === ExamMode.REAL ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                      {record.mode === ExamMode.REAL ? 'Real Mode' : 'AI Sim'}
                                  </span>
                                  <span className="text-xs text-slate-400">{new Date(record.timestamp).toLocaleString()}</span>
                              </div>
                              <h3 className="font-bold text-slate-800 text-lg">{record.topicName}</h3>
                              <div className="mt-2 flex items-center gap-2">
                                  <span className="text-sm text-slate-500">Grade:</span>
                                  <span className={`font-bold text-lg ${['A+','A'].includes(record.result.totalGrade) ? 'text-green-600' : 'text-blue-600'}`}>
                                      {record.result.totalGrade}
                                  </span>
                              </div>
                          </div>
                          
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                              <button 
                                onClick={() => {
                                    // CRITICAL: Ensure record.result has all required fields with defaults
                                    const defaultFeedback = { originalText: "", feedback: "No data available", score: 0 };
                                    const safeResult = {
                                        totalGrade: record.result?.totalGrade || 'C',
                                        part1Feedback: record.result?.part1Feedback || defaultFeedback,
                                        part2Feedback: record.result?.part2Feedback || defaultFeedback,
                                        part3Feedback: record.result?.part3Feedback || defaultFeedback,
                                        part4Feedback: record.result?.part4Feedback || defaultFeedback,
                                        part5Feedback: record.result?.part5Feedback || defaultFeedback,
                                        highFreqErrors: record.result?.highFreqErrors || [],
                                        generalAdvice: record.result?.generalAdvice || "No advice available."
                                    };
                                    setExamResult(safeResult);
                                    setIsViewingHistoryRecord(true);
                                    setViewingRecordTranscript(record.fullTranscript || []);
                                    // CRITICAL: Restore examType and practicePart from record for proper filtering
                                    // If record doesn't have examType (old records), default to null (full exam)
                                    setExamType(record.examType || null);
                                    setPracticePart(record.practicePart || null);
                                    setStage(ExamStage.REPORT);
                                }}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition-colors"
                              >
                                  <Eye size={16} /> View
                              </button>
                              <button 
                                onClick={() => StorageService.exportRecord(record)}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-medium text-sm transition-colors"
                              >
                                  <Download size={16} /> JSON
                              </button>
                              <button 
                                onClick={() => {
                                    StorageService.deleteRecord(record.id);
                                    setHistoryRecords(prev => prev.filter(r => r.id !== record.id));
                                }}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                  <Trash2 size={18} />
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>
  );

  const renderExamTypeSelection = () => (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8 pb-10">
          <div className="text-center space-y-2">
              <button onClick={() => setStage(ExamStage.MODE_SELECTION)} className="absolute top-4 left-4 p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <ChevronLeft size={24} className="text-slate-600"/>
              </button>
              <h1 className="text-4xl font-bold text-slate-800">选择考试类型</h1>
              <p className="text-slate-500">Choose your exam type</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 w-full max-w-3xl px-4">
              {/* 完整考试 */}
              <button 
                onClick={() => selectExamType(ExamType.FULL_EXAM)}
                className="group relative bg-white p-8 rounded-2xl shadow-lg border-2 border-transparent hover:border-green-500 transition-all text-left flex flex-col gap-4"
              >
                 <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                    <GraduationCap size={24} />
                 </div>
                 <div>
                     <h3 className="text-xl font-bold text-slate-800">完整考试</h3>
                     <p className="text-sm text-slate-500 mt-1">完成所有5个部分，获得完整评分报告</p>
                 </div>
                 <div className="mt-auto pt-4 flex items-center text-green-600 font-medium text-sm">
                    开始完整考试 <CheckCircle2 size={16} className="ml-2"/>
                 </div>
              </button>

              {/* 专项特训 */}
              <button 
                onClick={() => selectExamType(ExamType.PRACTICE)}
                className="group relative bg-white p-8 rounded-2xl shadow-lg border-2 border-transparent hover:border-orange-500 transition-all text-left flex flex-col gap-4"
              >
                 <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                    <BrainCircuit size={24} />
                 </div>
                 <div>
                     <h3 className="text-xl font-bold text-slate-800">专项特训</h3>
                     <p className="text-sm text-slate-500 mt-1">选择单个部分进行针对性练习</p>
                 </div>
                 <div className="mt-auto pt-4 flex items-center text-orange-600 font-medium text-sm">
                    选择部分 <CheckCircle2 size={16} className="ml-2"/>
                 </div>
              </button>
          </div>
      </div>
  );

  const renderPracticePartSelection = () => (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8 pb-10">
          <div className="text-center space-y-2">
              <button onClick={() => setStage(ExamStage.EXAM_TYPE_SELECTION)} className="absolute top-4 left-4 p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <ChevronLeft size={24} className="text-slate-600"/>
              </button>
              <h1 className="text-4xl font-bold text-slate-800">选择练习部分</h1>
              <p className="text-slate-500">Choose a part to practice</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl px-4">
              {[
                  { part: PracticePart.PART1, name: 'Part 1', desc: '自我介绍', icon: User, color: 'blue' },
                  { part: PracticePart.PART2, name: 'Part 2', desc: '简短问答', icon: FileText, color: 'green' },
                  { part: PracticePart.PART3, name: 'Part 3', desc: '个人陈述', icon: BookOpen, color: 'purple' },
                  { part: PracticePart.PART4, name: 'Part 4', desc: '双人讨论', icon: Users, color: 'orange' },
                  { part: PracticePart.PART5, name: 'Part 5', desc: '深入问答', icon: Ear, color: 'red' },
              ].map(({ part, name, desc, icon: Icon, color }) => (
                  <button
                      key={part}
                      onClick={() => selectPracticePart(part)}
                      className={`group relative bg-white p-6 rounded-xl shadow-lg border-2 border-transparent hover:border-${color}-500 transition-all text-left flex flex-col gap-3`}
                  >
                      <div className={`w-10 h-10 bg-${color}-100 rounded-full flex items-center justify-center text-${color}-600 group-hover:scale-110 transition-transform`}>
                          <Icon size={20} />
                      </div>
                      <div>
                          <h3 className="text-lg font-bold text-slate-800">{name}</h3>
                          <p className="text-sm text-slate-500 mt-1">{desc}</p>
                      </div>
                  </button>
              ))}
          </div>
      </div>
  );

  const renderOnboarding = () => (
    <div className="flex flex-col items-center justify-center space-y-8 py-12">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full text-center border border-slate-100">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
                {examMode === ExamMode.REAL ? <BookOpen size={40}/> : <Sparkles size={40}/>}
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Ready?</h1>
            <p className="text-slate-500 mb-4">
                Mode: <span className="font-semibold text-slate-700">{examMode === ExamMode.REAL ? 'Real Exam (Knowledge Base)' : 'AI Simulation'}</span>
            </p>
            {realTopic && (
                <div className="bg-slate-50 p-3 rounded-lg mb-6 text-sm text-slate-600">
                    Selected Topic Set: <strong>{realTopic.name}</strong>
                </div>
            )}
            {!isSupported && <div className="p-4 bg-red-50 text-red-600 rounded-lg mb-4 text-sm">Browser not supported. Use Chrome.</div>}
            
            <div className="flex gap-3">
                <button 
                    onClick={() => setStage(ExamStage.MODE_SELECTION)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 rounded-xl"
                >
                    Back
                </button>
                <button 
                    onClick={startExam}
                    disabled={!isSupported}
                    className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2"
                >
                    <Play size={20} fill="currentColor"/>
                    Start Exam
                </button>
            </div>
        </div>
    </div>
  );

  const renderProcessing = () => (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-6 animate-in fade-in duration-300">
          <div className="relative w-24 h-24">
              <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold text-slate-700">Processing Response...</h2>
          <p className="text-slate-500">Saving your answer...</p>
      </div>
  );

  const renderPart1 = () => (
    <div className="flex flex-col items-center space-y-8 max-w-2xl mx-auto pt-10">
        <div className="flex flex-col items-center">
             <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-lg">
                 <User size={48} className="text-slate-400" />
             </div>
             <div className="bg-white px-6 py-3 rounded-full shadow-sm border border-slate-200">
                 <p className="font-medium text-slate-700">Examiner</p>
             </div>
        </div>
        
        <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-slate-800">Part 1: Self Introduction</h2>
            <p className="text-xl text-blue-600">"Please make a brief self-introduction."</p>
        </div>

        <Timer duration={20} isActive={isTimerActive} onFinish={handleTimerFinish} variant="success" />
        
        <div className="w-full bg-slate-100 rounded-xl p-4 min-h-[100px] flex items-center justify-center flex-col gap-2">
            {isListening && <div className="text-red-500 text-sm font-bold flex items-center gap-2"><div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"/> Recording</div>}
            <p className="text-slate-600 text-center italic">{transcript || "Speak now..."}</p>
        </div>
    </div>
  );

  const renderPart2 = () => (
    <div className="flex flex-col items-center space-y-6 max-w-3xl mx-auto pt-6">
        <div className="w-full bg-white border-l-4 border-blue-600 p-6 shadow-md rounded-r-xl">
             <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Part 2: Short Q&A</span>
             <h2 className="text-3xl font-bold text-slate-800 mt-2">Topic: {part2Data?.topic || "Loading..."}</h2>
        </div>

        <div className="w-full bg-blue-50 border border-blue-100 p-8 rounded-2xl text-center min-h-[150px] flex items-center justify-center relative overflow-hidden">
            {isTimerActive && <div className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded animate-pulse">SCORING STARTED</div>}
            <p className="text-2xl font-medium text-blue-900 leading-relaxed">
                {part2Data?.question || "..."}
            </p>
        </div>

        <Timer duration={30} isActive={isTimerActive} onFinish={handleTimerFinish} variant="success" />
        <Visualizer isListening={isListening} />
        <div className="w-full text-center text-slate-400 text-sm">{transcript}</div>
    </div>
  );

  const renderPart3 = () => (
    <div className="flex flex-col items-center space-y-6 max-w-3xl mx-auto pt-6">
        <div className="flex items-center gap-4 mb-4">
             <div className={`px-4 py-2 rounded-full font-bold ${stage === ExamStage.PART3_PREP ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-400'}`}>
                1. Preparing
             </div>
             <div className={`px-4 py-2 rounded-full font-bold ${stage === ExamStage.PART3_PRESENTATION ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                2. Answering
             </div>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 w-full text-center space-y-4 relative">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-800 text-white px-4 py-1 rounded text-xs uppercase tracking-wider">Prompt Card</div>
             <h2 className="text-xl font-bold text-slate-800">{part3Data?.title}</h2>
             <blockquote className="text-2xl italic font-serif text-slate-600 border-l-4 border-blue-400 pl-4 py-2 my-6">
                "{part3Data?.quote}"
             </blockquote>
        </div>

        {stage === ExamStage.PART3_PREP ? (
            <Timer duration={60} isActive={isTimerActive} onFinish={handleTimerFinish} variant="warning" label="Preparation Time" />
        ) : (
            <>
                <Timer duration={90} isActive={isTimerActive} onFinish={handleTimerFinish} variant="success" label="Speaking Time" />
                <Visualizer isListening={isListening} />
                <div className="w-full text-center text-slate-400 text-sm">{transcript}</div>
            </>
        )}
        
        {stage === ExamStage.PART3_PREP && (
            <button onClick={handleTimerFinish} className="text-sm text-slate-400 hover:text-slate-600 underline">Skip Prep</button>
        )}
    </div>
  );

  const renderPart4 = () => {
    const discussionTopic = examMode === ExamMode.REAL 
        ? (realTopic?.part4Topic || "Discussion Topic")
        : (part2Data?.topic || "Discussion Topic");
    
    // Helper to show dialogue history specifically for Part 4
    const dialogueHistory = messages.filter(m => m.text.includes('[Part 4'));

    return (
        <div className="flex flex-col h-[85vh]">
             {/* Header */}
             <div className="flex-none bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <Users className="text-purple-600" />
                        <h2 className="font-bold text-slate-700">Part 4: Pair Discussion</h2>
                    </div>
                    <div className="w-24">
                         {/* Global Timer - Calls handleTimerFinish to END PART 4 completely */}
                         <Timer duration={180} isActive={part4GlobalTimerActive} onFinish={handleTimerFinish} variant="default" />
                    </div>
                </div>
                <div className="bg-purple-50 border border-purple-100 p-3 rounded-lg text-center">
                    <p className="text-xs font-bold text-purple-600 uppercase">Topic</p>
                    <p className="font-medium text-purple-900 text-lg leading-tight">{discussionTopic}</p>
                </div>
             </div>
    
             {/* Chat & Avatar Area */}
             <div className="flex-1 flex gap-4 overflow-hidden mb-4">
                 {/* History Side Panel (Optional, but good for context) */}
                 <div className="w-1/3 bg-slate-50 rounded-xl border border-slate-100 p-4 overflow-y-auto hidden md:block">
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-4">Dialogue History</h3>
                    <div className="space-y-3">
                        {dialogueHistory.map((msg, i) => (
                            <div key={i} className={`p-3 rounded-lg text-xs ${msg.role === 'ai' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                <strong>{msg.role === 'ai' ? 'Partner' : 'You'}:</strong> {msg.text.replace(/\[Part 4.*?\]:\s*/, '')}
                            </div>
                        ))}
                    </div>
                 </div>

                 {/* Main Stage */}
                 <div className="flex-1 bg-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center relative border border-slate-200">
                      {/* Turn Indicator */}
                      <div className={`absolute top-4 transition-all duration-500 px-6 py-2 rounded-full text-white font-bold shadow-lg ${part4Turn === 'user' ? 'bg-green-500 scale-110' : 'bg-purple-500 scale-100'}`}>
                          {part4Turn === 'user' ? 'YOUR TURN' : 'PARTNER SPEAKING'}
                      </div>
    
                      <div className="flex items-center justify-between w-full max-w-lg mt-12">
                          <div className={`flex flex-col items-center transition-opacity ${part4Turn === 'user' ? 'opacity-100' : 'opacity-50'}`}>
                               <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center border-4 border-white shadow">
                                   <UserCircle2 size={48} className="text-green-600" />
                               </div>
                               <p className="mt-2 font-bold text-slate-600">You</p>
                          </div>
    
                          <div className="h-1 w-24 bg-slate-300 rounded-full mx-4"></div>
    
                          <div className={`flex flex-col items-center transition-opacity ${part4Turn === 'ai' ? 'opacity-100' : 'opacity-50'}`}>
                               <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center border-4 border-white shadow relative">
                                   <Users size={40} className="text-purple-600" />
                                   {part4Turn === 'ai' && <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full animate-ping" />}
                               </div>
                               <p className="mt-2 font-bold text-slate-600">Partner</p>
                          </div>
                      </div>
    
                      {/* Dynamic Transcript Bubble */}
                      <div className="mt-8 w-full max-w-lg p-6 bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[120px] flex items-center justify-center text-center">
                           {part4Turn === 'ai' ? (
                               <p className="text-slate-700 text-lg leading-relaxed animate-pulse">
                                   {messages.length > 0 && messages[messages.length - 1]?.role === 'ai' ? messages[messages.length - 1].text.replace(/\[Part 4.*?\]:\s*/, '') : "..."}
                               </p>
                           ) : (
                               <div>
                                   <p className="text-slate-500 italic mb-2">{transcript || "Start the discussion..."}</p>
                                   <Visualizer isListening={isListening} />
                               </div>
                           )}
                      </div>
                 </div>
             </div>
    
             {/* Controls */}
             <div className="flex-none h-24 bg-white rounded-xl shadow border border-slate-200 p-4 flex items-center justify-between">
                 {part4Turn === 'user' ? (
                     <div className="flex items-center gap-4 w-full">
                         <div className="flex-1 text-sm text-slate-400">Speak your point, then click Done to let Partner speak.</div>
                         <button onClick={manualFinishPart4UserTurn} className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-lg flex items-center gap-2">
                             Done / Next <SkipForward size={18} />
                         </button>
                     </div>
                 ) : (
                     <div className="flex items-center justify-between w-full px-4">
                        <div className="text-slate-400 text-sm flex items-center gap-2"><Volume2 className="animate-pulse text-purple-500"/> Partner is speaking...</div>
                        <button onClick={handlePart4Interrupt} className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold shadow-lg flex items-center gap-2 animate-pulse">
                             <PauseCircle size={18} /> Interrupt
                        </button>
                     </div>
                 )}
             </div>
        </div>
    );
  }

  const renderPart5 = () => (
    <div className="flex flex-col items-center justify-center h-[70vh] space-y-8 select-none" onContextMenu={(e) => e.preventDefault()}>
        <div className="bg-slate-800 text-white p-8 rounded-full shadow-2xl animate-pulse">
            <Ear size={80} />
        </div>
        
        <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-slate-800">Part 5: In-Depth Question</h2>
            <div className="bg-red-50 text-red-600 px-4 py-2 rounded border border-red-100 font-medium">
                Listen Carefully. Text is hidden.
            </div>
        </div>

        <div className="w-64">
             {isTimerActive ? (
                 <Timer duration={45} isActive={true} onFinish={handleTimerFinish} variant="success" />
             ) : (
                 <div className="flex justify-center text-blue-600"><Volume2 className="animate-bounce"/> Speaking...</div>
             )}
        </div>

        <div className="h-16 w-full max-w-md flex items-center justify-center">
            {isTimerActive && <Visualizer isListening={isListening} />}
        </div>
    </div>
  );

  const renderReport = () => {
      if (!examResult) return (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
             <p className="text-slate-500">Analyzing your performance part by part...</p>
          </div>
      );

      // CRITICAL: Ensure all feedback objects exist with default values to prevent undefined errors
      const defaultFeedback = { originalText: "", feedback: "No data available", score: 0 };
      
      // CRITICAL: Normalize examResult to ensure all fields exist
      const safeExamResult = {
          totalGrade: examResult.totalGrade || 'C',
          part1Feedback: examResult.part1Feedback || defaultFeedback,
          part2Feedback: examResult.part2Feedback || defaultFeedback,
          part3Feedback: examResult.part3Feedback || defaultFeedback,
          part4Feedback: examResult.part4Feedback || defaultFeedback,
          part5Feedback: examResult.part5Feedback || defaultFeedback,
          highFreqErrors: examResult.highFreqErrors || [],
          generalAdvice: examResult.generalAdvice || "No advice available."
      };
      
      const allSections = [
          { title: "Part 1: Intro", data: safeExamResult.part1Feedback, partKey: 'PART1' },
          { title: "Part 2: Q&A", data: safeExamResult.part2Feedback, partKey: 'PART2' },
          { title: "Part 3: Presentation", data: safeExamResult.part3Feedback, partKey: 'PART3' },
          { title: "Part 4: Discussion", data: safeExamResult.part4Feedback, partKey: 'PART4' },
          { title: "Part 5: In-Depth", data: safeExamResult.part5Feedback, partKey: 'PART5' },
      ];
      
      // Check if this is a practice session and which part was practiced
      const isPractice = examType === ExamType.PRACTICE;
      const practicedPart = practicePart;
      
      // Filter sections: in practice mode, only show the practiced part
      const sections = isPractice && practicedPart
          ? allSections.filter(sec => sec.partKey === practicedPart)
          : allSections;

      return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12 pt-6">
             <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 flex flex-col md:flex-row justify-between items-center relative">
                  {isViewingHistoryRecord && (
                      <button onClick={openHistory} className="absolute top-4 left-4 text-slate-500 hover:text-blue-600 flex items-center gap-1">
                          <ChevronLeft size={18}/> Back to History
                      </button>
                  )}

                  <div>
                      <h1 className="text-3xl font-bold text-slate-800 mt-6 md:mt-0">
                          {isViewingHistoryRecord ? 'Historical Report' : 'Exam Report'}
                      </h1>
                      <p className="text-slate-500 mt-2">Overall Grade</p>
                      <div className="text-6xl font-black text-blue-600 mt-1">{safeExamResult.totalGrade}</div>
                  </div>
                  <div className="mt-6 md:mt-0 max-w-md">
                      <h4 className="font-bold text-red-500 flex items-center gap-2 mb-2"><AlertCircle size={18}/> High Frequency Errors</h4>
                      <ul className="list-disc list-inside text-sm text-slate-600 bg-red-50 p-4 rounded-lg">
                          {safeExamResult.highFreqErrors?.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                  </div>
             </div>

             {/* Detailed Sections */}
             <div className="space-y-6">
                 <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
                     <h2 className="text-xl font-bold text-slate-700 mb-3">Section Breakdown</h2>
                     <div className="text-sm text-slate-600 space-y-2">
                         <p className="font-semibold text-slate-700">评分标准 (SET-6 Official Standards):</p>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                             <div className="bg-white p-3 rounded-lg border border-blue-100">
                                 <p className="font-bold text-blue-700 text-xs mb-1">准确性 (Accuracy)</p>
                                 <p className="text-xs text-slate-600">语法、词汇、发音 (5分)</p>
                             </div>
                             <div className="bg-white p-3 rounded-lg border border-green-100">
                                 <p className="font-bold text-green-700 text-xs mb-1">连贯性 (Coherence)</p>
                                 <p className="text-xs text-slate-600">话语长短、流畅度 (5分)</p>
                             </div>
                             <div className="bg-white p-3 rounded-lg border border-purple-100">
                                 <p className="font-bold text-purple-700 text-xs mb-1">互动性 (Flexibility)</p>
                                 <p className="text-xs text-slate-600">应变能力、参与度 (5分)</p>
                             </div>
                         </div>
                         <p className="text-xs text-slate-500 mt-2">每部分满分15分 (三个维度各5分) | A级: 13-15分 | B级: 10-12分 | C级: 7-9分 | D级: 0-6分</p>
                     </div>
                 </div>
                 {sections.map((sec, idx) => {
                     // CRITICAL: Ensure sec.data exists and has all required properties
                     const defaultFeedback = { originalText: "", feedback: "No data available", score: 0 };
                     if (!sec.data) {
                         console.warn(`Missing data for ${sec.title}`);
                         sec.data = defaultFeedback;
                     } else {
                         // Ensure all properties exist
                         sec.data = {
                             originalText: sec.data.originalText || "",
                             feedback: sec.data.feedback || "No feedback available",
                             score: sec.data.score ?? 0
                         };
                     }
                     
                     // For Part 4, extract full dialogue from messages
                     let displayText = (sec.data.originalText || "No response detected");
                     if (sec.partKey === 'PART4') {
                         // Extract all Part 4 messages from the transcript
                         const transcriptToUse = isViewingHistoryRecord ? viewingRecordTranscript : messages;
                         const part4Messages = transcriptToUse.filter(m => 
                             m.text.includes('[Part 4 User]') || 
                             m.text.includes('[Part 4 Partner]') || 
                             m.text.includes('[Part 4 End]')
                         );
                         
                         if (part4Messages.length > 0) {
                             // Build dialogue from messages
                             const dialogueLines = part4Messages.map(msg => {
                                 const text = msg.text.replace(/\[Part 4.*?\]:\s*/, '');
                                 if (msg.text.includes('[Part 4 User]') || msg.text.includes('[Part 4 End]')) {
                                     return `Candidate A: ${text}`;
                                 } else if (msg.text.includes('[Part 4 Partner]')) {
                                     return `Candidate B: ${text}`;
                                 }
                                 return text;
                             });
                             displayText = dialogueLines.join('\n');
                         } else if (sec.data?.originalText && (sec.data.originalText.includes('Candidate') || sec.data.originalText.includes('Partner'))) {
                             // Use originalText if it already contains dialogue format
                             displayText = sec.data.originalText;
                         }
                     }
                     
                     return (
                     <div key={idx} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                         <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                             <h3 className="font-bold text-slate-700">{sec.title}</h3>
                             <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                 (sec.data?.score || 0) >= 13 ? 'bg-green-100 text-green-700' : 
                                 (sec.data?.score || 0) >= 10 ? 'bg-blue-100 text-blue-700' : 
                                 (sec.data?.score || 0) >= 7 ? 'bg-yellow-100 text-yellow-700' : 
                                 'bg-red-100 text-red-700'
                             }`}>
                                 Score: {sec.data?.score || 0}/15
                             </span>
                         </div>
                         <div className="p-6 space-y-4">
                             <div>
                                 <p className="text-xs font-bold text-slate-400 uppercase mb-1">
                                     {sec.partKey === 'PART4' ? 'Full Dialogue' : 'Your Response'}
                                 </p>
                                 {sec.partKey === 'PART4' ? (
                                     <div className="text-slate-600 text-sm border-l-2 border-slate-200 pl-3 space-y-2 max-h-96 overflow-y-auto">
                                         {displayText.split('\n').map((line, i) => (
                                             line.trim() && (
                                                 <div key={i} className={
                                                     line.includes('Candidate A:') || line.includes('You:') 
                                                         ? 'text-green-700 font-medium mb-1' 
                                                         : line.includes('Candidate B:') || line.includes('Partner:') 
                                                         ? 'text-blue-700 font-medium mb-1' 
                                                         : 'mb-1'
                                                 }>
                                                     {line}
                                                 </div>
                                             )
                                         ))}
                                         {!displayText.includes('\n') && displayText !== "No response detected" && (
                                             <p className="italic">"{displayText}"</p>
                                         )}
                                         {displayText === "No response detected" && (
                                             <p className="text-slate-400 italic">No dialogue detected</p>
                                         )}
                                     </div>
                                 ) : (
                                     <p className="text-slate-600 italic text-sm border-l-2 border-slate-200 pl-3">
                                         "{displayText}"
                                     </p>
                                 )}
                             </div>
                             <div>
                                 <p className="text-xs font-bold text-blue-500 uppercase mb-3">Feedback</p>
                                 
                                 {/* Parse and display three dimensions separately */}
                                 {(() => {
                                     const feedback = sec.data?.feedback || '';
                                     
                                     // Helper function to extract dimension content
                                     const extractDimension = (text: string, patterns: string[]): string | null => {
                                         for (const pattern of patterns) {
                                             // Try with colon first
                                             const match1 = text.match(new RegExp(`${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[:：]\\s*([\\s\\S]*?)(?=(?:${patterns.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})[:：]|$)`, 'i'));
                                             if (match1 && match1[1]) return match1[1].trim();
                                             
                                             // Try without colon (just the keyword)
                                             const match2 = text.match(new RegExp(`${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+([\\s\\S]*?)(?=(?:${patterns.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})[:：\\s]|$)`, 'i'));
                                             if (match2 && match2[1]) return match2[1].trim();
                                         }
                                         return null;
                                     };
                                     
                                     // Define patterns for each dimension (English and Chinese)
                                     const accuracyPatterns = ['Accuracy and Range', '准确性', '准确性和范围'];
                                     const coherencePatterns = ['Size and Coherence', '连贯性', '话语长短和连贯性'];
                                     const flexibilityPatterns = ['Flexibility and Appropriateness', '互动性', '灵活性和适切性', '灵活性'];
                                     
                                     const accuracyText = extractDimension(feedback, accuracyPatterns);
                                     const coherenceText = extractDimension(feedback, coherencePatterns);
                                     const flexibilityText = extractDimension(feedback, flexibilityPatterns);
                                     
                                     // If we found at least one dimension, display them separately
                                     if (accuracyText || coherenceText || flexibilityText) {
                                         return (
                                             <div className="space-y-3">
                                                 {accuracyText && (
                                                     <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg shadow-sm">
                                                         <div className="flex items-center gap-2 mb-2">
                                                             <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                             <p className="font-bold text-blue-700 text-sm">准确性 (Accuracy and Range)</p>
                                                         </div>
                                                         <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{accuracyText}</p>
                                                     </div>
                                                 )}
                                                 {coherenceText && (
                                                     <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg shadow-sm">
                                                         <div className="flex items-center gap-2 mb-2">
                                                             <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                             <p className="font-bold text-green-700 text-sm">连贯性 (Size and Coherence)</p>
                                                         </div>
                                                         <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{coherenceText}</p>
                                                     </div>
                                                 )}
                                                 {flexibilityText && (
                                                     <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg shadow-sm">
                                                         <div className="flex items-center gap-2 mb-2">
                                                             <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                                             <p className="font-bold text-purple-700 text-sm">互动性 (Flexibility and Appropriateness)</p>
                                                         </div>
                                                         <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{flexibilityText}</p>
                                                     </div>
                                                 )}
                                             </div>
                                         );
                                     }
                                     
                                     // Fallback: if we can't parse, show original feedback in a clean format
                                     return (
                                         <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
                                             <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{feedback}</p>
                                         </div>
                                     );
                                 })()}
                             </div>
                         </div>
                     </div>
                     );
                 })}
             </div>

             <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                 <h3 className="font-bold text-blue-800 mb-2">General Advice</h3>
                 <p className="text-blue-700">{safeExamResult.generalAdvice}</p>
             </div>

             {!isViewingHistoryRecord && (
                 <button onClick={resetExamState} className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold hover:bg-slate-900 flex items-center justify-center gap-2">
                     <BrainCircuit /> Start New Exam
                 </button>
             )}
        </div>
      );
  };

  const getActiveRender = () => {
      switch(stage) {
          case ExamStage.MODE_SELECTION: return renderModeSelection();
          case ExamStage.EXAM_TYPE_SELECTION: return renderExamTypeSelection();
          case ExamStage.PRACTICE_PART_SELECTION: return renderPracticePartSelection();
          case ExamStage.HISTORY: return renderHistory();
          case ExamStage.ONBOARDING: return renderOnboarding();
          case ExamStage.PART1_SELF_INTRO: return renderPart1();
          case ExamStage.PART2_SHORT_QA: return renderPart2();
          case ExamStage.PART3_PREP: return renderPart3();
          case ExamStage.PART3_PRESENTATION: return renderPart3();
          case ExamStage.PART4_PAIR_DISCUSSION: return renderPart4();
          case ExamStage.PART5_IN_DEPTH_QA: return renderPart5();
          case ExamStage.PROCESSING: return renderProcessing();
          case ExamStage.REPORT: return renderReport();
          default: return renderModeSelection();
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={resetExamState}>
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">6</div>
                <span className="font-semibold text-slate-700 hidden sm:block">CET-6 Oral Simulator</span>
            </div>
            {stage !== ExamStage.ONBOARDING && stage !== ExamStage.MODE_SELECTION && stage !== ExamStage.EXAM_TYPE_SELECTION && stage !== ExamStage.PRACTICE_PART_SELECTION && stage !== ExamStage.HISTORY && stage !== ExamStage.REPORT && stage !== ExamStage.PROCESSING && (
                 <button onClick={finishExam} className="text-xs text-red-500 hover:bg-red-50 px-3 py-1 rounded-full border border-red-200">End Exam</button>
            )}
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-4 pb-20">
        {getActiveRender()}
      </main>
    </div>
  );
};

export default App;