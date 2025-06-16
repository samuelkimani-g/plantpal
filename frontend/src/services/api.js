import axios from 'axios';

// Base URL for your Django API
const API_BASE_URL = 'http://localhost:8000/api'; // Ensure this matches your backend

// Create an Axios instance with base configuration
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Attach JWT Access Token to outgoing requests
api.interceptors.request.use(
    config => {
        // Use 'accessToken' as the key, consistent with backend JWT output
        const accessToken = localStorage.getItem("accessToken"); 
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    }, 
    error => {
        return Promise.reject(error);
    }
);

// Response Interceptor: Handle JWT Refresh Token rotation and expiry
api.interceptors.response.use(
    response => response, // Pass through successful responses
    async error => {
        const originalRequest = error.config;

        // Check if the error is due to an expired or invalid access token (401 Unauthorized)
        // and ensure it's not a request that's already been retried (to prevent infinite loops)
        // Also, exclude the refresh token endpoint itself from being retried, or it would loop.
        if (error.response.status === 401 && !originalRequest._retry && 
            !originalRequest.url.includes('/accounts/login/refresh/')) {
            
            originalRequest._retry = true; // Mark this request as retried

            const refreshToken = localStorage.getItem('refreshToken'); // Get the refresh token

            if (refreshToken) {
                try {
                    // Attempt to get a new access token using the refresh token
                    const response = await axios.post(`${API_BASE_URL}/accounts/login/refresh/`, {
                        refresh: refreshToken,
                    });

                    // Store the new access and refresh tokens
                    localStorage.setItem('accessToken', response.data.access);
                    localStorage.setItem('refreshToken', response.data.refresh); // Backend rotates, so store the new one

                    // Update the Authorization header for the original request and the default for future requests
                    api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
                    originalRequest.headers['Authorization'] = `Bearer ${response.data.access}`;

                    // Retry the original failed request with the new access token
                    return api(originalRequest);

                } catch (refreshError) {
                    console.error("Failed to refresh token:", refreshError.response?.data || refreshError.message);
                    // If refresh fails (e.g., refresh token is expired or invalid), log out the user
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    // Redirect to login page or show a re-login modal
                    // Example with window.location (for simple web apps):
                    // window.location.href = '/login'; 
                    alert("Your session has expired. Please log in again."); // Using alert for demo, use proper UI
                    return Promise.reject(refreshError);
                }
            } else {
                console.warn("No refresh token found. User needs to log in again.");
                localStorage.removeItem('accessToken');
                // window.location.href = '/login'; 
                alert("Please log in to continue."); // Using alert for demo, use proper UI
            }
        }
        // If it's not a 401, or if refresh failed, or if it was the refresh endpoint itself, re-throw the original error
        return Promise.reject(error); 
    }
);

// --- Authentication Functions (Add these if not in a separate authService.js) ---
// For better modularity, consider moving these to src/services/authService.js
export const loginUser = async (username, password) => {
    try {
        const response = await api.post('accounts/login/', { username, password });
        localStorage.setItem('accessToken', response.data.access);
        localStorage.setItem('refreshToken', response.data.refresh);
        return response.data;
    } catch (error) {
        console.error('Error logging in:', error.response?.data || error.message);
        throw error;
    }
};

export const registerUser = async (username, email, password) => {
    try {
        const response = await api.post('accounts/register/', { username, email, password });
        return response.data;
    } catch (error) {
        console.error('Error registering user:', error.response?.data || error.message);
        throw error;
    }
};

export const logoutUser = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
        try {
            // Note: The logout endpoint requires the refresh token in the body,
            // and the IsAuthenticated permission means you need the access token in headers.
            await api.post('accounts/logout/', { refresh: refreshToken });
        } catch (error) {
            console.error('Error logging out:', error.response?.data || error.message);
        }
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    // Clear any user-related state in your React app here
    alert("You have been logged out."); // Using alert for demo, use proper UI
};

export const getCurrentUser = async () => {
    try {
        const response = await api.get('accounts/me/');
        return response.data;
    } catch (error) {
        console.error('Error fetching current user:', error.response?.data || error.message);
        throw error;
    }
};


// --- Journal Entry Functions ---
export const getJournalEntries = async () => {
    try {
        const response = await api.get('/journal/entries/');
        return response.data;
    } catch (error) {
        console.error('Error fetching journal entries:', error);
        throw error;
    }
};

export const createJournalEntry = async (text, mood_entry_id = null, is_favorite = false) => {
    try {
        const response = await api.post('/journal/entries/', { text, mood_entry: mood_entry_id, is_favorite });
        return response.data;
    } catch (error) {
        console.error('Error creating journal entry:', error);
        throw error;
    }
};

export const getLatestJournalEntry = async () => {
    try {
        const response = await api.get('/journal/entries/latest/');
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.log('No latest journal entry found.');
            return null;
        }
        console.error('Error fetching latest journal entry:', error);
        throw error;
    }
};

export const markJournalEntryFavorite = async (entryId, isFavorite) => {
    try {
        const response = await api.post(
            `/journal/entries/${entryId}/mark_favorite/`,
            { is_favorite: isFavorite }
        );
        return response.data;
    } catch (error) {
        console.error(`Error marking entry ${entryId} as favorite:`, error);
        throw error;
    }
};

// --- Plant Functions (Corrected Endpoints) ---
// Note: We are using the PlantViewSet endpoints.
// To get *a* user's plant (if only one is expected), you'd usually fetch all and pick the first.
// If you truly need a /plants/me/ type endpoint, it would need to be custom-defined in Django.
// For now, let's use the standard list and detail endpoints.

export const getAllUserPlants = async () => {
    try {
        const response = await api.get('/plants/plants/'); // Correct: Lists all user plants
        return response.data;
    } catch (error) {
        console.error('Error fetching user plants:', error.response?.data || error.message);
        throw error;
    }
};

export const createPlant = async (name, species = "") => { // Added species as optional
    try {
        const response = await api.post('/plants/plants/', { name, species }); // Correct: POST to list endpoint
        return response.data;
    } catch (error) {
        console.error('Error creating plant:', error.response?.data || error.message);
        throw error;
    }
};

export const getPlantDetail = async (plantId) => {
    try {
        const response = await api.get(`/plants/plants/${plantId}/`); // Correct: GET for specific plant by ID
        return response.data;
    } catch (error) {
        console.error(`Error fetching plant ${plantId}:`, error.response?.data || error.message);
        throw error;
    }
};

export const updatePlant = async (plantId, plantData) => {
    try {
        const response = await api.patch(`/plants/plants/${plantId}/`, plantData); // Correct: PATCH for specific plant by ID
        return response.data;
    } catch (error) {
        console.error(`Error updating plant ${plantId}:`, error.response?.data || error.message);
        throw error;
    }
};

export const deletePlant = async (plantId) => {
    try {
        await api.delete(`/plants/plants/${plantId}/`); // Correct: DELETE for specific plant by ID
        console.log(`Plant ${plantId} deleted successfully.`);
    } catch (error) {
        console.error(`Error deleting plant ${plantId}:`, error.response?.data || error.message);
        throw error;
    }
};

// --- Plant Log Functions (Add these) ---
export const getAllPlantLogs = async () => {
    try {
        const response = await api.get('/plants/logs/');
        return response.data;
    } catch (error) {
        console.error('Error fetching all plant logs:', error.response?.data || error.message);
        throw error;
    }
};

export const createPlantLog = async (plantId, note, watered, fertilized) => {
    try {
        const response = await api.post('/plants/logs/', { plant: plantId, note, watered, fertilized });
        return response.data;
    } catch (error) {
        console.error('Error creating plant log:', error.response?.data || error.message);
        throw error;
    }
};

export const getPlantLogDetail = async (logId) => {
    try {
        const response = await api.get(`/plants/logs/${logId}/`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching plant log ${logId}:`, error.response?.data || error.message);
        throw error;
    }
};

export const updatePlantLog = async (logId, logData) => {
    try {
        const response = await api.patch(`/plants/logs/${logId}/`, logData);
        return response.data;
    } catch (error) {
        console.error(`Error updating plant log ${logId}:`, error.response?.data || error.message);
        throw error;
    }
};

export const deletePlantLog = async (logId) => {
    try {
        await api.delete(`/plants/logs/${logId}/`);
        console.log(`Plant log ${logId} deleted successfully.`);
    } catch (error) {
        console.error(`Error deleting plant log ${logId}:`, error.response?.data || error.message);
        throw error;
    }
};

// --- Mood Entry Functions (Add these) ---
export const getAllMoodEntries = async () => {
    try {
        const response = await api.get('/mood/moods/');
        return response.data;
    } catch (error) {
        console.error('Error fetching mood entries:', error.response?.data || error.message);
        throw error;
    }
};

export const createMoodEntry = async (mood, note = "") => {
    try {
        const response = await api.post('/mood/moods/', { mood, note });
        return response.data;
    } catch (error) {
        console.error('Error creating mood entry:', error.response?.data || error.message);
        throw error;
    }
};

export const getMoodEntryDetail = async (moodId) => {
    try {
        const response = await api.get(`/mood/moods/${moodId}/`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching mood entry ${moodId}:`, error.response?.data || error.message);
        throw error;
    }
};

export const updateMoodEntry = async (moodId, moodData) => {
    try {
        const response = await api.patch(`/mood/moods/${moodId}/`, moodData);
        return response.data;
    } catch (error) {
        console.error(`Error updating mood entry ${moodId}:`, error.response?.data || error.message);
        throw error;
    }
};

export const deleteMoodEntry = async (moodId) => {
    try {
        await api.delete(`/mood/moods/${moodId}/`);
        console.log(`Mood entry ${moodId} deleted successfully.`);
    } catch (error) {
        console.error(`Error deleting mood entry ${moodId}:`, error.response?.data || error.message);
        throw error;
    }
};

// --- Reminder Functions (Add these) ---
export const getAllReminders = async () => {
    try {
        const response = await api.get('/reminders/reminders/');
        return response.data;
    } catch (error) {
        console.error('Error fetching reminders:', error.response?.data || error.message);
        throw error;
    }
};

export const createReminder = async (title, scheduledFor, description = "", plantId = null) => {
    try {
        const response = await api.post('/reminders/reminders/', { 
            title, 
            scheduled_for: scheduledFor, 
            description, 
            plant: plantId 
        });
        return response.data;
    } catch (error) {
        console.error('Error creating reminder:', error.response?.data || error.message);
        throw error;
    }
};

export const getReminderDetail = async (reminderId) => {
    try {
        const response = await api.get(`/reminders/reminders/${reminderId}/`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching reminder ${reminderId}:`, error.response?.data || error.message);
        throw error;
    }
};

export const updateReminder = async (reminderId, reminderData) => {
    try {
        const response = await api.patch(`/reminders/reminders/${reminderId}/`, reminderData);
        return response.data;
    } catch (error) {
        console.error(`Error updating reminder ${reminderId}:`, error.response?.data || error.message);
        throw error;
    }
};

export const deleteReminder = async (reminderId) => {
    try {
        await api.delete(`/reminders/reminders/${reminderId}/`);
        console.log(`Reminder ${reminderId} deleted successfully.`);
    } catch (error) {
        console.error(`Error deleting reminder ${reminderId}:`, error.response?.data || error.message);
        throw error;
    }
};

// Export the 'api' instance as default for direct use (e.g., api.get)
// and other functions as named exports.
export default api;
