import React from 'react';
import * as Icons from 'lucide-react';

interface TTSAlertProps {
  message: string;
  isVisible: boolean;
}

export const TTSAlert = ({ message, isVisible }: TTSAlertProps) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        zIndex: 1000,
        transform: isVisible ? 'translateY(0px)' : 'translateY(-160px)',
        transition: isVisible
          ? 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
          : 'transform 0.3s ease-in',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        padding: 16,
        borderRadius: 16,
        gap: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        pointerEvents: 'none',
      } as React.CSSProperties}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: '#3b82f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icons.Volume2 size={20} color="#ffffff" />
      </div>
      <span
        style={{
          flex: 1,
          color: '#ffffff',
          fontSize: 14,
          fontWeight: '600',
          lineHeight: '20px',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        } as React.CSSProperties}
      >
        {message}
      </span>
    </div>
  );
};
