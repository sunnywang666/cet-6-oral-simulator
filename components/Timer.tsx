import React, { useEffect, useState, useRef } from 'react';
import { Clock } from 'lucide-react';

interface TimerProps {
  duration: number; // in seconds
  onFinish: () => void;
  isActive: boolean;
  label?: string;
  variant?: 'default' | 'warning' | 'success'; 
}

const Timer: React.FC<TimerProps> = ({ duration, onFinish, isActive, label, variant = 'default' }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const onFinishRef = useRef(onFinish);
  const isActiveRef = useRef(isActive);

  // Update refs to avoid closure staleness in the interval
  useEffect(() => {
    onFinishRef.current = onFinish;
    isActiveRef.current = isActive;
  }, [onFinish, isActive]);

  // Reset timer when duration or active state changes substantially (start of new turn)
  useEffect(() => {
    if (isActive) {
        setTimeLeft(duration);
    }
  }, [duration, isActive]);

  useEffect(() => {
    if (!isActive) return;

    const intervalId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          // Critical: Call the ref to ensure we execute the LATEST finish logic
          // This forces the parent to handle the 'Time's Up' event strictly
          if (onFinishRef.current) onFinishRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isActive]);

  const progress = (timeLeft / duration) * 100;
  
  const getColors = () => {
    if (variant === 'warning') return { border: 'border-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-600', bar: 'bg-yellow-500' };
    if (variant === 'success') return { border: 'border-green-500', bg: 'bg-green-50', text: 'text-green-600', bar: 'bg-green-500' };
    return { border: 'border-blue-500', bg: 'bg-white', text: 'text-blue-600', bar: 'bg-blue-500' };
  };

  const colors = getColors();
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full flex flex-col items-center gap-2">
      <div className={`relative flex items-center justify-center w-32 h-32 rounded-full border-4 ${colors.border} ${colors.bg} ${colors.text} transition-colors duration-300 shadow-lg`}>
         <div className="flex flex-col items-center">
             <Clock size={24} className="mb-1 opacity-80"/>
             <span className="text-3xl font-bold font-mono">{formatTime(timeLeft)}</span>
         </div>
      </div>
      {label && <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">{label}</span>}
      
      <div className="w-full max-w-md h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
        <div 
            className={`h-full transition-all duration-1000 ease-linear ${colors.bar}`}
            style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default Timer;