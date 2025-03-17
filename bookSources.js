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
  {
    id: "sherlockholmes", 
    title: "The Adventures of Sherlock Holmes by Arthur Conan Doyle",
    author: "Arthur Conan Doyle",
    url: "https://www.gutenberg.org/files/48320/48320-h/48320-h.htm#i",
    language: "en",
    format: "text"
  },
  {
    id: "sherlockholmes2",
    title: "The Adventures of Sherlock Holmes by Arthur Conan Doyle",
    author: "Arthur Conan Doyle",
    url: "https://www.gutenberg.org/files/1661/1661-0.txt",
    language: "en",
    format: "text"
  },
  {
    id: "huckfinn", 
    title: "The Adventures of Huckleberry Finn by Mark Train",
    author: "Mark Train",
    url: "https://www.gutenberg.org/files/76/76-h/76-h.htm#chap01",
    language: "en",
    format: "text"
  },
  {
    id: "tomsawyer", 
    title: "The Adventures of Tom Sawyer by Mark Twain",
    author: "Mark Twain",
    url: "https://www.gutenberg.org/files/74/74-h/74-h.htm#c1",
    language: "en",
    format: "text"
  },
  {
    id: "aliceinwonderland", 
    title: "Alice's Adventures in Wonderland by Lewis Carroll",
    author: "Lewis Carroll",
    url: "https://www.gutenberg.org/files/11/11-h/11-h.htm#chap01",
    language: "en",
    format: "text"
  },
  {
    id: "annakarenina", 
    title: "Anna Karenina by Leo Tolstoy",
    author: "Leo Tolstoy",
    url: "https://www.gutenberg.org/files/1399/1399-h/1399-h.htm#chap01",
    language: "en",
    format: "text"
  },
  {
    id: "anthem",
    title: "Anthem by Ayn Rand",
    author: "Ayn Rand",
    url: "https://www.gutenberg.org/files/1250/1250-0.txt",
    language: "en",
    format: "text"
  },
  {
    id: "eightydays",
    title: "Around the World in Eighty Days by Jules Verne",
    author: "Jules Verne",
    url: "https://www.gutenberg.org/files/103/103-0.txt",
    language: "en",
    format: "text"
  },
  {
    id: "brotherskaramazov",
    title: "The Brothers Karamazov by Fyodor Dostoyevsky",
    author: "Fyodor Dostoyevsky",
    url: "https://www.gutenberg.org/files/28054/28054-0.txt",
    language: "en",
    format: "text"
  },
  {
    id: "callofthewild", 
    title: "The Call of the Wild by Jack London",
    author: "Jack London",
    url: "https://www.gutenberg.org/files/215/215-h/215-h.htm#chap01",
    language: "en",
    format: "text"
  },
  {
    id: "christmascarol",
    title: "A Christmas Carol by Charles Dickens",
    author: "Charles Dickens",
    url: "https://www.gutenberg.org/files/19337/19337-h/19337-h.htm#Page_11",
    language: "en",
    format: "text"
  },
  {
    id: "christmascarol2",
    title: "A Christmas Carol by Charles Dickens",
    author: "Charles Dickens",
    url: "https://www.gutenberg.org/files/46/46-0.txt",
    language: "en",
    format: "text"
  },
  {
    id: "montecristo", 
    title: "The Count of Monte Cristo by Alexandre Dumas",
    author: "Alexandre Dumas",
    url: "https://www.gutenberg.org/files/1184/1184-h/1184-h.htm#linkC2HCH0001",
    language: "en",
    format: "text"
  },
  {
    id: "crimeandpunishment", 
    title: "Crime and Punishment by Fyodor Dostoyevsky",
    author: "Fyodor Dostoyevsky",
    url: "https://www.gutenberg.org/files/2554/2554-h/2554-h.htm#link2H_4_0002",
    language: "en",
    format: "text"
  },
  {
    id: "divinecomedy",
    title: "The Divine Comedy by Dante Alighieri",
    author: "Dante Alighieri",
    url: "https://www.gutenberg.org/files/8800/8800-0.txt",
    language: "en",
    format: "text"
  },
  {
    id: "dollshouse", 
    title: "A Doll's House by Henrik Ibsen",
    author: "Henrik Ibsen",
    url: "https://www.gutenberg.org/files/2542/2542-h/2542-h.htm#act01",
    language: "en",
    format: "text"
  },
  {
    id: "donquixote", 
    title: "Don Quixote by Miguel de Cervantes",
    author: "Miguel de Cervantes",
    url: "https://www.gutenberg.org/files/5921/5921-h/5921-h.htm#ch1",
    language: "en",
    format: "text"
  },
  {
    id: "donquixote2",
    title: "Don Quixote by Miguel de Cervantes",
    author: "Miguel de Cervantes",
    url: "https://www.gutenberg.org/files/996/996-0.txt",
    language: "en",
    format: "text"
  },
  {
    id: "dracula", 
    title: "Dracula by Bram Stoker",
    author: "Bram Stoker",
    url: "https://www.gutenberg.org/files/345/345-h/345-h.htm#chap01",
    language: "en",
    format: "text"
  },
  {
    id: "frankenstein", 
    title: "Frankenstein by Mary Shelley",
    author: "Mary Shelley",
    url: "https://www.gutenberg.org/files/84/84-h/84-h.htm#letter1",
    language: "en",
    format: "text"
  },
  {
    id: "greatexpectations",
    title: "Great Expectations by Charles Dickens",
    author: "Charles Dickens",
    url: "https://www.gutenberg.org/files/1400/1400-0.txt",
    language: "en",
    format: "text"
  },
  {
    id: "greatgatsby", 
    title: "The Great Gatsby by F. Scott Fitzgerald",
    author: "F. Scott Fitzgerald",
    url: "https://www.gutenberg.org/files/64317/64317-h/64317-h.htm#chapter-1",
    language: "en",
    format: "text"
  },
  {
    id: "gulliverstravels",
    title: "Gulliver's Travels by Jonathan Swift",
    author: "Jonathan Swift",
    url: "https://www.gutenberg.org/files/829/829-0.txt",
    language: "en",
    format: "text"
  },
  {
    id: "heartofdarkness",
    title: "Heart of Darkness by Joseph Conrad",
    author: "Joseph Conrad",
    url: "https://www.gutenberg.org/files/219/219-0.txt",
    language: "en",
    format: "text"
  },
  {
    id: "houndofbaskervilles",
    title: "The Hound of the Baskervilles by Arthur Conan Doyle",
    author: "Arthur Conan Doyle",
    url: "https://www.gutenberg.org/files/2852/2852-0.txt",
    language: "en",
    format: "text"
  },
  {
    id: "iliad", 
    title: "The Iliad by Homer",
    author: "Homer",
    url: "https://www.gutenberg.org/files/2199/2199-h/2199-h.htm#chap01",
    language: "en",
    format: "text"
  },
  {
    id: "iliad2",
    title: "The Iliad by Homer",
    author: "Homer",
    url: "https://www.gutenberg.org/files/6130/6130-0.txt",
    language: "en",
    format: "text"
  },
  {
    id: "janeeyre",
    title: "Jane Eyre by Charlotte Brontë",
    author: "Charlotte Brontë",
    url: "https://www.gutenberg.org/files/1260/1260-0.txt",
    language: "en",
    format: "text"
  },
  {
    id: "ladywiththepet", 
    title: "The Lady with the Dog by Anton Chekhov",
    author: "Anton Chekhov",
    url: "https://www.gutenberg.org/files/13415/13415-h/13415-h.htm#THE_LADY_WITH_THE_DOG",
    language: "en",
    format: "text"
  },
  {
    id: "lesmiserables", 
    title: "Les Misérables by Victor Hugo",
    author: "Victor Hugo",
    url: "https://www.gutenberg.org/files/135/135-h/135-h.htm#link2H_PREF",
    language: "en",
    format: "text"
  },
  {
    id: "leviathan",
    title: "Leviathan by Thomas Hobbes",
    author: "Thomas Hobbes",
    url: "https://www.gutenberg.org/files/3207/3207-0.txt",
    language: "en",
    format: "text"
  },
  {
    id: "littleprince", 
    title: "The Little Prince by Antoine de Saint-Exupéry",
    author: "Antoine de Saint-Exupéry",
    url: "https://gutenberg.net.au/ebooks03/0300771h.html#ppded",
    language: "fr",
    format: "text"
  },
  {
    id: "littlewomen", 
    title: "Little Women by Louisa May Alcott",
    author: "Louisa May Alcott",
    url: "https://www.gutenberg.org/files/514/514-h/514-h.htm#part01",
    language: "en",
    format: "text"
  },
  {
    id: "metamorphosis",
    title: "Metamorphosis by Franz Kafka",
    author: "Franz Kafka",
    url: "https://www.gutenberg.org/files/5200/5200-0.txt",
    language: "en",
    format: "text"
  },
  {
    id: "mobydick", 
    title: "Moby Dick by Herman Melville",
    author: "Herman Melville",
    url: "https://www.gutenberg.org/files/2701/2701-h/2701-h.htm#link2HCH0001",
    language: "en",
    format: "text"
  },
  {
    id: "odyssey", 
    title: "The Odyssey by Homer",
    author: "Homer",
    url: "https://www.gutenberg.org/files/1727/1727-h/1727-h.htm#chap01",
    language: "en",
    format: "text"
  },
  {
    id: "peterpan",
    title: "Peter Pan by J. M. Barrie",
    author: "J. M. Barrie",
    url: "https://www.gutenberg.org/files/16/16-0.txt",
    language: "en",
    format: "text"
  },
  {
    id: "doriangray",
    title: "The Picture of Dorian Gray by Oscar Wilde",
    author: "Oscar Wilde",
    url: "https://www.gutenberg.org/files/174/174-0.txt",
    language: "en",
    format: "text"
  },
  {
    id: "prideandprejudice", 
    title: "Pride and Prejudice by Jane Austen",
    author: "Jane Austen",
    url: "https://www.gutenberg.org/files/1342/1342-h/1342-h.htm#Chapter_I",
    language: "en",
    format: "text"
  },
  {
    id: "theprince",
    title: "The Prince by Niccolò Machiavelli",
    author: "Niccolò Machiavelli",
    url: "https://www.gutenberg.org/files/1232/1232-0.txt",
    language: "en",
    format: "text"
  },
  {
    id: "republic", 
    title: "The Republic by Plato",
    author: "Plato",
    url: "https://www.gutenberg.org/files/1497/1497-h/1497-h.htm#link2H_4_0002",
    language: "en",
    format: "text"
  },
  {
    id: "scarletletter",
    title: "The Scarlet Letter by Nathaniel Hawthorne",
    author: "Nathaniel Hawthorne",
    url: "https://www.gutenberg.org/files/25344/25344-0.txt",
    language: "en",
    format: "text"
  },
  {
    id: "soulsofblackfolk",
    title: "The Souls of Black Folk by W. E. B. Du Bois",
    author: "W. E. B. Du Bois",
    url: "https://www.gutenberg.org/files/408/408-0.txt",
    language: "en",
    format: "text"
  },
  {
    id: "taleoftwocities", 
    title: "A Tale of Two Cities by Charles Dickens",
    author: "Charles Dickens",
    url: "https://www.gutenberg.org/files/98/98-h/98-h.htm#link2H_4_0001",
    language: "en",
    format: "text"
  },
  {
    id: "zarathustra", 
    title: "Thus Spake Zarathustra by Friedrich Nietzsche",
    author: "Friedrich Nietzsche",
    url: "https://www.gutenberg.org/files/1998/1998-h/1998-h.htm#link2H_4_0003",
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
  },
  {
    id: "ulysses",
    title: "Ulysses by James Joyce",
    author: "James Joyce",
    url: "https://www.gutenberg.org/files/4300/4300-0.txt",
    language: "en",
    format: "text"
  },
  {
    id: "warandpeace", 
    title: "War and Peace by Leo Tolstoy",
    author: "Leo Tolstoy",
    url: "https://www.gutenberg.org/cache/epub/2600/pg2600-images.html#link2H_4_0001",
    language: "en",
    format: "text"
  },
  {
    id: "waroftheworlds",
    title: "The War of the Worlds by H. G. Wells",
    author: "H. G. Wells",
    url: "https://www.gutenberg.org/files/36/36-0.txt",
    language: "en",
    format: "text"
  },
  {
    id: "wizardofoz", 
    title: "The Wonderful Wizard of Oz by L. Frank Baum",
    author: "L. Frank Baum",
    url: "https://www.gutenberg.org/files/55/55-h/55-h.htm#chap00",
    language: "en",
    format: "text"
  },
  {
    id: "yellowwallpaper",
    title: "The Yellow Wallpaper by Charlotte Perkins Gilman",
    author: "Charlotte Perkins Gilman",
    url: "https://www.gutenberg.org/files/1952/1952-0.txt",
    language: "en",
    format: "text"
  }
]

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