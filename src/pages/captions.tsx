'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useRecoilState, useSetRecoilState, atom } from 'recoil';
import Navbar from '../components/Navbar';
import VideoInfo from '../components/VideoInfo';
import LanguageSelector from '../components/LanguageSelector';
import CaptionsDisplay from '../components/CaptionsDisplay';
import ChatInterface from '../components/ChatInterface';
import QuizMode from '../components/QuizMode';
import Sidebar from '../components/Sidebar';
import Modal from '../components/Modal';
import CollectionsModal from '../components/CollectionsModal';
import FolderChatInterface from '../components/FolderChatInterface';
import { languagesAtom, channelInfoAtom, videoTitleAtom, chatsAtom, captionsAtom } from '../recoil/atoms';
import axios from 'axios';

export const isFolderChatModeAtom = atom({
  key: 'isFolderChatMode',
  default: false,
});

interface ChatItem {
  name: string;
  content: string;
  videoId: string;
}

interface FolderItem {
  name: string;
  type: 'folder' | 'file';
  children?: FolderItem[];
  content?: string;
  videoId?: string;
}

const Captions: React.FC = () => {
  const router = useRouter();
  const { videoTitle, languages, channelInfo, videoId } = router.query;
  const [parsedLanguages, setParsedLanguages] = useRecoilState(languagesAtom);
  const [parsedChannelInfo, setParsedChannelInfo] = useRecoilState(channelInfoAtom);
  const [parsedVideoTitle, setParsedVideoTitle] = useRecoilState(videoTitleAtom);
  const [chats, setChats] = useRecoilState(chatsAtom);
  const captions = useRecoilState(captionsAtom);
  const setCaptions = useSetRecoilState(captionsAtom); // Hook to reset captions
  const [isChatMode, setIsChatMode] = useState(false);
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [isFolderChatMode, setIsFolderChatMode] = useRecoilState(isFolderChatModeAtom);
  const [quizConfig, setQuizConfig] = useState<{
    numQuestions: number;
    questionType: 'multiple_choice' | 'true_false' | 'mixed';
  } | null>(null);
  const [modal, setModal] = useState<{
    type: 'save' | 'editor' | 'rename' | 'confirm';
    content?: string;
    title?: string;
    message?: string;
    initialValue?: string;
    onConfirm?: (value?: string) => void;
  } | null>(null);
  const [showCollectionsModal, setShowCollectionsModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chatContent, setChatContent] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [folderName, setFolderName] = useState<string>('');

  // Reset captions when videoId changes
  useEffect(() => {
    if (videoId) {
      setCaptions([]); // Clear captions when a new video is loaded
    }
  }, [videoId, setCaptions]);

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
    if (!existingChat && existingContent) {
      const newChats = [...chats, { name: parsedVideoTitle, content: existingContent, videoId: videoId as string }];
      setChats(newChats);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chats', JSON.stringify(newChats));
      }
    }
    setChatContent(existingContent);
    setIsChatMode(true);
  };

  const handleFolderChat = async (folderName: string) => {
    setIsLoading(true);
    try {
      console.log('Starting handleFolderChat for folder:', folderName);

      const currentFolder = getCurrentFolder(folderName);
      console.log('Current folder structure:', JSON.stringify(currentFolder, null, 2));

      const folderContent = collectFiles(currentFolder);
      console.log('Collected files:', folderContent);

      if (folderContent.length === 0) {
        console.warn('No files found in folder or subfolders.');
        showToast('This folder and its subfolders are empty.');
        setIsLoading(false);
        return;
      }

      const contentPayload = folderContent.map((item) => ({
        name: item.name,
        content: item.content || '',
      }));
      const alternatePayload = {
        folder_name: folderName,
        files: contentPayload,
      };
      console.log('Primary payload to /learn_folder_content:', JSON.stringify(contentPayload, null, 2));
      console.log('Alternate payload to /learn_folder_content:', JSON.stringify(alternatePayload, null, 2));

      let response;
      try {
        response = await axios.post('http://localhost:5000/learn_folder_content', {
          folder_name: folderName,
          folder_content: contentPayload,
        });
        console.log('Response from /learn_folder_content (primary):', response.data);
      } catch (error: any) {
        console.warn('Primary payload failed, trying alternate payload:', error.response?.data || error.message);
        response = await axios.post('http://localhost:5000/learn_folder_content', alternatePayload);
        console.log('Response from /learn_folder_content (alternate):', response.data);
      }

      const { captions } = response.data;
      if (!captions || !Array.isArray(captions) || captions.length === 0) {
        console.warn('No valid captions returned:', captions);
        const fallbackCaptions = folderContent
          .filter((item) => item.content && item.content.trim() !== '')
          .map((item) => item.content!);
        if (fallbackCaptions.length === 0) {
          showToast('No valid content found to use as captions.');
          setIsLoading(false);
          return;
        }
        console.log('Using fallback captions:', fallbackCaptions);
        setCaptions(fallbackCaptions);
        setFolderName(folderName);
        setTimeout(() => {
          setIsLoading(false);
          setIsFolderChatMode(true);
        }, 1000);
        return;
      }

      setCaptions(captions);
      setFolderName(folderName);
      setTimeout(() => {
        setIsLoading(false);
        setIsFolderChatMode(true);
      }, 1000);
    } catch (error: any) {
      console.error('Error in handleFolderChat:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.error || 'Failed to load folder content. Using raw content as fallback.';
      showToast(errorMessage);

      const folderContent = collectFiles(getCurrentFolder(folderName));
      const fallbackCaptions = folderContent
        .filter((item) => item.content && item.content.trim() !== '')
        .map((item) => item.content!);
      if (fallbackCaptions.length === 0) {
        showToast('No valid content found to use as captions.');
        setIsLoading(false);
        return;
      }
      console.log('Using fallback captions:', fallbackCaptions);
      setCaptions(fallbackCaptions);
      setFolderName(folderName);
      setTimeout(() => {
        setIsLoading(false);
        setIsFolderChatMode(true);
      }, 1000);
    }
  };

  const getCurrentFolder = (folderName: string): FolderItem => {
    let current: FolderItem = JSON.parse(localStorage.getItem('folderStructure') || '{}');
    const path = findFolderPath(current, folderName);
    for (const index of path) {
      current = current.children![index];
    }
    return current;
  };

  const findFolderPath = (folder: FolderItem, targetName: string, path: number[] = []): number[] => {
    if (folder.name === targetName && folder.type === 'folder') {
      return path;
    }
    if (folder.children) {
      for (let i = 0; i < folder.children.length; i++) {
        const result = findFolderPath(folder.children[i], targetName, [...path, i]);
        if (result.length > 0) {
          return result;
        }
      }
    }
    return [];
  };

  const collectFiles = (folder: FolderItem): FolderItem[] => {
    let files: FolderItem[] = [];
    if (folder.children) {
      folder.children.forEach((item) => {
        if (item.type === 'file' && item.content && item.content.trim() !== '') {
          console.log(`Found file: ${item.name} with content: ${item.content.slice(0, 50)}...`);
          files.push(item);
        } else if (item.type === 'folder') {
          files = files.concat(collectFiles(item));
        }
      });
    } else {
      console.warn('No children found in folder:', folder.name);
    }
    return files;
  };

  const showToast = (message: string) => {
    const toast = document.createElement('div');
    toast.className = 'toast show fixed bottom-5 right-8 bg-toast-green text-white p-3 rounded-lg shadow-md animate-fade-in-out';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
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
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <i className="fa-solid fa-spinner fa-spin text-text-primary text-3xl"></i>
            </div>
          ) : (
            <>
              {/* Show VideoInfo only when not in chat, quiz, or folder chat mode */}
              {!isChatMode && !isQuizMode && !isFolderChatMode && (
                <VideoInfo
                  videoTitle={parsedVideoTitle}
                  channelInfo={parsedChannelInfo}
                />
              )}
              {!isChatMode && !isQuizMode && !isFolderChatMode && (
                <>
                  <LanguageSelector
                    languages={parsedLanguages}
                    videoTitle={parsedVideoTitle}
                  />
                  <CaptionsDisplay
                    onLearnContent={handleLearnContent}
                    onSaveToLibrary={() => setModal({ type: 'save' })}
                    onQuizMode={(numQuestions, questionType) => {
                      setQuizConfig({ numQuestions, questionType });
                      setIsQuizMode(true);
                    }}
                    videoId={videoId as string}
                  />
                </>
              )}
              {isChatMode && (
                <ChatInterface
                  onBack={() => setIsChatMode(false)}
                  initialContent={chatContent}
                  videoId={videoId as string}
                />
              )}
              {isQuizMode && quizConfig && (
                <QuizMode
                  onBack={() => setIsQuizMode(false)}
                  videoId={videoId as string}
                  numQuestions={quizConfig.numQuestions}
                  questionType={quizConfig.questionType}
                />
              )}
              {isFolderChatMode && (
                <FolderChatInterface
                  onBack={() => setIsFolderChatMode(false)}
                  folderName={folderName}
                />
              )}
            </>
          )}
        </div>
        <Sidebar
          onLearnContent={handleLearnContent}
          isSidebarOpen={isSidebarOpen}
          handleFolderChat={handleFolderChat}
        />
      </div>
      {modal && (
        <Modal
          type={modal.type}
          onClose={() => setModal(null)}
          content={modal.content}
          title={modal.title}
          message={modal.message}
          initialValue={modal.initialValue}
          onConfirm={modal.onConfirm}
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
        />
      )}
      {showCollectionsModal && <CollectionsModal onClose={() => setShowCollectionsModal(false)} />}
    </div>
  );
};

export default Captions;