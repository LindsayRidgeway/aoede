import React, { useState, useEffect } from 'react';
import { fetchBookTextFromChatGPT, translateText } from './api';
import { MainUI } from './UI';
import * as Speech from 'expo-speech';

export default function App() {
  const [uiText, setUiText] = useState({});
  const [userQuery, setUserQuery] = useState("");  
  const [sentence, setSentence] = useState("");
  const [translatedSentence, setTranslatedSentence] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState("en");
  const [showText, setShowText] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [studyLanguage, setStudyLanguage] = useState("ru");
  const [loadingBook, setLoadingBook] = useState(false);

  useEffect(() => {
    const userLang = navigator.language.split('-')[0] || "en";
    const labels = [
      "Calliope", "Source Material", "Enter a book title or genre", "Listen", "Next Sentence",
      "Load Book", "Show Foreign Sentence", "Show Translation", "Reading Speed"
    ];

    const translateLabels = async () => {
      const translatedLabels = await Promise.all(labels.map(label => translateText(label, "en", userLang)));
      setUiText({
        appName: translatedLabels[0],
        sourceMaterial: translatedLabels[1],  // ✅ New label for the title
        enterBook: translatedLabels[2],
        listen: translatedLabels[3],
        next: translatedLabels[4],
        loadBook: translatedLabels[5],
        showText: translatedLabels[6],
        showTranslation: translatedLabels[7],
        readingSpeed: translatedLabels[8]
      });
    };

    translateLabels();
  }, []);

  const loadBook = async () => {
    if (!userQuery) return;

    setLoadingBook(true);

    try {
      const { text, language } = await fetchBookTextFromChatGPT(userQuery);
      setSentence(text);
      setDetectedLanguage(language || "en");

      let validSourceLang = language ? language.toLowerCase().trim() : "en";
      validSourceLang = validSourceLang.replace(/[^a-z]/g, "");

      if (!/^[a-z]{2}$/i.test(validSourceLang)) {
        console.warn(`⚠ AI returned invalid language code: "${validSourceLang}". Defaulting to "en".`);
        validSourceLang = "en";
      }

      console.log(`🔍 Translating from ${validSourceLang} to ${studyLanguage}:`, text);

      if (typeof translateText !== "function") {
        console.error("❌ translateText is not a function. Check import in App.js.");
        return;
      }

      if (validSourceLang === studyLanguage) {
        console.log(`⚠ Skipping translation: Source and target languages are both '${studyLanguage}'.`);
        setTranslatedSentence(text);
      } else {
        const translated = await translateText(text, validSourceLang, studyLanguage);
        console.log(`✅ Translation successful:`, translated);
        setTranslatedSentence(translated.replace(/^"|"$/g, ""));
      }
    } catch (error) {
      console.error("❌ Book loading failed:", error);
    } finally {
      setLoadingBook(false);
    }
  };

  const speakSentence = () => {
    if (!translatedSentence) return;
    
    console.log("🔊 Speaking:", translatedSentence);
    Speech.stop();
    
    Speech.speak(translatedSentence, {
      rate: speechRate,
      language: studyLanguage,
    });
  };

  return (
    <MainUI
      uiText={uiText}
      userQuery={userQuery}  
      setUserQuery={setUserQuery}
      loadBook={loadBook}
      sentence={translatedSentence}
      showText={showText}
      showTranslation={showTranslation}
      setShowText={setShowText}
      setShowTranslation={setShowTranslation}
      speechRate={speechRate}
      setSpeechRate={setSpeechRate}
      speakSentence={speakSentence}
      loadingBook={loadingBook}
    />
  );
}