// simplify15.js - Improved simplification prompt for 15-year-old reading level

const getSimplificationPrompt = (sourceText, targetLanguage, ageGroup = 15) => {
  return `Here are some consecutive sentences from a book that I need simplified:

${sourceText}

Please translate these sentences into ${targetLanguage} if they're not already in that language, and then adapt them for a ${ageGroup}-year-old native speaker of ${targetLanguage}.

CRITICAL REQUIREMENTS:
1. Maintain the EXACT SAME SEQUENCE of content and events as the original text
2. Do not skip any information or jump ahead in the story
3. Each original sentence should be represented in your simplified version
4. Preserve the narrative flow and order of events exactly as they appear

Guidelines for simplification:
1. Maximum sentence length: 15 words. Split longer sentences into multiple shorter ones.
2. Use vocabulary appropriate for a 15-year-old native speaker
3. Most concepts can be retained with minimal simplification
4. You can use figurative language, metaphors, and more complex expressions
5. Maintain the author's style and voice where possible
6. You can include more complex grammatical structures
7. Only simplify specialized terminology or archaic language that would be unfamiliar

FORMAT REQUIREMENTS:
- Put each sentence on its own line with a line break after
- A sentence is defined as a complete thought with subject and verb
- Each line must contain EXACTLY ONE sentence
- Each sentence must end with a period, question mark, or exclamation point
- Never combine multiple sentences on one line
- Never use semicolons to join sentences

Examples of correct formatting:
The protagonist contemplated his uncertain future with growing anxiety.
His past decisions haunted him like persistent ghosts.
Would he ever find redemption for his mistakes?
The weight of responsibility felt increasingly unbearable with each passing day.

Example of incorrect formatting:
The protagonist contemplated his uncertain future with growing anxiety. His past decisions haunted him.
Would he ever find redemption for his mistakes? The weight of responsibility felt unbearable.

Process the ENTIRE text I've provided, maintaining the full narrative.

FINAL CHECK: Before submitting your response, verify that EACH LINE contains EXACTLY ONE sentence ending with a period, question mark, or exclamation point. No exceptions.

DELIVER ONLY THE SIMPLIFIED TEXT WITH ONE SENTENCE PER LINE. DO NOT include any explanations or commentary.`;
};

export default getSimplificationPrompt;