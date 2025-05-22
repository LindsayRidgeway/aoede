// bookPipeProcess.js - Process HTML content into sentences
import { parseIntoSentences } from './textProcessing';
import { bookPipeStorage } from './bookPipeStorage';

// Text processing operations for BookPipe
export const bookPipeProcess = {
  // Find the position of the anchor in the HTML
  async findAnchorPosition(pipe) {
    if (__DEV__) console.log("MODULE 0058: bookPipeProcess.findAnchorPosition");
    if (!pipe.htmlContent) {
      throw new Error('No HTML content to search for anchor');
    }

    try {
      let fragmentId = '';
      if (pipe.bookUrl.includes('#')) {
        fragmentId = pipe.bookUrl.split('#')[1];
      } else {
        throw new Error('URL does not contain an anchor fragment');
      }

      const anchorPatterns = [
        new RegExp(`<a[^>]*?\\sname\\s*=\\s*["']?${fragmentId}["']?[^>]*?>((?!</a>).)*</a>`, 'i'),
        new RegExp(`<a[^>]*?\\sname\\s*=\\s*["']?${fragmentId}["']?[^>]*?>`, 'i'),
        new RegExp(`<[^>]+\\sid\\s*=\\s*["']?${fragmentId}["']?[^>]*?>`, 'i')
      ];

      let match = null;
      let patternIndex = -1;

      for (let i = 0; i < anchorPatterns.length; i++) {
        match = anchorPatterns[i].exec(pipe.htmlContent);
        if (match) {
          patternIndex = i;
          break;
        }
      }

      if (match) {
        pipe.anchorPosition = match.index;
      } else {
        pipe.sentences = [`Unable to find the beginning of the text. Anchor "#${fragmentId}" not found.`];
        throw new Error(`Anchor "#${fragmentId}" not found in HTML content`);
      }
    } catch (error) {
      throw error;
    }
  },

  // Process the next chunk of HTML into sentences
  async processNextChunk(pipe, shouldSave = true) {
    if (__DEV__) console.log("MODULE 0059: bookPipeProcess.processNextChunk");
    if (!pipe.htmlContent) {
      pipe.hasMoreContent = false;
      return [];
    }

    try {
      const chunkStart = pipe.anchorPosition + pipe.currentReadPosition;
      const chunkEnd = Math.min(chunkStart + pipe.chunkSize, pipe.htmlContent.length);

      if (chunkStart >= pipe.htmlContent.length || chunkStart >= chunkEnd) {
        pipe.hasMoreContent = false;
        return [];
      }

      const htmlChunk = pipe.htmlContent.substring(chunkStart, chunkEnd);
      const textChunk = this.extractText(htmlChunk);
      const newSentences = parseIntoSentences(textChunk);

      pipe.sentences = [...pipe.sentences, ...newSentences];

      const chunkSize = chunkEnd - chunkStart;
      pipe.currentReadPosition += chunkSize;

      if (shouldSave) {
        pipe.shouldSavePosition = true;
        await bookPipeStorage.saveReadingPosition(pipe);
      }

      return newSentences;
    } catch (error) {
      return [];
    }
  },

  // Extract readable text from HTML
  extractText(html) {
    if (__DEV__) console.log("MODULE 0060: bookPipeProcess.extractText");
    try {
      html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
      html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
      html = html.replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, ' ');
      html = html.replace(/<!--[\s\S]*?-->/g, ' ');
      html = html.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ');
      html = html.replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ');
      html = html.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ');
      html = html.replace(/<table\b[^<]*(?:(?!<\/table>)<[^<]*)*<\/table>/gi, ' ');
      
      // Add spaces before and after block elements to prevent run-together sentences
      html = html.replace(/(<\/(?:p|div|h[1-6])>)(<(?:p|div|h[1-6])[^>]*>)/gi, '$1 $2');
      
      html = html.replace(/(<h[1-6][^>]*>)/gi, '\n$1');
      html = html.replace(/(<\/h[1-6]>)/gi, '$1\n');
      html = html.replace(/(<(div|p|section|article)[^>]*>)/gi, '\n$1');
      html = html.replace(/(<\/(div|p|section|article)>)/gi, '$1\n');
      html = html.replace(/(<[^>]*class\s*=\s*["'][^"']*(?:title|chapter|heading|header)[^"']*["'][^>]*>)/gi, '\n$1');

      let text = html.replace(/<[^>]*>/g, ' ');

      text = text.replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&ldquo;/g, '"')
        .replace(/&rdquo;/g, '"')
        .replace(/&lsquo;/g, "'")
        .replace(/&rsquo;/g, "'")
        .replace(/&mdash;/g, '-')
        .replace(/&ndash;/g, '-');

      text = text.replace(/&#(\d+);/g, (match, dec) => {
        return String.fromCharCode(dec);
      });

      text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      text = text.replace(/\n{3,}/g, '\n\n');
      text = text.split('\n').map(line => line.replace(/\s+/g, ' ').trim()).join('\n').trim();
      
      // Ensure sentences ending with punctuation have a space after them
      text = text.replace(/([.!?])([A-Z])/g, '$1 $2');
      
      // DEBUG: Log if we find the problem text
      if (text.includes("I didn't know what to do")) {
        console.log("DEBUG extractText: Found problem text");
        console.log("Text around 'I didn't know':", text.substring(text.indexOf("I didn't know what to do") - 50, text.indexOf("I didn't know what to do") + 200));
      }

      return text;
    } catch (error) {
      return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }
};