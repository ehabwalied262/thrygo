'use client'

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

const Home: React.FC = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // دالة لاستخراج videoId من رابط الـ YouTube
  const extractVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // تحقق من إن url مش فاضي وإنه رابط يوتيوب صالح
    if (!url.trim()) {
      setError('Please enter a YouTube URL.');
      setLoading(false);
      return;
    }

    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      setError('Please enter a valid YouTube URL.');
      setLoading(false);
      return;
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      setError('Invalid YouTube URL: Could not extract video ID.');
      setLoading(false);
      return;
    }

    console.log('Sending YouTube URL:', url);
    console.log('Extracted videoId:', videoId);

    try {
      const response = await axios.post(
        'http://localhost:5000/',
        { youtube_url: url.trim() },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Response from server:', response.data);

      // Validation للتأكد إن الـ response فيه البيانات المتوقعة
      if (!response.data.languages || !response.data.video_title || !response.data.channel_info) {
        throw new Error('Invalid response from server: Missing required fields (languages, video_title, or channel_info).');
      }

      router.push({
        pathname: '/captions',
        query: {
          videoTitle: response.data.video_title,
          languages: JSON.stringify(response.data.languages),
          channelInfo: JSON.stringify(response.data.channel_info),
          videoId: videoId,
        },
      });
    } catch (e: any) {
      console.error('Axios error:', e.response?.data || e.message);
      setError(`An error occurred: ${e.response?.data?.error || e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="pt-32 flex items-center justify-center">
        <div className="w-full max-w-xl bg-[#1a1a1a] p-8 rounded-2xl shadow-xl border border-[#2a2a2a]">
          <h1 className="text-3xl font-semibold text-white mb-4 text-center">
            <span className="text-[#2f81f7]">Thrygo</span>, From YouTube to your brain.
          </h1>
          <p className="text-center text-[#b0b0b0] mb-6">
            Skip the fluff, quiz, chat, and think deeper.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtu.be/..."
              className="w-full p-4 rounded-xl bg-[#121212] border border-[#2a2a2a] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2f81f7]"
            />
            <button
              type="submit"
              className="w-full bg-[#2f81f7] hover:bg-[#1c60c2] text-white font-medium py-3 rounded-xl transition flex items-center justify-center"
              disabled={loading}
            >
              Analyze <i className="fas fa-search ml-2"></i>
            </button>
          </form>
          {error && <p className="text-red-400 text-center mt-4">{error}</p>}
          {loading && (
            <div className="flex items-center justify-center mt-4 text-[#d0d0d0]">
              <span>Processing...</span>
              <div className="spinner ml-2"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;