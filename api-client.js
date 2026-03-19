// api-client.js
class NASAApiClient {
    constructor() {
        this.apiKey = 'DEMO_KEY';
        this.baseUrl = 'https://api.nasa.gov';
    }

    /**
     * Fetches Solar Flare data (DONKI) for the last 7 days.
     */
    async getSolarFlares() {
        try {
            const endDate = dayjs().format('YYYY-MM-DD');
            const startDate = dayjs().subtract(7, 'day').format('YYYY-MM-DD');

            const response = await fetch(`${this.baseUrl}/DONKI/FLR?startDate=${startDate}&endDate=${endDate}&api_key=${this.apiKey}`);

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('RATE_LIMITED');
                }
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            return data || [];
        } catch (error) {
            console.error('Error fetching Solar Flares:', error);
            throw error;
        }
    }

    /**
     * Fetches Near Earth Objects (NeoWs) for today.
     */
    async getNearEarthObjects() {
        try {
            const today = dayjs().format('YYYY-MM-DD');

            const response = await fetch(`${this.baseUrl}/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${this.apiKey}`);

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('RATE_LIMITED');
                }
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching Near Earth Objects:', error);
            throw error;
        }
    }
}

// Export a singleton instance
window.apiClient = new NASAApiClient();