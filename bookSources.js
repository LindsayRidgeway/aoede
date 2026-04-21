// bookSources.js - Built-in starter library for new users

/**
 * Each entry contains:
 * - id: Unique identifier for the book
 * - title: Full title of the book
 * - author: Author's name
 * - url: Direct URL to the Project Gutenberg source
 * - language: Original language code
 * - format: Content format
 */

export const bookSources = [
  {
    id: "sherlockholmes",
    title: "The Adventures of Sherlock Holmes by Arthur Conan Doyle",
    author: "Arthur Conan Doyle",
    url: "https://www.gutenberg.org/files/48320/48320-h/48320-h.htm#i",
    language: "en",
    format: "text"
  },
  {
    id: "arsenelupin",
    title: "Arsène Lupin, gentleman-cambrioleur by Maurice Leblanc",
    author: "Maurice Leblanc",
    url: "https://www.gutenberg.org/files/32854/32854-h/32854-h.htm#LARRESTATION_DARSENE_LUPIN",
    language: "fr",
    format: "text"
  },
  {
    id: "eightydays",
    title: "Around the World in Eighty Days by Jules Verne",
    author: "Jules Verne",
    url: "https://www.gutenberg.org/files/103/103-h/103-h.htm#chap01",
    language: "en",
    format: "text"
  },
  {
    id: "prisonerofzenda",
    title: "The Prisoner of Zenda by Anthony Hope",
    author: "Anthony Hope",
    url: "https://www.gutenberg.org/files/95/95-h/95-h.htm#chap01",
    language: "en",
    format: "text"
  },
  {
    id: "scarletpimpernel",
    title: "The Scarlet Pimpernel by Baroness Orczy",
    author: "Baroness Orczy",
    url: "https://www.gutenberg.org/files/60/60-h/60-h.htm#chap01",
    language: "en",
    format: "text"
  },
  {
    id: "lostworld",
    title: "The Lost World by Arthur Conan Doyle",
    author: "Arthur Conan Doyle",
    url: "https://www.gutenberg.org/files/139/139-h/139-h.htm#chap01",
    language: "en",
    format: "text"
  },
  {
    id: "thirtyninesteps",
    title: "The Thirty-Nine Steps by John Buchan",
    author: "John Buchan",
    url: "https://www.gutenberg.org/files/558/558-h/558-h.htm#chap01",
    language: "en",
    format: "text"
  },
  {
    id: "kidnapped",
    title: "Kidnapped by Robert Louis Stevenson",
    author: "Robert Louis Stevenson",
    url: "https://www.gutenberg.org/files/421/421-h/421-h.htm#link2HCH0001",
    language: "en",
    format: "text"
  },
  {
    id: "bluecastle",
    title: "The Blue Castle by L. M. Montgomery",
    author: "L. M. Montgomery",
    url: "https://www.gutenberg.org/files/67979/67979-h/67979-h.htm#CHAPTER_I",
    language: "en",
    format: "text"
  },
  {
    id: "treasureisland",
    title: "Treasure Island by Robert Louis Stevenson",
    author: "Robert Louis Stevenson",
    url: "https://www.gutenberg.org/files/120/120-h/120-h.htm#part01",
    language: "en",
    format: "text"
  }
];

export const getBookSourceById = (id) => {
  return bookSources.find(book => book.id === id) || null;
};

export const isValidUrl = (url) => {
  if (!url) return false;

  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

export const popularBooks = bookSources.map(book => ({
  id: book.id,
  title: book.title,
  author: book.author
}));
