import React from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { Stack } from 'expo-router';
import { ProfileProvider } from '../store/ProfileContext';
import { RouteProvider } from '../store/RouteContext';
import { LanguageProvider } from '../store/LanguageContext';

export default function RootLayout() {
  return (
    <LanguageProvider>
      <ProfileProvider>
        <RouteProvider>
          <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
            <View style={styles.container}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: '#0f172a' },
                  animation: 'slide_from_right',
                }}
              />
            </View>
          </SafeAreaView>
        </RouteProvider>
      </ProfileProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
});
