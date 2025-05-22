// ReadingUI.js - Web Only version with Go To Position feature
import React, { useRef, useState, useEffect } from 'react';
import { 
  Text, View, TouchableOpacity, Switch, 
  ActivityIndicator, Animated, ScrollView,
  Image, TextInput
} from 'react-native';
import { readingStyles as styles } from './readingStyles';
import gamepadManager from './gamepadSupport';
import GamepadIndicator from './gamepadIndicator';

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
  isAtStartOfBook,
  // Access to the total sentences information
  totalSentences = 0,
  currentSentenceIndex = 0,
  // Add the new goToPosition handler
  goToPosition
}) {
  // Animation ref for Next button
  const nextButtonAnimation = useRef(new Animated.Value(1)).current;
  
  // State for tracking which element has focus (for enhanced visual indication)
  const [focusedElementId, setFocusedElementId] = useState(null);
  
  // State for position input
  const [positionInput, setPositionInput] = useState('');
  
  // Setup gamepad support when component mounts
  useEffect(() => {
    // Initialize gamepad support
    gamepadManager.init();
    
    // Create a handler for the Listen button that handles the current sentence
    const handleListenButtonPress = () => {
      if (!loadingBook) {
        speakSentence();
      }
    };
    
    // Register callbacks for gamepad buttons
    gamepadManager.registerCallbacks({
      onNext: handleNextButtonPress,
      onListen: handleListenButtonPress,
      onPrevious: handlePreviousButtonPress,
      onBeginningOfBook: handleBeginningOfBookPress,
      onEndOfBook: handleEndOfBookPress
    });
    
    // Cleanup when component unmounts
    return () => {
      // No need to disable gamepad support as it may be used elsewhere
    };
  }, [loadingBook, isAtEndOfBook, isAtStartOfBook, speakSentence]);
  
  // Track focus changes
  useEffect(() => {
    // Listen for focus changes on web
    if (typeof document !== 'undefined') {
      const handleFocusChange = () => {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.id) {
          setFocusedElementId(activeElement.id);
        } else {
          setFocusedElementId(null);
        }
      };
      
      document.addEventListener('focusin', handleFocusChange);
      return () => {
        document.removeEventListener('focusin', handleFocusChange);
      };
    }
  }, []);
  
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
    if (!loadingBook && !isAtEndOfBook) {
      animateNextButton();
      nextSentence();
    }
  };
  
  // Handle previous sentence button press
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
  
  // Handle position input change
  const handlePositionInputChange = (text) => {
    // Only allow digits and limit to 6 characters
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
    setPositionInput(cleaned);
  };
  
  // Handle Go button press
  const handleGoButtonPress = () => {
    console.log("Go button pressed");
    console.log("goToPosition function exists:", !!goToPosition);
    console.log("positionInput value:", positionInput);
    console.log("positionInput trimmed:", positionInput.trim());
    
    if (goToPosition && positionInput.trim() !== '') {
      console.log("Calling goToPosition with:", positionInput);
      goToPosition(positionInput).then((success) => {
        console.log("goToPosition returned:", success);
        if (success) {
          // Clear the input on successful jump
          console.log("Clearing position input");
          setPositionInput('');
        }
      });
    } else {
      console.log("Not calling goToPosition - missing function or empty input");
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
  
  // Define the header style based on font loading
  const getHeaderTextStyle = () => {
    // Web should work fine with the standard approach
    return fontsLoaded ? 
      [styles.header, {fontFamily: 'Cinzel'}] : 
      styles.header;
  };

  // Custom style for navigation buttons container - metallic appearance
  const navigationFrameStyle = {
    // Web-specific metallic style with CSS
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#a0a0a0',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 5,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.4), inset 0px 1px 3px rgba(255, 255, 255, 0.7), inset 0px -2px 3px rgba(0, 0, 0, 0.2)',
    backgroundImage: 'linear-gradient(180deg, #dcdcdc 0%, #9e9e9e 50%, #757575 100%)',
    border: '1px solid #606060'
  };

  // Style for the sentence count display
  const sentenceCountStyle = {
    backgroundColor: '#f0f0f0',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignSelf: 'center',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.15)',
    border: '1px solid #ddd',
  };

  // Enhanced content container style with shadows
  const enhancedContentContainerStyle = {
    ...styles.contentContainer,
    boxShadow: '0px 6px 12px rgba(0, 0, 0, 0.3)',
    border: '1px solid #e0e0e0',
  };

  // Enhanced home button with 3D/gradient effect - same blue color scheme
  const enhancedHomeButtonStyle = {
    ...styles.homeLink,
    backgroundImage: 'linear-gradient(180deg, #4a8ab5 0%, #3a7ca5 50%, #2a6c95 100%)',
    boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.3), inset 0px 1px 3px rgba(255, 255, 255, 0.4)',
    border: '1px solid #2a6c95',
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginTop: 8,
  };

  // Enhanced home button text style
  const enhancedHomeLinkTextStyle = {
    ...styles.homeLinkText,
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  };
  
  // Media button styles
  const mediaButtonStyle = [
    styles.mediaButton,
    { marginHorizontal: 5 }
  ];
  
  // Style for focused toggle item - prominent visual indication
  const getFocusedStyle = (id) => {
    const isFocused = id === focusedElementId;
    
    return isFocused ? {
      backgroundColor: 'rgba(58, 124, 165, 0.2)',
      borderWidth: 2,
      borderColor: '#3a7ca5',
      borderRadius: 8,
      margin: -2, // Compensate for border width
      boxShadow: '0 0 8px rgba(58, 124, 165, 0.8)'
    } : {};
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
          
          {/* Navigation buttons in metallic frame with buttons closer together */}
          <View style={navigationFrameStyle}>
            {/* Beginning of Book (First) */}
            <TouchableOpacity
              id="begin-button"
              style={[
                mediaButtonStyle,
                (loadingBook || isAtStartOfBook) ? styles.disabledButton : null,
                getFocusedStyle("begin-button")
              ]}
              onPress={handleBeginningOfBookPress}
              disabled={loadingBook || isAtStartOfBook}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={uiText.rewindConfirmTitle || "Go to beginning of book"}
              tabIndex={1}
            >
              <Text style={styles.mediaButtonText}>⏮</Text>
            </TouchableOpacity>
            
            {/* Previous Sentence */}
            <TouchableOpacity
              id="prev-button"
              style={[
                mediaButtonStyle,
                (loadingBook || isAtStartOfBook) ? styles.disabledButton : null,
                getFocusedStyle("prev-button")
              ]}
              onPress={handlePreviousButtonPress}
              disabled={loadingBook || isAtStartOfBook}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Previous sentence"
              tabIndex={2}
            >
              <Text style={styles.mediaButtonText}>⏪</Text>
            </TouchableOpacity>
            
            {/* Listen/Stop Button (center, larger) */}
            <TouchableOpacity 
              id="listen-button"
              style={[
                styles.mediaButtonCenter, 
                isSpeaking ? styles.activeButton : null,
                loadingBook ? styles.disabledButton : null,
                { marginHorizontal: 5 },
                getFocusedStyle("listen-button")
              ]} 
              onPress={speakSentence} 
              disabled={loadingBook}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={isSpeaking ? (uiText.stop || "Stop") : (uiText.listen || "Listen")}
              tabIndex={3}
            >
              <Text style={[styles.buttonText, { fontSize: 14 }]}>
                {isSpeaking ? (uiText.stop || "Stop") : (uiText.listen || "Listen")}
              </Text>
            </TouchableOpacity>
            
            {/* Next Sentence */}
            <TouchableOpacity 
              id="next-button"
              style={[
                mediaButtonStyle,
                (loadingBook || isAtEndOfBook) ? styles.disabledButton : null,
                getFocusedStyle("next-button")
              ]} 
              onPress={handleNextButtonPress} 
              disabled={loadingBook || isAtEndOfBook}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Next sentence"
              tabIndex={4}
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
              id="end-button"
              style={[
                mediaButtonStyle,
                (loadingBook || isAtEndOfBook) ? styles.disabledButton : null,
                getFocusedStyle("end-button")
              ]}
              onPress={handleEndOfBookPress}
              disabled={loadingBook || isAtEndOfBook}
              accessible={true}
              accessibilityRole="button" 
              accessibilityLabel={uiText.goToEndConfirmTitle || "Go to end of book"}
              tabIndex={5}
            >
              <Text style={styles.mediaButtonText}>⏭</Text>
            </TouchableOpacity>
          </View>
          
          {/* Progress label with meter in rectangle, now with input and Go button */}
          <View style={styles.positionRow}>
            <Text style={[styles.toggleLabel, { fontStyle: 'italic' }]}>
              {uiText.position || "Position"}:
            </Text>
            <View style={sentenceCountStyle}>
              <Text style={{ fontSize: 11, fontWeight: '500', color: '#555' }}>
                {(currentSentenceIndex + 1)}/{totalSentences}
              </Text>
            </View>
            <TextInput
              id="position-input"
              style={[
                styles.positionInput,
                getFocusedStyle("position-input")
              ]}
              value={positionInput}
              onChangeText={handlePositionInputChange}
              keyboardType="numeric"
              maxLength={6}
              accessible={true}
              accessibilityLabel="Go to position input"
              tabIndex={6}
            />
            <TouchableOpacity
              id="go-button"
              style={[
                styles.goButton,
                (!positionInput || loadingBook) ? styles.disabledButton : null,
                getFocusedStyle("go-button")
              ]}
              onPress={handleGoButtonPress}
              disabled={!positionInput || loadingBook}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={uiText.goToPosition || "Go"}
              tabIndex={7}
            >
              <Text style={styles.goButtonText}>
                {uiText.goToPosition || "Go"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content Container - Enhanced with shadow */}
          <View style={enhancedContentContainerStyle}>
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
            <Text style={[styles.speedLabel, { fontStyle: 'italic' }]}>
              {uiText.readingSpeed || "Listening Speed"}:
            </Text>
            <View style={styles.speedCircleContainer}>
              {[1, 2, 3, 4, 5].map((speed) => (
                <TouchableOpacity
                  key={speed}
                  id={`speed-${speed}`}
                  style={[
                    styles.speedCircle,
                    listeningSpeed === speed ? styles.speedCircleActive : null,
                    getFocusedStyle(`speed-${speed}`)
                  ]}
                  onPress={() => updateListeningSpeed(speed)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Speed ${speed}`}
                  accessibilityState={{ selected: listeningSpeed === speed }}
                  tabIndex={7 + speed}
                />
              ))}
            </View>
          </View>

          {/* Toggle Controls - Keeping original styling but adding focus highlighting */}
          <View style={styles.toggleContainer}>
            {/* Articulation toggle */}
            <View 
              style={[
                styles.toggleItem,
                getFocusedStyle("articulation-toggle")
              ]}
            >
              <Text style={[styles.toggleLabel, { fontStyle: 'italic' }]}>
                {uiText.articulation || "Articulation"}:
              </Text>
              <Switch 
                id="articulation-toggle"
                value={articulation} 
                onValueChange={setArticulation}
                accessible={true}
                accessibilityRole="switch"
                accessibilityState={{ checked: articulation }}
                accessibilityLabel={`${uiText.articulation || "Articulation"} ${articulation ? "on" : "off"}`}
                tabIndex={13}
              />
            </View>
            
            {/* Auto-play toggle */}
            <View 
              style={[
                styles.toggleItem,
                getFocusedStyle("autoplay-toggle")
              ]}
            >
              <Text style={[styles.toggleLabel, { fontStyle: 'italic' }]}>
                {uiText.autoplay || "Sentence Auto-play"}:
              </Text>
              <Switch 
                id="autoplay-toggle"
                value={autoplay} 
                onValueChange={setAutoplay}
                accessible={true}
                accessibilityRole="switch"
                accessibilityState={{ checked: autoplay }}
                accessibilityLabel={`${uiText.autoplay || "Sentence Auto-play"} ${autoplay ? "on" : "off"}`}
                tabIndex={14}
              />
            </View>
            
            {/* Show Text toggle */}
            <View 
              style={[
                styles.toggleItem,
                getFocusedStyle("showtext-toggle")
              ]}
            >
              <Text style={[styles.toggleLabel, { fontStyle: 'italic' }]}>
                {uiText.showText || "Show Sentence"}:
              </Text>
              <Switch 
                id="showtext-toggle"
                value={showText} 
                onValueChange={setShowText}
                accessible={true}
                accessibilityRole="switch"
                accessibilityState={{ checked: showText }}
                accessibilityLabel={`${uiText.showText || "Show Sentence"} ${showText ? "on" : "off"}`}
                tabIndex={15}
              />
            </View>
            
            {/* Show Translation toggle */}
            <View 
              style={[
                styles.toggleItem,
                getFocusedStyle("showtranslation-toggle")
              ]}
            >
              <Text style={[styles.toggleLabel, { fontStyle: 'italic' }]}>
                {uiText.showTranslation || "Show Translation"}:
              </Text>
              <Switch 
                id="showtranslation-toggle"
                value={showTranslation} 
                onValueChange={setShowTranslation}
                accessible={true}
                accessibilityRole="switch"
                accessibilityState={{ checked: showTranslation }}
                accessibilityLabel={`${uiText.showTranslation || "Show Translation"} ${showTranslation ? "on" : "off"}`}
                tabIndex={16}
              />
            </View>
          </View>
          
          {/* Home Link with GamepadIndicator */}
          <TouchableOpacity 
            id="home-button"
            style={[
              enhancedHomeButtonStyle,
              getFocusedStyle("home-button")
            ]} 
            onPress={handleGoHome}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={uiText.homeLink || "Home"}
            tabIndex={17}
          >
            <Text style={enhancedHomeLinkTextStyle}>{uiText.homeLink || "Home"}</Text>
          </TouchableOpacity>
          
          {/* Smart gamepad indicator - only shows when gamepad is connected */}
          <GamepadIndicator />
        </ScrollView>
      </View>
    </>
  );
}