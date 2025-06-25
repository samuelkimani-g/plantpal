import api from '../api';

class MusicAPIService {
  constructor() {
    this.baseURL = '/api/music';
  }

  // Authentication & Connection
  async getAuthUrl() {
    try {
      const response = await api.get(`${this.baseURL}/auth/`);
      return response.data;
    } catch (error) {
      console.error('Error getting Spotify auth URL:', error);
      throw error;
    }
  }

  async handleCallback(code, state = null) {
    try {
      const response = await api.post(`${this.baseURL}/callback/`, {
        code,
        state
      });
      return response.data;
    } catch (error) {
      console.error('Error handling Spotify callback:', error);
      throw error;
    }
  }

  async getConnectionStatus() {
    try {
      const response = await api.get(`${this.baseURL}/status/`);
      return response.data;
    } catch (error) {
      console.error('Error getting connection status:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      const response = await api.delete(`${this.baseURL}/disconnect/`);
      return response.data;
    } catch (error) {
      console.error('Error disconnecting Spotify:', error);
      throw error;
    }
  }

  // Music Data
  async getTopTracks(timeRange = 'medium_term', limit = 20) {
    try {
      const response = await api.get(`${this.baseURL}/top-tracks/`, {
        params: { time_range: timeRange, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting top tracks:', error);
      throw error;
    }
  }

  async getRecentlyPlayed(limit = 20) {
    try {
      const response = await api.get(`${this.baseURL}/recently-played/`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting recently played:', error);
      throw error;
    }
  }

  async getCurrentTrack() {
    try {
      const response = await api.get(`${this.baseURL}/current-track/`);
      return response.data;
    } catch (error) {
      console.error('Error getting current track:', error);
      throw error;
    }
  }

  // Mood Analysis
  async getMoodAnalysis(days = 7) {
    try {
      const response = await api.get(`${this.baseURL}/mood/analysis/`, {
        params: { days }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting mood analysis:', error);
      throw error;
    }
  }

  async getMoodSummary() {
    try {
      const response = await api.get(`${this.baseURL}/mood/summary/`);
      return response.data;
    } catch (error) {
      console.error('Error getting mood summary:', error);
      throw error;
    }
  }

  async getMoodSettings() {
    try {
      const response = await api.get(`${this.baseURL}/mood/settings/`);
      return response.data;
    } catch (error) {
      console.error('Error getting mood settings:', error);
      throw error;
    }
  }

  async updateMoodSettings(settings) {
    try {
      const response = await api.put(`${this.baseURL}/mood/settings/`, settings);
      return response.data;
    } catch (error) {
      console.error('Error updating mood settings:', error);
      throw error;
    }
  }

  // Statistics & Reports
  async getListeningStats(days = 30) {
    try {
      const response = await api.get(`${this.baseURL}/stats/`, {
        params: { days }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting listening stats:', error);
      throw error;
    }
  }

  async getWeeklyMoodReport() {
    try {
      const response = await api.get(`${this.baseURL}/reports/weekly/`);
      return response.data;
    } catch (error) {
      console.error('Error getting weekly mood report:', error);
      throw error;
    }
  }

  // Data Management
  async syncListeningData() {
    try {
      const response = await api.post(`${this.baseURL}/sync/`);
      return response.data;
    } catch (error) {
      console.error('Error syncing listening data:', error);
      throw error;
    }
  }

  // Helper Methods
  formatMoodScore(score) {
    if (score >= 0.8) return 'Euphoric';
    if (score >= 0.7) return 'Happy';
    if (score >= 0.6) return 'Upbeat';
    if (score >= 0.4) return 'Neutral';
    if (score >= 0.3) return 'Calm';
    if (score >= 0.2) return 'Melancholy';
    return 'Sad';
  }

  formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  getMoodColor(moodScore) {
    if (moodScore >= 0.8) return '#ff6b6b'; // Euphoric - bright red
    if (moodScore >= 0.7) return '#feca57'; // Happy - yellow
    if (moodScore >= 0.6) return '#48dbfb'; // Upbeat - light blue
    if (moodScore >= 0.4) return '#a29bfe'; // Neutral - purple
    if (moodScore >= 0.3) return '#6c5ce7'; // Calm - darker purple
    if (moodScore >= 0.2) return '#74b9ff'; // Melancholy - blue
    return '#636e72'; // Sad - gray
  }

  getMoodEmoji(moodLabel) {
    const emojiMap = {
      'euphoric': '🤩',
      'happy': '😊',
      'upbeat': '😎',
      'energetic': '⚡',
      'neutral': '😐',
      'calm': '😌',
      'melancholy': '😔',
      'sad': '😢',
      'angry': '😠',
      'unknown': '❓'
    };
    return emojiMap[moodLabel?.toLowerCase()] || '❓';
  }

  // Plant Growth Integration
  calculatePlantGrowthBonus(moodScore, moodMultiplier = 1.0) {
    // Calculate how much the music mood affects plant growth
    let bonus = 1.0;
    
    if (moodScore >= 0.7) {
      bonus = 1.2; // 20% growth bonus for happy moods
    } else if (moodScore >= 0.5) {
      bonus = 1.1; // 10% growth bonus for positive moods
    } else if (moodScore <= 0.3) {
      bonus = 0.9; // 10% growth penalty for sad moods
    }
    
    return bonus * moodMultiplier;
  }

  // Journal Integration
  generateJournalPrompts(moodData) {
    const { overall_mood_label, overall_mood_score } = moodData;
    
    const prompts = [];
    
    if (overall_mood_score >= 0.7) {
      prompts.push("What's making you feel so positive today? How is your music reflecting your good vibes?");
      prompts.push("Your music mood is really upbeat! What are you excited about right now?");
    } else if (overall_mood_score <= 0.3) {
      prompts.push("Your music seems to reflect some deeper emotions. What's on your mind today?");
      prompts.push("Sometimes music helps us process difficult feelings. What would you like to explore?");
    } else {
      prompts.push("How do you feel your music choices today reflect your inner state?");
      prompts.push("What role does music play in your emotional wellbeing?");
    }
    
    return prompts;
  }
}

// Create singleton instance
const musicAPI = new MusicAPIService();

export default musicAPI; 