import { translateText } from "./api"; // Ensure access to translateText

const userLang = navigator.language.split('-')[0] || "en";

const labels = [
  "Calliope", "Source Material", "Enter a book title or genre", "Listen", "Next Sentence",
  "Load Book", "Show Foreign Sentence", "Show Translation", "Reading Speed",
  "Study Language", "Enter study language"  // ✅ Added missing labels
];

export const translateLabels = async (setUiText) => {
  try {
      const translatedLabels = await Promise.all(labels.map(label => translateText(label, "en", userLang)));

      setUiText({
	appName: translatedLabels[0],
	sourceMaterial: translatedLabels[1],
	enterBook: translatedLabels[2],
	listen: translatedLabels[3],
	next: translatedLabels[4],
	loadBook: translatedLabels[5],
	showText: translatedLabels[6],
	showTranslation: translatedLabels[7],
	readingSpeed: translatedLabels[8],
	studyLanguage: translatedLabels[9],
	enterLanguage: translatedLabels[10]
      });
  } catch (error) {
    console.error("❌ ERROR: Failed to translate UI labels:", error);
  }
};
