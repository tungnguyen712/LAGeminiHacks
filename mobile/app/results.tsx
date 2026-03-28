import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '../store/RouteContext';
import { useProfile } from '../store/ProfileContext';
import { RouteCard } from '../components/route/RouteCard';
import { ProfileBadge } from '../components/profile/ProfileBadge';
import { Route } from '../types/Route';

const MOCK_ROUTES: Route[] = [
  {
    id: '1',
    name: 'Accessible Path',
    totalDistance: '1.2 km',
    estimatedTime: '15 min',
    overallFriction: 'low',
    confidence: 0.94,
    segments: [
      {
        id: 's1',
        instruction: 'Head north on Main St',
        distance: '400m',
        friction: 'low',
        confidence: 0.98,
        type: 'sidewalk',
      },
      {
        id: 's2',
        instruction: 'Turn right onto Park Ave',
        distance: '800m',
        friction: 'medium',
        confidence: 0.88,
        type: 'sidewalk',
        details: 'Slight incline (4%)',
      },
    ],
  },
  {
    id: '2',
    name: 'Direct Route',
    totalDistance: '0.9 km',
    estimatedTime: '12 min',
    overallFriction: 'high',
    confidence: 0.72,
    segments: [
      {
        id: 's3',
        instruction: 'Head north on Main St',
        distance: '300m',
        friction: 'low',
        confidence: 0.95,
        type: 'sidewalk',
      },
      {
        id: 's4',
        instruction: 'Cross Broadway',
        distance: '50m',
        friction: 'high',
        confidence: 0.65,
        type: 'crossing',
        details: 'No curb cut on west side',
      },
      {
        id: 's5',
        instruction: 'Continue on 2nd St',
        distance: '550m',
        friction: 'medium',
        confidence: 0.82,
        type: 'sidewalk',
      },
    ],
  },
];

export default function ResultsScreen() {
  const { activeRoute, setActiveRoute, origin, destination } = useRoute();
  const { selectedProfile } = useProfile();
  const router = useRouter();

  useEffect(() => {
    if (!activeRoute && MOCK_ROUTES.length > 0) {
      setActiveRoute(MOCK_ROUTES[0]);
    }
  }, []);

  const handleRouteSelect = (route: Route) => {
    setActiveRoute(route);
  };

  const handleNavigate = () => {
    if (activeRoute) {
      router.push('/navigate');
    }
  };

  const handleSegmentDrillDown = () => {
    if (activeRoute) {
      router.push('/segment');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/search')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.routeText} numberOfLines={1}>
            {origin || 'Origin'} to {destination || 'Destination'}
          </Text>
          {selectedProfile && <ProfileBadge profile={selectedProfile} size="sm" />}
        </View>
      </View>

      {/* Map Placeholder */}
      <View style={styles.mapPlaceholder}>
        <Ionicons name="map-outline" size={48} color="rgba(59,130,246,0.3)" />
        <Text style={styles.mapText}>Map View</Text>
      </View>

      {/* Route list */}
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Recommended Routes</Text>
        {MOCK_ROUTES.map((route) => (
          <RouteCard
            key={route.id}
            route={route}
            isSelected={activeRoute?.id === route.id}
            onSelect={() => handleRouteSelect(route)}
          />
        ))}
      </ScrollView>

      {/* Footer actions */}
      {activeRoute && (
        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
            ]}
            onPress={handleSegmentDrillDown}
          >
            <Text style={styles.secondaryButtonText}>Details</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
            ]}
            onPress={handleNavigate}
          >
            <Text style={styles.primaryButtonText}>Start Navigation</Text>
            <Ionicons name="navigate" size={20} color="#ffffff" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 20,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    zIndex: 10,
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
    gap: 4,
  },
  routeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  mapPlaceholder: {
    height: 200,
    backgroundColor: 'rgba(255,255,255,0.02)',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    gap: 8,
  },
  mapText: {
    color: 'rgba(148,163,184,0.5)',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 40,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  primaryButton: {
    flex: 2,
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
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f9',
  },
});
