export const fetchBookTextFromChatGPT = async (query) => {
  try {
    const requestBody = {
      model: "gpt-4",
      messages: [
        { role: "system", content: "You retrieve the first paragraph of books or genres in their original language. Respond with only the text, followed by the detected language code (e.g., 'fr', 'de', 'ru')." },
        { role: "user", content: `Provide the first paragraph of "${query}" in its original language, followed by the language code.` }
      ]
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer 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`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    const fullResponse = data.choices[0].message.content.trim();

    const parts = fullResponse.split("\n");
    const text = parts.slice(0, -1).join("\n").trim();
    const detectedLanguage = parts[parts.length - 1].trim();

    return { text, language: detectedLanguage };
  } catch (error) {
    console.error("Error fetching book text:", error);
    return { text: "No book found for this query.", language: "en" };
  }
};

export const translateText = async (text, sourceLang, targetLang) => {
  if (!text || sourceLang === targetLang) return text;
  try {
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`
    );
    const data = await response.json();
    return data.responseData.translatedText || text;
  } catch {
    return text;
  }
};