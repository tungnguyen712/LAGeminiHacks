import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VoiceButton } from './VoiceButton';

interface VoiceSheetProps {
  isVisible: boolean;
  onClose: () => void;
  transcript: string;
  isListening: boolean;
}

export const VoiceSheet = ({ isVisible, onClose, transcript, isListening }: VoiceSheetProps) => {
  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismiss} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Voice Search</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.transcriptContainer}>
              <Text style={styles.transcript}>
                {transcript || (isListening ? 'Listening...' : 'Tap the mic to start')}
              </Text>
            </View>

            <View style={styles.micContainer}>
              <VoiceButton isListening={isListening} onPress={() => {}} size={80} />
            </View>

            <Text style={styles.hint}>
              "Find a wheelchair accessible route to the library"
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dismiss: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 400,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  transcriptContainer: {
    width: '100%',
    padding: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transcript: {
    fontSize: 18,
    color: '#334155',
    textAlign: 'center',
    lineHeight: 28,
  },
  micContainer: {
    alignItems: 'center',
  },
  hint: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
