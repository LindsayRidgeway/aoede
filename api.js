import Constants from "expo-constants"; // ✅ Correct way to access Expo config

const openaiKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_OPENAI_API_KEY;
const googleKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_API_KEY;

export const fetchBookTextFromChatGPT = async (query) => {
  try {
    if (!openaiKey) {
      return { text: "⚠ OpenAI API Key Missing", language: "en" };
    }

    const requestBody = {
      model: "gpt-4", // Switched back to GPT-4 for reliable source material access
      messages: [
        { role: "system", content: "You retrieve the first paragraph of books or genres in their original language. Respond with only the paragraph text, followed by the detected two-letter ISO language code (e.g., 'fr', 'de', 'ru'). The language code must be on a separate last line, and contain only the two-letter code." },
        { role: "user", content: `Provide the first paragraph of "${query}" in its original language, followed by the language code on a new line.` }
      ]
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      return { text: "⚠ Book fetch failed", language: "en" };
    }

    const fullResponse = data.choices[0].message.content.trim();
    const parts = fullResponse.split("\n");

    if (parts.length < 2) {
      return { text: "⚠ Book fetch failed", language: "en" };
    }

    let text = parts.slice(0, -1).join("\n").trim();
    let detectedLanguage = parts[parts.length - 1].trim().toLowerCase();

    detectedLanguage = detectedLanguage.replace(/[^a-z]/g, "");
    if (!/^[a-z]{2}$/i.test(detectedLanguage)) {
      detectedLanguage = "en";
    }

    const maxLength = 450;
    if (text.length > maxLength) {
      text = text.slice(0, maxLength) + "...";
    }

    return { text, language: detectedLanguage };
  } catch (error) {
    return { text: "⚠ Book fetch failed", language: "en" };
  }
};

// ✅ Google Translate API Integration
export const translateText = async (text, sourceLang, targetLang) => {
  if (!text || sourceLang === targetLang) return text;

  try {
    if (!googleKey) {
      return "⚠ Google API Key Missing";
    }

    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${googleKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
          format: "text"
        })
      }
    );

    const data = await response.json();

    if (!data.data?.translations || data.data.translations.length === 0) {
      return "⚠ Translation failed";
    }

    return data.data.translations[0].translatedText;
  } catch (error) {
    return "⚠ Translation failed";
  }
};