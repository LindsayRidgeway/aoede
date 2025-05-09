// ReadingUI.js - Component for the reading controls
import React, { useRef, useEffect, useState } from 'react';
import { 
  Text, View, TouchableOpacity, Switch, 
  ActivityIndicator, Animated, ScrollView,
  Platform, Image
} from 'react-native';
import { styles } from './styles';
import { debugLog } from './DebugPanel';

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
  currentSentenceIndex = 0
}) {
  // Animation ref for Next button
  const nextButtonAnimation = useRef(new Animated.Value(1)).current;
  
  // State to track which setting is currently selected for gamepad navigation
  const [selectedSetting, setSelectedSetting] = useState('showText');
  
  // State to track if gamepad is connected - maintaining for Android functionality
  const [gamepadConnected, setGamepadConnected] = useState(false);
  
  // Visual feedback for gamepad selection
  const getSettingStyle = (setting) => {
    return selectedSetting === setting && gamepadConnected ? 
      { backgroundColor: 'rgba(58, 124, 165, 0.1)', borderRadius: 5, padding: 2 } : 
      {};
  };
  
  // Cycle through settings (B button function)
  const cycleSettings = () => {
    const settingsOrder = ['showText', 'showTranslation', 'articulation', 'autoplay'];
    const currentIndex = settingsOrder.indexOf(selectedSetting);
    const nextIndex = (currentIndex + 1) % settingsOrder.length;
    setSelectedSetting(settingsOrder[nextIndex]);
    debugLog(`Cycled setting to: ${settingsOrder[nextIndex]}`);
  };
  
  // Toggle the currently selected setting (X button function)
  const toggleSelectedSetting = () => {
    debugLog(`Toggling setting: ${selectedSetting}`);
    switch (selectedSetting) {
      case 'showText':
        setShowText(!showText);
        debugLog(`Show Text set to: ${!showText}`);
        break;
      case 'showTranslation':
        setShowTranslation(!showTranslation);
        debugLog(`Show Translation set to: ${!showTranslation}`);
        break;
      case 'articulation':
        setArticulation(!articulation);
        debugLog(`Articulation set to: ${!articulation}`);
        break;
      case 'autoplay':
        setAutoplay(!autoplay);
        debugLog(`Autoplay set to: ${!autoplay}`);
        break;
    }
  };
  
  // Gamepad event handling for Android
  // This is kept minimal with no external libraries
  useEffect(() => {
    // Map native Android gamepad events to actions
    if (Platform.OS === 'android') {
      try {
        // This is a placeholder for any native module integration
        // that would be needed for Android gamepad support
        
        // Log initial state
        debugLog("Android gamepad support initialized");
        
        // For actual Android gamepad functionality, custom native modules 
        // would need to be implemented and integrated here
        
        // This is where we would connect to Android GameController API
        // or other native gamepad interfaces
      } catch (error) {
        debugLog(`Error initializing Android gamepad: ${error.message}`);
      }
    }
    
    return () => {
      // Cleanup when component unmounts
      if (Platform.OS === 'android') {
        debugLog("Cleaning up Android gamepad listeners");
        // Cleanup code for any native modules would go here
      }
    };
  }, [
    loadingBook, isAtStartOfBook, isAtEndOfBook, listeningSpeed, 
    selectedSetting, showText, showTranslation, articulation, autoplay
  ]);
  
  // Global key and gamepad event handler for debugging
  // This is function is called by the native side when events occur
  if (typeof window !== 'undefined' && !window.handleGamepadEvent) {
    window.handleGamepadEvent = (eventType, buttonIndex) => {
      debugLog(`Native gamepad event: ${eventType}, Button: ${buttonIndex}`);
      
      // Handle button actions based on mapping
      switch (buttonIndex) {
        case 0: // A button - Play/Pause
          debugLog("A button - Play/Pause activated");
          if (!loadingBook) {
            speakSentence();
          }
          break;
        case 1: // B button - Cycle settings
          debugLog("B button - Cycle Settings activated");
          cycleSettings();
          break;
        case 2: // X button - Toggle selected setting
          debugLog("X button - Toggle Setting activated");
          toggleSelectedSetting();
          break;
        case 4: // Left shoulder - Previous sentence
          debugLog("Left Shoulder - Previous Sentence activated");
          if (!loadingBook && !isAtStartOfBook && previousSentence) {
            previousSentence();
          }
          break;
        case 5: // Right shoulder - Next sentence
          debugLog("Right Shoulder - Next Sentence activated");
          if (!loadingBook && !isAtEndOfBook) {
            nextSentence();
          }
          break;
        case 12: // D-pad up - Increase speed
          debugLog("D-pad Up - Increase Speed activated");
          if (listeningSpeed < 5) {
            setListeningSpeed(listeningSpeed + 1);
          }
          break;
        case 13: // D-pad down - Decrease speed
          debugLog("D-pad Down - Decrease Speed activated");
          if (listeningSpeed > 1) {
            setListeningSpeed(listeningSpeed - 1);
          }
          break;
        case 14: // D-pad left - Rewind
          debugLog("D-pad Left - Rewind activated");
          if (!loadingBook && !isAtStartOfBook) {
            rewindBook();
          }
          break;
        case 15: // D-pad right - End of book
          debugLog("D-pad Right - End of Book activated");
          if (!loadingBook && !isAtEndOfBook && goToEndOfBook) {
            goToEndOfBook();
          }
          break;
      }
    };
  }
  
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

  // Custom style for navigation buttons container - metallic appearance
  const navigationFrameStyle = Platform.OS === 'web' 
    ? {
        // Web-specific metallic style with CSS
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#a0a0a0', // Base metallic color
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 10,
        marginBottom: 5, // REDUCED gap between navigation panel and progress meter
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.4), inset 0px 1px 3px rgba(255, 255, 255, 0.7), inset 0px -2px 3px rgba(0, 0, 0, 0.2)',
        backgroundImage: 'linear-gradient(180deg, #dcdcdc 0%, #9e9e9e 50%, #757575 100%)',
        border: '1px solid #606060'
      }
    : {
        // React Native style for iOS/Android
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#a0a0a0', // Base metallic color
        paddingVertical: 10,
        paddingHorizontal: 20, // INCREASED horizontal padding for mobile
        borderRadius: 10,
        marginHorizontal: 8, // ADDED horizontal margin to prevent edge cutoff
        marginBottom: 5, 
        borderWidth: 1,
        borderColor: '#606060',
        // More pronounced shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
      };

  // Style for the sentence count display
  const sentenceCountStyle = Platform.OS === 'web'
    ? {
        backgroundColor: '#f0f0f0',
        paddingVertical: 2, // REDUCED vertical padding
        paddingHorizontal: 8,
        borderRadius: 10,
        alignSelf: 'center',
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.15)',
        border: '1px solid #ddd',
      }
    : {
        backgroundColor: '#f0f0f0',
        paddingVertical: 2, // REDUCED vertical padding
        paddingHorizontal: 8,
        borderRadius: 10,
        alignSelf: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#ddd',
      };

  // Enhanced content container style with shadows
  const enhancedContentContainerStyle = Platform.OS === 'web'
    ? {
        ...styles.contentContainer,
        boxShadow: '0px 6px 12px rgba(0, 0, 0, 0.3)',
        border: '1px solid #e0e0e0',
      }
    : {
        ...styles.contentContainer,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
      };

  // Enhanced home button with 3D/gradient effect - same blue color scheme
  const enhancedHomeButtonStyle = Platform.OS === 'web'
    ? {
        ...styles.homeLink,
        backgroundImage: 'linear-gradient(180deg, #4a8ab5 0%, #3a7ca5 50%, #2a6c95 100%)',
        boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.3), inset 0px 1px 3px rgba(255, 255, 255, 0.4)',
        border: '1px solid #2a6c95',
        paddingVertical: 8, // REDUCED vertical padding
        paddingHorizontal: 15,
        marginTop: 8, // REDUCED margin above home button
      }
    : {
        ...styles.homeLink,
        backgroundColor: '#3a7ca5',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#2a6c95',
        paddingVertical: 8, // REDUCED vertical padding
        paddingHorizontal: 15,
        marginTop: 8, // REDUCED margin above home button
      };

  // Enhanced home button text style
  const enhancedHomeLinkTextStyle = {
    ...styles.homeLinkText,
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12, // REDUCED font size (from 14)
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  };

  // Enhanced reading level button style - raised appearance
  const enhancedReadingLevelButtonStyle = Platform.OS === 'web'
    ? {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        marginRight: 10,
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2), inset 0px 1px 2px rgba(255, 255, 255, 0.8)',
        backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #f0f0f0 100%)',
        border: '1px solid #ccc',
        cursor: 'pointer',
      }
    : {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        marginRight: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#ccc',
      };

  // Enhanced active reading level button - pressed appearance
  const enhancedReadingLevelButtonActiveStyle = Platform.OS === 'web'
    ? {
        backgroundColor: '#3a7ca5',
        backgroundImage: 'linear-gradient(180deg, #3a7ca5 0%, #2a6c95 100%)',
        boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.2), inset 0px 1px 1px rgba(0, 0, 0, 0.3)',
        transform: 'translateY(1px)',
        border: '1px solid #1a5c85',
      }
    : {
        backgroundColor: '#3a7ca5',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#1a5c85',
        // We can't translate in React Native styles, but we can modify the margin to create 
        // the impression that the button is pressed down
        marginTop: 1,
        marginBottom: -1,
      };

  // Enhanced text style for active button
  const enhancedReadingLevelButtonTextActiveStyle = {
    color: '#fff',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  };
  
  // Media button styles with spacing adjustments for mobile
  const mediaButtonStyle = [
    styles.mediaButton,
    // Adjust horizontal margin to prevent edge cutoff
    Platform.OS !== 'web' ? { marginHorizontal: 2 } : { marginHorizontal: 5 }
  ];

  // Gamepad control guide tooltip - only show when gamepad is connected
  const gamepadHelpStyle = {
    marginTop: 5,
    marginBottom: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(58, 124, 165, 0.1)',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(58, 124, 165, 0.3)',
    display: gamepadConnected ? 'flex' : 'none' // Only show when gamepad connected
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
              style={[
                mediaButtonStyle,
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
                mediaButtonStyle,
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
                loadingBook ? styles.disabledButton : null,
                Platform.OS !== 'web' ? { marginHorizontal: 4 } : { marginHorizontal: 5 }
              ]} 
              onPress={speakSentence} 
              disabled={loadingBook}
            >
              <Text style={[styles.buttonText, { fontSize: 14 }]}> {/* REDUCED font size (from 16) */}
                {isSpeaking ? (uiText.stop || "Stop") : (uiText.listen || "Listen")}
              </Text>
            </TouchableOpacity>
            
            {/* Next Sentence */}
            <TouchableOpacity 
              style={[
                mediaButtonStyle,
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
                mediaButtonStyle,
                (loadingBook || isAtEndOfBook) ? styles.disabledButton : null
              ]}
              onPress={handleEndOfBookPress}
              disabled={loadingBook || isAtEndOfBook}
            >
              <Text style={styles.mediaButtonText}>⏭</Text>
            </TouchableOpacity>
          </View>
          
          {/* Progress label with meter in rectangle */}
          <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 0, marginBottom: 10}}>
            <Text style={[styles.toggleLabel, { fontStyle: 'italic' }]}>
              {uiText.position || "Position"}:
            </Text>
            <View style={sentenceCountStyle}>
              <Text style={{ fontSize: 11, fontWeight: '500', color: '#555' }}>
                {(currentSentenceIndex + 1)}/{totalSentences}
              </Text>
            </View>
          </View>

          {/* Gamepad control guide - only visible when gamepad connected */}
          {gamepadConnected && (
            <View style={gamepadHelpStyle}>
              <Text style={{ fontSize: 10, color: '#3a7ca5', textAlign: 'center' }}>
                Gamepad: Shoulder L/R = Prev/Next • D-pad L/R = Start/End • 
                D-pad Up/Down = Speed • A = Play/Stop • B = Cycle • X = Toggle
              </Text>
            </View>
          )}

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
            <View style={[styles.toggleItem, getSettingStyle('articulation')]}>
              <Text style={[styles.toggleLabel, { fontStyle: 'italic' }]}>
                {uiText.articulation || "Articulation"}:
              </Text>
              <Switch value={articulation} onValueChange={setArticulation} />
            </View>
            
            {/* Auto-play toggle */}
            <View style={[styles.toggleItem, getSettingStyle('autoplay')]}>
              <Text style={[styles.toggleLabel, { fontStyle: 'italic' }]}>
                {uiText.autoplay || "Sentence Auto-play"}:
              </Text>
              <Switch value={autoplay} onValueChange={setAutoplay} />
            </View>
            
            {/* Show Text toggle */}
            <View style={[styles.toggleItem, getSettingStyle('showText')]}>
              <Text style={[styles.toggleLabel, { fontStyle: 'italic' }]}>
                {uiText.showText || "Show Sentence"}:
              </Text>
              <Switch value={showText} onValueChange={setShowText} />
            </View>
            
            {/* Show Translation toggle */}
            <View style={[styles.toggleItem, getSettingStyle('showTranslation')]}>
              <Text style={[styles.toggleLabel, { fontStyle: 'italic' }]}>
                {uiText.showTranslation || "Show Translation"}:
              </Text>
              <Switch value={showTranslation} onValueChange={setShowTranslation} />
            </View>
          </View>
          
          {/* Enhanced Home Link with 3D metallic style */}
          <TouchableOpacity 
            style={enhancedHomeButtonStyle} 
            onPress={handleGoHome}
          >
            <Text style={enhancedHomeLinkTextStyle}>{uiText.homeLink || "Home"}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </>
  );
}