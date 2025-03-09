// bookSources.js - Mapping of book titles to their source URLs
// This file provides direct access to book content without relying on GPT-4o

/**
 * Book sources data structure
 * Each entry contains:
 * - id: Unique identifier for the book (same as used in popularBooks array)
 * - title: Full title of the book
 * - author: Author's name
 * - url: Direct URL to plain text or HTML version of the book
 * - language: Original language of the text (ISO code, e.g., 'en', 'fr', 'ru')
 * - format: Format of the content ('text' or 'html')
 */

export const bookSources = [
    /*
  { 
    id: "montecristo", 
    title: "The Count of Monte Cristo", 
    author: "Alexandre Dumas",
    url: "https://www.gutenberg.org/files/1184/1184-h/1184-h.htm#linkC2HCH0001",
    language: "en",
    format: "text"
    },
    */
  { 
    id: "prideandprejudice", 
    title: "Pride and Prejudice", 
    author: "Jane Austen",
    url: "https://www.gutenberg.org/files/1342/1342-h/1342-h.htm#Chapter_I",
    language: "en",
    format: "text"
  },
  { 
    id: "sherlockholmes", 
    title: "The Adventures of Sherlock Holmes", 
    author: "Arthur Conan Doyle",
    url: "https://www.gutenberg.org/files/48320/48320-h/48320-h.htm#i",
    language: "en",
    format: "text"
  },
    /*
  { 
    id: "warandpeace", 
    title: "War and Peace", 
    author: "Leo Tolstoy",
    url: "https://www.gutenberg.org/files/2600/2600-h/2600-h.htm#link2H_4_0001",
    language: "en",
    format: "text"
    },
    */
  { 
    id: "aliceinwonderland", 
    title: "Alice's Adventures in Wonderland", 
    author: "Lewis Carroll",
    url: "https://www.gutenberg.org/files/11/11-h/11-h.htm#chap01",
    language: "en",
    format: "text"
  },
    /*
  { 
    id: "mobydick", 
    title: "Moby Dick", 
    author: "Herman Melville",
    url: "https://www.gutenberg.org/files/2701/2701-h/2701-h.htm#link2HCH0001",
    language: "en",
    format: "text"
    },
    */
  { 
    id: "frankenstein", 
    title: "Frankenstein", 
    author: "Mary Shelley",
    url: "https://www.gutenberg.org/files/84/84-h/84-h.htm#letter1",
    language: "en",
    format: "text"
  },
    /*
  { 
    id: "donquixote", 
    title: "Don Quixote", 
    author: "Miguel de Cervantes",
    url: "https://www.gutenberg.org/files/5921/5921-h/5921-h.htm#ch1",
    language: "en",
    format: "text"
    },
    */
  { 
    id: "taleoftwocities", 
    title: "A Tale of Two Cities", 
    author: "Charles Dickens",
    url: "https://www.gutenberg.org/files/98/98-h/98-h.htm#link2H_4_0001",
    language: "en",
    format: "text"
  },
  { 
    id: "greatgatsby", 
    title: "The Great Gatsby", 
    author: "F. Scott Fitzgerald",
    url: "https://www.gutenberg.org/files/64317/64317-h/64317-h.htm#chapter-1",
    language: "en",
    format: "text"
  },
  { 
    id: "dracula", 
    title: "Dracula", 
    author: "Bram Stoker",
    url: "https://www.gutenberg.org/files/345/345-h/345-h.htm#chap01",
    language: "en",
    format: "text"
  },
  { 
    id: "wizardofoz", 
    title: "The Wonderful Wizard of Oz", 
    author: "L. Frank Baum",
    url: "https://www.gutenberg.org/files/55/55-h/55-h.htm#chap00",
    language: "en",
    format: "text"
  },
    /*
  { 
    id: "littlewomen", 
    title: "Little Women", 
    author: "Louisa May Alcott",
    url: "https://www.gutenberg.org/files/514/514-h/514-h.htm#part01",
    language: "en",
    format: "text"
    },
    */
  { 
    id: "odyssey", 
    title: "The Odyssey", 
    author: "Homer",
    url: "https://www.gutenberg.org/files/1727/1727-h/1727-h.htm#chap01",
    language: "en",
    format: "text"
  },
  { 
    id: "iliad", 
    title: "The Iliad", 
    author: "Homer",
    url: "https://www.gutenberg.org/files/2199/2199-h/2199-h.htm#chap01",
    language: "en",
    format: "text"
  },
  { 
    id: "treasureisland", 
    title: "Treasure Island", 
    author: "Robert Louis Stevenson",
    url: "https://www.gutenberg.org/files/120/120-h/120-h.htm#part01",
    language: "en",
    format: "text"
  },
  { 
    id: "tomsawyer", 
    title: "The Adventures of Tom Sawyer", 
    author: "Mark Twain",
    url: "https://www.gutenberg.org/files/74/74-h/74-h.htm#c1",
    language: "en",
    format: "text"
  },
  { 
    id: "callofthewild", 
    title: "The Call of the Wild", 
    author: "Jack London",
    url: "https://www.gutenberg.org/files/215/215-h/215-h.htm#chap01",
    language: "en",
    format: "text"
  },
    /*
  { 
    id: "bible", 
    title: "The Bible", 
    author: "Traditional",
    url: "https://www.gutenberg.org/cache/epub/10/pg10-images.html#The_First_Book_of_Moses_Called_Genesis",
    language: "en",
    format: "text"
    },
    */
    /*
  { 
    id: "republic", 
    title: "The Republic", 
    author: "Plato",
    url: "https://www.gutenberg.org/files/1497/1497-h/1497-h.htm#link2H_4_0002",
    language: "en",
    format: "text"
    },
    */
  { 
    id: "zarathustra", 
    title: "Thus Spoke Zarathustra", 
    author: "Friedrich Nietzsche",
    url: "https://www.gutenberg.org/files/1998/1998-h/1998-h.htm#link2H_4_0003",
    language: "en",
    format: "text"
  },
    /*
  { 
    id: "lesmiserables", 
    title: "Les Misérables", 
    author: "Victor Hugo",
    url: "https://www.gutenberg.org/files/135/135-h/135-h.htm#link2H_PREF",
    language: "en",
    format: "text"
    },
    */
  { 
    id: "ladywiththepet", 
    title: "The Lady with the Dog", 
    author: "Anton Chekhov",
    url: "https://www.gutenberg.org/files/13415/13415-h/13415-h.htm#THE_LADY_WITH_THE_DOG",
    language: "en",
    format: "text"
  },
  { 
    id: "littleprince", 
    title: "The Little Prince", 
    author: "Antoine de Saint-Exupéry",
    url: "https://gutenberg.net.au/ebooks03/0300771h.html#ppded",
    language: "fr",
    format: "text"
  },
    /*
  { 
    id: "annakarenina", 
    title: "Anna Karenina", 
    author: "Leo Tolstoy",
    url: "https://www.gutenberg.org/files/1399/1399-h/1399-h.htm#chap01",
    language: "en",
    format: "text"
    },
    */
];

// Helper function to get book source by ID
export const getBookSourceById = (id) => {
  return bookSources.find(book => book.id === id) || null;
};

// Function to check if a URL is valid
export const isValidUrl = (url) => {
  if (!url) return false;
  
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

// Export the book sources for use in the dropdown
export const popularBooks = bookSources.map(book => ({
  id: book.id,
  title: book.title,
  author: book.author
}));
