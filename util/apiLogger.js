
// apiLogger.js
export const logApiCall = (label, url, payload = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[API CALL] ${timestamp} | ${label}`);
  console.log(`↳ URL: ${url}`);
  if (payload) {
    try {
      const preview = JSON.stringify(payload).slice(0, 500);
      console.log(`↳ Payload: ${preview}${JSON.stringify(payload).length > 500 ? '...' : ''}`);
    } catch (e) {
      console.log(`↳ Payload: [unserializable]`);
    }
  }
};
