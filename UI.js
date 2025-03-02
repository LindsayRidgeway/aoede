import React, { useEffect, useState } from 'react';
import { Text, View, TouchableOpacity, TextInput, Switch } from 'react-native';
import Slider from '@react-native-community/slider';
import { styles } from './styles';  
import { getStoredListeningSpeed, saveListeningSpeed } from './listeningSpeed';
import { getStoredStudyLanguage, saveStudyLanguage } from './listeningSpeed';

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

  useEffect(() => {
      getStoredListeningSpeed().then(setListeningSpeed);
      getStoredStudyLanguage().then((storedLang) => {
          if (storedLang) {
              setStudyLanguage(storedLang);
         } else {
              console.warn("⚠ Study Language was empty or not found.");
         }
      });
  }, []);    

  const updateListeningSpeed = async (speed) => {
    setListeningSpeed(speed);
    await saveListeningSpeed(speed);
  };

  return (
      <View style={styles.container}>
      
      <Text style={styles.header}>{uiText.appName || "Aoede"}</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>{uiText.studyLanguage || "Study Language"}</Text>
        <TextInput
          style={styles.input}
          placeholder={uiText.enterLanguage || "Enter study language"}
          value={studyLanguage}
          onChangeText={(text) => {
            setStudyLanguage(text);
            saveStudyLanguage(text);
          }}
        />

        <Text style={styles.label}>{uiText.sourceMaterial || "Source Material"}</Text>
        <TextInput
          style={styles.input}
          placeholder={uiText.enterBook || "Enter a book title or genre"}
          value={userQuery}
          onChangeText={setUserQuery}
        />
        
        <TouchableOpacity style={[styles.button, loadingBook ? styles.disabledButton : null]} onPress={loadBook} disabled={loadingBook}>
          <Text style={styles.buttonText}>{uiText.loadBook || "Load Book"}</Text>
        </TouchableOpacity>
      </View>

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
      </View>
      
      {sentence && (
        <View style={styles.contentContainer}>
          {showText && (
            <View style={styles.sentenceWrapper}>
              <Text style={styles.studyLanguageLabel}>Study Language:</Text>
              <Text style={styles.foreignSentence}>{sentence}</Text>
            </View>
          )}
          {showTranslation && translatedSentence && (
            <View style={styles.translationWrapper}>
              <Text style={styles.translationLabel}>Your Language:</Text>
              <Text style={styles.translation}>{translatedSentence}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}