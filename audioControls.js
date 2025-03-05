import ListeningSpeed from './listeningSpeed';

// Toggle speak function
export const toggleSpeak = (isSpeaking, setIsSpeaking, studyLangSentence, listeningSpeed) => {
  if (isSpeaking) {
    ListeningSpeed.stopSpeaking();
    setIsSpeaking(false);
  } else {
    ListeningSpeed.speakSentenceWithPauses(studyLangSentence, listeningSpeed, () => setIsSpeaking(false));
    setIsSpeaking(true);
  }
};

// Process next sentence
export const processNextSentence = (sentences, currentSentenceIndex, setCurrentSentenceIndex, 
  setStudyLangSentence, setNativeLangSentence, showAlert) => {
  
  if (sentences.length === 0) return;
  
  // Increment sentence index
  const nextIndex = currentSentenceIndex + 1;
  
  // Check if we've reached the end of available sentences
  if (nextIndex >= sentences.length) {
    // Show notification to user that we're at the end
    showAlert("End of Content", "You've reached the end of the available sentences.");
    return;
  }
  
  // Display the next sentence
  setCurrentSentenceIndex(nextIndex);
  setStudyLangSentence(sentences[nextIndex].original);
  setNativeLangSentence(sentences[nextIndex].translation);
};