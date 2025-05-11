import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useRecoilState } from 'recoil';
import Navbar from '../components/Navbar';
import VideoInfo from '../components/VideoInfo';
import LanguageSelector from '../components/LanguageSelector';
import CaptionsDisplay from '../components/CaptionsDisplay';
import ChatInterface from '../components/ChatInterface';
import QuizMode from '../components/QuizMode'; // Import the new QuizMode component
import Sidebar from '../components/Sidebar';
import Modal from '../components/Modal';
import CollectionsModal from '../components/CollectionsModal';
import { languagesAtom, channelInfoAtom, videoTitleAtom, chatsAtom } from '../recoil/atoms';

interface ChatItem {
  name: string;
  content: string;
  videoId: string;
}

const Captions: React.FC = () => {
  const router = useRouter();
  const { videoTitle, languages, channelInfo, videoId } = router.query;
  const [parsedLanguages, setParsedLanguages] = useRecoilState(languagesAtom);
  const [parsedChannelInfo, setParsedChannelInfo] = useRecoilState(channelInfoAtom);
  const [parsedVideoTitle, setParsedVideoTitle] = useRecoilState(videoTitleAtom);
  const [chats, setChats] = useRecoilState(chatsAtom);
  const [isChatMode, setIsChatMode] = useState(false);
  const [isQuizMode, setIsQuizMode] = useState(false); // Add Quiz Mode state
  const [modal, setModal] = useState<{ type: 'save' | 'editor'; content?: string; title?: string } | null>(null);
  const [showCollectionsModal, setShowCollectionsModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (languages && typeof languages === 'string') {
      try {
        setParsedLanguages(JSON.parse(languages));
      } catch (e) {
        console.error('Error parsing languages:', e);
      }
    }
    if (channelInfo && typeof channelInfo === 'string') {
      try {
        setParsedChannelInfo(JSON.parse(channelInfo));
      } catch (e) {
        console.error('Error parsing channelInfo:', e);
      }
    }
    if (videoTitle && typeof videoTitle === 'string') {
      setParsedVideoTitle(videoTitle);
    }
  }, [languages, channelInfo, videoTitle, setParsedLanguages, setParsedChannelInfo, setParsedVideoTitle]);

  const handleLearnContent = (existingContent?: string) => {
    if (!parsedVideoTitle || !videoId) return;

    const existingChat = chats.find((chat) => chat.name === parsedVideoTitle);
    if (!existingChat) {
      const initialContent = `Hello! This is your chat for "${parsedVideoTitle}". Ask me anything about the video!`;
      const newChats = [...chats, { name: parsedVideoTitle, content: initialContent, videoId: videoId as string }];
      setChats(newChats);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chats', JSON.stringify(newChats));
      }
    }
    setIsChatMode(true);
  };

  const handleQuizMode = () => {
    setIsQuizMode(true); // Switch to Quiz Mode
  };

  return (
     <div className="flex min-h-screen dark-mode flex-col">
     <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />    
     <div className="flex flex-1">
     <div
      className={`${
        isSidebarOpen ? 'w-64' : 'w-0'
      } transition-all duration-300 ease-in-out`}
    />

      <div className="flex-1 pr-12 pt-20 max-w-4xl mx-12 p-4">
        <VideoInfo
          videoTitle={parsedVideoTitle}
          channelInfo={parsedChannelInfo}
        />
        {!isChatMode && !isQuizMode && (
          <>
            <LanguageSelector
              languages={parsedLanguages}
              videoTitle={parsedVideoTitle}
            />
            <CaptionsDisplay
              onLearnContent={handleLearnContent}
              onSaveToLibrary={() => setModal({ type: 'save' })}
              onQuizMode={handleQuizMode}
              videoId={videoId as string}
            />
          </>
        )}
        {isChatMode && <ChatInterface onBack={() => setIsChatMode(false)} />}
        {isQuizMode && <QuizMode onBack={() => setIsQuizMode(false)} videoId={videoId as string} />}
      </div>

      <Sidebar onLearnContent={handleLearnContent} isSidebarOpen={isSidebarOpen} />  
      </div>

    {modal && (
      <Modal
        type={modal.type}
        onClose={() => setModal(null)}
        content={modal.content}
        title={modal.title}
      />
    )}
    {showCollectionsModal && <CollectionsModal onClose={() => setShowCollectionsModal(false)} />}
  </div>
);
};

export default Captions;