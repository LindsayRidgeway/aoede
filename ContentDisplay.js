// ContentDisplay.js - Updated to use integer values for speed buttons
import React from 'react';
import {
  Text, View, TouchableOpacity, Switch, ActivityIndicator,
  Animated, StyleSheet
} from 'react-native';
import { styles } from './styles';

const ContentDisplay = ({
  showControls,
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
  rewindBook,
  nextButtonAnimation,
  isAtEndOfBook,
  uiText,
  // Use integer values 1-5 for the speed options
  speedOptions = [1, 2, 3, 4, 5]
}) => {
  // Handle rewind button press
  const handleRewindPress = () => {
    console.log("MODULE 0007: ContentDisplay.handleRewindPress");
    if (!loadingBook) {
      rewindBook();
    }
  };

  // Update listening speed - directly use integer values
  const updateListeningSpeed = (speed) => {
    console.log("MODULE 0008: ContentDisplay.updateListeningSpeed");
    setListeningSpeed(speed);
  };

  // Only render if controls should be shown
  if (!showControls) return null;
  console.log("MODULE 0009: ContentDisplay.mainReturn");

  return (
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
            <Text style={styles.buttonText}>
              {isSpeaking ? (uiText.stop || "Stop") : (uiText.listen || "Listen")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.controlButton, 
              (loadingBook || isAtEndOfBook) ? styles.disabledButton : null
            ]} 
            onPress={nextSentence} 
            disabled={loadingBook || isAtEndOfBook}
          >
            {loadingBook ? (
              <View style={styles.nextButtonContent}>
                <ActivityIndicator size="small" color="#ffffff" style={styles.buttonSpinner} />
                <Text style={[styles.buttonText, styles.buttonTextWithSpinner]}>
                  {uiText.next || "Next Sentence"}
                </Text>
              </View>
            ) : (
              <Animated.View style={{transform: [{scale: nextButtonAnimation}]}}>
                <Text style={styles.buttonText}>{uiText.next || "Next Sentence"}</Text>
              </Animated.View>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Rewind button */}
        <TouchableOpacity
          style={styles.rewindButton}
          onPress={handleRewindPress}
          disabled={loadingBook}
        >
          <Text style={styles.rewindButtonText}>
            {uiText.rewindConfirmTitle || "Rewind"}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Speed Control with Inline Circle Buttons using integer values */}
      <View style={styles.speedControlRow}>
        <Text style={styles.speedLabel}>{uiText.readingSpeed || "Listening Speed"}:</Text>
        <View style={styles.speedCircleContainer}>
          {speedOptions.map((speed) => (
            <TouchableOpacity
              key={speed}
              style={[
                styles.speedCircle,
                listeningSpeed === speed ? styles.speedCircleActive : null
              ]}
              onPress={() => updateListeningSpeed(speed)}
            />
          ))}
        </View>
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
      
      {/* Content Container without fixed height */}
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
    </>
  );
};

export default ContentDisplay;