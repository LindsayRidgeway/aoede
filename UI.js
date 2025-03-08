import React, { useEffect, useState } from 'react';
import { Text, View, TouchableOpacity, TextInput, Switch, Picker, ActivityIndicator } from 'react-native';
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
  setSearchMode,
  isAtEndOfBook
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

  // Speed options for radio buttons
  const speedOptions = [
    { label: "0.5x", value: 0.5 },
    { label: "0.75x", value: 0.75 },
    { label: "1.0x", value: 1.0 },
    { label: "1.25x", value: 1.25 },
    { label: "1.5x", value: 1.5 },
    { label: "1.75x", value: 1.75 },
    { label: "2.0x", value: 2.0 }
  ];

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

        {/* Book Selection Row with improved UI */}
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
                )),
                <Picker.Item key="other" label={uiText.other || "Other"} value="other" />
              ]}
            </Picker>
          </View>
          <TouchableOpacity 
            style={[
              styles.loadButton, 
              loadingBook ? styles.disabledButton : null, 
              (!selectedBook || (selectedBook === "other" && !customSearch)) ? styles.disabledButton : null
            ]} 
            onPress={handleLoadButtonClick} 
            disabled={loadingBook || !selectedBook || (selectedBook === "other" && !customSearch)}
          >
            <Text style={styles.buttonText}>{uiText.loadBook || "Load Book"}</Text>
          </TouchableOpacity>
        </View>

        {/* Custom Search field - only shown when "Other" is selected */}
        {selectedBook === "other" && (
          <View style={styles.customSearchRow}>
            <Text style={styles.smallLabel}>{uiText.custom || "Custom"}:</Text>
            <TextInput
              style={styles.customInput}
              placeholder={uiText.enterCustomBook || "Enter a book title or genre"}
              value={customSearch}
              onChangeText={setCustomSearch}
              editable={!loadingBook}
            />
          </View>
        )}
        
        {/* Loading wait notice */}
        {loadingBook && !sentence && (
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
                  <Text style={styles.buttonText}>{uiText.next || "Next Sentence"}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Speed Control with Radio Buttons */}
          <View style={styles.speedControlPanel}>
            <Text style={styles.speedLabelHeader}>{uiText.readingSpeed || "Listening Speed"}:</Text>
            <View style={styles.speedButtonsContainer}>
              {speedOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.speedButton,
                    Math.abs(listeningSpeed - option.value) < 0.1 ? styles.speedButtonActive : null
                  ]}
                  onPress={() => updateListeningSpeed(option.value)}
                >
                  <Text
                    style={[
                      styles.speedButtonText,
                      Math.abs(listeningSpeed - option.value) < 0.1 ? styles.speedButtonTextActive : null
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
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