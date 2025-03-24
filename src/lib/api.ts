// API configuration
export const API_URL = import.meta.env.DEV ? '/api' : 'https://yt-thumbnail-bkend.onrender.com';

// Common headers for all requests
export const getHeaders = () => ({
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'Origin': window.location.origin,
});

// API endpoints
export const endpoints = {
  generateImage: `${API_URL}/generate_image`,
  status: (requestId: string) => `${API_URL}/status/${requestId}`,
  train: `${API_URL}/train`,
  insertGeneratedImages: (requestId: string) => `${API_URL}/insert_generated_images/${requestId}`,
};

// API functions
export async function fetchWithError(url: string, options: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  try {
    const text = await response.text();
    if (!text) return null;
    
    try {
      return JSON.parse(text);
    } catch (e) {
      // If JSON parsing fails but we have text, return it wrapped in an object
      if (typeof text === 'string' && text.trim()) {
        return { message: text.trim() };
      }
      throw new Error('Invalid response format from server');
    }
  } catch (e) {
    console.error('Response parsing error:', e);
    throw new Error('Failed to parse server response');
  }
}

// Function to check status and insert generated images
export async function checkStatusAndInsertImages(requestId: string) {
  try {
    // First check the status
    const statusResult = await fetchWithError(endpoints.status(requestId), {
      method: 'GET',
    });

    // If status is completed, try to insert generated images
    if (statusResult?.status?.toLowerCase() === 'completed') {
      await fetchWithError(endpoints.insertGeneratedImages(requestId), {
        method: 'GET',
      });
    }

    return statusResult;
  } catch (error) {
    console.error('Error in checkStatusAndInsertImages:', error);
    throw error;
  }
}