import React, { useEffect, useState } from 'react';
import { Text, View, TouchableOpacity, TextInput, Switch, Picker, ActivityIndicator } from 'react-native';
import { styles } from './styles';  
import ListeningSpeed from './listeningSpeed';
import { bookSources } from './bookSources';

export function MainUI({
  studyLanguage,
  setStudyLanguage,
  uiText,
  selectedBook,
  setSelectedBook,
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

  // Speed options for circle buttons - only 5 speeds, removing the two slowest
  const speedOptions = [1.0, 1.25, 1.5, 1.75, 2.0];

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
                ...bookSources.map(book => (
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
        
        {/* We've removed the loading wait notice text and will just use the button spinner */}
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