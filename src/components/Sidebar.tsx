'use client'

import { useRecoilState, useRecoilValue } from 'recoil';
import { folderStructureAtom, videoTitleAtom, chatsAtom } from '../recoil/atoms';
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

interface FolderItem {
  name: string;
  type: 'folder' | 'file';
  children?: FolderItem[];
  content?: string;
  videoId?: string; // Add optional videoId
}

const Modal = dynamic(() => import('./Modal'), {
  ssr: false,
});

interface ChatItem {
  name: string;
  content: string;
  videoId: string;
}

interface SidebarProps {
  onLearnContent: (existingContent?: string) => void;
  isSidebarOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ onLearnContent, isSidebarOpen }) => {  
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
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'chats' | 'files'>('files');
  const sidebarRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
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

  // نقل الـ useEffect هنا
  useEffect(() => {
    setContextMenu(null);
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeSection, currentFolderPath]);

  // تنظيف الـ refs
  useEffect(() => {
    return () => {
      itemRefs.current.clear();
    };
  }, [activeSection, currentFolderPath]);

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
      setSelectedFileContent(existingChat.content);
      setIsModalOpen(true);
      onLearnContent(existingChat.content); // Notify parent component
    } else {
      const newChats = [...chats, { name: chatName, content: existingContent || '', videoId }];
      setChats(newChats);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chats', JSON.stringify(newChats));
      }
      setSelectedFileContent(existingContent || '');
      setIsModalOpen(true);
      onLearnContent(existingContent); // Notify parent component
    }
  };

  const handleLearnContent = (folderName: string, videoId: string) => {
    if (!videoTitle) {
      showToast('No video title available to create a chat.');
      return;
    }
    handleCreateOrUpdateChat(videoId, videoTitle);
  };

const handleContextMenu = (
  e: React.MouseEvent,
  item: FolderItem | ChatItem | null,
  index: number | null,
  isRoot: boolean,
  itemKey: string
) => {
  e.preventDefault();
  e.stopPropagation();

  let items: { label: string; action: () => void; icon: string }[] = [];
  const sidebarRect = sidebarRef.current?.getBoundingClientRect();
  const itemElement = itemRefs.current.get(itemKey);
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let x = 0;
  let y = 0;
  let itemRect: DOMRect | undefined;

  if (itemElement && sidebarRect) {
    itemRect = itemElement.getBoundingClientRect();
    x = itemRect.left - sidebarRect.left;
    y = itemRect.bottom - sidebarRect.top;
  } else {
    x = e.pageX - (sidebarRect?.left || 0);
    y = e.pageY - (sidebarRect?.top || 0);
  }

  const menuWidth = 150;
  const menuHeight = 150;
  if (x + menuWidth > sidebarRect!.width) {
    x = sidebarRect!.width - menuWidth - 10;
  }
  if (y + menuHeight > viewportHeight - (sidebarRect?.top || 0)) {
    y = (itemElement && itemRect ? itemRect.top - sidebarRect!.top : e.pageY - sidebarRect!.top) - menuHeight - 10;
  }

    if (activeSection === 'files') {
      if (isRoot || !item) {
        items = [
          {
            label: 'Create a new folder',
            action: handleCreateFolder,
            icon: 'fas fa-plus',
          },
        ];
      } else if ('type' in item && item.type === 'folder') {
        items = [
          {
            label: 'Rename',
            action: () => {
              setModalConfig({
                type: 'rename',
                title: 'Rename Folder',
                initialValue: item.name,
                onConfirm: (newName) => {
                  if (!newName) return;

                  const sanitizedName = sanitizeInput(newName);
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
                    current.children![index!].name = sanitizedName;
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('folderStructure', JSON.stringify(newStructure));
                    }
                    showToast('Folder renamed successfully!');
                    return newStructure;
                  });
                },
              });
              setIsModalOpen(true);
            },
            icon: 'fas fa-pen',
          },
          {
            label: 'Delete',
            action: () => {
              setModalConfig({
                type: 'confirm',
                title: 'Confirm Deletion',
                message: `Are you sure you want to delete "${item.name}"?`,
                onConfirm: () => {
                  setFolderStructure((prevStructure) => {
                    const newStructure = JSON.parse(JSON.stringify(prevStructure));
                    let current: FolderItem = newStructure;
                    for (const index of currentFolderPath) {
                      current = current.children![index];
                    }
                    current.children!.splice(index!, 1);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('folderStructure', JSON.stringify(newStructure));
                    }
                    showToast('Folder deleted successfully!');
                    return newStructure;
                  });
                },
              });
              setIsModalOpen(true);
            },
            icon: 'fas fa-trash',
          },
          {
            label: 'Collections',
            action: () => {
              showToast(`Adding "${item.name}" to collection!`);
            },
            icon: 'fas fa-bookmark',
          },
          {
            label: 'Learn Content',
            action: () => {
              if ('videoId' in item) {
                handleLearnContent(item.name, item.videoId);
              } else {
                showToast('No video ID available for this item.');
              }
            },
            icon: 'fas fa-play',
          },
        ];
      } else if ('type' in item && item.type === 'file') {
        items = [
          {
            label: 'Open',
            action: () => {
              setSelectedFileContent(item.content || 'No content');
              setIsModalOpen(true);
            },
            icon: 'fas fa-eye',
          },
          {
            label: 'Rename',
            action: () => {
              setModalConfig({
                type: 'rename',
                title: 'Rename File',
                initialValue: item.name.replace('.txt', ''),
                onConfirm: (newName) => {
                  if (!newName) return;

                  const sanitizedName = sanitizeInput(newName);
                  if (sanitizedName.length < MIN_NAME_LENGTH || sanitizedName.length > MAX_NAME_LENGTH) {
                    showToast(`File name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters.`);
                    return;
                  }

                  setFolderStructure((prevStructure) => {
                    const newStructure = JSON.parse(JSON.stringify(prevStructure));
                    let current: FolderItem = newStructure;
                    for (const index of currentFolderPath) {
                      current = current.children![index];
                    }
                    if (
                      current.children!.some(
                        (i) =>
                          i.type === 'file' &&
                          i.name.toLowerCase() === `${sanitizedName}.txt`.toLowerCase()
                      )
                    ) {
                      showToast('A file with this name already exists.');
                      return prevStructure;
                    }
                    current.children![index!].name = `${sanitizedName}.txt`;
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('folderStructure', JSON.stringify(newStructure));
                    }
                    showToast('File renamed successfully!');
                    return newStructure;
                  });
                },
              });
              setIsModalOpen(true);
            },
            icon: 'fas fa-pen',
          },
          {
            label: 'Delete',
            action: () => {
              setModalConfig({
                type: 'confirm',
                title: 'Confirm Deletion',
                message: `Are you sure you want to delete "${item.name}"?`,
                onConfirm: () => {
                  setFolderStructure((prevStructure) => {
                    const newStructure = JSON.parse(JSON.stringify(prevStructure));
                    let current: FolderItem = newStructure;
                    for (const index of currentFolderPath) {
                      current = current.children![index];
                    }
                    current.children!.splice(index!, 1);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('folderStructure', JSON.stringify(newStructure));
                    }
                    showToast('File deleted successfully!');
                    return newStructure;
                  });
                },
              });
              setIsModalOpen(true);
            },
            icon: 'fas fa-trash',
          },
        ];
      }
    } else if (activeSection === 'chats') {
      items = [];
      if (item) {
        items.push(
          {
            label: 'Rename',
            action: () => {
              setModalConfig({
                type: 'rename',
                title: 'Rename Chat',
                initialValue: item.name,
                onConfirm: (newName) => {
                  if (!newName) return;

                  const sanitizedName = sanitizeInput(newName);
                  if (sanitizedName.length < MIN_NAME_LENGTH || sanitizedName.length > MAX_NAME_LENGTH) {
                    showToast(`Chat name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters.`);
                    return;
                  }

                  const newChats = chats.map((chat) =>
                    chat.name === item.name ? { ...chat, name: sanitizedName } : chat
                  );
                  setChats(newChats);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('chats', JSON.stringify(newChats));
                  }
                  showToast('Chat renamed successfully!');
                },
              });
              setIsModalOpen(true);
            },
            icon: 'fas fa-pen',
          },
          {
            label: 'Delete',
            action: () => {
              setModalConfig({
                type: 'confirm',
                title: 'Confirm Deletion',
                message: `Are you sure you want to delete "${item.name}"?`,
                onConfirm: () => {
                  const newChats = chats.filter((c) => c.name !== item.name);
                  setChats(newChats);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('chats', JSON.stringify(newChats));
                  }
                  showToast('Chat deleted successfully!');
                },
              });
              setIsModalOpen(true);
            },
            icon: 'fas fa-trash',
          }
        );
      }
    }

    if (items.length > 0) {
      setContextMenu({ x, y, items });
    }
  };

  const renderFolderStructure = (structure: FolderItem, path: number[] = []) => {
    const currentFolder = path.length ? getCurrentFolder() : structure;
    const items = [];

    if (activeSection === 'files') {
      if (path.length > 0) {
        const backKey = 'back';
        items.push(
          <div
            key={backKey}
            ref={(el) => {
              if (el) itemRefs.current.set(backKey, el);
            }}
            className="folder flex items-center p-2 rounded cursor-pointer hover:bg-[#4a5568]"
            onClick={() => setCurrentFolderPath(path.slice(0, -1))}
            onContextMenu={(e) => handleContextMenu(e, null, null, false, backKey)}
          >
            <i className="fas fa-arrow-left mr-2"></i> ..
          </div>
        );
      }

      if (!currentFolder.children || currentFolder.children.length === 0) {
        items.push(
          <div key="empty" className="text-text-primary italic">
            This folder is empty.
          </div>
        );
      } else {
        currentFolder.children.forEach((item, index) => {
          const itemPath = [...path, index];
          const itemKey = item.name;
          items.push(
            <div
              key={itemKey}
              ref={(el) => {
                if (el) itemRefs.current.set(itemKey, el);
              }}
              className={`${item.type === 'folder' ? 'folder' : 'file'} flex items-center p-2 rounded cursor-pointer hover:bg-[#4a5568]`}
              onClick={() =>
                item.type === 'folder'
                  ? setCurrentFolderPath(itemPath)
                  : (setSelectedFileContent(item.content || 'No content'), setIsModalOpen(true))
              }
              onContextMenu={(e) => handleContextMenu(e, item, index, false, itemKey)}
            >
              <span>
                {item.type === 'folder' ? (
                  <i className="fas fa-folder mr-2 text-text-primary"></i>
                ) : null}
              </span>
              <span className="truncate flex-1">{item.name}</span>
              {item.type === 'file' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setModalConfig({
                      type: 'rename',
                      title: 'Rename File',
                      initialValue: item.name.replace('.txt', ''),
                      onConfirm: (newName) => {
                        if (!newName) return;

                        const sanitizedName = sanitizeInput(newName);
                        if (sanitizedName.length < MIN_NAME_LENGTH || sanitizedName.length > MAX_NAME_LENGTH) {
                          showToast(`File name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters.`);
                          return;
                        }

                        setFolderStructure((prevStructure) => {
                          const newStructure = JSON.parse(JSON.stringify(prevStructure));
                          let current: FolderItem = newStructure;
                          for (const index of currentFolderPath) {
                            current = current.children![index];
                          }
                          if (
                            current.children!.some(
                              (i) =>
                                i.type === 'file' &&
                                i.name.toLowerCase() === `${sanitizedName}.txt`.toLowerCase()
                            )
                          ) {
                            showToast('A file with this name already exists.');
                            return prevStructure;
                          }
                          current.children![index].name = `${sanitizedName}.txt`;
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('folderStructure', JSON.stringify(newStructure));
                          }
                          showToast('File renamed successfully!');
                          return newStructure;
                        });
                      },
                    });
                    setIsModalOpen(true);
                  }}
                >
                  <i className="fas fa-edit text-text-primary hover:text-text-hover"></i>
                </button>
              )}
            </div>
          );
        });
      }
    } else if (activeSection === 'chats') {
      if (chats.length === 0) {
        items.push(
          <div key="empty" className="text-text-primary italic">
            No chats available.
          </div>
        );
      } else {
        chats.forEach((chat, index) => {
          const chatKey = chat.name;
          items.push(
            <div
              key={chatKey}
              ref={(el) => {
                if (el) itemRefs.current.set(chatKey, el);
              }}
              className="chat flex items-center p-2 rounded cursor-pointer hover:bg-[#4a5568]"
              onClick={() => {
                setSelectedFileContent(chat.content);
                setIsModalOpen(true);
              }}
              onContextMenu={(e) => handleContextMenu(e, chat, index, false, chatKey)}
            >
              <i className="fas fa-comments mr-2 text-text-primary"></i>
              <span className="truncate flex-1">{chat.name}</span>
            </div>
          );
        });
      }
    }

    return items;
  };

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeSection, currentFolderPath]);

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
      <div
        className="folder-structure flex-1"
        onContextMenu={(e) => handleContextMenu(e, null, null, true, 'root')}
      >
        {renderFolderStructure(folderStructure, currentFolderPath)}
      </div>
      {activeSection === 'files' && (
        <button
          onClick={handleCreateFolder}
          className="create-folder-btn bg-transparent ring-1 ring-white/10 border-text-hover rounded px-4 py-2 my-4 text-text-primary hover:bg-[#454545]"
        >
          <i className="fas fa-folder-plus mr-2"></i> Create Folder
        </button>
      )}
      {contextMenu && (
        <div
          className="context-menu bg-dark-nav ring-1 ring-white/10 border-text-hover rounded shadow-md transform transition-all duration-200 ease-in-out animate-slide-down"
          style={{ position: 'absolute', left: contextMenu.x, top: contextMenu.y, zIndex: 1000 }}
        >
          {contextMenu.items.map((item, index) => (
            <div
              key={index}
              className="px-4 py-2 text-text-primary hover:bg-[#4a5568] cursor-pointer flex items-center text-sm"
              onClick={(e) => {
                e.stopPropagation();
                item.action();
                setContextMenu(null);
              }}
            >
              <i className={`${item.icon} mr-2`}></i>
              {item.label}
            </div>
          ))}
        </div>
      )}
      {typeof window !== 'undefined' && isModalOpen && (
        modalConfig ? (
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
              setSelectedFileContent(null);
            }}
            minLength={MIN_NAME_LENGTH}
            maxLength={MAX_NAME_LENGTH}
          />
        ) : (
          <Modal
            type="editor"
            onClose={() => {
              setIsModalOpen(false);
              setSelectedFileContent(null);
              const existingChat = chatExists(videoTitle);
              if (existingChat && selectedFileContent !== existingChat.content) {
                const newChats = chats.map((chat) =>
                  chat.name === videoTitle ? { ...chat, content: selectedFileContent || '' } : chat
                );
                setChats(newChats);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('chats', JSON.stringify(newChats));
                }
              }
            }}
            content={selectedFileContent}
            title="File Content"
          />
        )
      )}
      {toast && (
        <div className="toast show fixed bottom-5 right-5 bg-toast-green text-white p-3 rounded-lg shadow-md animate-fade-in-out">
          {toast}
        </div>
      )}
    </div>
  );
};

export default Sidebar;