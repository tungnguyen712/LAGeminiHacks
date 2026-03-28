import React from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Svg, { G } from 'react-native-svg';
import { Route } from '../../types/Route';
import { Polylines } from './Polylines';
import { Markers } from './Markers';

const { width } = Dimensions.get('window');
const MAP_HEIGHT = 300;

interface RouteMapProps {
  routes: Route[];
  selectedRouteId: string | null;
  onRouteSelect: (id: string) => void;
}

// Mock path data for demonstration
const MOCK_PATHS = {
  '1': "M 40 150 L 120 150 L 120 80 L 280 80 L 280 40",
  '2': "M 40 150 L 100 150 L 100 220 L 260 220 L 260 40",
};

export const RouteMap = ({ routes, selectedRouteId, onRouteSelect }: RouteMapProps) => {
  return (
    <View style={styles.container}>
      <Svg width={width} height={MAP_HEIGHT} viewBox={`0 0 ${width} ${MAP_HEIGHT}`}>
        {/* Render unselected routes first */}
        {routes.filter(r => r.id !== selectedRouteId).map(route => (
          <G key={route.id} onPress={() => onRouteSelect(route.id)}>
            <Polylines 
              points={(MOCK_PATHS as any)[route.id] || ""} 
              friction={route.overallFriction} 
              isActive={false} 
            />
          </G>
        ))}
        
        {/* Render selected route on top */}
        {selectedRouteId && routes.find(r => r.id === selectedRouteId) && (
          <Polylines 
            points={(MOCK_PATHS as any)[selectedRouteId] || ""} 
            friction={routes.find(r => r.id === selectedRouteId)!.overallFriction} 
            isActive={true} 
          />
        )}

        {/* Origin Marker */}
        <G transform="translate(40, 150)">
          <Markers type="origin" />
        </G>

        {/* Destination Marker */}
        <G transform="translate(280, 40)">
          <Markers type="destination" />
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: MAP_HEIGHT,
    backgroundColor: 'rgba(255,255,255,0.02)',
    overflow: 'hidden',
  },
});
