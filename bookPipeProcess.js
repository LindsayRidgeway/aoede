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
      // Parse the URL fragment (bookmark)
      let fragmentId = '';
      if (pipe.bookUrl.includes('#')) {
        fragmentId = pipe.bookUrl.split('#')[1];
      } else {
        // No fragment ID, we don't have a specific anchor to find
        throw new Error('URL does not contain an anchor fragment');
      }
      
      // Look for anchor element patterns
      const anchorPatterns = [
        // Pattern 1: <a name="i"> - classic HTML anchor
        new RegExp(`<a[^>]*?\\sname\\s*=\\s*["']?${fragmentId}["']?[^>]*?>((?!</a>).)*</a>`, 'i'),
        
        // Pattern 2: <a name="i" - with any attributes after
        new RegExp(`<a[^>]*?\\sname\\s*=\\s*["']?${fragmentId}["']?[^>]*?>`, 'i'),
        
        // Pattern 3: <element id="i"> - any element with matching ID
        new RegExp(`<[^>]+\\sid\\s*=\\s*["']?${fragmentId}["']?[^>]*?>`, 'i')
      ];
      
      // Try each pattern
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
        // We couldn't find the anchor - clear state
        pipe.sentences = [`Unable to find the beginning of the text. Anchor "#${fragmentId}" not found.`];
        throw new Error(`Anchor "#${fragmentId}" not found in HTML content`);
      }
    } catch (error) {
      // Error already handled by setting pipe.sentences
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
      // Calculate the end position for this chunk
      const chunkStart = pipe.anchorPosition + pipe.currentReadPosition;
      const chunkEnd = Math.min(chunkStart + pipe.chunkSize, pipe.htmlContent.length);
            
      // Check if we're at the end of the content
      if (chunkStart >= pipe.htmlContent.length || chunkStart >= chunkEnd) {
        pipe.hasMoreContent = false;
        return [];
      }
      
      // Extract the chunk of HTML
      const htmlChunk = pipe.htmlContent.substring(chunkStart, chunkEnd);
      if (__DEV__) console.log("[PROCESS_NEXT_CHUNK.1] chunkSize=", pipe.chunkSize, " chunkStart=", chunkStart, " chunkEnd=", chunkEnd, " htmlChunk=", htmlChunk);
      
      // Extract text from this HTML chunk
      let textChunk = this.extractText(htmlChunk);
      if (__DEV__) console.log("[PROCESS_NEXT_CHUNK.2] textChunk.length=", textChunk.length, " textChunk=", textChunk);
      
      // Parse the text into sentences
      const newSentences = parseIntoSentences(textChunk);
      
      // Add new sentences to our collection
      pipe.sentences = [...pipe.sentences, ...newSentences];
	  // DOES THIS MEAN WE'RE STORING THE ENTIRE BOOK IN MEMORY TWICE?
      
      // Update the current read position
      const chunkSize = chunkEnd - chunkStart;
      pipe.currentReadPosition += chunkSize;
      
      // Only save position if instructed to (e.g., after user clicks Next)
      if (shouldSave) {
        pipe.shouldSavePosition = true; // Now it's ok to save position
        await bookPipeStorage.saveReadingPosition(pipe);
      }
      
      // Return the new sentences
      return newSentences;
    } catch (error) {
      if (__DEV__) console.log(`Error processing chunk: ${error.message}`);
      return [];
    }
  },
  
  // Extract readable text from HTML
  extractText(html) {
  if (__DEV__) console.log("MODULE 0060: bookPipeProcess.extractText");
    try {
      // Remove script, style, and metadata tags
      html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
      html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
      html = html.replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, ' ');
      html = html.replace(/<!--[\s\S]*?-->/g, ' ');
      
      // Remove navigation, header, footer sections if present
      html = html.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ');
      html = html.replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ');
      html = html.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ');
      
      // Remove table elements - often contain TOC or other navigation
      html = html.replace(/<table\b[^<]*(?:(?!<\/table>)<[^<]*)*<\/table>/gi, ' ');
      
      // Preserve heading tags by adding newlines before and after them
      // This helps maintain chapter titles and headers
      html = html.replace(/(<h[1-6][^>]*>)/gi, '\n$1');
      html = html.replace(/(<\/h[1-6]>)/gi, '$1\n');
      
      // Add newlines for other structural elements 
      html = html.replace(/(<(div|p|section|article)[^>]*>)/gi, '\n$1');
      html = html.replace(/(<\/(div|p|section|article)>)/gi, '$1\n');
      
      // Special handling for content that's likely to be title elements
      html = html.replace(/(<[^>]*class\s*=\s*["'][^"']*(?:title|chapter|heading|header)[^"']*["'][^>]*>)/gi, '\n$1');
      
      // Remove all remaining HTML tags
      let text = html.replace(/<[^>]*>/g, ' ');
      
      // Decode HTML entities
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
      
      // Handle numeric entities
      text = text.replace(/&#(\d+);/g, (match, dec) => {
        return String.fromCharCode(dec);
      });
      
      // Normalize newlines
      text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      // Remove consecutive newlines
      text = text.replace(/\n{3,}/g, '\n\n');
      
      // Clean up whitespace while preserving newlines
      text = text.split('\n')
                .map(line => line.replace(/\s+/g, ' ').trim())
                .join('\n')
                .trim();
      
      return text;
    } catch (error) {
      // Return a simplified version as fallback
      return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }
};