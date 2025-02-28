curl -X POST -H "Content-Type: application/json" \
     --data '{
       "input": {"text": "Привет, как дела?"},
       "voice": {"languageCode": "ru-RU", "ssmlGender": "FEMALE"},
       "audioConfig": {"audioEncoding": "MP3", "speakingRate": 0.5}
     }' \
     "https://texttospeech.googleapis.com/v1/text:synthesize?key=AIzaSyDvrAsHGvT7nurWKi3w0879zLWFYtpEgJ0" \
     | jq -r '.audioContent' | base64 --decode > output.mp3 && afplay output.mp3