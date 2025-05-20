import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

export interface Mode {
  id: string;
  name: string;
}

export const fitnessApi = {
  // Get available training modes
  getModes: async (): Promise<Mode[]> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/modes`);
      return response.data.modes;
    } catch (error) {
      console.error('Error fetching modes:', error);
      return [];
    }
  },
  
  // Get video feed URL
  getVideoFeedUrl: async (exerciseType: string = 'squat'): Promise<string> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/video_feed_url?exercise=${exerciseType}`);
      return response.data.url;
    } catch (error) {
      console.error('Error fetching video feed URL:', error);
      return '';
    }
  },
  
  // Start live analysis
  startLiveAnalysis: async (mode: string = 'Beginner', exerciseType: string = 'squat'): Promise<void> => {
    await axios.post(`${API_BASE_URL}/set_mode`, { mode, exerciseType });
    await axios.get(`${API_BASE_URL}/start_camera?exercise=${exerciseType}`);
  },
  
  // Stop live analysis
  stopLiveAnalysis: async (): Promise<void> => {
    await axios.get(`${API_BASE_URL}/stop_camera`);
  },
  
  // Upload video for analysis
  uploadVideo: async (
    file: File, 
    mode: string = 'Beginner', 
    exerciseType: string = 'squat'
  ): Promise<{
    original: string;
    processed: string;
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);
    formData.append('exerciseType', exerciseType);
    
    const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    if (response.data.status === 'success') {
      return {
        original: `${API_BASE_URL}${response.data.original}`,
        processed: `${API_BASE_URL}${response.data.processed}`
      };
    } else {
      throw new Error(response.data.message || 'Video processing failed');
    }
  },
  
  // Mock function for feedback - you can implement real feedback API later
  getFeedback: async (exerciseType: string = 'squat'): Promise<{ feedback: string }> => {
    // In a real app, fetch this from your backend
    const feedbackMap: Record<string, string[]> = {
      squat: [
        "Keep your back straight",
        "Lower your hips more",
        "Keep knees aligned with toes",
        "Good depth, maintain form"
      ],
      plank: [
        "Keep your core engaged",
        "Maintain a straight line from head to heels",
        "Avoid dropping your hips",
        "Keep your neck neutral"
      ]
    };
    
    // Randomly select a feedback message for the demo
    const messages = feedbackMap[exerciseType] || feedbackMap.squat;
    const randomIndex = Math.floor(Math.random() * messages.length);
    
    return { feedback: messages[randomIndex] };
  }
};