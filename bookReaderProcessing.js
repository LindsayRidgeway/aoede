// bookReaderProcessing.js - Text processing and API interaction methods
import { apiTranslateAndSimplifySentence, apiTranslateSentenceCheap } from './apiServices';
import BookPipe from './bookPipeCore';
import { bookPipeProcess } from './bookPipeProcess';
import { getBookById } from './userLibrary';

// Implementation of Step 1: Load the entire book into memory
export async function loadEntireBook(reader, bookId) {
  try {
    // Get book details from user library
    const book = await getBookById(bookId);
    if (!book) {
      throw new Error(`Book with ID ${bookId} not found`);
    }
    
    // Store the book language
    reader.bookLanguage = book.language || 'en';
    
    // Initialize BookPipe to get access to the book URL
    await BookPipe.initialize(bookId);
    
    // Store reader for later use
    reader.reader = BookPipe;
    reader.readerBookTitle = book.title;
    
    // Get the HTML content from BookPipe
    const htmlContent = BookPipe.htmlContent;
    
    if (!htmlContent) {
      throw new Error("Failed to load book content");
    }
    
    // Store the HTML content for anchor searching
    reader.bookText = htmlContent;
    
    // Extract plain text for sentence extraction
    reader.bookTextPlain = bookPipeProcess.extractText(htmlContent);
    
    return true;
  } catch (error) {
    reader.bookText = null;
    reader.bookTextPlain = null;
    throw error;
  }
}

// Implementation of Step 2: Find the anchor in the URL
export async function findAnchor(reader, bookId) {
  try {
    if (!reader.bookText) {
      throw new Error("Book text not loaded");
    }
  
    // Get book details from user library
    const book = await getBookById(bookId);
    if (!book) {
      throw new Error(`Book with ID ${bookId} not found`);
    }
  
    // Extract URL from book
    const bookUrl = book.url;
    if (!bookUrl) {
      throw new Error("Book URL is missing");
    }
  
    // Check if URL has a fragment identifier (anchor)
    let fragmentId = '';
    if (bookUrl.includes('#')) {
      fragmentId = bookUrl.split('#')[1];
    } else {
      throw new Error('URL does not contain an anchor fragment');
    }
    
    // Define patterns to search for the anchor in HTML
    // Order is important - we're using the patterns from Aoede 2.0
    const anchorPatterns = [
      new RegExp(`<a[^>]*?\\sname\\s*=\\s*["']?${fragmentId}["']?[^>]*?>((?!</a>).)*</a>`, 'i'),
      new RegExp(`<a[^>]*?\\sname\\s*=\\s*["']?${fragmentId}["']?[^>]*?>`, 'i'),
      new RegExp(`<[^>]+\\sid\\s*=\\s*["']?${fragmentId}["']?[^>]*?>`, 'i')
    ];
  
    let match = null;
    let patternIndex = -1;
  
    // Try each pattern to find the anchor
    for (let i = 0; i < anchorPatterns.length; i++) {
      match = anchorPatterns[i].exec(reader.bookText);
      if (match) {
        patternIndex = i;
        break;
      }
    }
  
    if (match) {
      reader.anchorPosition = match.index;
      return true;
    } else {
      reader.anchorPosition = 0;
      throw new Error(`Anchor "${fragmentId}" not found in book content`);
    }
  } catch (error) {
    reader.anchorPosition = 0;
    throw error;
  }
}

// Implementation of Step 3: Separate book into sentences AFTER THE ANCHOR POSITION
export async function extractSentences(reader) {
  try {
    if (!reader.bookTextPlain) {
      throw new Error("Book text not available");
    }
    
    // Get text AFTER the anchor position in plain text
    // First find where in the plain text the anchor corresponds to
    const htmlBeforeAnchor = reader.bookText.substring(0, reader.anchorPosition);
    const plainBeforeAnchor = bookPipeProcess.extractText(htmlBeforeAnchor);
    const plainTextAnchorPosition = plainBeforeAnchor.length;
    
    // Now get text after the anchor in plain text
    const textFromAnchor = reader.bookTextPlain.substring(plainTextAnchorPosition);
    
    // Extract sentences using our improved method
    reader.bookSentences = extractSentencesFromText(textFromAnchor);
          
    return true;
  } catch (error) {
    reader.bookSentences = [];
    throw error;
  }
}

// Calculate offsets for each sentence (for position tracking)
export function calculateSentenceOffsets(reader) {
  reader.sentenceOffsets = [];
  let currentOffset = 0;
  
  // For each sentence, store its starting offset
  for (let i = 0; i < reader.bookSentences.length; i++) {
    reader.sentenceOffsets.push(currentOffset);
    // Add the length of this sentence to the offset for the next sentence
    currentOffset += reader.bookSentences[i].length;
  }
  
  return true;
}

// Helper method to extract sentences from text
export function extractSentencesFromText(text) {
  // Prepare the text by normalizing whitespace
  const normalizedText = text.replace(/\r\n/g, '\n');
  
  // Split by paragraphs first to maintain structure
  const paragraphs = normalizedText.split(/\n\n+/);
  const sentences = [];
  
  for (const paragraph of paragraphs) {
    if (paragraph.trim().length === 0) continue;
    
    // TEMPORARY DEBUG: Check if this is our problem paragraph
    if (paragraph.includes("I didn't know what to do")) {
      console.log("DEBUG: Found problem paragraph!");
      console.log("Paragraph text:", JSON.stringify(paragraph));
      console.log("Paragraph length:", paragraph.length);
      
      // Let's see the character codes around the periods
      for (let i = 0; i < paragraph.length; i++) {
        if (paragraph[i] === '.') {
          console.log(`Character at position ${i}: '${paragraph[i]}' (code: ${paragraph.charCodeAt(i)})`);
          if (i + 1 < paragraph.length) {
            console.log(`Next character: '${paragraph[i+1]}' (code: ${paragraph.charCodeAt(i+1)})`);
          }
        }
      }
    }
    
    // Use a better approach: split on sentence endings but keep the delimiter
    // This regex looks for period/exclamation/question followed by optional space(s)
    // The key change: (\s*) instead of (\s+) to handle missing spaces
    const sentenceEndings = /([.!?]+)(\s*)/g;
    
    // Replace the endings with a unique delimiter that we can split on
    const delimiter = '\u0001'; // Use a control character that won't appear in text
    const marked = paragraph.replace(sentenceEndings, '$1' + delimiter);
    
    // Split on our delimiter
    const potentialSentences = marked.split(delimiter);
    
    for (const sentence of potentialSentences) {
      const trimmed = sentence.trim();
      if (trimmed.length > 0) {
        sentences.push(trimmed);
      }
    }
  }
  
  return sentences;
}

// Process the current sentence through the API
export async function processCurrentSentence(reader) {
  try {
    if (reader.currentSentenceIndex >= reader.bookSentences.length) {
      throw new Error("Invalid sentence index");
    }
    
    const sentence = reader.bookSentences[reader.currentSentenceIndex];
    
    // Make the API call for this single sentence
    const result = await processSentenceWithOpenAI(reader, sentence);
    
    if (result) {
      return true;
    } else {
      // If API fails, use the original sentence as fallback
      reader.simplifiedSentences = [sentence];
      return false;
    }
  } catch (error) {
    // Fallback to using the original sentence
    if (reader.currentSentenceIndex < reader.bookSentences.length) {
      reader.simplifiedSentences = [reader.bookSentences[reader.currentSentenceIndex]];
    } else {
      reader.simplifiedSentences = ["Error: Unable to process sentence"];
    }
    return false;
  }
}

// Process a single sentence with OpenAI API
async function processSentenceWithOpenAI(reader, sentence) {
  try {
   const processedText = await apiTranslateAndSimplifySentence(
      sentence, 
      reader.bookLanguage, 
      reader.studyLanguage, 
      reader.userLanguage, 
      reader.readingLevel
    );
    
    if (!processedText) {
      throw new Error("API returned empty response");
    }
    
    // Split the response into separate sentences by newlines
    const simplifiedSentences = processedText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (simplifiedSentences.length === 0) {
      throw new Error("No valid sentences found in API response");
    }
    
    // Store the simplified sentences
    reader.simplifiedSentences = simplifiedSentences;
    
    // Reset the simplified index to the first sentence
    reader.currentSimplifiedIndex = 0;
    
    // Clear translation cache for this new set of sentences
    reader.translationCache = {};
    
    return true;
  } catch (error) {
    return false;
  }
}

// Update the display with the current sentence
export async function updateDisplay(reader) {
  try {
    if (reader.simplifiedSentences.length === 0) {
      // Use the original sentence as fallback
      if (reader.currentSentenceIndex < reader.bookSentences.length) {
        const originalSentence = reader.bookSentences[reader.currentSentenceIndex];
        reader.simpleArray = [originalSentence];
        reader.translatedArray = [originalSentence];
      } else {
        reader.simpleArray = ["No content available"];
        reader.translatedArray = ["No content available"];
      }
    } else {
      // Use the current simplified sentence
      const currentSimplified = reader.simplifiedSentences[reader.currentSimplifiedIndex];
      reader.simpleArray = [currentSimplified];
      
      // Get translation to user language
      const translatedSentence = await apiTranslateSentenceCheap(currentSimplified, reader.studyLanguage, reader.userLanguage);
      
      // Make sure we only have a single-line translation (fixes duplicate sentence issue)
      const cleanedTranslation = translatedSentence.split('\n')[0].trim();
      reader.translatedArray = [cleanedTranslation];
    }
    
    // Call the callback to update the UI
    if (reader.onSentenceProcessed) {
      reader.onSentenceProcessed(
        reader.simpleArray[0], 
        reader.translatedArray[0]
      );
    }
    
    return true;
  } catch (error) {
    // Set fallback content
    reader.simpleArray = [`Error: ${error.message}`];
    reader.translatedArray = [`Error: ${error.message}`];
    
    // Call the callback
    if (reader.onSentenceProcessed) {
      reader.onSentenceProcessed(
        reader.simpleArray[0], 
        reader.translatedArray[0]
      );
    }
    
    return false;
  }
}