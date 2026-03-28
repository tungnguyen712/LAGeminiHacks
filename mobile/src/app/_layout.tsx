import React, { useRef } from 'react';
import { View, StyleSheet, Dimensions, Platform, PanResponder } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { ProfileProvider } from '../store/ProfileContext';
import { RouteProvider } from '../store/RouteContext';
import { LanguageProvider, useLanguage, ACCENT_COLORS, THEME_MODES } from '../store/LanguageContext';
import { MeshBackground } from '../components/MeshBackground';

interface LayoutProps {
  children: React.ReactNode;
}

const { width: windowWidth } = Dimensions.get('window');
const isDesktop = Platform.OS === 'web' && windowWidth > 600;

const InnerLayout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const { accent, themeMode } = useLanguage();
  const bg = THEME_MODES[themeMode].bg;
  const accentGlow = ACCENT_COLORS[accent].glow;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dy) < 10,
      onPanResponderRelease: (_, g) => {
        if (g.dx > 50) navigate(-1);
        else if (g.dx < -50) navigate(1);
      },
    })
  ).current;

  return (
    <View style={[styles.root, { backgroundColor: isDesktop ? '#080d14' : bg }]}>
      <View
        style={[
          styles.phoneFrame,
          isDesktop && styles.desktopFrame,
          { backgroundColor: bg },
          isDesktop && { shadowColor: accentGlow },
        ]}
        {...panResponder.panHandlers}
      >
        <MeshBackground />
        <View style={styles.content}>
          {children}
        </View>
      </View>
    </View>
  );
};

export const Layout = ({ children }: LayoutProps) => (
  <LanguageProvider>
    <ProfileProvider>
      <RouteProvider>
        <InnerLayout>{children}</InnerLayout>
      </RouteProvider>
    </ProfileProvider>
  </LanguageProvider>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneFrame: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  desktopFrame: {
    width: 390,
    height: 844,
    flex: undefined,
    borderRadius: 44,
    borderWidth: 8,
    borderColor: '#1e293b',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.6,
    shadowRadius: 48,
    elevation: 24,
  },
  content: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
    overflow: 'hidden' as any,
  },
});
