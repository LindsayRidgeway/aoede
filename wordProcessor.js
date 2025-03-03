import AsyncStorage from '@react-native-async-storage/async-storage';

// Extract words from text (works with any script)
export const extractWords = (text) => {
  if (!text) return [];
  
  // First split by whitespace to get initial words
  const wordCandidates = text.split(/\s+/);
  
  // Clean punctuation from each word individually
  const cleaned = wordCandidates.map(word => 
    word.replace(/[^\p{L}\p{N}]/gu, '') // Remove anything that's not a letter or number
  );
  
  // Remove empty strings
  return cleaned.filter(word => word && word.length > 0);
};

// Process words for both lists
export const processWords = (words, tooHardWordsList, setNewWordsList, historyWords, setHistoryWords) => {
  if (!words || words.length === 0) return;
  
  // Filter out words that have been marked as too hard
  const lowerCaseTooHardWords = new Set(tooHardWordsList.map(w => w.toLowerCase()));
  const newWords = words.filter(word => 
    !lowerCaseTooHardWords.has(word.toLowerCase())
  );
  
  // Update new words list
  setNewWordsList([...newWords]);
  
  // Add all words to history
  updateHistoryWords(words, historyWords, setHistoryWords);
};

// Function to update history words
export const updateHistoryWords = async (wordsToAdd, historyWords, setHistoryWords) => {
  try {
    if (!wordsToAdd || wordsToAdd.length === 0) return;
    
    let currentHistory = [...historyWords];
    const lowerHistoryWords = new Set(currentHistory.map(w => w.toLowerCase()));
    
    let updated = false;
    for (const word of wordsToAdd) {
      if (!word || word.length === 0) continue;
      
      if (!lowerHistoryWords.has(word.toLowerCase())) {
        currentHistory.push(word);
        lowerHistoryWords.add(word.toLowerCase());
        updated = true;
      }
    }
    
    if (updated) {
      currentHistory.sort();
      setHistoryWords(currentHistory);
      await AsyncStorage.setItem('historyWords', JSON.stringify(currentHistory));
    }
  } catch (error) {
    console.error("Error updating history words:", error);
  }
};

// Handle word feedback
export const handleWordFeedback = async (words, isTooHard, tooHardWords, setTooHardWordsList, 
                                         studyLangSentence, setNewWordsList, saveCurrentState) => {
  if (isTooHard) {
    words.forEach(word => tooHardWords.add(word.toLowerCase()));
    
    const updatedTooHardList = Array.from(tooHardWords);
    setTooHardWordsList(updatedTooHardList);
    
    if (studyLangSentence) {
      const allWords = extractWords(studyLangSentence);
      const lowerCaseTooHardWords = new Set(updatedTooHardList.map(w => w.toLowerCase()));
      const filteredNewWords = allWords.filter(word => 
        !lowerCaseTooHardWords.has(word.toLowerCase())
      );
      
      setNewWordsList(filteredNewWords);
    }
  } else {
    words.forEach(word => tooHardWords.delete(word.toLowerCase()));
    
    const updatedTooHardList = Array.from(tooHardWords);
    setTooHardWordsList(updatedTooHardList);
    
    if (studyLangSentence) {
      const allWords = extractWords(studyLangSentence);
      const lowerCaseTooHardWords = new Set(updatedTooHardList.map(w => w.toLowerCase()));
      const filteredNewWords = allWords.filter(word => 
        !lowerCaseTooHardWords.has(word.toLowerCase())
      );
      
      setNewWordsList(filteredNewWords);
    }
  }
  
  await saveCurrentState();
};