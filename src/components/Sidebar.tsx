'use client'

import { useRecoilState, useRecoilValue } from 'recoil';
import { folderStructureAtom, videoTitleAtom, chatsAtom } from '../recoil/atoms';
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import FolderStructure from './FolderStructure';
import ContextMenu from './ContextMenu';
import axios from 'axios';

interface FolderItem {
  name: string;
  type: 'folder' | 'file';
  children?: FolderItem[];
  content?: string;
  videoId?: string;
}

interface ChatItem {
  name: string;
  content: string;
  videoId: string;
}

interface SidebarProps {
  onLearnContent: (existingContent?: string) => void;
  isSidebarOpen: boolean;
  handleFolderChat: (folderName: string) => void;
}

const Modal = dynamic(() => import('./Modal'), {
  ssr: false,
});

const Sidebar: React.FC<SidebarProps> = ({ onLearnContent, isSidebarOpen, handleFolderChat }) => {
  const [folderStructure, setFolderStructure] = useRecoilState(folderStructureAtom);
  const videoTitle = useRecoilValue(videoTitleAtom);
  const [chats, setChats] = useRecoilState(chatsAtom);
  const [currentFolderPath, setCurrentFolderPath] = useState<number[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: { label: string; action: () => void; icon: string }[];
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'chats' | 'files'>('files');
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [modalConfig, setModalConfig] = useState<{
    type: 'confirm' | 'rename';
    title: string;
    message?: string;
    initialValue?: string;
    onConfirm: (value?: string) => void;
  } | null>(null);
  const [toast, setToast] = useState('');

  const MIN_NAME_LENGTH = 3;
  const MAX_NAME_LENGTH = 50;

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedChats = localStorage.getItem('chats');
      if (savedChats) {
        setChats(JSON.parse(savedChats));
      }
    }
  }, [setChats]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 2000);
  };

  const sanitizeInput = (input: string): string => {
    return input
      .replace(/<[^>]+>/g, '')
      .replace(/script/gi, '')
      .replace(/[^a-zA-Z0-9\s.,-]/g, '')
      .trim();
  };

  const getCurrentFolder = (): FolderItem => {
    let current: FolderItem = folderStructure;
    for (const index of currentFolderPath) {
      current = current.children![index];
    }
    return current;
  };

  const folderExists = (name: string, parentFolder: FolderItem) => {
    return parentFolder.children?.some(
      (item) => item.type === 'folder' && item.name.toLowerCase() === name.toLowerCase()
    ) || false;
  };

  const chatExists = (videoTitle: string) => {
    return chats.find((chat) => chat.name === videoTitle);
  };

  const handleCreateFolder = () => {
    setModalConfig({
      type: 'rename',
      title: 'Create Folder',
      initialValue: '',
      onConfirm: (folderName) => {
        if (!folderName) return;

        const sanitizedName = sanitizeInput(folderName);
        if (sanitizedName.length < MIN_NAME_LENGTH || sanitizedName.length > MAX_NAME_LENGTH) {
          showToast(`Folder name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters.`);
          return;
        }

        setFolderStructure((prevStructure) => {
          const newStructure = JSON.parse(JSON.stringify(prevStructure));
          let current: FolderItem = newStructure;
          for (const index of currentFolderPath) {
            current = current.children![index];
          }

          if (folderExists(sanitizedName, current)) {
            showToast('A folder with this name already exists.');
            return prevStructure;
          }

          current.children = current.children || [];
          current.children.push({ name: sanitizedName, type: 'folder', children: [] });

          if (typeof window !== 'undefined') {
            localStorage.setItem('folderStructure', JSON.stringify(newStructure));
          }
          showToast('Folder created successfully!');
          return newStructure;
        });
      },
    });
    setIsModalOpen(true);
  };

  const handleCreateOrUpdateChat = (videoId: string, chatName: string, existingContent?: string) => {
    const existingChat = chatExists(chatName);
    if (existingChat) {
      onLearnContent(existingChat.content);
    } else {
      const newChats = [...chats, { name: chatName, content: existingContent || '', videoId }];
      setChats(newChats);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chats', JSON.stringify(newChats));
      }
      onLearnContent(existingContent);
    }
  };

  const handleAddToCollection = async (folderName: string) => {
    try {
      const currentFolder = getCurrentFolder();
      const videoUrls = collectFiles(currentFolder)
        .filter((item) => item.videoId)
        .map((item) => `https://www.youtube.com/watch?v=${item.videoId}`);

      if (videoUrls.length === 0) {
        showToast('No videos found in this folder.');
        return;
      }

      const response = await axios.post('http://localhost:5000/fetch_channel_data', {
        channel_urls: videoUrls,
      });
      const { videos } = response.data;
      showToast(`Added ${videos.length} videos to collection for ${folderName}`);
    } catch (error) {
      showToast('Failed to add to collection.');
      console.error('Error adding to collection:', error);
    }
  };

  const collectFiles = (folder: FolderItem): FolderItem[] => {
    let files: FolderItem[] = [];
    if (folder.children) {
      folder.children.forEach((item) => {
        if (item.type === 'file' && item.content) {
          files.push(item);
        } else if (item.type === 'folder') {
          files = files.concat(collectFiles(item));
        }
      });
    }
    return files;
  };

  return (
    <div
      ref={sidebarRef}
      className={`sidebar fixed top-16 left-0 w-64 bg-[#0f0f0f] h-[calc(100vh-64px)] overflow-y-auto overflow-x-hidden p-4 flex flex-col transition-transform duration-300 ease-in-out transform ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="mb-4">
        <div className="relative w-full">
          <button
            className={`w-1/2 py-2 rounded-l-lg text-text-primary font-semibold transition-all duration-300 ${
              activeSection === 'files'
                ? 'bg-[#4a5568] text-white'
                : 'bg-transparent hover:bg-[#4a5568] hover:text-white'
            }`}
            onClick={() => setActiveSection('files')}
          >
            Files
          </button>
          <button
            className={`w-1/2 py-2 rounded-r-lg text-text-primary font-semibold transition-all duration-300 ${
              activeSection === 'chats'
                ? 'bg-[#4a5568] text-white'
                : 'bg-transparent hover:bg-[#4a5568] hover:text-white'
            }`}
            onClick={() => setActiveSection('chats')}
          >
            Chats
          </button>
          <div
            className="absolute bottom-0 h-1 bg-primary-blue transition-all duration-300"
            style={{
              width: '50%',
              transform: activeSection === 'chats' ? 'translateX(100%)' : 'translateX(0)',
            }}
          />
        </div>
      </div>
      <FolderStructure
        folderStructure={folderStructure}
        currentFolderPath={currentFolderPath}
        setCurrentFolderPath={setCurrentFolderPath}
        activeSection={activeSection}
        chats={chats}
        setIsModalOpen={setIsModalOpen}
        setModalConfig={setModalConfig}
        showToast={showToast}
        sanitizeInput={sanitizeInput}
        setFolderStructure={setFolderStructure}
        setChats={setChats}
        setContextMenu={setContextMenu}
        handleCreateFolder={handleCreateFolder}
        handleFolderChat={handleFolderChat}
        handleAddToCollection={handleAddToCollection}
        sidebarRef={sidebarRef}
      />
      {activeSection === 'files' && (
        <button
          onClick={handleCreateFolder}
          className="create-folder-btn bg-transparent ring-1 ring-white/10 border-text-hover rounded px-4 py-2 my-2 text-text-primary hover:bg-[#454545]"
        >
          <i className="fas fa-folder-plus mr-2"></i> Create Folder
        </button>
      )}
      {contextMenu && (
        <ContextMenu
          contextMenu={contextMenu}
          setContextMenu={setContextMenu}
        />
      )}
      {isModalOpen && modalConfig && (
        <Modal
          type={modalConfig.type === 'rename' ? 'rename' : 'confirm'}
          title={modalConfig.title}
          message={modalConfig.message}
          initialValue={modalConfig.initialValue}
          onConfirm={(value) => {
            modalConfig.onConfirm(value);
            setIsModalOpen(false);
            setModalConfig(null);
          }}
          onClose={() => {
            setIsModalOpen(false);
            setModalConfig(null);
          }}
          minLength={MIN_NAME_LENGTH}
          maxLength={MAX_NAME_LENGTH}
        />
      )}
      {toast && (
        <div className="toast show fixed bottom-5 right-8 bg-toast-green text-white p-3 rounded-lg shadow-md animate-fade-in-out">
          {toast}
        </div>
      )}
    </div>
  );
};

export default Sidebar;