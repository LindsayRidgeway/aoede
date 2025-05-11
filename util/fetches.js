XXX apiServices.js
- processSourceText()...translates and simplifies via OpenAI

XXX App.js
- directTranslate()...translates one sentence via OpenAI (should NOT be used for I18N)

bookPipeFetch.js
- bookPipeFetch() ... three versions of book read, with and without CORS ... could be done
						without environmental variable; needs no API KEY

XXX HomeUI.js
- HomeUI() ... get list of languages from Google Translate

XXX languageVerifier.js
- fetchSupportedLanguages() ... get list of languages from Google Translate (same as HomeUI()?)

LibraryUI.js
XXX - translateBookTitle() ... I18N for book titles in library listing via Google Translate (could
      use same function as other single-sentence translate)
- safeFetch() ... book read (could possibly be used instead of bookPipeFetch(), could be
                    done without env variable; needs no API KEY

listeningSpeed.js
- three functions ... TTS via Google TTS

