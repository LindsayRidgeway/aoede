// ReadingUI.js - Component for the reading controls
import React, { useRef } from 'react';
import { 
  Text, View, TouchableOpacity, Switch, 
  ActivityIndicator, Animated, ScrollView
} from 'react-native';
import { styles } from './styles';

export function ReadingUI({
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
  isAtEndOfBook,
  uiText,
  // Props for articulation
  articulation,
  setArticulation,
  // Props for autoplay
  autoplay,
  setAutoplay,
  // Book title and navigation
  selectedBook,
  onGoHome,
  bookTitle
}) {
  // Animation ref for Next button
  const nextButtonAnimation = useRef(new Animated.Value(1)).current;
  
  // Animate the Next button
  const animateNextButton = () => {
    // Sequence of animations: shrink then grow
    Animated.sequence([
      Animated.timing(nextButtonAnimation, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(nextButtonAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();
  };
  
  // Handle next button with animation
  const handleNextButtonPress = () => {
    animateNextButton();
    nextSentence();
  };
  
  // Handle rewind button press
  const handleRewindPress = () => {
    if (!loadingBook) {
      rewindBook();
    }
  };
  
  // Update listening speed
  const updateListeningSpeed = (speed) => {
    setListeningSpeed(speed);
  };
  
  // Handle going back to home screen
  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.readingScrollContainer}>
      {/* Book Title */}
      <View style={styles.bookTitleContainer}>
        <Text style={styles.bookTitle}>{bookTitle || ""}</Text>
      </View>
      
      {/* Controls Container - KEPT AT THE TOP FOR NOW */}
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
            onPress={handleNextButtonPress} 
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

      {/* Content Container */}
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
      
      {/* Speed Control with Inline Circle Buttons */}
      <View style={styles.speedControlRow}>
        <Text style={styles.speedLabel}>{uiText.readingSpeed || "Listening Speed"}:</Text>
        <View style={styles.speedCircleContainer}>
          {[1, 2, 3, 4, 5].map((speed) => (
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

      {/* Toggle Controls */}
      <View style={styles.toggleContainer}>
        {/* Articulation toggle */}
        <View style={styles.toggleItem}>
          <Text style={styles.toggleLabel}>{uiText.articulation || "Articulation"}:</Text>
          <Switch value={articulation} onValueChange={setArticulation} />
        </View>
        
        {/* Auto-play toggle */}
        <View style={styles.toggleItem}>
          <Text style={styles.toggleLabel}>{uiText.autoplay || "Next Sentence Auto-play"}:</Text>
          <Switch value={autoplay} onValueChange={setAutoplay} />
        </View>
        
        {/* Show Text toggle */}
        <View style={styles.toggleItem}>
          <Text style={styles.toggleLabel}>{uiText.showText || "Show Foreign Sentence"}:</Text>
          <Switch value={showText} onValueChange={setShowText} />
        </View>
        
        {/* Show Translation toggle */}
        <View style={styles.toggleItem}>
          <Text style={styles.toggleLabel}>{uiText.showTranslation || "Show Translation"}:</Text>
          <Switch value={showTranslation} onValueChange={setShowTranslation} />
        </View>
      </View>
      
      {/* Home Link */}
      <TouchableOpacity 
        style={styles.homeLink} 
        onPress={handleGoHome}
      >
        <Text style={styles.homeLinkText}>Home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}