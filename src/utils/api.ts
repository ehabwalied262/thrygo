import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000', // Flask server
});

export const fetchCaptions = async (
  baseUrl: string,
  langCode: string,
  isAuto: boolean,
  videoTitle: string
) => {
  const response = await api.post('/get_captions', {
    base_url: baseUrl,
    lang_code: langCode,
    is_auto: isAuto,
    video_title: videoTitle,
  });
  return response.data;
};

export const askQuestion = async (question: string, captions?: string[]) => {
  try {
    const response = await fetch('http://localhost:5000/ask_question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, captions }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const fetchChannelData = async (channelUrls: string[]) => {
  const response = await api.post('/fetch_channel_data', { channel_urls: channelUrls });
  return response.data;
};

export const fetchVideoData = async (videoUrls: string[]) => {
  const response = await api.post('/fetch_video_data', { video_urls: videoUrls });
  return response.data;
};

export const learnFolderContent = async (folderContent: any) => {
  const response = await api.post('/learn_folder_content', { folder_content: folderContent });
  return response.data;
};