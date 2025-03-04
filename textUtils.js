// textUtils.js - Common utilities for text processing

// Split text into sentences
export const splitIntoSentences = (text) => {
  if (!text) return [];
  return text.split(/(?<=[.!?])\s+/).filter(sentence => sentence.trim().length > 0);
};