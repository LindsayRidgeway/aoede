// UI.js - Main UI file that imports and renders module components
import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, View } from 'react-native';
import { styles } from './styles';
import { HomeUI } from './HomeUI';
import { ReadingUI } from './ReadingUI';
import { LibraryUI } from './LibraryUI';
import * as Font from 'expo-font';
import { initializeUserLibrary } from './userLibrary';

export function MainUI(props) {
  // State to track if content should be shown
  const [showContent, setShowContent] = useState(props.sentence && props.sentence.length > 0);
  
  // State to track if fonts are loaded
  const [fontsLoaded, setFontsLoaded] = useState(false);
  
  // State to track if library modal is shown
  const [showLibrary, setShowLibrary] = useState(false);
  
  // Initialize user library when the component mounts
  useEffect(() => {
    const initLibrary = async () => {
      await initializeUserLibrary();
    };
    
    initLibrary();
  }, []);
  
  // Update showContent when sentence changes
  useEffect(() => {
    setShowContent(props.sentence && props.sentence.length > 0);
  }, [props.sentence]);
  
  // Load font with aggressive retry mechanism
  useEffect(() => {
    let mounted = true;
    let fontLoadAttempts = 0;
    const MAX_ATTEMPTS = 5;
    
    const attemptFontLoad = async () => {
      try {
        if (fontLoadAttempts >= MAX_ATTEMPTS) {
          return;
        }
        
        fontLoadAttempts++;
        
        // Try to load both Cinzel and Cinzel-ExtraBold fonts
        // This gives us backup options for different platforms
        await Font.loadAsync({
          'Cinzel': require('./assets/fonts/Cinzel.ttf'),
          'Cinzel-ExtraBold': require('./assets/fonts/Cinzel-ExtraBold.ttf'),
          // Load the font with explicit weight variations - helps on Android
          'Cinzel-Bold': require('./assets/fonts/Cinzel.ttf'),
        });
        
        if (mounted) {
          setFontsLoaded(true);
        }
      } catch (error) {
        // Wait longer between retries
        if (mounted && fontLoadAttempts < MAX_ATTEMPTS) {
          const delay = 500 * Math.pow(2, fontLoadAttempts - 1); // Exponential backoff
          setTimeout(attemptFontLoad, delay);
        }
      }
    };
    
    // Start loading fonts
    attemptFontLoad();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Define showControls early to avoid reference issues
  const showControls = showContent && props.sentence && props.sentence.length > 0;

  // Handle showing the library
  const handleShowLibrary = () => {
    setShowLibrary(true);
  };
  
  // Handle closing the library
  const handleCloseLibrary = () => {
    setShowLibrary(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.innerContainer}>
          {/* Home UI component - Contains the header and load panel */}
          <HomeUI
            fontsLoaded={fontsLoaded}
            studyLanguage={props.studyLanguage}
            setStudyLanguage={props.setStudyLanguage}
            uiText={props.uiText}
            selectedBook={props.selectedBook}
            setSelectedBook={props.setSelectedBook}
            loadBook={props.loadBook}
            loadingBook={props.loadingBook}
            readingLevel={props.readingLevel}
            setReadingLevel={props.setReadingLevel}
            handleClearContent={() => setShowContent(false)}
            onLibraryButtonClick={handleShowLibrary}
          />
          
          {/* Reading UI component - Contains all the reading controls */}
          {showControls && (
            <ReadingUI
              sentence={props.sentence}
              translatedSentence={props.translatedSentence}
              showText={props.showText}
              showTranslation={props.showTranslation}
              setShowText={props.setShowText}
              setShowTranslation={props.setShowTranslation}
              speakSentence={props.speakSentence}
              nextSentence={props.nextSentence}
              loadingBook={props.loadingBook}
              listeningSpeed={props.listeningSpeed}
              setListeningSpeed={props.setListeningSpeed}
              isSpeaking={props.isSpeaking}
              rewindBook={props.rewindBook}
              isAtEndOfBook={props.isAtEndOfBook}
              uiText={props.uiText}
              articulation={props.articulation}
              setArticulation={props.setArticulation}
              autoplay={props.autoplay}
              setAutoplay={props.setAutoplay}
            />
          )}
        </View>
      </ScrollView>
      
      {/* Library UI component - Modal panel for library management */}
      <LibraryUI
        visible={showLibrary}
        onClose={handleCloseLibrary}
        uiText={props.uiText}
      />
    </SafeAreaView>
  );
}