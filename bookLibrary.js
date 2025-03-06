// Keep the original imports for backwards compatibility
import { montecristo } from './books/montecristo';
import { prideandprejudice } from './books/prideandprejudice';
import { sherlockholmes } from './books/sherlockholmes';
import { warandpeace } from './books/warandpeace';
import { aliceinwonderland } from './books/aliceinwonderland';
import { mobydick } from './books/mobydick';
import { frankenstein } from './books/frankenstein';
import { donquixote } from './books/donquixote';
import { taleoftwocities } from './books/taleoftwocities';
import { greatgatsby } from './books/greatgatsby';
import { dracula } from './books/dracula';
import { wizardofoz } from './books/wizardofoz';
import { littlewomen } from './books/littlewomen';
import { odyssey } from './books/odyssey';
import { iliad } from './books/iliad';
import { treasureisland } from './books/treasureisland';
import { tomsawyer } from './books/tomsawyer';
import { callofthewild } from './books/callofthewild';
import { torah } from './books/torah';
import { republic } from './books/republic';
import { zarathustra } from './books/zarathustra';
import { lesmiserables } from './books/lesmiserables';
import { ladywiththepet } from './books/ladywiththepet';

// Add imports for file handling
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create a flag to control whether to use text files or JS files
let useTextFiles = true;

// Function to toggle between text files and JS files
export const toggleTextFileUsage = async (value) => {
  useTextFiles = value;
  try {
    await AsyncStorage.setItem('useTextFiles', value ? 'true' : 'false');
  } catch (error) {
    console.error('Error saving useTextFiles setting:', error);
  }
};

// Function to load the preference
export const loadTextFilePreference = async () => {
  try {
    const value = await AsyncStorage.getItem('useTextFiles');
    useTextFiles = value !== 'false'; // Default to true unless explicitly set to false
  } catch (error) {
    console.error('Error loading useTextFiles setting:', error);
  }
};

// Initialize on import
loadTextFilePreference();

// Book library with titles and metadata
export const bookLibrary = [
  {
    id: "montecristo",
    titleKey: "countOfMonteCristo",
    defaultTitle: "The Count of Monte Cristo",
    author: "Alexandre Dumas",
    jsContent: montecristo,
    txtFilename: "montecristo.txt"
  },
  {
    id: "prideandprejudice",
    titleKey: "prideAndPrejudice",
    defaultTitle: "Pride and Prejudice",
    author: "Jane Austen",
    jsContent: prideandprejudice,
    txtFilename: "prideandprejudice.txt"
  },
  {
    id: "sherlockholmes",
    titleKey: "adventuresOfSherlockHolmes",
    defaultTitle: "The Adventures of Sherlock Holmes",
    author: "Arthur Conan Doyle",
    jsContent: sherlockholmes,
    txtFilename: "sherlockholmes.txt"
  },
  {
    id: "warandpeace",
    titleKey: "warAndPeace",
    defaultTitle: "War and Peace",
    author: "Leo Tolstoy",
    jsContent: warandpeace,
    txtFilename: "warandpeace.txt"
  },
  {
    id: "aliceinwonderland",
    titleKey: "aliceInWonderland",
    defaultTitle: "Alice's Adventures in Wonderland",
    author: "Lewis Carroll",
    jsContent: aliceinwonderland,
    txtFilename: "aliceinwonderland.txt"
  },
  {
    id: "mobydick",
    titleKey: "mobyDick",
    defaultTitle: "Moby Dick",
    author: "Herman Melville",
    jsContent: mobydick,
    txtFilename: "mobydick.txt"
  },
  {
    id: "frankenstein",
    titleKey: "frankenstein",
    defaultTitle: "Frankenstein",
    author: "Mary Shelley",
    jsContent: frankenstein,
    txtFilename: "frankenstein.txt"
  },
  {
    id: "donquixote",
    titleKey: "donQuixote",
    defaultTitle: "Don Quixote",
    author: "Miguel de Cervantes",
    jsContent: donquixote,
    txtFilename: "donquixote.txt"
  },
  {
    id: "taleoftwocities",
    titleKey: "taleOfTwoCities",
    defaultTitle: "A Tale of Two Cities",
    author: "Charles Dickens",
    jsContent: taleoftwocities,
    txtFilename: "taleoftwocities.txt"
  },
  {
    id: "greatgatsby",
    titleKey: "greatGatsby",
    defaultTitle: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    jsContent: greatgatsby,
    txtFilename: "greatgatsby.txt"
  },
  {
    id: "dracula",
    titleKey: "dracula",
    defaultTitle: "Dracula",
    author: "Bram Stoker",
    jsContent: dracula,
    txtFilename: "dracula.txt"
  },
  {
    id: "wizardofoz",
    titleKey: "wizardOfOz",
    defaultTitle: "The Wonderful Wizard of Oz",
    author: "L. Frank Baum",
    jsContent: wizardofoz,
    txtFilename: "wizardofoz.txt"
  },
  {
    id: "littlewomen",
    titleKey: "littleWomen",
    defaultTitle: "Little Women",
    author: "Louisa May Alcott",
    jsContent: littlewomen,
    txtFilename: "littlewomen.txt"
  },
  {
    id: "odyssey",
    titleKey: "odyssey",
    defaultTitle: "The Odyssey",
    author: "Homer",
    jsContent: odyssey,
    txtFilename: "odyssey.txt"
  },
  {
    id: "iliad",
    titleKey: "iliad",
    defaultTitle: "The Iliad",
    author: "Homer",
    jsContent: iliad,
    txtFilename: "iliad.txt"
  },
  {
    id: "treasureisland",
    titleKey: "treasureIsland",
    defaultTitle: "Treasure Island",
    author: "Robert Louis Stevenson",
    jsContent: treasureisland,
    txtFilename: "treasureisland.txt"
  },
  {
    id: "tomsawyer",
    titleKey: "tomSawyer",
    defaultTitle: "The Adventures of Tom Sawyer",
    author: "Mark Twain",
    jsContent: tomsawyer,
    txtFilename: "tomssawyer.txt" // Note the double 's' here
  },
  {
    id: "callofthewild",
    titleKey: "callOfTheWild",
    defaultTitle: "The Call of the Wild",
    author: "Jack London",
    jsContent: callofthewild,
    txtFilename: "callofthewild.txt"
  },
  {
    id: "torah",
    titleKey: "torah",
    defaultTitle: "The Torah",
    author: "Traditional",
    jsContent: torah,
    txtFilename: "torah.txt"
  },
  {
    id: "republic",
    titleKey: "republic",
    defaultTitle: "The Republic",
    author: "Plato",
    jsContent: republic,
    txtFilename: "republic.txt"
  },
  {
    id: "zarathustra",
    titleKey: "thusSpokeZarathustra",
    defaultTitle: "Thus Spoke Zarathustra",
    author: "Friedrich Nietzsche",
    jsContent: zarathustra,
    txtFilename: "zarathustra.txt"
  },
  {
    id: "lesmiserables",
    titleKey: "lesMiserables",
    defaultTitle: "Les Misérables",
    author: "Victor Hugo",
    jsContent: lesmiserables,
    txtFilename: "lesmiserables.txt"
  },
  {
    id: "ladywiththepet",
    titleKey: "ladyWithTheDog",
    defaultTitle: "The Lady with the Dog",
    author: "Anton Chekhov",
    jsContent: ladywiththepet,
    txtFilename: "ladywiththepet.txt"
  }
];

// Helper function to load a text file from the assets directory
async function loadTextFile(filename) {
  try {
    console.log(`Loading text file: ${filename}`);
    
    // Try to read directly from the assets directory
    try {
      const path = FileSystem.documentDirectory + 'assets/books/' + filename;
      console.log(`Trying path: ${path}`);
      
      const fileInfo = await FileSystem.getInfoAsync(path);
      if (fileInfo.exists) {
        console.log(`File found at: ${path}`);
        const content = await FileSystem.readAsStringAsync(path);
        return content;
      } else {
        console.log(`File not found at: ${path}`);
      }
    } catch (error) {
      console.log(`Error reading from document directory: ${error.message}`);
    }
    
    // Try alternate paths
    const alternatePaths = [
      'assets/books/' + filename,
      'books/' + filename,
      '../assets/books/' + filename,
    ];
    
    for (const path of alternatePaths) {
      try {
        console.log(`Trying alternate path: ${path}`);
        const fileInfo = await FileSystem.getInfoAsync(path);
        if (fileInfo.exists) {
          console.log(`File found at: ${path}`);
          const content = await FileSystem.readAsStringAsync(path);
          return content;
        }
      } catch (error) {
        console.log(`Error with alternate path ${path}: ${error.message}`);
      }
    }
    
    // If we get here, we couldn't find the file
    console.error(`Text file not found: ${filename}`);
    throw new Error(`Text file not found: ${filename}`);
  } catch (error) {
    console.error(`Error loading text file ${filename}:`, error);
    throw error;
  }
}

// Function to get book by ID
export const getBookById = async (id) => {
  try {
    console.log(`Getting book with ID: ${id}, useTextFiles: ${useTextFiles}`);
    
    // Find the book metadata
    const book = bookLibrary.find(book => book.id === id);
    if (!book) {
      console.error(`Book with ID ${id} not found`);
      return null;
    }
    
    console.log(`Found book: "${book.defaultTitle}" by ${book.author}`);
    
    // If we're using text files, try to load from the text file
    if (useTextFiles) {
      try {
        const textContent = await loadTextFile(book.txtFilename);
        if (textContent) {
          console.log(`Successfully loaded book from text file. Length: ${textContent.length}`);
          return {
            ...book,
            content: textContent,
            source: 'text'
          };
        }
      } catch (textError) {
        console.log(`Error loading from text file: ${textError.message}`);
        console.log('Falling back to JS content');
      }
    }
    
    // Fallback to JS content (or if we're not using text files)
    console.log(`Using JavaScript content for ${book.id}`);
    return {
      ...book,
      content: book.jsContent,
      source: 'js'
    };
  } catch (error) {
    console.error('Error in getBookById:', error);
    return null;
  }
};

// Function to get a translated version of all book titles
export const translateBookTitles = async (translateFunction) => {
  const titles = {};
  
  // Map for tracking translations
  for (const book of bookLibrary) {
    try {
      const translatedTitle = await translateFunction(book.defaultTitle, 'en', null);
      titles[book.titleKey] = translatedTitle || book.defaultTitle;
    } catch (error) {
      console.error(`Error translating title for ${book.id}:`, error);
      titles[book.titleKey] = book.defaultTitle;
    }
  }
  
  return titles;
};