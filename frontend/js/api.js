/**
 * Fetches cheese data from the backend API.
 * @returns {Promise<Array>} A promise that resolves to an array of cheese objects.
 */
const API_BASE = 'http://localhost:8000';

let savedSet = new Set();

async function fetchSavedCheeses() {
    try {
        const response = await fetch(`${API_BASE}/api/saved`);
        if (!response.ok) return [];
        const data = await response.json();
        savedSet = new Set(data.map(c => c._id));
        return data;
    } catch (error) {
        console.error("Could not fetch saved cheeses:", error);
        return [];
    }
}

async function saveCheese(cheeseId) {
    try {
        await fetch(`${API_BASE}/api/saved/${cheeseId}`, { method: 'POST' });
        savedSet.add(cheeseId);
    } catch (error) {
        console.error("Could not save cheese:", error);
    }
}

async function unsaveCheese(cheeseId) {
    try {
        await fetch(`${API_BASE}/api/saved/${cheeseId}`, { method: 'DELETE' });
        savedSet.delete(cheeseId);
    } catch (error) {
        console.error("Could not unsave cheese:", error);
    }
}

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