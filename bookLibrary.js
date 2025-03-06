// Import each book's content from separate files
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

// Book library with titles and metadata
export const bookLibrary = [
  {
    id: "montecristo",
    titleKey: "countOfMonteCristo",
    defaultTitle: "The Count of Monte Cristo",
    author: "Alexandre Dumas",
    content: montecristo
  },
  {
    id: "prideandprejudice",
    titleKey: "prideAndPrejudice",
    defaultTitle: "Pride and Prejudice",
    author: "Jane Austen",
    content: prideandprejudice
  },
  {
    id: "sherlockholmes",
    titleKey: "adventuresOfSherlockHolmes",
    defaultTitle: "The Adventures of Sherlock Holmes",
    author: "Arthur Conan Doyle",
    content: sherlockholmes
  },
  {
    id: "warandpeace",
    titleKey: "warAndPeace",
    defaultTitle: "War and Peace",
    author: "Leo Tolstoy",
    content: warandpeace
  },
  {
    id: "aliceinwonderland",
    titleKey: "aliceInWonderland",
    defaultTitle: "Alice's Adventures in Wonderland",
    author: "Lewis Carroll",
    content: aliceinwonderland
  },
  {
    id: "mobydick",
    titleKey: "mobyDick",
    defaultTitle: "Moby Dick",
    author: "Herman Melville",
    content: mobydick
  },
  {
    id: "frankenstein",
    titleKey: "frankenstein",
    defaultTitle: "Frankenstein",
    author: "Mary Shelley",
    content: frankenstein
  },
  {
    id: "donquixote",
    titleKey: "donQuixote",
    defaultTitle: "Don Quixote",
    author: "Miguel de Cervantes",
    content: donquixote
  },
  {
    id: "taleoftwocities",
    titleKey: "taleOfTwoCities",
    defaultTitle: "A Tale of Two Cities",
    author: "Charles Dickens",
    content: taleoftwocities
  },
  {
    id: "greatgatsby",
    titleKey: "greatGatsby",
    defaultTitle: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    content: greatgatsby
  },
  {
    id: "dracula",
    titleKey: "dracula",
    defaultTitle: "Dracula",
    author: "Bram Stoker",
    content: dracula
  },
  {
    id: "wizardofoz",
    titleKey: "wizardOfOz",
    defaultTitle: "The Wonderful Wizard of Oz",
    author: "L. Frank Baum",
    content: wizardofoz
  },
  {
    id: "littlewomen",
    titleKey: "littleWomen",
    defaultTitle: "Little Women",
    author: "Louisa May Alcott",
    content: littlewomen
  },
  {
    id: "odyssey",
    titleKey: "odyssey",
    defaultTitle: "The Odyssey",
    author: "Homer",
    content: odyssey
  },
  {
    id: "iliad",
    titleKey: "iliad",
    defaultTitle: "The Iliad",
    author: "Homer",
    content: iliad
  },
  {
    id: "treasureisland",
    titleKey: "treasureIsland",
    defaultTitle: "Treasure Island",
    author: "Robert Louis Stevenson",
    content: treasureisland
  },
  {
    id: "tomsawyer",
    titleKey: "tomSawyer",
    defaultTitle: "The Adventures of Tom Sawyer",
    author: "Mark Twain",
    content: tomsawyer
  },
  {
    id: "callofthewild",
    titleKey: "callOfTheWild",
    defaultTitle: "The Call of the Wild",
    author: "Jack London",
    content: callofthewild
  },
  {
    id: "torah",
    titleKey: "torah",
    defaultTitle: "The Torah",
    author: "Traditional",
    content: torah
  },
  {
    id: "republic",
    titleKey: "republic",
    defaultTitle: "The Republic",
    author: "Plato",
    content: republic
  },
  {
    id: "zarathustra",
    titleKey: "thusSpokeZarathustra",
    defaultTitle: "Thus Spoke Zarathustra",
    author: "Friedrich Nietzsche",
    content: zarathustra
  },
  {
    id: "lesmiserables",
    titleKey: "lesMiserables",
    defaultTitle: "Les Misérables",
    author: "Victor Hugo",
    content: lesmiserables
  },
  {
    id: "ladywiththepet",
    titleKey: "ladyWithTheDog",
    defaultTitle: "The Lady with the Dog",
    author: "Anton Chekhov",
    content: ladywiththepet
  }
];

// Function to get book by ID
export const getBookById = (id) => {
  return bookLibrary.find(book => book.id === id);
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