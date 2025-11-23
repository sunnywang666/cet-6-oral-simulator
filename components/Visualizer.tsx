import React from 'react';

const Visualizer: React.FC<{ isListening: boolean }> = ({ isListening }) => {
  if (!isListening) return <div className="h-12 w-full flex items-center justify-center text-slate-400 text-sm">Microphone Idle</div>;

  return (
    <div className="h-12 flex items-center justify-center gap-1">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="w-2 bg-blue-500 rounded-full animate-pulse"
          style={{
            height: '100%',
            animationDuration: `${0.5 + i * 0.1}s`,
            animationDelay: `${i * 0.1}s`
          }}
        />
      ))}
      <span className="ml-3 text-blue-600 font-medium text-sm animate-pulse">Recording...</span>
    </div>
  );
};

export default Visualizer;