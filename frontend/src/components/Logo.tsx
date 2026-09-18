import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showSubtitle = false,
  className = '',
}) => {
  const sizeClasses = {
    sm: {
      box: 'px-2 py-0.5 border-[1.5px]',
      text: 'text-base',
      badge: 'text-[9px] px-1.5 py-0.2',
    },
    md: {
      box: 'px-3 py-1 border-[1.5px]',
      text: 'text-xl',
      badge: 'text-[10px] px-1.5 py-0.5',
    },
    lg: {
      box: 'px-4 py-1.5 border-2',
      text: 'text-2xl',
      badge: 'text-xs px-2 py-0.5',
    },
    xl: {
      box: 'px-6 py-2.5 border-2',
      text: 'text-4xl',
      badge: 'text-xs px-2.5 py-1',
    },
  }[size];

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Boxed PredictX Logo matching user image */}
      <div
        className={`inline-flex items-center justify-center font-bold tracking-tight rounded-xs border-[#6b7c74] hover:border-[#109c85] transition-colors duration-300 select-none ${sizeClasses.box}`}
        style={{
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          letterSpacing: '-0.02em',
        }}
      >
        <span className="text-white font-extrabold">Predict</span>
        <span className="text-[#109c85] font-extrabold">X</span>
      </div>

      {showSubtitle && (
        <span className="font-mono uppercase tracking-widest text-[#109c85] bg-[#142620] px-1.5 py-0.5 rounded border border-[#244c3e] text-[10px]">
          XAI AUDIT
        </span>
      )}
    </div>
  );
};
