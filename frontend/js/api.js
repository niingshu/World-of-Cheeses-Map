/**
 * Fetches cheese data from the backend API.
 * @returns {Promise<Array>} A promise that resolves to an array of cheese objects.
 */
const API_BASE = 'http://localhost:8000';

async function fetchCheeses() {
    try {
        const response = await fetch(`${API_BASE}/api/cheeses`);

        //check if the response is okay
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Could not fetch cheese data:", error);
        return [];
    }
}