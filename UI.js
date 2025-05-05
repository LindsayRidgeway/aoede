// UI.js - Main UI file that imports and renders module components
import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, View, Text, Image } from 'react-native';
import { styles } from './styles';
import { HomeUI } from './HomeUI';
import { ReadingUI } from './ReadingUI';
import { LibraryUI } from './LibraryUI';
import * as Font from 'expo-font';
import { initializeUserLibrary } from './userLibrary';
import { getBookById } from './userLibrary';
import { Platform } from 'react-native';

// Explicitly export MainUI as a named export
export function MainUI(props) {
  // State to track if content should be shown
  const [showContent, setShowContent] = useState(props.sentence && props.sentence.length > 0);
  
  // State to track if fonts are loaded
  const [fontsLoaded, setFontsLoaded] = useState(false);
  
  // State to track if library modal is shown
  const [showLibrary, setShowLibrary] = useState(false);
  
  // State to track which view is active: 'home' or 'reading'
  const [activeView, setActiveView] = useState('home');
  
  // State to store book title
  const [bookTitle, setBookTitle] = useState('');
  
  // State to track if we're at the start of the book
  const [isAtStartOfBook, setIsAtStartOfBook] = useState(true);
  
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
    
    // Update activeView based on content
    if (props.sentence && props.sentence.length > 0 && activeView === 'home') {
      setActiveView('reading');
    }
  }, [props.sentence]);
  
  // Update isAtStartOfBook based on currentSentenceIndex
  useEffect(() => {
    setIsAtStartOfBook(props.currentSentenceIndex === 0);
  }, [props.currentSentenceIndex]);
  
  // Update book title when selectedBook changes
  useEffect(() => {
    const fetchBookTitle = async () => {
      if (props.selectedBook) {
        try {
          const book = await getBookById(props.selectedBook);
          if (book) {
            // Use translated title if available or fall back to original title
            const title = props.uiText[props.selectedBook] || book.title;
            setBookTitle(title);
          }
        } catch (error) {
          console.error("Error fetching book title:", error);
        }
      }
    };
    
    fetchBookTitle();
  }, [props.selectedBook, props.uiText]);
  
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

  // Define showControls early to avoid reference issues
  const showControls = showContent && props.sentence && props.sentence.length > 0;

  // Handle showing the library - use imperative form
  const handleShowLibrary = () => {
    // Force modal to remain open by using setTimeout
    setTimeout(() => {
      setShowLibrary(true);
    }, 0);
  };
  
  // Handle closing the library with refresh if needed
  const handleCloseLibrary = (libraryChanged) => {
    setShowLibrary(false);
    
    // If library changed, refresh the content
    if (libraryChanged && props.refreshLibrary) {
      props.refreshLibrary();
    }
  };
  
  // Handle loading a book - switch to reading view
  const handleLoadBook = async () => {
    const success = await props.loadBook();
    if (success) {
      setActiveView('reading');
    }
    return success;
  };
  
  // Handle going back to home view
  const handleGoHome = () => {
    setActiveView('home');
  };
  
  // Go to previous sentence - new function
  const handlePreviousSentence = async () => {
    try {
      if (props.handlePreviousSentence) {
        await props.handlePreviousSentence();
      } else {
        // Fallback implementation if not provided - uses reader functionality
        const reader = window.BookReader && window.BookReader.readingManagement();
        if (reader && reader.goToPreviousSentence) {
          await reader.goToPreviousSentence();
        }
      }
    } catch (error) {
      console.error("Error going to previous sentence:", error);
    }
  };
  
  // Go to end of book - new function
  const handleGoToEndOfBook = async () => {
    try {
      if (props.handleGoToEndOfBook) {
        await props.handleGoToEndOfBook();
      } else {
        // Fallback implementation - will need to be implemented in BookReader
        console.log("Go to end of book - functionality not yet implemented");
      }
    } catch (error) {
      console.error("Error going to end of book:", error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.innerContainer}>
          {/* Common Header - ALWAYS VISIBLE */}
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
          
          {/* Home UI component - only shown when activeView is 'home' */}
          {activeView === 'home' && (
            <HomeUI
              fontsLoaded={fontsLoaded}
              studyLanguage={props.studyLanguage}
              setStudyLanguage={props.setStudyLanguage}
              uiText={props.uiText}
              selectedBook={props.selectedBook}
              setSelectedBook={props.setSelectedBook}
              loadBook={handleLoadBook}
              loadingBook={props.loadingBook}
              readingLevel={props.readingLevel}
              setReadingLevel={props.setReadingLevel}
              handleClearContent={() => {
                if (props.handleClearContent) {
                  props.handleClearContent();
                }
                setShowContent(false);
              }}
              onLibraryButtonClick={handleShowLibrary}
              libraryRefreshKey={props.libraryRefreshKey}
              // Pass skipHeader to avoid duplicate header
              skipHeader={true}
            />
          )}
          
          {/* Reading UI component - only shown when activeView is 'reading' */}
          {activeView === 'reading' && (
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
              selectedBook={props.selectedBook}
              bookTitle={bookTitle}
              onGoHome={handleGoHome}
              fontsLoaded={fontsLoaded}
              // Pass skipHeader to avoid duplicate header
              skipHeader={true}
              // New navigation props
              previousSentence={handlePreviousSentence}
              goToEndOfBook={handleGoToEndOfBook}
              isAtStartOfBook={isAtStartOfBook}
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

// Also add a default export just to be safe
export default MainUI;