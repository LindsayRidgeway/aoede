import React, { useEffect, useState } from 'react';
import { Text, View, TouchableOpacity, TextInput, Switch, ScrollView, Modal } from 'react-native';
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
  cancelClearHistory
}) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [historyWords, setHistoryWords] = useState([]);
  const [feedbackLabels, setFeedbackLabels] = useState({
    showFeedback: "Show Feedback Panel",
    instruction: "Click the words that are too hard for you:",
    newWords: "New Words",
    history: "History",
    clearHistory: "Clear History",
    confirmClear: "Confirm Clear",
    confirmClearText: "Are you sure you want to clear all history? This cannot be undone.",
    cancel: "Cancel",
    confirm: "Confirm"
  });

  // Load saved words and translate UI labels
  useEffect(() => {
    const loadSavedWords = async () => {
      try {
        const savedHistory = await AsyncStorage.getItem('historyWords');
        if (savedHistory) {
          setHistoryWords(JSON.parse(savedHistory).sort());
        }
      } catch (error) {
        // Handle silently
      }
    };
    
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
          translateText(labels.confirm, "en", userLang)
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
          confirm: translations[8]
        });
      } catch (error) {
        // Handle silently
      }
    };
    
    loadSavedWords();
    translateFeedbackLabels();
    getStoredListeningSpeed().then(setListeningSpeed);
    getStoredStudyLanguage().then((storedLang) => {
      if (storedLang) {
        setStudyLanguage(storedLang);
      }
    });
  }, []);

  // Save history words when they change
  useEffect(() => {
    const saveWords = async () => {
      try {
        if (historyWords.length > 0) {
          await AsyncStorage.setItem('historyWords', JSON.stringify(historyWords));
        } else {
          // If history is empty, remove the item from storage
          await AsyncStorage.removeItem('historyWords');
        }
      } catch (error) {
        // Handle silently
      }
    };
    
    saveWords();
  }, [historyWords]);

  // Update history words when sentence changes
  useEffect(() => {
    if (sentence) {
      // Remove punctuation and split into words
      const words = sentence
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        .split(/\s+/)
        .filter(word => word.length > 0);
      
      // Add words to history if they're not already there
      const lowerHistoryWords = new Set(historyWords.map(w => w.toLowerCase()));
      const wordsToAdd = words.filter(word => 
        !lowerHistoryWords.has(word.toLowerCase())
      );
      
      if (wordsToAdd.length > 0) {
        // Ensure no duplicates in the history list
        const uniqueHistory = [...historyWords];
        for (const word of wordsToAdd) {
          if (!lowerHistoryWords.has(word.toLowerCase())) {
            uniqueHistory.push(word);
            lowerHistoryWords.add(word.toLowerCase());
          }
        }
        setHistoryWords(uniqueHistory.sort());
      }
    }
  }, [sentence]);

  const updateListeningSpeed = async (speed) => {
    setListeningSpeed(speed);
    await saveListeningSpeed(speed);
  };

  const handleWordClick = (word) => {
    // Mark the word as "too hard" and remove from both lists
    const updatedHistory = historyWords.filter(w => w.toLowerCase() !== word.toLowerCase());
    setHistoryWords(updatedHistory);
    
    // Notify parent component about word feedback (this word is too hard)
    if (onWordFeedback) {
      onWordFeedback([word], true);
    }
  };

  // Handle the confirmation of clearing history
  const handleConfirmClearHistory = () => {
    // Clear the local history words state
    setHistoryWords([]);
    
    // But immediately repopulate with current sentence words
    if (sentence) {
      const words = sentence
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        .split(/\s+/)
        .filter(word => word.length > 0);
      
      // Use a Set to ensure uniqueness
      const uniqueWords = Array.from(new Set(words));
      setHistoryWords(uniqueWords);
    }
    
    // Call the parent component's confirmClearHistory function
    confirmClearHistory();
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
                    {historyWords.map((word, index) => (
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
                      onPress={handleConfirmClearHistory}
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