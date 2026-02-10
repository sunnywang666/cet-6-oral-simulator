// Improved implementation of getApiKey function

/**
 * Retrieves the API key from the Vite environment variables.
 * Throws an error if the API key is not configured.
 *
 * @throws {Error} When the API key is not found in the environment variables.
 * @returns {string} The API key.
 */
function getApiKey() {
    const apiKey = import.meta.env.VITE_API_KEY;
    if (!apiKey) {
        throw new Error('API key is not configured. Please set VITE_API_KEY in your environment variables.');
    }
    return apiKey;
}