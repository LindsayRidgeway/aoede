import React, { useEffect, useState } from 'react';
import { Text, View, TouchableOpacity, TextInput, Switch, ScrollView, Modal, ActivityIndicator } from 'react-native';
import Slider from '@react-native-community/slider';
import { styles } from './styles';  
import { getStoredListeningSpeed, saveListeningSpeed } from './listeningSpeed';
import { getStoredStudyLanguage, saveStudyLanguage } from './listeningSpeed';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translateText } from './api';

export function MainUI({
  studyLanguage,
  setStudyLanguage,
  uiText,
  userQuery,
  setUserQuery,
  loadBook,
  sentence,
  translatedSentence,
  showText,
  showTranslation,
  setShowText,
  setShowTranslation,
  speakSentence,
  nextSentence,
  loadingBook,
  listeningSpeed,
  setListeningSpeed,
  isSpeaking,
  onWordFeedback,
  knownWords, // Actually the "too hard" words list
  newWords,
  clearHistory,
  showConfirmation,
  confirmClearHistory,
  cancelClearHistory,
  loadProgress,
  historyWords
}) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackLabels, setFeedbackLabels] = useState({
    showFeedback: "Show Feedback Panel",
    instruction: "Click the words that are too hard for you:",
    newWords: "New Words",
    history: "History",
    clearHistory: "Clear History",
    confirmClear: "Confirm Clear",
    confirmClearText: "Are you sure you want to clear all history? This cannot be undone.",
    cancel: "Cancel",
    confirm: "Confirm",
    loadingMore: "Loading more content...",
    sectionsLoaded: "Sections loaded:"
  });

  // Translate UI labels
  useEffect(() => {
    const translateFeedbackLabels = async () => {
      try {
        const userLang = navigator.language.split('-')[0] || "en";
        if (userLang === 'en') return; // Skip translation for English
        
        const labels = feedbackLabels;
        const translations = await Promise.all([
          translateText(labels.showFeedback, "en", userLang),
          translateText(labels.instruction, "en", userLang),
          translateText(labels.newWords, "en", userLang),
          translateText(labels.history, "en", userLang),
          translateText(labels.clearHistory, "en", userLang),
          translateText(labels.confirmClear, "en", userLang),
          translateText(labels.confirmClearText, "en", userLang),
          translateText(labels.cancel, "en", userLang),
          translateText(labels.confirm, "en", userLang),
          translateText(labels.loadingMore, "en", userLang),
          translateText(labels.sectionsLoaded, "en", userLang)
        ]);
        
        setFeedbackLabels({
          showFeedback: translations[0],
          instruction: translations[1],
          newWords: translations[2],
          history: translations[3],
          clearHistory: translations[4],
          confirmClear: translations[5],
          confirmClearText: translations[6],
          cancel: translations[7],
          confirm: translations[8],
          loadingMore: translations[9],
          sectionsLoaded: translations[10]
        });
      } catch (error) {
        // Handle silently
      }
    };
    
    translateFeedbackLabels();
    getStoredListeningSpeed().then(setListeningSpeed);
    getStoredStudyLanguage().then((storedLang) => {
      if (storedLang) {
        setStudyLanguage(storedLang);
      }
    });
  }, []);

  const updateListeningSpeed = async (speed) => {
    setListeningSpeed(speed);
    await saveListeningSpeed(speed);
  };

  const handleWordClick = (word) => {
    // Mark the word as "too hard"
    if (onWordFeedback) {
      onWordFeedback([word], true);
    }
  };

  // Only show controls if content is loaded
  const showControls = sentence && sentence.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{uiText.appName || "Aoede"}</Text>

      {/* Only show the input container when feedback panel is hidden */}
      {!showFeedback && (
        <View style={styles.inputContainer}>
          <View style={styles.studyLangRow}>
            <Text style={styles.smallLabel}>{uiText.studyLanguage || "Study Language"}:</Text>
            <TextInput
              style={styles.studyLangInput}
              placeholder={uiText.enterLanguage || "Enter study language"}
              value={studyLanguage}
              onChangeText={(text) => {
                setStudyLanguage(text);
                saveStudyLanguage(text);
              }}
            />
          </View>

          <View style={styles.sourceRow}>
            <View style={styles.sourceInputWrapper}>
              <Text style={styles.smallLabel}>{uiText.sourceMaterial || "Source Material"}:</Text>
              <TextInput
                style={styles.input}
                placeholder={uiText.enterBook || "Enter a book title or genre"}
                value={userQuery}
                onChangeText={setUserQuery}
              />
            </View>
            <TouchableOpacity 
              style={[styles.loadButton, loadingBook ? styles.disabledButton : null]} 
              onPress={loadBook} 
              disabled={loadingBook}
            >
              <Text style={styles.buttonText}>Load</Text>
            </TouchableOpacity>
          </View>
          
          {/* Show load progress indicator */}
          {loadProgress && loadProgress.sections > 1 && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                {feedbackLabels.sectionsLoaded} {loadProgress.sections}
                {loadProgress.loading && (
                  <ActivityIndicator size="small" color="#4a90e2" style={{ marginLeft: 5 }} />
                )}
                {loadProgress.complete && (
                  <Text style={styles.completeText}> (Complete)</Text>
                )}
              </Text>
            </View>
          )}
        </View>
      )}

      {showControls && (
        <>
          <View style={styles.controlsContainer}>
            <View style={styles.controls}>
              <TouchableOpacity 
                style={[
                  styles.controlButton, 
                  isSpeaking ? styles.activeButton : null,
                  loadingBook ? styles.disabledButton : null
                ]} 
                onPress={speakSentence} 
                disabled={loadingBook}
              >
                <Text style={styles.buttonText}>{isSpeaking ? (uiText.stop || "Stop") : (uiText.listen || "Listen")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.controlButton, loadingBook ? styles.disabledButton : null]} onPress={nextSentence} disabled={loadingBook}>
                <Text style={styles.buttonText}>{uiText.next || "Next Sentence"}</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.speedControlContainer}>
            <Text style={styles.speedLabel}>{uiText.readingSpeed || "Listening Speed"}:</Text>
            <Slider 
              style={styles.speedSlider}
              minimumValue={0.5}
              maximumValue={2.0}
              value={listeningSpeed}
              onValueChange={updateListeningSpeed}
              minimumTrackTintColor="#1fb28a"
              maximumTrackTintColor="#d3d3d3"
              thumbTintColor="#b9e4c9"
            />
          </View>

          <View style={styles.toggleContainer}>
            <View style={styles.toggleItem}>
              <Text style={styles.toggleLabel}>{uiText.showText || "Show Study Language"}</Text>
              <Switch value={showText} onValueChange={setShowText} />
            </View>
            <View style={styles.toggleItem}>
              <Text style={styles.toggleLabel}>{uiText.showTranslation || "Show System Language"}</Text>
              <Switch value={showTranslation} onValueChange={setShowTranslation} />
            </View>
            <View style={styles.toggleItem}>
              <Text style={styles.toggleLabel}>{feedbackLabels.showFeedback}</Text>
              <Switch value={showFeedback} onValueChange={setShowFeedback} />
            </View>
          </View>
          
          <View style={styles.contentContainer}>
            {loadProgress && loadProgress.loading && sentence === feedbackLabels.loadingMore && (
              <View style={styles.loadingIndicator}>
                <ActivityIndicator size="large" color="#4a90e2" />
                <Text style={styles.loadingText}>{feedbackLabels.loadingMore}</Text>
              </View>
            )}
            
            {showText && (
              <View style={styles.sentenceWrapper}>
                <Text style={styles.foreignSentence}>{sentence}</Text>
              </View>
            )}
            {showTranslation && translatedSentence && (
              <View style={showText ? styles.translationWrapper : styles.soloTranslationWrapper}>
                <Text style={styles.translation}>{translatedSentence}</Text>
              </View>
            )}
          </View>

          {showFeedback && (
            <View style={styles.feedbackWrapper}>
              <View style={styles.feedbackHeader}>
                <Text style={styles.feedbackInstruction}>{feedbackLabels.instruction}</Text>
                <TouchableOpacity style={styles.clearButton} onPress={clearHistory}>
                  <Text style={styles.clearButtonText}>{feedbackLabels.clearHistory}</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.feedbackContainer}>
                <View style={styles.feedbackColumn}>
                  <Text style={styles.feedbackColumnHeader}>{feedbackLabels.newWords}</Text>
                  <ScrollView style={styles.wordList}>
                    {newWords && newWords.map((word, index) => (
                      <TouchableOpacity 
                        key={`new-${index}`} 
                        style={styles.wordItem}
                        onPress={() => handleWordClick(word)}
                      >
                        <Text style={styles.wordText}>{word}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                
                <View style={styles.feedbackColumn}>
                  <Text style={styles.feedbackColumnHeader}>{feedbackLabels.history}</Text>
                  <ScrollView style={styles.wordList}>
                    {historyWords && historyWords.map((word, index) => (
                      <TouchableOpacity 
                        key={`history-${index}`} 
                        style={styles.historyWordItem}
                        onPress={() => handleWordClick(word)}
                      >
                        <Text 
                          style={[
                            styles.historyWordText, 
                            knownWords.some(
                              w => w.toLowerCase() === word.toLowerCase()
                            ) ? styles.knownWordText : null
                          ]}
                        >
                          {word}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>
          )}
          
          {/* Confirmation Modal */}
          {showConfirmation && (
            <Modal
              transparent={true}
              visible={showConfirmation}
              animationType="fade"
              onRequestClose={cancelClearHistory}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>{feedbackLabels.confirmClear}</Text>
                  <Text style={styles.modalText}>{feedbackLabels.confirmClearText}</Text>
                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={cancelClearHistory}
                    >
                      <Text style={styles.modalButtonText}>{feedbackLabels.cancel}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.confirmButton]}
                      onPress={confirmClearHistory}
                    >
                      <Text style={styles.modalButtonText}>{feedbackLabels.confirm}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          )}
        </>
      )}
    </View>
  );
}