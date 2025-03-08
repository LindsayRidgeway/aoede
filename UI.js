import React, { useEffect, useState } from 'react';
import { Text, View, TouchableOpacity, TextInput, Switch, Picker, ActivityIndicator } from 'react-native';
import Slider from '@react-native-community/slider';
import { styles } from './styles';  
import ListeningSpeed from './listeningSpeed';
import { popularBooks } from './gptBookService';

export function MainUI({
  studyLanguage,
  setStudyLanguage,
  uiText,
  selectedBook,
  setSelectedBook,
  customSearch,
  setCustomSearch,
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
  isSpeaking,
  currentSentenceIndex,
  totalSentences,
  readingLevel,
  setReadingLevel,
  searchMode,
  setSearchMode
}) {
  // Initialize listening speed from storage when component mounts
  useEffect(() => {
    ListeningSpeed.getStoredListeningSpeed().then(setListeningSpeed);
    ListeningSpeed.getStoredStudyLanguage().then((storedLang) => {
      if (storedLang) {
        setStudyLanguage(storedLang);
      }
    });
  }, []);

  const updateListeningSpeed = async (speed) => {
    setListeningSpeed(speed);
    await ListeningSpeed.saveListeningSpeed(speed);
  };

  // Only show controls if content is loaded
  const showControls = sentence && sentence.length > 0;

  // Get translated book titles from uiText for dropdown
  const getBookTitle = (book) => {
    // Try to get translated title from uiText
    const translatedTitle = uiText[book.id] || uiText[`${book.id}Title`] || uiText[book.id + 'Title'];
    return translatedTitle || book.title;
  };

  // Toggle between dropdown selection and free-form search
  const toggleSearchMode = () => {
    const newMode = searchMode === 'dropdown' ? 'search' : 'dropdown';
    console.log(`Toggling search mode to: ${newMode}`);
    setSearchMode(newMode);
  };

  // Handle Load Book button click with console logs
  const handleLoadButtonClick = () => {
    console.log("Load button clicked in UI");
    // Call the passed loadBook function from props
    loadBook();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{uiText.appName || "Aoede"}</Text>

      {/* Input container is always visible */}
      <View style={styles.inputContainer}>
        <View style={styles.studyLangRow}>
          <Text style={styles.smallLabel}>{uiText.studyLanguage || "Study Language"}:</Text>
          <TextInput
            style={styles.studyLangInput}
            placeholder={uiText.enterLanguage || "Enter study language"}
            value={studyLanguage}
            onChangeText={(text) => {
              setStudyLanguage(text);
              ListeningSpeed.saveStudyLanguage(text);
            }}
          />
        </View>

        {/* Reading Level Row */}
        <View style={styles.readingLevelRow}>
          <Text style={styles.smallLabel}>{uiText.readingLevel || "Reading Level"}:</Text>
          <View style={styles.readingLevelControls}>
            {[6, 9, 12, 15, 18].map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.readingLevelButton,
                  readingLevel === level ? styles.readingLevelButtonActive : null
                ]}
                onPress={() => setReadingLevel(level)}
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

        {/* Toggle between search modes */}
        <View style={styles.searchModeRow}>
          <TouchableOpacity
            style={styles.searchModeToggle}
            onPress={toggleSearchMode}
          >
            <Text style={styles.searchModeText}>
              {searchMode === 'dropdown' 
                ? (uiText.switchToSearch || "Switch to Search") 
                : (uiText.switchToDropdown || "Switch to Book List")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Book Selection UI - changes based on search mode */}
        {searchMode === 'dropdown' ? (
          /* Dropdown selection */
          <View style={styles.bookSelectionRow}>
            <Text style={styles.smallLabel}>{uiText.bookSelection || "Book Selection"}:</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedBook}
                style={styles.bookPicker}
                onValueChange={(itemValue) => setSelectedBook(itemValue)}
                enabled={!loadingBook}
              >
                {[
                  <Picker.Item key="prompt" label={uiText.enterBook || "Select a book"} value="" />,
                  ...popularBooks.map(book => (
                    <Picker.Item 
                      key={book.id} 
                      label={getBookTitle(book)} 
                      value={book.id} 
                    />
                  ))
                ]}
              </Picker>
            </View>
            <TouchableOpacity 
              style={[
                styles.loadButton, 
                loadingBook ? styles.disabledButton : null, 
                !selectedBook ? styles.disabledButton : null
              ]} 
              onPress={handleLoadButtonClick} 
              disabled={loadingBook || !selectedBook}
            >
              <Text style={styles.buttonText}>{uiText.loadBook || "Load Book"}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Free-form search */
          <View style={styles.bookSearchRow}>
            <Text style={styles.smallLabel}>{uiText.bookSearch || "Book Search"}:</Text>
            <View style={styles.searchInputContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder={uiText.enterBookSearch || "Enter book title or description"}
                value={customSearch}
                onChangeText={setCustomSearch}
                editable={!loadingBook}
              />
            </View>
            <TouchableOpacity 
              style={[
                styles.loadButton, 
                loadingBook ? styles.disabledButton : null, 
                !customSearch ? styles.disabledButton : null
              ]} 
              onPress={handleLoadButtonClick} 
              disabled={loadingBook || !customSearch?.trim()}
            >
              <Text style={styles.buttonText}>{uiText.searchButton || "Search"}</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Loading wait notice */}
        {loadingBook && (
          <View style={styles.loadingNoticeContainer}>
            <ActivityIndicator size="small" color="#4a90e2" style={styles.loadingSpinner} />
            <Text style={styles.loadingNoticeText}>
              {uiText.pleaseWait || "Please wait. This may take several minutes..."}
            </Text>
          </View>
        )}
      </View>

      {showControls && (
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
                style={[styles.controlButton, loadingBook ? styles.disabledButton : null]} 
                onPress={nextSentence} 
                disabled={loadingBook}
              >
                {loadingBook ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={[styles.buttonText, styles.loadingText]}>{uiText.loadingMore || "Loading..."}</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>{uiText.next || "Next Sentence"}</Text>
                )}
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
  );
}