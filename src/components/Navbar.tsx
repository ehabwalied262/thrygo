'use client';

import React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const Navbar: React.FC<{ isSidebarOpen: boolean; setIsSidebarOpen: (value: boolean) => void }> = ({ isSidebarOpen, setIsSidebarOpen }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isInputOpen, setIsInputOpen] = useState(false); // حالة لفتح/إغلاق الـ input

  const router = useRouter();

  const extractVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!url.trim()) {
      setError('Please enter a YouTube URL.');
      setLoading(false);
      return;
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      setError('Invalid YouTube URL.');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('https://644e-41-46-153-165.ngrok-free.app', {
        youtube_url: url.trim(),
      });

      if (!response.data.languages || !response.data.video_title || !response.data.channel_info) {
        throw new Error('Missing required fields from server response.');
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

      // مسح الـ input وإغلاقه بعد نجاح العملية
      setUrl('');
      setIsInputOpen(false);
    } catch (e: any) {
      console.error(e);
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 px-8 py-4 bg-[#0f0f0f] border-b border-[#2a2a2a] flex items-center justify-between">
      <div className="text-2xl font-bold text-[#2f81f7]"> 
        <i className="fa-solid fa-bars mr-2 hover:cursor-pointer"
         onClick={() => setIsSidebarOpen(!isSidebarOpen)}>     
      </i> {isInputOpen ? (window.innerWidth < 768 ? null : 'Thrygo') : 'Thrygo'}
      </div>

      <div className="flex items-center space-x-2">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste YouTube link..."
            className={`${
              isInputOpen ? 'md:w-64 w-40 p-2 opacity-100' : 'w-0 p-0 opacity-0 overflow-hidden'
            } rounded-lg bg-[#1a1a1a] text-white border border-[#2a2a2a] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2f81f7] transition-all duration-300 ease-in-out`}
            style={{ minWidth: isInputOpen ? '0' : '0px' }}
          />
          <button
            type="button"
            onClick={() => setIsInputOpen(!isInputOpen)}
            className="bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white px-4 py-2 rounded-lg transition flex items-center justify-center"
          >
            <i className="fas fa-search"></i>
          </button>
          {isInputOpen && (
            <button
              type="submit"
              disabled={loading}
              className="bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white px-4 py-2 rounded-lg transition flex items-center justify-center"
            >
              {loading ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-check"></i>
              )}
            </button>
          )}
        </form>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          className={`bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white px-4 py-2 rounded-lg border border-[#2a2a2a] flex items-center space-x-4 transition ${isInputOpen && window.innerWidth < 768 ? 'hidden' : ''}`}
        >
          <i class="fa-solid fa-user"></i>
          <span className="hidden md:inline">Sign in</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;