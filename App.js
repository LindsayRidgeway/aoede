import React, { useState, useEffect } from 'react';
import { fetchBookTextFromChatGPT, translateText } from './api'; // ✅ Ensure `translateText` is correctly imported
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
  const [studyLanguage, setStudyLanguage] = useState("ru"); // ✅ Still hardcoded for now

  useEffect(() => {
    const userLang = navigator.language.split('-')[0] || "en";
    const labels = [
      "Calliope", "Enter a book title or genre", "Play", "Next Sentence",
      "Load Book", "Show Foreign Sentence", "Show Translation", "Reading Speed"
    ];

    const translateLabels = async () => {
      const translatedLabels = await Promise.all(labels.map(label => translateText(label, "en", userLang)));
      setUiText({
        appName: translatedLabels[0],
        enterBook: translatedLabels[1],
        play: translatedLabels[2],
        next: translatedLabels[3],
        loadBook: translatedLabels[4],
        showText: translatedLabels[5],
        showTranslation: translatedLabels[6],
        readingSpeed: translatedLabels[7]
      });
    };

    translateLabels();
  }, []);

  const loadBook = async () => {
    if (!userQuery) return;
    const { text, language } = await fetchBookTextFromChatGPT(userQuery);
    setSentence(text);
    setDetectedLanguage(language || "en");

    // ✅ Ensure detected language is always valid (fallback to "en" if incorrect)
    let validSourceLang = language ? language.toLowerCase().trim() : "en";
    validSourceLang = validSourceLang.replace(/[^a-z]/g, ""); // ✅ Removes invalid characters

    if (!/^[a-z]{2}$/i.test(validSourceLang)) {
      console.warn(`⚠ AI returned invalid language code: "${validSourceLang}". Defaulting to "en".`);
      validSourceLang = "en";
    }

    console.log(`🔍 Translating from ${validSourceLang} to ${studyLanguage}:`, text);

    // ✅ **Ensure translation function exists before calling**
    if (typeof translateText !== "function") {
      console.error("❌ translateText is not a function. Check import in App.js.");
      return;
    }

    // ✅ **Prevent self-translation errors**
    if (validSourceLang === studyLanguage) {
      console.log(`⚠ Skipping translation: Source and target languages are both '${studyLanguage}'.`);
      setTranslatedSentence(text);
      return;
    }

    // ✅ **Ensure translation is always forced**
    translateText(text, validSourceLang, studyLanguage)
      .then((translated) => {
        console.log(`✅ Translation successful:`, translated);
        setTranslatedSentence(translated.replace(/^"|"$/g, "")); // ✅ Remove surrounding quotes
      })
      .catch(error => {
        console.error("❌ Translation error:", error);
        setTranslatedSentence("⚠ Translation failed");
      });
  };

  return (
    <MainUI
      uiText={uiText}
      userQuery={userQuery}  
      setUserQuery={setUserQuery}
      loadBook={loadBook}
      sentence={translatedSentence}  // ✅ Always display in study language
      showText={showText}
      showTranslation={showTranslation}
      setShowText={setShowText}
      setShowTranslation={setShowTranslation}
      speechRate={speechRate}
      setSpeechRate={setSpeechRate}
    />
  );
}