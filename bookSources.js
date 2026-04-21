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
    id: "eightydays",
    title: "Around the World in Eighty Days by Jules Verne",
    author: "Jules Verne",
    url: "https://www.gutenberg.org/files/103/103-h/103-h.htm#chap01",
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
