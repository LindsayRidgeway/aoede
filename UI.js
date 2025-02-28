import React, { useEffect, useState } from 'react';
import { Text, View, TouchableOpacity, TextInput, Switch } from 'react-native';
import Slider from '@react-native-community/slider';
import { styles } from './styles';  
import { getStoredListeningSpeed, saveListeningSpeed } from './listeningSpeed'; // ✅ Now using extracted file

export function MainUI({
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
  listeningSpeed,  // ✅ Accept listeningSpeed from App.js
  setListeningSpeed  // ✅ Accept setListeningSpeed from App.js
}) {

  useEffect(() => {
    getStoredListeningSpeed().then(setListeningSpeed);
  }, []);

  const updateListeningSpeed = async (speed) => {
    console.log(`🎯 SLIDER UPDATED: New listeningSpeed = ${speed}`);  // ✅ Debug log
    setListeningSpeed(speed);  // ✅ Now updates App.js
    await saveListeningSpeed(speed);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{uiText.appName || "Calliope"}</Text>

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

      {sentence && (
        <View style={styles.sentenceContainer}>
          {showText && <Text style={styles.sentence}>{sentence}</Text>}
          {showTranslation && <Text style={styles.translation}>{translatedSentence}</Text>}
        </View>
      )}

      <View style={styles.controls}>
        <TouchableOpacity style={[styles.button, loadingBook ? styles.disabledButton : null]} onPress={speakSentence} disabled={loadingBook}>
          <Text style={styles.buttonText}>{uiText.listen || "Listen"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, loadingBook ? styles.disabledButton : null]} onPress={nextSentence} disabled={loadingBook}>
          <Text style={styles.buttonText}>{uiText.next || "Next Sentence"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.toggleContainer}>
        <View style={styles.toggleItem}>
          <Text style={styles.toggleLabel}>{uiText.showText || "Show Foreign Sentence"}</Text>
          <Switch value={showText} onValueChange={setShowText} />
        </View>
        <View style={styles.toggleItem}>
          <Text style={styles.toggleLabel}>{uiText.showTranslation || "Show Translation"}</Text>
          <Switch value={showTranslation} onValueChange={setShowTranslation} />
        </View>
      </View>

      <View style={styles.sliderContainer}>
        <Text style={styles.sliderLabel}>{uiText.readingSpeed || "Listening Speed"}: {listeningSpeed.toFixed(1)}</Text>
        <Slider 
          style={{width: 200, height: 40}} 
          minimumValue={0.5}
          maximumValue={2.0}
          value={listeningSpeed}
          onValueChange={updateListeningSpeed}
          minimumTrackTintColor="#1fb28a"
          maximumTrackTintColor="#d3d3d3"
          thumbTintColor="#b9e4c9"
        />
      </View>
    </View>
  );
}
