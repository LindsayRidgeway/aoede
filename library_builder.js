<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Aoede Library Builder</title>
  <style>
    body {
      font-family: sans-serif;
      margin: 2rem;
      line-height: 1.5;
    }
    label, input {
      margin-top: 1rem;
      display: block;
    }
    .result {
      border-top: 1px solid #ccc;
      margin-top: 1rem;
      padding-top: 1rem;
    }
    #log {
      margin-top: 2rem;
      background: #f9f9f9;
      padding: 1rem;
      border: 1px solid #ccc;
      max-height: 300px;
      overflow-y: scroll;
      font-size: 0.9rem;
      white-space: pre-wrap;
      display: none; /* Hide logging by default */
    }
    .log-entry {
      margin-bottom: 0.5rem;
    }
    button {
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover {
      background-color: #45a049;
    }
    button:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
    button.stop-button {
      background-color: #f44336;
    }
    button.stop-button:hover {
      background-color: #d32f2f;
    }
    #statusText {
      margin-top: 1rem;
      font-style: italic;
    }
    .toggle-log {
      margin-top: 1rem;
      display: inline-block;
      color: #666;
      cursor: pointer;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <h1>Aoede Library Builder</h1>
  <p><strong>Build:</strong> LB-2025.04.09.21</p>

  <form id="searchForm">
    <label for="subject">Book Topic:</label>
    <input type="text" id="subject" required />
    
    <button type="submit" id="searchButton">Search</button>
  </form>

  <div id="statusText"></div>
  
  <div id="results"></div>
  
  <a href="#" class="toggle-log" id="toggleLog">Show/Hide Log</a>
  <div id="log"></div>

  <script>
    // DOM Elements
    const form = document.getElementById('searchForm');
    const resultsDiv = document.getElementById('results');
    const logDiv = document.getElementById('log');
    const searchButton = document.getElementById('searchButton');
    const statusText = document.getElementById('statusText');
    const toggleLog = document.getElementById('toggleLog');
    
    // Allow toggling the log visibility
    toggleLog.addEventListener('click', (e) => {
      e.preventDefault();
      if (logDiv.style.display === 'none') {
        logDiv.style.display = 'block';
      } else {
        logDiv.style.display = 'none';
      }
    });
    
    // Search state
    let isSearching = false;
    let abortController = null;
    let booksFound = 0;
    
    // Proxy tracking
    let lastSuccessfulProxy = null;
	
	const OPENAI_API_KEY = process.env.OPENAI_KEY;

    // Log function
    function log(message) {
      console.log(message);
      const p = document.createElement('div');
      p.className = 'log-entry';
      p.textContent = message;
      logDiv.appendChild(p);
      logDiv.scrollTop = logDiv.scrollHeight;
    }
    
    // Update status text
    function updateStatus(message) {
      statusText.textContent = message;
    }
    
    // CORS Proxies
    const CORS_PROXIES = [
      'https://corsproxy.io/?',
      'https://api.allorigins.win/raw?url=',
      'https://proxy.cors.sh/',
      'https://thingproxy.freeboard.io/fetch/'
    ];

    // Fetch with proxy
    async function fetchWithProxies(url, readFirstNBytes = null) {
      // Start with the last successful proxy if available
      let orderedProxies = [...CORS_PROXIES];
      
      if (lastSuccessfulProxy) {
        // Move the last successful proxy to the front
        orderedProxies = orderedProxies.filter(p => p !== lastSuccessfulProxy);
        orderedProxies.unshift(lastSuccessfulProxy);
      }
      
      for (let i = 0; i < orderedProxies.length; i++) {
        const proxy = orderedProxies[i];
        let proxyUrl;
        
        // Format the URL
        if (proxy.includes('?url=')) {
          proxyUrl = `${proxy}${encodeURIComponent(url)}`;
        } else {
          proxyUrl = `${proxy}${url}`;
        }
        
        log(`Trying proxy ${i+1}...`);
        
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          
          const response = await fetch(proxyUrl, {
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            log(`Proxy ${i+1} failed with status ${response.status}`);
            continue;
          }
          
          // If we only need to read part of the response
          if (readFirstNBytes) {
            try {
              const reader = response.body.getReader();
              const { value, done } = await reader.read();
              
              if (done) {
                log(`Stream ended too early`);
                return '';
              }
              
              const decoder = new TextDecoder();
              const text = decoder.decode(value.slice(0, readFirstNBytes));
              
              log(`Proxy succeeded (partial read)`);
              lastSuccessfulProxy = proxy;
              return text;
            } catch (err) {
              log(`Error reading stream: ${err.message}`);
              continue;
            }
          } else {
            const text = await response.text();
            log(`Proxy succeeded`);
            lastSuccessfulProxy = proxy;
            return text;
          }
        } catch (error) {
          log(`Proxy error: ${error.message}`);
        }
      }
      
      throw new Error('All proxies failed');
    }

    // AI Subject Matching
    async function checkSubjectMatchWithAI(title, synopsis, subject) {
      try {
        log(`Checking relevance...`);
        
        const prompt = `
        Title: ${title}
        Synopsis: ${synopsis.substring(0, 500)}... (truncated)
        Subject: ${subject}
        
        The subject may include language/cultural aspects like "French" or "Russian" combined with genre terms like "novel" or "poetry".
        
        Question: Is this book relevant to the subject "${subject}"? 
        Consider both:
        1. If it matches any genre terms (novel, poetry, thriller, etc.)
        2. If it relates to the language or culture mentioned (French, German, Russian, etc.)
        
        A book is relevant if it:
        - Was originally written in the specified language
        - Features characters, settings, or themes from the specified culture
        - Deals with historical or cultural aspects of the specified country/region
        - Matches the genre or type of literature specified
        
        Answer with "yes" if the book seems relevant based on any of these criteria.
        Answer with "no" only if there's no significant connection.
        Be inclusive rather than exclusive when determining relevance.
        Answer with only "yes" or "no".
        `;
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.3,
            max_tokens: 10
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          log(`AI API error: ${errorData.error?.message || response.statusText}`);
          return false;
        }
        
        const data = await response.json();
        const answer = data.choices[0]?.message?.content?.trim().toLowerCase() || '';
        
        const isMatch = answer.includes('yes');
        log(`AI assessment: ${isMatch ? 'Relevant' : 'Not relevant'}`);
        
        return isMatch;
      } catch (error) {
        log(`Error in AI matching: ${error.message}`);
        return false;
      }
    }
    
    // Process a single book
    async function processBook(bookPath, title, author, subject) {
      const bookUrl = `https://www.gutenberg.org${bookPath}`;
        
      log(`\nChecking book: "${title}" by ${author}`);
      
      try {
        const hubText = await fetchWithProxies(bookUrl);
        log(`Book page loaded`);
        
        const hubDoc = new DOMParser().parseFromString(hubText, 'text/html');
        
        // Get language info
        let bookLanguage = null;
        const bibrec = hubDoc.querySelector('table.bibrec');
        
        if (bibrec) {
          log(`Found bibliographic table`);
          const rows = bibrec.querySelectorAll('tr');
          
          for (const row of rows) {
            const thElement = row.querySelector('th');
            const tdElement = row.querySelector('td');
            
            if (thElement && tdElement) {
              const label = thElement.innerText.trim();
              const value = tdElement.innerText.trim();
              
              if (label.toLowerCase().includes('language')) {
                bookLanguage = value;
                log(`Language: "${bookLanguage}"`);
              }
            }
          }
        }
        
        // Extract synopsis
        log(`Checking for subject match...`);
        const rawText = hubDoc.body.innerText;
        const synopsisPart = rawText.split(/Read now or download|Download this ebook|Available formats/i)[0] || '';
        
        // Check if book matches subject
        const isSubjectMatch = await checkSubjectMatchWithAI(title, synopsisPart, subject);
        
        if (!isSubjectMatch) {
          log(`Not relevant to subject`);
          return { success: false };
        }
        log(`Subject match found`);

        // Get HTML version URL
        const bookId = bookPath.replace(/\/ebooks\//, '').replace(/\D/g, '');
        const htmlBase = `https://www.gutenberg.org/files/${bookId}/${bookId}-h`;
        const htmlUrl = `${htmlBase}/${bookId}-h.htm`;
        log(`Checking HTML version`);

        try {
          // Read only first part of HTML file for anchor
          const htmlFragment = await fetchWithProxies(htmlUrl, 50000);
          log(`HTML found`);
          
          // Try to find a good anchor - prioritize likely chapter beginnings
          const priorityAnchors = htmlFragment.match(/<a\s+[^>]*?(?:id|name)=["'](chapter|book|part|preface|introduction|toc|contents|title|heading).*?["'][^>]*>/i);
          
          // If no priority anchor, look for any anchor
          const anyAnchor = priorityAnchors || 
                          htmlFragment.match(/<a\s+[^>]*?(?:id|name)=["']([^"']+)["'][^>]*>/i);
                          
          // Fallback to link to anchor
          const anchorLink = anyAnchor || 
                            htmlFragment.match(/<a\s+[^>]*?href=["']#([^"']+)["'][^>]*>/i);
          
          if (!anchorLink) {
            log(`No anchor found`);
            return { success: false };
          }
          
          // Extract anchor name (group 1)
          const anchor = anchorLink[1];
          log(`Found anchor: #${anchor}`);
          
          const fullUrl = `${htmlUrl}#${anchor}`;
          
          log(`Book accepted!`);
          
          // Return book info
          return {
            success: true,
            bookInfo: {
              title,
              author,
              bookId,
              url: fullUrl,
              language: bookLanguage || 'Unknown'
            }
          };
        } catch (htmlErr) {
          log(`Error with HTML: ${htmlErr.message}`);
          return { success: false };
        }
      } catch (hubErr) {
        log(`Error with book page: ${hubErr.message}`);
        return { success: false };
      }
    }
    
    // Get all pages of search results
    async function getAllPages(searchUrl, doc) {
      // Find first page links
      const firstPageLinks = Array.from(doc.querySelectorAll('li.booklink a.link'));
      
      if (!firstPageLinks || firstPageLinks.length === 0) {
        return [];
      }
      
      // Check for pagination
      const paginationLinks = doc.querySelectorAll('.pagination a');
      if (!paginationLinks || paginationLinks.length === 0) {
        return firstPageLinks;
      }
      
      let maxPage = 1;
      
      // Find highest page number
      for (const pageLink of paginationLinks) {
        const pageText = pageLink.textContent.trim();
        if (pageText.match(/^\d+$/)) {
          const pageNum = parseInt(pageText, 10);
          if (pageNum > maxPage) maxPage = pageNum;
        }
      }
      
      // If only one page, return first page links
      if (maxPage <= 1) {
        return firstPageLinks;
      }
      
      // Get all pages
      let allLinks = [...firstPageLinks];
      log(`Processing results...`);
      
      // Start from page 2 (already have page 1)
      for (let page = 2; page <= maxPage; page++) {
        if (abortController.signal.aborted) break;
        
        const pageUrl = `${searchUrl}&page=${page}`;
        
        try {
          log(`Fetching page ${page}...`);
          
          const pageHtml = await fetchWithProxies(pageUrl);
          const pageDoc = new DOMParser().parseFromString(pageHtml, 'text/html');
          const pageLinks = Array.from(pageDoc.querySelectorAll('li.booklink a.link'));
          
          log(`Processing additional results...`);
          allLinks = allLinks.concat(pageLinks);
        } catch (err) {
          log(`Error with page ${page}: ${err.message}`);
        }
      }
      
      return allLinks;
    }
    
    // Stop search
    function stopSearch() {
      if (isSearching && abortController) {
        abortController.abort();
        isSearching = false;
        searchButton.textContent = 'Search';
        searchButton.classList.remove('stop-button');
        updateStatus('');
      }
    }
    
    // Handle search form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Toggle search/stop
      if (isSearching) {
        stopSearch();
        return;
      }
      
      // Start search
      resultsDiv.innerHTML = '';
      logDiv.innerHTML = '';
      updateStatus('');
      booksFound = 0;
      log('Beginning search...');
      
      // Setup abort controller
      abortController = new AbortController();
      isSearching = true;
      searchButton.textContent = 'Stop';
      searchButton.classList.add('stop-button');

      const subject = document.getElementById('subject').value.trim();
      log(`Subject: ${subject}`);
      
      try {
        const query = encodeURIComponent(subject);
        const searchUrl = `https://www.gutenberg.org/ebooks/search/?query=${query}`;
        log(`Searching...`);
        
        // Get search results page
        const html = await fetchWithProxies(searchUrl);
        log(`Results received`);
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Get all pages of results
        const allLinks = await getAllPages(searchUrl, doc);
        
        // Handle no results
        if (allLinks.length === 0) {
          log(`No books found for query: "${subject}"`);
          resultsDiv.innerHTML = '<p>No books found.</p>';
          isSearching = false;
          searchButton.textContent = 'Search';
          searchButton.classList.remove('stop-button');
          return;
        }
        
        log(`Processing results...`);
        
        // Process each book
        for (const a of allLinks) {
          // Check if search was stopped
          if (abortController.signal.aborted) {
            throw new Error('Search stopped');
          }
          
          const bookPath = a.getAttribute('href');
          const title = a.querySelector('span.title')?.innerText.trim() || 'Untitled';
          const author = a.querySelector('span.subtitle')?.innerText.trim() || 'Unknown';
          
          // Process book
          const result = await processBook(bookPath, title, author, subject);
          
          // Add to results if successful
          if (result.success) {
            const bookInfo = result.bookInfo;
            
            // Create result entry with hyperlink
            const entry = document.createElement('div');
            entry.className = 'result';
            
            const link = document.createElement('a');
            link.href = bookInfo.url;
            link.textContent = bookInfo.title;
            link.target = "_blank";
            
            entry.appendChild(link);
            entry.appendChild(document.createElement('br'));
            entry.appendChild(document.createTextNode(bookInfo.author));
            
            resultsDiv.appendChild(entry);
            
            booksFound++;
            updateStatus(`Books found: ${booksFound}`);
          }
        }

        // Final status
        if (booksFound === 0) {
          resultsDiv.innerHTML = '<p>No books found.</p>';
          log(`No books found.`);
        } else {
          log(`Search complete. ${booksFound} books found.`);
        }
      } catch (err) {
        if (err.message === 'Search stopped') {
          log(`Search stopped by user.`);
        } else {
          log(`Error: ${err.message}`);
          resultsDiv.innerHTML = `<p>Error: ${err.message}</p>`;
        }
      } finally {
        isSearching = false;
        searchButton.textContent = 'Search';
        searchButton.classList.remove('stop-button');
        
        // Add search complete
        if (statusText.textContent) {
          updateStatus(statusText.textContent + " Search complete.");
        } else {
          updateStatus("Search complete.");
        }
      }
    });

    // Clean up on page leave
    window.addEventListener('beforeunload', stopSearch);
  </script>
</body>
</html>