// ReadingUI.js - Component for the reading controls
import React, { useRef } from 'react';
import { 
  Text, View, TouchableOpacity, Switch, 
  ActivityIndicator, Animated, ScrollView,
  Platform, Image
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
  bookTitle,
  // Add fontsLoaded prop
  fontsLoaded,
  // Add skipHeader prop
  skipHeader = false,
  // Add new navigation props
  previousSentence,
  goToEndOfBook,
  isAtStartOfBook
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
  
  // Handle previous button press
  const handlePreviousButtonPress = () => {
    if (previousSentence && !loadingBook && !isAtStartOfBook) {
      previousSentence();
    }
  };
  
  // Handle end of book button press
  const handleEndOfBookPress = () => {
    if (goToEndOfBook && !loadingBook && !isAtEndOfBook) {
      goToEndOfBook();
    }
  };
  
  // Handle rewind button press (renamed to beginningOfBook for clarity)
  const handleBeginningOfBookPress = () => {
    if (!loadingBook && !isAtStartOfBook) {
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
  
  // Define the header style based on platform and font loading
  const getHeaderTextStyle = () => {
    if (Platform.OS === 'android') {
      // Android needs explicit style parameters
      if (fontsLoaded) {
        return {
          fontSize: 36,
          fontWeight: 'bold',
          color: '#3a7ca5',
          fontFamily: 'Cinzel-ExtraBold', // Try the ExtraBold version for Android
        };
      } else {
        return {
          fontSize: 36,
          fontWeight: 'bold',
          color: '#3a7ca5',
        };
      }
    } else if (Platform.OS === 'ios') {
      // iOS may need different font handling
      return fontsLoaded ? 
        {
          fontSize: 36,
          fontWeight: 'bold',
          color: '#3a7ca5',
          fontFamily: 'Cinzel',
        } : 
        styles.header;
    } else {
      // Web should work fine with the standard approach
      return fontsLoaded ? 
        [styles.header, {fontFamily: 'Cinzel'}] : 
        styles.header;
    }
  };

  return (
    <>
      {/* Skip the header if skipHeader is true (rendered by parent instead) */}
      {!skipHeader && (
        <View style={styles.headerContainer}>
          <Image 
            source={require('./assets/aoede_logo.png')} 
            style={styles.headerLogo} 
            resizeMode="contain"
          />
          <View style={styles.titleContainer}>
            <Text style={getHeaderTextStyle()}>
              Aoede
            </Text>
            <Text style={styles.headerPronunciation}>(ay-EE-dee)</Text>
          </View>
        </View>
      )}
      
      {/* Reading panel container */}
      <View style={styles.inputContainer}>
        <ScrollView contentContainerStyle={styles.readingScrollContainer}>
          {/* Book Title */}
          <View style={styles.bookTitleContainer}>
            <Text style={styles.bookTitle}>{bookTitle || ""}</Text>
          </View>
          
          {/* Enhanced Media-Player Style Navigation */}
          <View style={styles.mediaControlsContainer}>
            {/* Beginning of Book (First) */}
            <TouchableOpacity
              style={[
                styles.mediaButton,
                (loadingBook || isAtStartOfBook) ? styles.disabledButton : null
              ]}
              onPress={handleBeginningOfBookPress}
              disabled={loadingBook || isAtStartOfBook}
            >
              <Text style={styles.mediaButtonText}>⏮</Text>
            </TouchableOpacity>
            
            {/* Previous Sentence */}
            <TouchableOpacity
              style={[
                styles.mediaButton,
                (loadingBook || isAtStartOfBook) ? styles.disabledButton : null
              ]}
              onPress={handlePreviousButtonPress}
              disabled={loadingBook || isAtStartOfBook}
            >
              <Text style={styles.mediaButtonText}>⏪</Text>
            </TouchableOpacity>
            
            {/* Listen/Stop Button (center, larger) */}
            <TouchableOpacity 
              style={[
                styles.mediaButtonCenter, 
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
            
            {/* Next Sentence */}
            <TouchableOpacity 
              style={[
                styles.mediaButton, 
                (loadingBook || isAtEndOfBook) ? styles.disabledButton : null
              ]} 
              onPress={handleNextButtonPress} 
              disabled={loadingBook || isAtEndOfBook}
            >
              {loadingBook ? (
                <View style={styles.nextButtonContent}>
                  <ActivityIndicator size="small" color="#ffffff" style={styles.buttonSpinner} />
                  <Text style={[styles.mediaButtonText, styles.buttonTextWithSpinner]}>⏩</Text>
                </View>
              ) : (
                <Animated.View style={{transform: [{scale: nextButtonAnimation}]}}>
                  <Text style={styles.mediaButtonText}>⏩</Text>
                </Animated.View>
              )}
            </TouchableOpacity>
            
            {/* End of Book (Last) */}
            <TouchableOpacity
              style={[
                styles.mediaButton,
                (loadingBook || isAtEndOfBook) ? styles.disabledButton : null
              ]}
              onPress={handleEndOfBookPress}
              disabled={loadingBook || isAtEndOfBook}
            >
              <Text style={styles.mediaButtonText}>⏭</Text>
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
            <Text style={styles.homeLinkText}>{uiText.homeLink || "Home"}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </>
  );
}