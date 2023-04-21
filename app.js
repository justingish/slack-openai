const { App } = require('@slack/bolt');
require('dotenv').config();

let fleschKincaid;
import('flesch-kincaid').then((module) => {
  fleschKincaid = module.fleschKincaid;
});

const { Configuration, OpenAIApi } = require('openai');
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
  port: process.env.PORT || 3000,
});

// Listens to all incoming messages on the channels it is included in
// If the message has a reading level of 10 or above it will responds with a summary
app.message('', async ({ message, say }) => {
  const counts = getCounts(message.text);
  const level = Number(fleschKincaid(counts));

  if (level >= 10) {
    await say(
      `That message was of grade level ${level.toFixed(
        2
      )}. Let me rephrase that for you:`
    );
    const summary = await summarizeText(message.text);
    await say(summary);
  }
});

// Gets the word, sentence, and syllable counts
function getCounts(text) {
  const wordCount = text.trim().split(/\s+/).length;

  const sentenceCount = text
    .split(/\.|\?|!/)
    .filter((sentence) => sentence.trim().length > 0).length;

  const syllableCount = text
    .toLowerCase()
    .split(/\s+/)
    .reduce((count, word) => {
      const syllables = word
        .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
        .match(/[aeiouy]{1,2}/g);
      return count + (syllables ? syllables.length : 0);
    }, 0);

  return {
    word: wordCount,
    sentence: sentenceCount,
    syllable: syllableCount,
  };
}

// Asks OpenAI to summarize the text
async function summarizeText(text) {
  const response = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: `Please rewrite the following text at an 8th grade reading level: ${text}`,
    max_tokens: 2000,
    temperature: 0.5,
  });

  if (response?.data?.choices && response?.data?.choices?.length > 0) {
    return response.data.choices[0].text.trim();
  } else {
    return 'Unable to generate a summary.';
  }
}

(async () => {
  await app.start();
  console.log('Slackbot is running!');
})();
