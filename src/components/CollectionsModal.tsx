'use client'
import { useState } from 'react';
import { fetchChannelData, fetchVideoData } from '../utils/api';

interface CollectionsModalProps {
  onClose: () => void;
}

const CollectionsModal: React.FC<CollectionsModalProps> = ({ onClose }) => {
  const [platform, setPlatform] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [links, setLinks] = useState<string[]>(['']);
  const [data, setData] = useState<any>(null);

  const addLinkInput = () => {
    if (links.length < 10) {
      setLinks([...links, '']);
    }
  };

  const handleLinkChange = (index: number, value: string) => {
    const newLinks = [...links];
    newLinks[index] = value;
    setLinks(newLinks);
  };

  const handleProcess = async () => {
    if (!platform || !type) return;
    const filteredLinks = links.filter((url) => url);
    if (filteredLinks.length === 0) return;

    if (platform === 'YouTube' && type === 'Channels') {
      const response = await fetchChannelData(filteredLinks);
      setData(response);
    } else if (platform === 'YouTube' && type === 'Videos') {
      const response = await fetchVideoData(filteredLinks);
      setData(response);
    }
  };

  return (
    <div className="custom-modal fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-70">
      <div className="custom-modal-content bg-dark-bg p-6 rounded-lg w-4/5 max-w-[700px] max-h-[85vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-white mb-4 border-b border-gray-700 pb-2">
          Collections
        </h2>
        {!data ? (
          <>
            <div className="mb-4">
              <label className="block text-text-primary mb-2">Select Platform:</label>
              <div className="flex gap-2 flex-wrap">
                {['YouTube', 'TikTok', 'Instagram', 'PDFs'].map((p) => (
                  <button
                    key={p}
                    className={`platform-btn px-3 py-1 rounded ${
                      platform === p ? 'bg-primary-blue' : 'bg-[#454545]'
                    } text-text-primary hover:bg-hover-blue transition`}
                    onClick={() => {
                      setPlatform(p);
                      setType(null);
                      setLinks(['']);
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            {platform === 'YouTube' && (
              <div className="mb-4">
                <label className="block text-text-primary mb-2">Select Type:</label>
                <div className="flex gap-2">
                  {['Channels', 'Playlists', 'Videos'].map((t) => (
                    <button
                      key={t}
                      className={`type-btn px-3 py-1 rounded ${
                        type === t ? 'bg-primary-blue' : 'bg-[#454545]'
                      } text-text-primary hover:bg-hover-blue transition`}
                      onClick={() => setType(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {(platform === 'YouTube' && (type === 'Channels' || type === 'Videos')) ? (
              <div className="mb-4 flex flex-col gap-2 max-h-[200px] overflow-y-auto">
                <label className="text-text-primary mb-2">
                  Enter {type === 'Channels' ? 'Channel' : 'Video'} URLs:
                </label>
                {links.map((link, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={link}
                      onChange={(e) => handleLinkChange(index, e.target.value)}
                      className="bg-dark-nav text-[#353535] p-2 rounded w-full"
                      placeholder="Enter URL"
                    />
                    <button
                      onClick={addLinkInput}
                      className="add-link-btn text-text-primary hover:text-text-hover"
                    >
                      <i className="fas fa-plus"></i>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              platform && <p className="text-text-primary">Coming soon for {platform}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={handleProcess}
                className="bg-primary-blue text-white px-4 py-2 rounded hover:bg-hover-blue transition"
              >
                Process
              </button>
              <button
                onClick={onClose}
                className="bg-error-red text-white px-4 py-2 rounded hover:bg-[#b32428] transition"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div>
            <h2 className="text-xl text-text-primary mb-4">
              {platform === 'YouTube' && type === 'Channels' ? 'Channel Data' : 'Video Captions'}
            </h2>
            <ul className="text-text-primary">
              {data.error ? (
                <li className="text-red-400">{data.error}</li>
              ) : (
                (data.videos || data.captions || []).map((item: any, index: number) => (
                  <li key={index} className="mb-2">
                    {data.videos ? (
                      <>
                        <span>{item.title}</span>
                        <button
                          className="fetch-captions-btn text-text-primary hover:text-text-hover ml-2"
                          onClick={() => fetchVideoData([item.url]).then(setData)}
                        >
                          <i className="fas fa-closed-captioning"></i> Fetch Captions
                        </button>
                      </>
                    ) : (
                      <span>{item}</span>
                    )}
                  </li>
                ))
              )}
            </ul>
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="bg-primary-blue text-white px-4 py-2 rounded hover:bg-hover-blue transition"
                onClick={() => {
                  const captions = data.captions || [];
                  if (captions.length === 0) {
                    alert('No captions to save.');
                    return;
                  }
                  // Save to folder structure (implement based on your needs)
                  onClose();
                }}
              >
                Save Captions
              </button>
              <button
                className="bg-error-red text-white px-4 py-2 rounded hover:bg-[#b32428] transition"
                onClick={() => setData(null)}
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionsModal;