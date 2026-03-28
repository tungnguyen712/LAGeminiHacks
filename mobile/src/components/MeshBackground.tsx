import { motion } from 'motion/react';

export const MeshBackground = () => {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 0,
      overflow: 'hidden',
      background: 'inherit',
      pointerEvents: 'none',
    }}>
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3], x: [0, 80, 0], y: [0, 40, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: '-20%', left: '-10%',
          width: '60%', height: '60%',
          borderRadius: '50%',
          background: 'var(--color-gemini-blue, #4285f4)',
          filter: 'blur(120px)',
          opacity: 0.3,
          pointerEvents: 'none',
        }}
      />
      <motion.div
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2], x: [0, -60, 0], y: [0, 80, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: '20%', right: '-10%',
          width: '50%', height: '50%',
          borderRadius: '50%',
          background: 'var(--color-gemini-purple, #9b72cb)',
          filter: 'blur(100px)',
          opacity: 0.25,
          pointerEvents: 'none',
        }}
      />
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.25, 0.1], x: [0, 40, 0], y: [0, -80, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          bottom: '-10%', left: '20%',
          width: '40%', height: '40%',
          borderRadius: '50%',
          background: 'var(--color-gemini-pink, #d96570)',
          filter: 'blur(80px)',
          opacity: 0.2,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};
