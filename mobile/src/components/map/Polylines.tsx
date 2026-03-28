import React from 'react';
import { Animated } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { FrictionLevel } from '../../types/Route';
import { FRICTION_COLORS } from '../../constants/frictionColors';

const AnimatedPath = Animated.createAnimatedComponent(Path) as any;

interface PolylineProps {
  points: string;
  friction: FrictionLevel;
  isActive?: boolean;
  key?: any;
}

export const Polylines = ({ points, friction, isActive = false }: PolylineProps) => {
  const color = FRICTION_COLORS[friction];
  const pulseAnim = React.useRef(new Animated.Value(0.1)).current;

  React.useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(0.1);
    }
  }, [isActive]);
  
  return (
    <G>
      {/* Glow effect for active route */}
      {isActive && (
        <AnimatedPath
          d={points}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={pulseAnim}
        />
      )}
      
      {/* Main path */}
      <Path
        d={points}
        fill="none"
        stroke={color}
        strokeWidth={isActive ? "6" : "4"}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={friction === 'high' ? "1, 8" : undefined}
      />
    </G>
  );
};
