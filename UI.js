import React, { useEffect, useState } from 'react';
import { Text, View, TouchableOpacity, TextInput, Switch, ScrollView } from 'react-native';
import Slider from '@react-native-community/slider';
import { styles } from './styles';  
import { getStoredListeningSpeed, saveListeningSpeed } from './listeningSpeed';
import { getStoredStudyLanguage, saveStudyLanguage } from './listeningSpeed';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  isSpeaking
}) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [newWords, setNewWords] = useState([]);
  const [historyWords, setHistoryWords] = useState([]);

  // Load saved words on start
  useEffect(() => {
    const loadSavedWords = async () => {
      try {
        const savedHistory = await AsyncStorage.getItem('historyWords');
        if (savedHistory) {
          setHistoryWords(JSON.parse(savedHistory).sort());
        }
      } catch (error) {
        console.error("Failed to load saved words:", error);
      }
    };
    
    loadSavedWords();
    getStoredListeningSpeed().then(setListeningSpeed);
    getStoredStudyLanguage().then((storedLang) => {
      if (storedLang) {
        setStudyLanguage(storedLang);
      } else {
        console.warn("⚠ Study Language was empty or not found.");
      }
    });
  }, []);

  // Save history words when they change
  useEffect(() => {
    const saveWords = async () => {
      try {
        await AsyncStorage.setItem('historyWords', JSON.stringify(historyWords));
      } catch (error) {
        console.error("Failed to save history words:", error);
      }
    };
    
    if (historyWords.length > 0) {
      saveWords();
    }
  }, [historyWords]);

  // Extract words when sentence changes
  useEffect(() => {
    if (sentence) {
      // Remove punctuation and split into words
      const words = sentence
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        .split(/\s+/)
        .filter(word => word.length > 0);
      
      setNewWords(words);
      
      // Add new words to history if they're not already there
      const lowerNewWords = words.map(w => w.toLowerCase());
      const lowerHistoryWords = historyWords.map(w => w.toLowerCase());
      
      const wordsToAdd = lowerNewWords.filter(word => 
        !lowerHistoryWords.includes(word)
      );
      
      if (wordsToAdd.length > 0) {
        const updatedHistory = [...historyWords, ...wordsToAdd].sort();
        setHistoryWords(updatedHistory);
      }
    }
  }, [sentence]);

  const updateListeningSpeed = async (speed) => {
    setListeningSpeed(speed);
    await saveListeningSpeed(speed);
  };

  const handleWordClick = (word) => {
    // Remove from new words
    setNewWords(newWords.filter(w => w.toLowerCase() !== word.toLowerCase()));
    
    // Remove from history
    setHistoryWords(historyWords.filter(w => w.toLowerCase() !== word.toLowerCase()));
  };

  // Only show controls if content is loaded
  const showControls = sentence && sentence.length > 0;

  return (
      <View style={styles.container}>
      
      <Text style={styles.header}>{uiText.appName || "Aoede"}</Text>

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
              <Text style={styles.toggleLabel}>Show Feedback Panel</Text>
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
              <View style={styles.translationWrapper}>
                <Text style={styles.translation}>{translatedSentence}</Text>
              </View>
            )}
          </View>

          {showFeedback && (
            <View style={styles.feedbackWrapper}>
              <Text style={styles.feedbackInstruction}>Click the words that are too hard for you</Text>
              <View style={styles.feedbackContainer}>
                <View style={styles.feedbackColumn}>
                  <Text style={styles.feedbackHeader}>New Words</Text>
                  <ScrollView style={styles.wordList}>
                    {newWords.map((word, index) => (
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
                  <Text style={styles.feedbackHeader}>History</Text>
                  <ScrollView style={styles.wordList}>
                    {historyWords.map((word, index) => (
                      <TouchableOpacity 
                        key={`history-${index}`} 
                        style={styles.historyWordItem}
                        onPress={() => handleWordClick(word)}
                      >
                        <Text style={styles.historyWordText}>{word}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}