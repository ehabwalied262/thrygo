'use client'
import { useRecoilState, useRecoilValue } from 'recoil';
import { folderStructureAtom, captionsAtom, videoTitleAtom } from '../recoil/atoms';
import { useState, useEffect, useRef } from 'react';

interface ModalProps {
  type: 'save' | 'editor' | 'rename' | 'confirm';
  onClose: () => void;
  content?: string;
  title?: string;
  message?: string;
  initialValue?: string;
  onConfirm?: (value?: string) => void;
  minLength?: number;
  maxLength?: number;
}

const Modal: React.FC<ModalProps> = ({ type, onClose, content, title, message, initialValue, onConfirm, minLength = 3, maxLength = 50 }) => {
  const [folderStructure, setFolderStructure] = useRecoilState(folderStructureAtom);
  const captions = useRecoilValue(captionsAtom);
  const videoTitle = useRecoilValue(videoTitleAtom);
  const [selectedFolderIndex, setSelectedFolderIndex] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const [inputValue, setInputValue] = useState(initialValue || '');
  const inputRef = useRef<HTMLInputElement>(null);

  const fileExists = (name: string, parentFolder: any) => {
    return parentFolder.children?.some(
      (item: any) => item.type === 'file' && item.name.toLowerCase() === name.toLowerCase()
    );
  };

  const handleSave = () => {
    if (selectedFolderIndex === null) {
      alert('Please select a folder to save the captions.');
      return;
    }

    setFolderStructure((prevStructure) => {
      const newStructure = JSON.parse(JSON.stringify(prevStructure));
      const currentFolder = newStructure.children![selectedFolderIndex];
      const fileName = `${videoTitle}.txt`;
      
      if (fileExists(fileName, currentFolder)) {
        setToast('Already saved!');
        setTimeout(() => setToast(''), 2000);
        onClose();
        return prevStructure;
      }

      currentFolder.children = currentFolder.children || [];
      currentFolder.children.push({
        name: fileName,
        type: 'file',
        content: captions.join('\n\n'),
      });

      localStorage.setItem('folderStructure', JSON.stringify(newStructure));
      setToast('Saved successfully!');
      setTimeout(() => setToast(''), 2000);
      onClose();
      return newStructure;
    });
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm(inputValue);
      setToast('Action completed!');
      setTimeout(() => setToast(''), 2000);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  useEffect(() => {
    if (type === 'rename' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [type]);

  const renderModalFolderStructure = () => {
    if (!folderStructure.children || folderStructure.children.length === 0) {
      return <div className="text-text-primary italic">No folders available. Create a folder first.</div>;
    }
    return folderStructure.children.map((item, index) => {
      if (item.type === 'folder') {
        return (
          <div
            key={item.name}
            className={`folder flex items-center p-2 border-b border-text-hover cursor-pointer hover:bg-[#4a5568] ${
              selectedFolderIndex === index ? 'bg-primary-blue' : ''
            }`}
            onClick={() => setSelectedFolderIndex(index)}
          >
            <i className="fas fa-folder mr-2"></i> {item.name}
          </div>
        );
      }
      return null;
    });
  };

  return (
    <div className="modal fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-70">
      <div className="modal-content bg-dark-sidebar p-6 rounded-xl shadow-2xl w-11/12 max-w-lg relative transform transition-all duration-300 ease-in-out">
        <span
          className="close absolute top-3 right-3 text-text-primary text-3xl cursor-pointer hover:text-text-hover transition-colors"
          onClick={onClose}
        >
          ×
        </span>
        {type === 'save' ? (
          <>
            <h2 className="text-2xl font-bold mb-5 text-text-primary">Save to Library</h2>
            <p className="mb-5 text-text-primary">Where would you like to save this text file?</p>
            <div className="max-h-64 overflow-y-auto mb-5 border border-text-hover rounded-lg">
              {renderModalFolderStructure()}
            </div>
            <button
              onClick={handleSave}
              className="bg-primary-blue text-white py-2 px-4 rounded-lg hover:bg-hover-blue transition-colors w-full font-semibold"
            >
              Save
            </button>
            {toast && <div className="toast show fixed bottom-5 right-5 bg-toast-green text-white p-3 rounded-lg shadow-md animate-fade-in-out">{toast}</div>}
          </>
        ) : type === 'editor' ? (
          <>
            <h2 className="text-2xl font-bold mb-5 text-text-primary">{title}</h2>
            <textarea
              className="w-full h-[80%] bg-dark-bg text-text-primary border border-text-hover rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-primary-blue transition-all duration-300"
              value={content}
              readOnly
            />
          </>
        ) : type === 'rename' ? (
          <>
            <h2 className="text-2xl font-bold mb-5 text-text-primary">{title}</h2>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full p-3 mb-2 bg-dark-bg text-text-primary border border-text-hover rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue transition-all duration-300"
              placeholder="Enter new name"
              maxLength={maxLength}
            />
            <div className="text-text-primary text-sm mb-5">
              {inputValue.length}/{maxLength}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded bg-transparent border border-text-hover text-text-primary hover:bg-[#454545]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 rounded bg-primary-blue text-white hover:bg-hover-blue"
                disabled={inputValue.length < minLength}
              >
                Confirm
              </button>
            </div>
          </>
        ) : type === 'confirm' ? (
          <>
            <h2 className="text-2xl font-bold mb-5 text-text-primary">{title}</h2>
            <p className="mb-5 text-text-primary text-yellow-400">{message}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded bg-transparent border border-text-hover text-text-primary hover:bg-[#454545]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                onKeyDown={handleKeyDown}
                className="px-4 py-2 rounded bg-primary-blue text-white hover:bg-hover-blue"
              >
                Confirm
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default Modal;