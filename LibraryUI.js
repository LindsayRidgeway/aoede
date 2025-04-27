// LibraryUI.js - Component for the library screen
import React from 'react';
import { 
  View, Text, TouchableOpacity, Modal,
  ScrollView, SafeAreaView
} from 'react-native';
import { styles } from './styles';

export function LibraryUI({
  visible,
  onClose,
  uiText
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.libraryModal}>
        <View style={styles.libraryContentWrapper}>
          {/* Header with Exit button */}
          <View style={styles.libraryHeader}>
            <Text style={styles.libraryTitle}>
              {uiText.library || "Library"}
            </Text>
            <TouchableOpacity 
              style={styles.exitButton} 
              onPress={onClose}
            >
              <Text style={styles.exitButtonText}>
                {uiText.exit || "Exit"}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Scrollable content area */}
          <ScrollView style={styles.libraryScrollView}>
            <View style={styles.libraryContent}>
              {/* This will be populated with library functionality later */}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}