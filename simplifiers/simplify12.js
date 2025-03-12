// simplify12.js - Improved simplification prompt for 12-year-old reading level

const getSimplificationPrompt = (sourceText, targetLanguage, ageGroup = 12) => {
  return `Here are some consecutive sentences from a book that I need simplified:

${sourceText}

Please translate these sentences into ${targetLanguage} if they're not already in that language, and then simplify them for a ${ageGroup}-year-old native speaker of ${targetLanguage}.

CRITICAL REQUIREMENTS:
1. Maintain the EXACT SAME SEQUENCE of content and events as the original text
2. Do not skip any information or jump ahead in the story
3. Each original sentence should be represented in your simplified version
4. Preserve the narrative flow and order of events exactly as they appear

Guidelines for simplification:
1. Maximum sentence length: 12 words. Split longer sentences into multiple shorter ones.
2. Use vocabulary that a 12-year-old native speaker would understand
3. Simplify complex concepts but retain the core meaning
4. You can use more nuanced language than for younger readers
5. Some figurative language is acceptable if it's clear
6. Maintain the original tone and style where possible
7. Can include some more complex sentence structures as long as they're clear

FORMAT REQUIREMENTS:
- Put each sentence on its own line with a line break after
- A sentence is defined as a complete thought with subject and verb
- Each line must contain EXACTLY ONE sentence
- Each sentence must end with a period, question mark, or exclamation point
- Never combine multiple sentences on one line
- Never use semicolons to join sentences

Examples of correct formatting:
The teenager decided to explore the abandoned house.
She knew her parents would disapprove of this decision.
The door creaked as she pushed it open.
Dust particles danced in the beam of her flashlight.

Example of incorrect formatting:
The teenager decided to explore the abandoned house. She knew her parents would disapprove.
The door creaked as she pushed it open and dust particles danced in her flashlight beam.

Process the ENTIRE text I've provided, maintaining the full narrative.

FINAL CHECK: Before submitting your response, verify that EACH LINE contains EXACTLY ONE sentence ending with a period, question mark, or exclamation point. No exceptions.

DELIVER ONLY THE SIMPLIFIED TEXT WITH ONE SENTENCE PER LINE. DO NOT include any explanations or commentary.`;
};

export default getSimplificationPrompt;