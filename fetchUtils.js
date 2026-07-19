// fetchUtils.js - Gutenberg fetch helper for Aoede (Web Only)
import { apiFetchRemoteText } from './apiServices';

const GUTENBERG_HOSTS = new Set([
  'www.gutenberg.org',
  'gutenberg.org',
  'gutenberg.net.au'
]);

export const fetchUrl = async (url) => {
  const parsedUrl = new URL(url);

  if (!GUTENBERG_HOSTS.has(parsedUrl.hostname)) {
    throw new Error(`Unsupported fetch host: ${parsedUrl.hostname}`);
  }

  const remoteText = await apiFetchRemoteText(url);
  if (!remoteText) {
    throw new Error('Remote fetch returned empty content');
  }

  return remoteText;
};
