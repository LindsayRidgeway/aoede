// Process the source text - translate and simplify
export const processSourceText = async (sourceText, targetLanguage, readingLevel = 6) => {
  try {
    if (!anthropicKey) {
      console.log('[API] No Anthropic API key available for simplification');
      return null;
    }
    
    // Additional validation to ensure we have usable source text
    if (!sourceText) {
      return null;
    }
    
    if (typeof sourceText !== 'string') {
      return null;
    }
    
    if (sourceText.length < 10) {
      return null;
    }
    
    // Log key details again at point of use
    if (DEBUG_API_CALLS) {
      console.log('[API-DEBUG] About to use Anthropic API key for request:');
      console.log(`[API-DEBUG] FULL ANTHROPIC KEY: "${anthropicKey}"`);
    }
    
    const apiUrl = `${CORS_PROXY}https://api.anthropic.com/v1/messages`;
    
    if (DEBUG_API_CALLS) {
      console.log(`[API-DEBUG] Full API URL: "${apiUrl}"`);
      console.log(`[API-DEBUG] CORS proxy used: ${CORS_PROXY ? 'YES' : 'NO'}`);
    }
    
    // Get the appropriate prompt function based on reading level
    const getPrompt = getPromptForLevel(readingLevel);
    const prompt = getPrompt(sourceText, targetLanguage, readingLevel);
    
    // Dump the complete headers and request details for debugging
    if (DEBUG_API_CALLS) {
      const headers = {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
      };
      
      console.log(`[API-DEBUG] Anthropic API request headers:`, JSON.stringify(headers));
      
      console.log(`[API-DEBUG] Anthropic API request body sample:`,
        JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 4000,
          messages: [
            { 
              role: "user", 
              // Don't log the full prompt for brevity
              content: prompt.substring(0, 50) + "..."
            }
          ]
        })
      );
    }
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 4000,
        messages: [
          { 
            role: "user", 
            content: prompt
          }
        ]
      })
    });
    
    if (!response.ok) {
      const responseText = await response.text();
      console.log(`[API] Anthropic API error: ${response.status} - ${responseText}`);
      
      // Additional error analysis
      if (DEBUG_API_CALLS) {
        console.log(`[API-DEBUG] Anthropic API error details:`);
        console.log(`[API-DEBUG] - Status: ${response.status}`);
        console.log(`[API-DEBUG] - Status Text: ${response.statusText}`);
        console.log(`[API-DEBUG] - Headers:`, JSON.stringify(Object.fromEntries([...response.headers])));
        
        try {
          const errorJson = JSON.parse(responseText);
          console.log(`[API-DEBUG] - Error type: ${errorJson.type}`);
          console.log(`[API-DEBUG] - Error message: ${errorJson.error?.message}`);
        } catch (e) {
          console.log(`[API-DEBUG] - Could not parse error as JSON`);
        }
      }
      
      return null;
    }
    
    const data = await response.json();
    
    if (data.error) {
      console.log(`[API] Anthropic API returned error: ${JSON.stringify(data.error)}`);
      return null;
    }
    
    if (!data.content || data.content.length === 0) {
      console.log('[API] No content in Anthropic API response');
      return null;
    }
    
    // Get the processed text
    const processedText = data.content[0].text.trim();
    
    // Remove any potential intro sentence like "Here are simplified sentences in Russian:"
    const cleanedText = processedText.replace(/^[^\.!?]*(?:[\.!?]|:)\s*/i, '');
    
    return cleanedText;
  } catch (error) {
    console.log(`[API] Error in processSourceText: ${error.message}`);
    
    // Additional error details
    if (DEBUG_API_CALLS) {
      console.log(`[API-DEBUG] Error stack: ${error.stack}`);
    }
    
    return null;
  }
};