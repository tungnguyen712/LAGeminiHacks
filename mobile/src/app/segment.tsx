import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, ScrollView } from 'react-native';
import { useRoute } from '../store/RouteContext';
import { useLanguage } from '../store/LanguageContext';
import { SegmentPanel } from '../components/route/SegmentPanel';
import * as Icons from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SegmentScreen = () => {
  const { activeRoute } = useRoute();
  const { t } = useLanguage();
  const navigate = useNavigate();

  if (!activeRoute) {
    console.warn('No active route, redirecting to results');
    navigate('/results');
    return null;
  }

  const handleStartNavigation = () => {
    console.log('Starting navigation from segment screen');
    navigate('/navigate');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigate('/results')} style={styles.backButton}>
          <Icons.ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Route Details</Text>
          <Text style={styles.subtitle}>{activeRoute.name} • {activeRoute.totalDistance}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <SegmentPanel segments={activeRoute.segments} />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={() => navigate('/navigate')}>
          <Text style={styles.buttonText}>Start Navigation</Text>
          <Icons.Navigation2 size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
  },
  button: {
    backgroundColor: '#3b82f6',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
