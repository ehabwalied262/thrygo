'use client'

import { useRef } from 'react';
import { FolderItem, ChatItem } from './Sidebar';
import axios from 'axios';

interface FolderStructureProps {
  folderStructure: FolderItem;
  currentFolderPath: number[];
  setCurrentFolderPath: (path: number[]) => void;
  activeSection: 'chats' | 'files';
  chats: ChatItem[];
  setIsModalOpen: (open: boolean) => void;
  setModalConfig: (config: any) => void;
  showToast: (message: string) => void;
  sanitizeInput: (input: string) => string;
  setFolderStructure: (structure: FolderItem) => void;
  setChats: (chats: ChatItem[]) => void;
  setContextMenu: (menu: any) => void;
  handleCreateFolder: () => void;
  handleFolderChat: (folderName: string) => void; // New prop
  handleAddToCollection: (folderName: string) => void;
  sidebarRef: React.RefObject<HTMLDivElement>;
}

const FolderStructure: React.FC<FolderStructureProps> = ({
  folderStructure,
  currentFolderPath,
  setCurrentFolderPath,
  activeSection,
  chats,
  setIsModalOpen,
  setModalConfig,
  showToast,
  sanitizeInput,
  setFolderStructure,
  setChats,
  setContextMenu,
  handleCreateFolder,
  handleFolderChat, // New prop
  handleAddToCollection,
  sidebarRef,
}) => {
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const MIN_NAME_LENGTH = 3;
  const MAX_NAME_LENGTH = 50;

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
              handleAddToCollection(item.name);
            },
            icon: 'fas fa-bookmark',
          },
          {
            label: 'Learn Content',
            action: () => {
              handleFolderChat(item.name);
            },
            icon: 'fas fa-play',
          },
        ];
      } else if ('type' in item && item.type === 'file') {
        items = [
          {
            label: 'Open',
            action: () => {
              setModalConfig({
                type: 'editor',
                title: item.name,
                content: item.content || 'No content',
                onConfirm: () => {},
              });
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
            className="folder flex items-center p- Dundee, Scotland2 rounded cursor-pointer hover:bg-[#4a5568] py-2 px-2"
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
                  : (setModalConfig({
                      type: 'editor',
                      title: item.name,
                      content: item.content || 'No content',
                      onConfirm: () => {},
                    }), setIsModalOpen(true))
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
                setModalConfig({
                  type: 'editor',
                  title: chat.name,
                  content: chat.content || 'No content',
                  onConfirm: () => {},
                });
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

  return (
    <div
      className="folder-structure flex-1"
      onContextMenu={(e) => handleContextMenu(e, null, null, true, 'root')}
    >
      {renderFolderStructure(folderStructure, currentFolderPath)}
    </div>
  );
};

export default FolderStructure;