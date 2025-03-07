// This file provides access to book content

// Import text files from assets statically
// These imports will be properly processed by Metro bundler
const bookContents = {
  sherlockholmes: require('./assets/books/sherlockholmes.txt'),
  montecristo: require('./assets/books/montecristo.txt'),
  prideandprejudice: require('./assets/books/prideandprejudice.txt'),
  warandpeace: require('./assets/books/warandpeace.txt'),
  aliceinwonderland: require('./assets/books/aliceinwonderland.txt'),
  mobydick: require('./assets/books/mobydick.txt'),
  frankenstein: require('./assets/books/frankenstein.txt'),
  donquixote: require('./assets/books/donquixote.txt'),
  taleoftwocities: require('./assets/books/taleoftwocities.txt'),
  greatgatsby: require('./assets/books/greatgatsby.txt'),
  dracula: require('./assets/books/dracula.txt'),
  wizardofoz: require('./assets/books/wizardofoz.txt'),
  littlewomen: require('./assets/books/littlewomen.txt'),
  odyssey: require('./assets/books/odyssey.txt'),
  iliad: require('./assets/books/iliad.txt'),
  treasureisland: require('./assets/books/treasureisland.txt'),
  tomsawyer: require('./assets/books/tomsawyer.txt'),
  callofthewild: require('./assets/books/callofthewild.txt'),
  torah: require('./assets/books/torah.txt'),
  republic: require('./assets/books/republic.txt'),
  zarathustra: require('./assets/books/zarathustra.txt'),
  lesmiserables: require('./assets/books/lesmiserables.txt'),
  ladywiththepet: require('./assets/books/ladywiththepet.txt')
};

// Function to get book content by ID
export const getBookContent = async (id) => {
  if (bookContents[id]) {
    try {
      // Since require() returns the raw content directly on the web
      return bookContents[id];
    } catch (error) {
      console.error(`Error loading book content for ${id}:`, error);
      return null;
    }
  }
  return null;
};