import React, { useEffect } from 'react';
import { Text, View, TouchableOpacity, TextInput, Switch } from 'react-native';
import Slider from '@react-native-community/slider';
import { styles } from './styles';  
import ListeningSpeed from './listeningSpeed';

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
  currentSentenceIndex,
  totalSentences
}) {
  // Initialize listening speed from storage when component mounts
  useEffect(() => {
    ListeningSpeed.getStoredListeningSpeed().then(setListeningSpeed);
    ListeningSpeed.getStoredStudyLanguage().then((storedLang) => {
      if (storedLang) {
        setStudyLanguage(storedLang);
      }
    });
  }, []);

  const updateListeningSpeed = async (speed) => {
    setListeningSpeed(speed);
    await ListeningSpeed.saveListeningSpeed(speed);
  };

  // Only show controls if content is loaded
  const showControls = sentence && sentence.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{uiText.appName || "Aoede"}</Text>

      {/* Input container is always visible */}
      <View style={styles.inputContainer}>
        <View style={styles.studyLangRow}>
          <Text style={styles.smallLabel}>{uiText.studyLanguage || "Study Language"}:</Text>
          <TextInput
            style={styles.studyLangInput}
            placeholder={uiText.enterLanguage || "Enter study language"}
            value={studyLanguage}
            onChangeText={(text) => {
              setStudyLanguage(text);
              ListeningSpeed.saveStudyLanguage(text);
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
              <TouchableOpacity 
                style={[styles.controlButton, loadingBook ? styles.disabledButton : null]} 
                onPress={nextSentence} 
                disabled={loadingBook}
              >
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
          </View>
          
          <View style={styles.contentContainer}>
            {totalSentences > 0 && (
              <Text style={styles.sentenceCounter}>
                {`Sentence ${currentSentenceIndex + 1} of ${totalSentences}`}
              </Text>
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
        </>
      )}
    </View>
  );
}