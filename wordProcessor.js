import AsyncStorage from '@react-native-async-storage/async-storage';

// Extract words from text (works with any script)
export const extractWords = (text) => {
  if (!text) return [];
  
  console.log("DEBUG-EW1: Extracting words from:", text);
  console.log("DEBUG-EW2: Text type:", typeof text);
  console.log("DEBUG-EW3: Text length:", text.length);
  console.log("DEBUG-EW4: First 20 chars:", text.substring(0, 20));
  
  // Extract words using a two-step approach
  // 1. Split by any whitespace first to get raw tokens
  const rawTokens = text.split(/\s+/);
  console.log("DEBUG-EW5: Raw tokens:", rawTokens);
  console.log("DEBUG-EW6: Raw tokens length:", rawTokens.length);
  
  // 2. Clean each token and ensure it's valid
  const words = [];
  for (const token of rawTokens) {
    console.log("DEBUG-EW7: Processing token:", token);
    
    // Remove all punctuation and symbols, keeping only letters and numbers
    const cleanWord = token.replace(/[^\p{L}\p{N}]/gu, '');
    console.log("DEBUG-EW8: Clean word:", cleanWord);
    
    // Only add non-empty words
    if (cleanWord && cleanWord.length > 0) {
      words.push(cleanWord);
      console.log("DEBUG-EW9: Added word:", cleanWord);
    }
  }
  
  console.log("DEBUG-EW10: Final extracted words:", words);
  return words;
};

// Process words for both lists
export const processWords = (words, tooHardWordsList, setNewWordsList, historyWords, setHistoryWords) => {
  if (!words || words.length === 0) {
    console.log("DEBUG-PW1: No words to process");
    return;
  }
  
  console.log("DEBUG-PW2: Processing words:", words);
  console.log("DEBUG-PW3: Current too hard words:", tooHardWordsList);
  
  // Filter out words that have been marked as too hard
  const lowerCaseTooHardWords = new Set(tooHardWordsList.map(w => w.toLowerCase()));
  console.log("DEBUG-PW4: Lower case too hard words:", Array.from(lowerCaseTooHardWords));
  
  const newWords = words.filter(word => {
    const lowerWord = word.toLowerCase();
    const isHard = lowerCaseTooHardWords.has(lowerWord);
    console.log(`DEBUG-PW5: Word ${word}, lowerCase ${lowerWord}, isHard: ${isHard}`);
    return !isHard;
  });
  
  console.log("DEBUG-PW6: New words after filtering:", newWords);
  
  // Update new words list
  console.log("DEBUG-PW7: Setting new words list to:", [...newWords]);
  setNewWordsList([...newWords]);
  
  // Add all words to history
  updateHistoryWords(words, historyWords, setHistoryWords);
};

// Function to update history words
export const updateHistoryWords = async (wordsToAdd, historyWords, setHistoryWords) => {
  try {
    if (!wordsToAdd || wordsToAdd.length === 0) {
      console.log("DEBUG-UHW1: No words to add to history");
      return;
    }
    
    console.log("DEBUG-UHW2: Adding words to history:", wordsToAdd);
    console.log("DEBUG-UHW3: Current history:", historyWords);
    
    let currentHistory = [...historyWords];
    const lowerHistoryWords = new Set(currentHistory.map(w => w.toLowerCase()));
    console.log("DEBUG-UHW4: Lower case history words:", Array.from(lowerHistoryWords));
    
    let updated = false;
    for (const word of wordsToAdd) {
      if (!word || word.length === 0) continue;
      
      const lowerWord = word.toLowerCase();
      console.log(`DEBUG-UHW5: Checking word: ${word}, lower: ${lowerWord}`);
      
      if (!lowerHistoryWords.has(lowerWord)) {
        currentHistory.push(word);
        lowerHistoryWords.add(lowerWord);
        updated = true;
        console.log(`DEBUG-UHW6: Added ${word} to history`);
      } else {
        console.log(`DEBUG-UHW7: Word ${word} already in history`);
      }
    }
    
    if (updated) {
      currentHistory.sort((a, b) => a.localeCompare(b));
      console.log("DEBUG-UHW8: Updated history:", currentHistory);
      setHistoryWords(currentHistory);
      await AsyncStorage.setItem('historyWords', JSON.stringify(currentHistory));
      console.log("DEBUG-UHW9: Saved history to AsyncStorage");
    } else {
      console.log("DEBUG-UHW10: No updates to history needed");
    }
  } catch (error) {
    console.error("DEBUG-UHW-ERROR: Error updating history words:", error);
  }
};

// Handle word feedback
export const handleWordFeedback = async (words, isTooHard, tooHardWords, setTooHardWordsList, 
                                         studyLangSentence, setNewWordsList, saveCurrentState) => {
  console.log("DEBUG-HWF1: Handling word feedback:", words, "isTooHard:", isTooHard);
  console.log("DEBUG-HWF2: Current too hard words:", Array.from(tooHardWords));
  
  if (isTooHard) {
    words.forEach(word => {
      const lowerWord = word.toLowerCase();
      console.log(`DEBUG-HWF3: Adding ${word} (${lowerWord}) to too hard words`);
      tooHardWords.add(lowerWord);
    });
    
    const updatedTooHardList = Array.from(tooHardWords);
    console.log("DEBUG-HWF4: Updated too hard list:", updatedTooHardList);
    setTooHardWordsList(updatedTooHardList);
    
    if (studyLangSentence) {
      console.log("DEBUG-HWF5: Re-extracting words from study sentence:", studyLangSentence);
      const allWords = extractWords(studyLangSentence);
      const lowerCaseTooHardWords = new Set(updatedTooHardList.map(w => w.toLowerCase()));
      
      console.log("DEBUG-HWF6: All words:", allWords);
      console.log("DEBUG-HWF7: Lower case too hard words:", Array.from(lowerCaseTooHardWords));
      
      const filteredNewWords = allWords.filter(word => {
        const lowerWord = word.toLowerCase();
        const isHard = lowerCaseTooHardWords.has(lowerWord);
        console.log(`DEBUG-HWF8: Word ${word}, lower: ${lowerWord}, isHard: ${isHard}`);
        return !isHard;
      });
      
      console.log("DEBUG-HWF9: Filtered new words:", filteredNewWords);
      setNewWordsList(filteredNewWords);
    }
  } else {
    words.forEach(word => {
      const lowerWord = word.toLowerCase();
      console.log(`DEBUG-HWF10: Removing ${word} (${lowerWord}) from too hard words`);
      tooHardWords.delete(lowerWord);
    });
    
    const updatedTooHardList = Array.from(tooHardWords);
    console.log("DEBUG-HWF11: Updated too hard list:", updatedTooHardList);
    setTooHardWordsList(updatedTooHardList);
    
    if (studyLangSentence) {
      console.log("DEBUG-HWF12: Re-extracting words from study sentence:", studyLangSentence);
      const allWords = extractWords(studyLangSentence);
      const lowerCaseTooHardWords = new Set(updatedTooHardList.map(w => w.toLowerCase()));
      
      console.log("DEBUG-HWF13: All words:", allWords);
      console.log("DEBUG-HWF14: Lower case too hard words:", Array.from(lowerCaseTooHardWords));
      
      const filteredNewWords = allWords.filter(word => {
        const lowerWord = word.toLowerCase();
        const isHard = lowerCaseTooHardWords.has(lowerWord);
        console.log(`DEBUG-HWF15: Word ${word}, lower: ${lowerWord}, isHard: ${isHard}`);
        return !isHard;
      });
      
      console.log("DEBUG-HWF16: Filtered new words:", filteredNewWords);
      setNewWordsList(filteredNewWords);
    }
  }
  
  await saveCurrentState();
  console.log("DEBUG-HWF17: Saved current state");
};