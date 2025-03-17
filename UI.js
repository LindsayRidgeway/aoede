import React, { useEffect, useState, useRef } from 'react';
import { 
  Text, View, TouchableOpacity, TextInput, Switch, 
  ActivityIndicator, Platform, Alert, Animated, 
  Modal, FlatList, SafeAreaView, ScrollView,
  Image
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { styles } from './styles';  
import ListeningSpeed from './listeningSpeed';
import { bookSources } from './bookSources';
import * as Font from 'expo-font';
import Constants from 'expo-constants';

// Get API key using both old and new Expo Constants paths for compatibility
const getConstantValue = (key) => {
  if (Constants?.expoConfig?.extra && Constants.expoConfig.extra[key] !== undefined) {
    return Constants.expoConfig.extra[key];
  }
  if (Constants?.manifest?.extra && Constants.manifest.extra[key] !== undefined) {
    return Constants.manifest.extra[key];
  }
  if (Constants?.extra && Constants.extra[key] !== undefined) {
    return Constants.extra[key];
  }
  if (Constants && Constants[key] !== undefined) {
    return Constants[key];
  }
  return null;
};

// Get Google API key from Expo Constants
const GOOGLE_API_KEY = getConstantValue('EXPO_PUBLIC_GOOGLE_API_KEY');

export function MainUI({
  studyLanguage,
  setStudyLanguage,
  uiText,
  selectedBook,
  setSelectedBook,
  loadBook,
  rewindBook,
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
  totalSentences,
  readingLevel,
  setReadingLevel,
  isAtEndOfBook
}) {
  // State to track if content should be shown
  const [showContent, setShowContent] = useState(sentence && sentence.length > 0);
  
  // State to track if fonts are loaded
  const [fontsLoaded, setFontsLoaded] = useState(false);
  
  // Define showControls early to avoid reference issues
  const showControls = showContent && sentence && sentence.length > 0;
  
  // State to track the displayed book title
  const [displayBookTitle, setDisplayBookTitle] = useState("");
  const [showBookModal, setShowBookModal] = useState(false);
  
  // State for languages and language selection modal
  const [languages, setLanguages] = useState([]);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [displayLanguage, setDisplayLanguage] = useState(studyLanguage || uiText.enterLanguage || "Select language");
  
  // Load languages from the Google Translate API
  useEffect(() => {
    const loadLanguages = async () => {
      try {
        // Get user's system language for localized language names
        const userLang = typeof navigator !== 'undefined' && navigator.language
          ? navigator.language.split('-')[0]
          : 'en';
        
        // Fetch available languages from Google Translate API
        const response = await fetch(
          `https://translation.googleapis.com/language/translate/v2/languages?key=${GOOGLE_API_KEY}&target=${userLang}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.ok) {
          const result = await response.json();
          
          if (result.data && result.data.languages) {
            setLanguages(result.data.languages);
          }
        }
      } catch (error) {
        console.error("Failed to load languages:", error);
      }
    };
    
    loadLanguages();
  }, []);
  
  // Update displayed language when studyLanguage changes
  useEffect(() => {
    if (studyLanguage) {
      // Find the language in our list if possible
      const lang = languages.find(l => 
        l.language === studyLanguage
      );
      
      if (lang) {
        setDisplayLanguage(lang.name);
      } else {
        // If we can't find the language in our list, use the code directly
        setDisplayLanguage(studyLanguage);
      }
    } else {
      setDisplayLanguage(uiText.enterLanguage || "Select language");
    }
  }, [studyLanguage, languages, uiText]);
  
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
  
  // Update showContent when sentence changes
  useEffect(() => {
    setShowContent(sentence && sentence.length > 0);
  }, [sentence]);
  
  // Initialize listening speed from storage when component mounts
  useEffect(() => {
    ListeningSpeed.getStoredListeningSpeed().then(setListeningSpeed);
    ListeningSpeed.getStoredStudyLanguage().then((storedLang) => {
      if (storedLang) {
        setStudyLanguage(storedLang);
      }
    });
  }, []);
  
  // Update displayed book title when selection changes
  useEffect(() => {
    if (selectedBook) {
      const book = bookSources.find(b => b.id === selectedBook);
      if (book) {
        setDisplayBookTitle(getBookTitle(book));
      }
    } else {
      setDisplayBookTitle(uiText.enterBook || "Select a book");
    }
  }, [selectedBook, uiText]);
  
  // Speed options for circle buttons - only 5 speeds
  const speedOptions = [1.0, 1.25, 1.5, 1.75, 2.0];

  const updateListeningSpeed = async (speed) => {
    setListeningSpeed(speed);
    await ListeningSpeed.saveListeningSpeed(speed);
  };
  
  // Get translated book titles from uiText for dropdown
  const getBookTitle = (book) => {
    // Try to get translated title from uiText
    const translatedTitle = uiText[book.id] || uiText[`${book.id}Title`] || uiText[book.id + 'Title'];
    return translatedTitle || book.title;
  };

  // Handle input change that should clear content
  const handleClearContent = () => {
    setShowContent(false);
  };

  // Handle Load Book button click
  const handleLoadButtonClick = () => {
    // Call the passed loadBook function from props
    loadBook();
  };
  
  // Handle language selection
  const handleLanguageChange = async (language) => {
    if (language && language.language) {
      // Use the language code for API calls but display the friendly name
      await ListeningSpeed.saveStudyLanguage(language.language);
      setStudyLanguage(language.language);
      setDisplayLanguage(language.name);
      handleClearContent(); // Clear content when language changes
    }
  };
  
  // Animation for Next button
  const nextButtonAnimation = useRef(new Animated.Value(1)).current;
  
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
  
  // Handle book selection with more robustness for Android
  const handleBookChange = (itemValue) => {
    setSelectedBook(itemValue);
    handleClearContent(); // Clear content when book selection changes
    if (itemValue) {
      const book = bookSources.find(b => b.id === itemValue);
      if (book) {
        setDisplayBookTitle(getBookTitle(book));
      }
    }
  };

  // Handle rewind button press with confirmation
  const handleRewindPress = () => {
    if (loadingBook) {
      return;
    }
    
    // Show confirmation dialog
    if (Platform.OS === 'web') {
      if (window.confirm(uiText.rewindConfirmMessage || "Are you sure you want to rewind the book to the beginning?")) {
        rewindBook();
      }
    } else {
      Alert.alert(
        uiText.rewindConfirmTitle || "Rewind Book",
        uiText.rewindConfirmMessage || "Are you sure you want to rewind the book to the beginning?",
        [
          {
            text: uiText.cancel || "Cancel",
            style: "cancel"
          },
          {
            text: uiText.yes || "Yes",
            onPress: () => {
              rewindBook();
            }
          }
        ]
      );
    }
  };

  // Render language selection component
  const renderLanguagePicker = () => {
    if (Platform.OS === 'android') {
      return (
        <TouchableOpacity
          style={styles.studyLangInput}
          onPress={() => {
            if (!loadingBook) {
              setShowLanguageModal(true);
            }
          }}
          disabled={loadingBook}
        >
          <Text style={studyLanguage ? { color: '#000' } : { color: '#999' }}>
            {displayLanguage}
          </Text>
        </TouchableOpacity>
      );
    }
    
    // For iOS and Web, use the standard Picker but styled like a text input
    return (
      <View style={[styles.studyLangInput, { paddingHorizontal: 0, overflow: 'hidden' }]}>
        <Picker
          selectedValue={studyLanguage}
          style={{ width: '100%', height: 40, marginTop: Platform.OS === 'ios' ? -6 : 0 }}
          onValueChange={(itemValue, itemIndex) => {
            if (itemValue && itemIndex > 0) { // Skip the prompt item
              const language = languages.find(l => l.language === itemValue);
              if (language) {
                handleLanguageChange(language);
              }
            }
          }}
          enabled={!loadingBook}
        >
          <Picker.Item key="prompt" label={uiText.enterLanguage || "Select language"} value="" />
          {languages.map(lang => (
            <Picker.Item 
              key={lang.language} 
              label={lang.name} 
              value={lang.language} 
            />
          ))}
        </Picker>
      </View>
    );
  };

  // This function handles showing the Picker differently based on platform
  const renderBookPicker = () => {
    if (Platform.OS === 'android') {
      return (
        <View style={{
          flex: 1,
          marginRight: 10,
          height: 40, // Exact height match with button
        }}>
          <TouchableOpacity
            style={{
              height: 40, // Exact height match with button
              borderColor: '#ddd',
              borderWidth: 1,
              borderRadius: 5,
              backgroundColor: '#fff',
              paddingHorizontal: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
            onPress={() => {
              if (!loadingBook) {
                setShowBookModal(true);
              }
            }}
            disabled={loadingBook}
          >
            <Text style={selectedBook ? styles.androidPickerButtonTextSelected : styles.androidPickerButtonText}>
              {displayBookTitle}
            </Text>
            <Text style={styles.androidPickerIcon}>▼</Text>
          </TouchableOpacity>
          
          {/* Book Selection Modal */}
          <Modal
            visible={showBookModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowBookModal(false)}
          >
            <SafeAreaView style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalHeader}>{uiText.bookSelection || "Book Selection"}</Text>
                
                <FlatList
                  data={[{id: 'prompt', title: uiText.enterBook || "Select a book"}, ...bookSources]}
                  keyExtractor={item => item.id}
                  renderItem={({item}) => (
                    <TouchableOpacity
                      style={styles.bookItem}
                      onPress={() => {
                        handleBookChange(item.id === 'prompt' ? "" : item.id);
                        setShowBookModal(false);
                      }}
                    >
                      <Text style={styles.bookItemText}>
                        {item.id === 'prompt' ? item.title : getBookTitle(item)}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
                
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowBookModal(false)}
                >
                  <Text style={styles.closeButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Modal>
        </View>
      );
    }
    
    // For iOS and Web, use the standard Picker
    return (
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedBook}
          style={styles.bookPicker}
          onValueChange={handleBookChange}
          enabled={!loadingBook}
        >
          <Picker.Item key="prompt" label={uiText.enterBook || "Select a book"} value="" />
          {bookSources.map(book => (
            <Picker.Item 
              key={book.id} 
              label={getBookTitle(book)} 
              value={book.id} 
            />
          ))}
        </Picker>
      </View>
    );
  };

  // Render a consistent rewind button for all platforms
  const renderRewindButton = () => {
    if (!showControls) return null;
    
    return (
      <TouchableOpacity
        style={styles.rewindButton}
        onPress={handleRewindPress}
        disabled={loadingBook}
      >
        <Text style={styles.rewindButtonText}>
          {uiText.rewindConfirmTitle || "Rewind"}
        </Text>
      </TouchableOpacity>
    );
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.innerContainer}>
          <View style={styles.headerContainer}>
            <Image 
              source={require('./assets/muse.png')} 
              style={styles.headerLogo} 
              resizeMode="contain"
            />
            <View style={styles.titleContainer}>
              <Text style={getHeaderTextStyle()}>
                {uiText.appName || "Aoede"}
              </Text>
              <Text style={styles.headerPronunciation}>(ay-EE-dee)</Text>
            </View>
          </View>

          {/* Input container is always visible */}
          <View style={styles.inputContainer}>
            {/* Redesigned Study Language Row with Dropdown */}
            <View style={styles.studyLangRow}>
              <Text style={styles.studyLangLabel}>{uiText.studyLanguage || "Study Language"}:</Text>
              {renderLanguagePicker()}
              
              {/* Language Selection Modal for Android */}
              {Platform.OS === 'android' && (
                <Modal
                  visible={showLanguageModal}
                  transparent={true}
                  animationType="slide"
                  onRequestClose={() => setShowLanguageModal(false)}
                >
                  <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                      <Text style={styles.modalHeader}>{uiText.studyLanguage || "Study Language"}</Text>
                      
                      <FlatList
                        data={languages}
                        keyExtractor={item => item.language}
                        renderItem={({item}) => (
                          <TouchableOpacity
                            style={styles.bookItem}
                            onPress={() => {
                              handleLanguageChange(item);
                              setShowLanguageModal(false);
                            }}
                          >
                            <Text style={styles.bookItemText}>{item.name}</Text>
                          </TouchableOpacity>
                        )}
                      />
                      
                      <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setShowLanguageModal(false)}
                      >
                        <Text style={styles.closeButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </SafeAreaView>
                </Modal>
              )}
            </View>

            {/* Redesigned Reading Level Row */}
            <View style={styles.readingLevelRow}>
              <Text style={styles.readingLevelLabel}>{uiText.readingLevel || "Reading Level"}:</Text>
              <View style={styles.readingLevelControls}>
                {[6, 9, 12, 15, 18].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.readingLevelButton,
                      readingLevel === level ? styles.readingLevelButtonActive : null
                    ]}
                    onPress={() => {
                      setReadingLevel(level);
                      handleClearContent(); // Clear content when reading level changes
                    }}
                  >
                    <Text 
                      style={[
                        styles.readingLevelButtonText,
                        readingLevel === level ? styles.readingLevelButtonTextActive : null
                      ]}
                    >
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Source Material label */}
            <View style={styles.sourceRow}>
              <Text style={styles.studyLangLabel}>{uiText.sourceMaterial || "Source Material"}:</Text>
            </View>

            {/* Book Selection Row with improved UI */}
            <View style={styles.bookSelectionRow}>
              {renderBookPicker()}
              <TouchableOpacity 
                style={[
                  styles.loadButton, 
                  loadingBook ? styles.disabledButton : null, 
                  !selectedBook ? styles.disabledButton : null
                ]} 
                onPress={handleLoadButtonClick} 
                disabled={loadingBook || !selectedBook}
              >
                {loadingBook ? (
                  <View style={styles.nextButtonContent}>
                    <ActivityIndicator size="small" color="#ffffff" style={styles.buttonSpinner} />
                    <Text style={[styles.buttonText, styles.buttonTextWithSpinner]}>
                      {uiText.loadBook || "Load Book"}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>{uiText.loadBook || "Load Book"}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {showContent && showControls && (
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
                
                {/* Render rewind button consistently across platforms */}
                {renderRewindButton()}
              </View>
              
              {/* Speed Control with Inline Circle Buttons - Only 5 speeds */}
              <View style={styles.speedControlRow}>
                <Text style={styles.speedLabel}>{uiText.readingSpeed || "Listening Speed"}:</Text>
                <View style={styles.speedCircleContainer}>
                  {speedOptions.map((speed) => (
                    <TouchableOpacity
                      key={speed}
                      style={[
                        styles.speedCircle,
                        Math.abs(listeningSpeed - speed) < 0.1 ? styles.speedCircleActive : null
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
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}