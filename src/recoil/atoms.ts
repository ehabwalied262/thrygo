import { atom } from 'recoil';

interface Language {
  name: string;
  code: string;
  base_url: string;
  is_auto: boolean;
}

interface FolderItem {
  name: string;
  type: 'folder' | 'file';
  children?: FolderItem[];
  content?: string;
}

interface ChatItem {
  name: string;
  content: string;
  videoId: string;
}


const getInitialFolderStructure = (): FolderItem => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('folderStructure');
    return saved ? JSON.parse(saved) : { name: 'root', type: 'folder', children: [] };
  }
  return { name: 'root', type: 'folder', children: [] };
};

export const captionsAtom = atom<string[]>({
  key: 'captions',
  default: [],
});

export const currentPageAtom = atom<number>({
  key: 'currentPage',
  default: 1,
});

export const totalPagesAtom = atom<number>({
  key: 'totalPages',
  default: 0,
});

export const videoTitleAtom = atom<string>({
  key: 'videoTitle',
  default: '',
});

export const languagesAtom = atom<Language[]>({
  key: 'languages',
  default: [],
});

export const channelInfoAtom = atom<{
  name: string;
  avatar: string;
}>({
  key: 'channelInfo',
  default: { name: '', avatar: '' },
});

export const recommendedQuestionsAtom = atom<string[]>({
  key: 'recommendedQuestions',
  default: [],
});

export const folderStructureAtom = atom<FolderItem>({
  key: 'folderStructure',
  default: getInitialFolderStructure(),
});

export const chatsAtom = atom<ChatItem[]>({
  key: 'chatsAtom',
  default: [],
});

// New atom for folder chat mode
export const isFolderChatModeAtom = atom({
  key: 'isFolderChatMode',
  default: false,
});