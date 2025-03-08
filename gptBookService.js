// GPT-based book content retrieval service
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Number of sentences to request
const DEFAULT_SENTENCE_COUNT = 200; // Increased from 100 to get more content

// Get API key using both old and new Expo Constants paths for compatibility
const getConstantValue = (key) => {
  // Try the new path (expoConfig.extra) first - Expo SDK 46+
  if (Constants?.expoConfig?.extra && Constants.expoConfig.extra[key] !== undefined) {
    return Constants.expoConfig.extra[key];
  }
  
  // Fallback to old path (manifest.extra) - before Expo SDK 46
  if (Constants?.manifest?.extra && Constants.manifest.extra[key] !== undefined) {
    return Constants.manifest.extra[key];
  }
  
  // For Expo Go and other environments - check extra at top level
  if (Constants?.extra && Constants.extra[key] !== undefined) {
    return Constants.extra[key];
  }
  
  // Check the direct path in Constants as last resort
  if (Constants && Constants[key] !== undefined) {
    return Constants[key];
  }
  
  return null;
};

// Get API keys from Expo Constants
const OPENAI_API_KEY = getConstantValue('EXPO_PUBLIC_OPENAI_API_KEY') || 
  "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";
const CORS_PROXY = getConstantValue('EXPO_PUBLIC_CORS_PROXY') || "https://thingproxy.freeboard.io/fetch/";

// Log API key status for debugging
console.log('OpenAI API key available:', !!OPENAI_API_KEY);
console.log('CORS Proxy available:', !!CORS_PROXY);

// Function to fetch book content by ID (from dropdown) or by custom search
export const fetchBookContent = async (bookIdOrSearch, sentenceCount = DEFAULT_SENTENCE_COUNT, isCustomSearch = false) => {
  let searchQuery;
  
  if (isCustomSearch) {
    // Use the provided text directly as search query
    searchQuery = bookIdOrSearch;
    console.log(`Searching for book: "${searchQuery}" with ${sentenceCount} sentences`);
  } else {
    // Look up the book title from the popularBooks array
    const book = popularBooks.find(book => book.id === bookIdOrSearch);
    if (!book) {
      throw new Error(`Book with ID ${bookIdOrSearch} not found`);
    }
    searchQuery = book.title;
    console.log(`Fetching book: "${searchQuery}" with ${sentenceCount} sentences`);
  }
  
  try {
    // Use proxy for web, direct call for mobile
    if (Platform.OS === 'web') {
      return await fetchWithProxy(searchQuery, sentenceCount);
    } else {
      return await fetchDirectFromOpenAI(searchQuery, sentenceCount);
    }
  } catch (error) {
    console.error('Error fetching book content:', error);
    
    // If web fetch with proxy fails, try direct as fallback
    if (Platform.OS === 'web') {
      try {
        console.log('Proxy failed, trying direct API access...');
        return await fetchDirectFromOpenAI(searchQuery, sentenceCount);
      } catch (directError) {
        console.error('Direct fetch also failed:', directError);
        throw directError;
      }
    }
    
    throw error;
  }
};

// Fetch with CORS proxy (for web)
const fetchWithProxy = async (searchQuery, sentenceCount) => {
  console.log('Using CORS proxy for OpenAI request');
  
  const apiUrl = `${CORS_PROXY}https://api.openai.com/v1/chat/completions`;
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a literature search engine for public domain works. When given a book title or description, you find the matching public domain text and return ONLY the first ${sentenceCount} sentences with no additional commentary. For each sentence, include it on a new line. Include the title and language at the beginning in the format "TITLE: [book title] | LANGUAGE: [language]". If no matching text is found, respond with "No books found matching that query."`
        },
        {
          role: 'user',
          content: `Find a public domain work matching this description: "${searchQuery}". I need the first ${sentenceCount} sentences - please include as many sentences as possible up to that limit.`
        }
      ],
      max_tokens: 8000, // Increased from 4000 to get more content
      temperature: 0.2, // Lower temperature for more precise responses
    })
  });
  
  // Parse and process the response
  const responseText = await response.text();
  let responseData;
  
  try {
    responseData = JSON.parse(responseText);
  } catch (e) {
    throw new Error(`Failed to parse response as JSON. Response starts with: ${responseText.substring(0, 100)}`);
  }
  
  if (!response.ok) {
    throw new Error('API error: ' + (responseData.error?.message || JSON.stringify(responseData)));
  }
  
  if (!responseData.choices || !responseData.choices[0]?.message?.content) {
    throw new Error('Invalid API response structure: ' + JSON.stringify(responseData));
  }
  
  const text = responseData.choices[0].message.content;
  
  if (text.includes("No books found matching that query")) {
    throw new Error('No books found matching your query');
  }
  
  return processBookText(text);
};

// Direct API access (for mobile)
const fetchDirectFromOpenAI = async (searchQuery, sentenceCount) => {
  console.log('Using direct API access for OpenAI request');
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a literature search engine for public domain works. When given a book title or description, you find the matching public domain text and return ONLY the first ${sentenceCount} sentences with no additional commentary. For each sentence, include it on a new line. Include the title and language at the beginning in the format "TITLE: [book title] | LANGUAGE: [language]". If no matching text is found, respond with "No books found matching that query."`
        },
        {
          role: 'user',
          content: `Find a public domain work matching this description: "${searchQuery}". I need the first ${sentenceCount} sentences - please include as many sentences as possible up to that limit.`
        }
      ],
      max_tokens: 8000, // Increased from 4000 to get more content
      temperature: 0.2, // Lower temperature for more precise responses
    })
  });
  
  const responseData = await response.json();
  
  if (!response.ok) {
    throw new Error('API error: ' + (responseData.error?.message || JSON.stringify(responseData)));
  }
  
  if (!responseData.choices || !responseData.choices[0]?.message?.content) {
    throw new Error('Invalid API response structure: ' + JSON.stringify(responseData));
  }
  
  const text = responseData.choices[0].message.content;
  
  if (text.includes("No books found matching that query")) {
    throw new Error('No books found matching your query');
  }
  
  return processBookText(text);
};

// Process the response text into title, language, and sentences
const processBookText = (text) => {
  // Parse the title and language from the response
  const metaInfoMatch = text.match(/TITLE: (.*) \| LANGUAGE: (.*)/);
  let title = '';
  let language = '';
  let content = text;
  
  if (metaInfoMatch) {
    title = metaInfoMatch[1];
    language = metaInfoMatch[2];
    
    // Remove the metadata from the text
    content = text.replace(/TITLE: (.*) \| LANGUAGE: (.*)/, '').trim();
  } else {
    title = 'Unknown';
    language = 'Unknown';
  }
  
  // Split the text into sentences (improved method to catch more sentence patterns)
  let sentences = [];
  
  // First, try to split by newlines (if they're already one per line)
  if (content.includes('\n')) {
    sentences = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }
  
  // If we didn't get any sentences from newlines, try to split by sentence endings
  if (sentences.length === 0) {
    const sentenceRegex = /(?<=[.!?]['"]?)(?:\s+|$)/g;
    sentences = content.split(sentenceRegex)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
  
  console.log(`Extracted ${sentences.length} sentences from text`);
  
  return {
    title,
    language,
    sentences: sentences
  };
};

// List of popular books to show in dropdown
export const popularBooks = [
  { id: "montecristo", title: "The Count of Monte Cristo", author: "Alexandre Dumas" },
  { id: "prideandprejudice", title: "Pride and Prejudice", author: "Jane Austen" },
  { id: "sherlockholmes", title: "The Adventures of Sherlock Holmes", author: "Arthur Conan Doyle" },
  { id: "warandpeace", title: "War and Peace", author: "Leo Tolstoy" },
  { id: "aliceinwonderland", title: "Alice's Adventures in Wonderland", author: "Lewis Carroll" },
  { id: "mobydick", title: "Moby Dick", author: "Herman Melville" },
  { id: "frankenstein", title: "Frankenstein", author: "Mary Shelley" },
  { id: "donquixote", title: "Don Quixote", author: "Miguel de Cervantes" },
  { id: "taleoftwocities", title: "A Tale of Two Cities", author: "Charles Dickens" },
  { id: "greatgatsby", title: "The Great Gatsby", author: "F. Scott Fitzgerald" },
  { id: "dracula", title: "Dracula", author: "Bram Stoker" },
  { id: "wizardofoz", title: "The Wonderful Wizard of Oz", author: "L. Frank Baum" },
  { id: "littlewomen", title: "Little Women", author: "Louisa May Alcott" },
  { id: "odyssey", title: "The Odyssey", author: "Homer" },
  { id: "iliad", title: "The Iliad", author: "Homer" },
  { id: "treasureisland", title: "Treasure Island", author: "Robert Louis Stevenson" },
  { id: "tomsawyer", title: "The Adventures of Tom Sawyer", author: "Mark Twain" },
  { id: "callofthewild", title: "The Call of the Wild", author: "Jack London" },
  { id: "torah", title: "The Torah", author: "Traditional" },
  { id: "republic", title: "The Republic", author: "Plato" },
  { id: "zarathustra", title: "Thus Spoke Zarathustra", author: "Friedrich Nietzsche" },
  { id: "lesmiserables", title: "Les Misérables", author: "Victor Hugo" },
  { id: "ladywiththepet", title: "The Lady with the Dog", author: "Anton Chekhov" }
];