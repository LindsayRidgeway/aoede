// Aoede button handling pseudocode
//
// *** indicates functionality already defined in Aoede codebase
//

// Constants
define INT BLOCKSIZE = 10000;

// Global variables
define BOOLEAN trackerExists = FALSE;
define STRUCTURE tracker {
  STRING studyLanguage;
  STRING bookTitle;
  LONGINT offset;
}

define URL_READER reader = null;
define STRING readerStudyLanguage;
define STRING readerBookTitle;

define INT rawSentenceSize;
define INT simpleIndex;
define ARRAY(STRING) simpleArray;

// FUNCTIONS

// Handle Load Book button, supplying data from screen
FUNCTION handleLoadBook(STRING studyLanguage,STRING bookTitle) {
  *** Set tracker to an tracker object in persistent store that matches on studyLanguage and bookTitle
  if (not found) {
    set tracker.studyLanguage = studyLanguage;
    set tracker.bookTitle = bookTitle;
    set tracker.offset = 0;
    set trackerExists = true;
    *** Store the tracker in persistent store
  }

  if (reader != null) {
      close reader;
  }
    
  *** Set reader to the anchor in the URL anchor specification
  *** Skip readern forward tracker.offset bytes
  set readerStudyLanguage = studyLanguage;
  set readerBookTitle = bookTitle;

  loadRawSentence();
  processSimpleSentence();
}

// Handle Next Sentence button
FUNCTION handleNextSentence() {
  if (NOT trackerExists) {
    exit();
  }

  if (simpleIndex < (LENGTH(simpleArray) - 1) {
    simpleIndex++;
  } else {
    *** Skip reader forward rawSentenceSize bytes
    *** Add rawSentenceSize to tracker.offset
    *** Store the tracker in persistent store
    loadRawSentence();
  }

  processSimpleSentence();
}

// Handle confirmed Rewind button
FUNCTION handleRewind() {
  if (NOT trackerExists) {
    exit();
  }

  handleLoadBook(tracker.studyLanguage, tracker.bookTitle);
}

// Load and process next raw sentence
FUNCTION loadRawSentence() {
  *** Save tracker in persistent storagea

  *** If reader at EOF, close reader and set reader = null

  define STRING block;
  *** Read BLOCKSIZE bytes from raader into block

  define STRING rawSentence;
  *** Set rawSentence = to the first sentence in block
  set rawSentenceSize = LENGTH(rawSentence);

  *** Set rawSentenceForStudy = rawSentence translated into the study language
  *** Use simplifier to convert rawSentenceForStudy into simpleSentence array  set simpleIndex = 0;
}

FUNCTION processSimpleSentence() { 
  *** Submit simpleArray[simpleIndex] to NEXT SENTENCE (where it will be made available for display, translation, and TTS)
}

