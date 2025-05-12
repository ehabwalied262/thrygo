'use client';

import { useRecoilState, useRecoilValue } from 'recoil';
import { captionsAtom, currentPageAtom, totalPagesAtom, videoTitleAtom, chatsAtom } from '../recoil/atoms';
import { useState } from 'react';

interface CaptionsDisplayProps {
  onLearnContent: (existingContent?: string) => void;
  onSaveToLibrary: () => void;
  onQuizMode?: (numQuestions: number, questionType: 'mcq' | 'true_false' | 'mixed') => void;
  onDeepSearch?: () => void;
  videoId: string;
}

const CaptionsDisplay: React.FC<CaptionsDisplayProps> = ({ onLearnContent, onSaveToLibrary, onQuizMode, onDeepSearch, videoId }) => {
  const captions = useRecoilValue(captionsAtom);
  const [currentPage, setCurrentPage] = useRecoilState(currentPageAtom);
  const totalPages = useRecoilValue(totalPagesAtom);
  const videoTitle = useRecoilValue(videoTitleAtom);
  const chats = useRecoilValue(chatsAtom);
  const [toast, setToast] = useState('');
  const [isLoading, setIsLoading] = useState<{ learn: boolean; quiz: boolean; deep: boolean }>({
    learn: false,
    quiz: false,
    deep: false,
  });
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [questionType, setQuestionType] = useState<'mcq' | 'true_false' | 'mixed'>('mixed');

  const updatePagination = () => {
    const start = (currentPage - 1) * 5;
    const end = start + 5;
    return captions.slice(start, end).join('\n\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(updatePagination()).then(() => {
      setToast('Copied!');
      setTimeout(() => setToast(''), 2000);
    });
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  const renderPageNumbers = () => {
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          className={`p-2 rounded-md ${
            i === currentPage ? 'bg-primary-blue text-white' : 'text-text-primary hover:bg-[#4a5568]'
          } transition`}
          onClick={() => handlePageClick(i)}
        >
          {i}
        </button>
      );
    }
    return pages;
  };

  const handleLearnContentClick = () => {
    setIsLoading((prev) => ({ ...prev, learn: true }));
    setTimeout(() => {
      setIsLoading((prev) => ({ ...prev, learn: false }));
      if (videoTitle && onLearnContent) {
        const existingChat = chats.find((chat) => chat.name === videoTitle);
        onLearnContent(existingChat ? existingChat.content : undefined);
      }
    }, 500);
  };

  const handleQuizModeClick = () => {
    setIsLoading((prev) => ({ ...prev, quiz: true }));
    setTimeout(() => {
      setIsLoading((prev) => ({ ...prev, quiz: false }));
      setShowQuizModal(true);
    }, 1000);
  };

  const handleQuizModalSubmit = () => {
    if (numQuestions < 1 || numQuestions > 25) {
      setToast('Number of questions must be between 1 and 25.');
      return;
    }
    setShowQuizModal(false);
    if (onQuizMode) onQuizMode(numQuestions, questionType);
  };

  const handleDeepSearchClick = () => {
    setIsLoading((prev) => ({ ...prev, deep: true }));
    setTimeout(() => {
      setIsLoading((prev) => ({ ...prev, deep: false }));
      if (onDeepSearch) onDeepSearch();
    }, 1000);
  };

  if (captions.length === 0) return null;

  return (
    <div className="flex flex-col gap-8">
      {/* Buttons Container */}
      <div className="flex justify-end items-center gap-4 bg-dark-nav p-4 rounded-lg shadow-lg">
        <button
          onClick={handleLearnContentClick}
          className="text-text-primary hover:text-text-hover relative tooltip"
          disabled={isLoading.learn}
        >
          {isLoading.learn ? (
            <i className="fa-solid fa-spinner fa-spin text-text-primary p-2 rounded-full border border-text-hover"></i>
          ) : (
            <>
              <i className="fas fa-book p-2 rounded-full border border-text-hover hover:bg-[#454545] transition"></i>
              <span className="tooltip-text">Learn Content</span>
            </>
          )}
        </button>
        <button
          onClick={handleQuizModeClick}
          className="text-text-primary hover:text-text-hover relative tooltip"
          disabled={isLoading.quiz}
        >
          {isLoading.quiz ? (
            <i className="fa-solid fa-sync fa-spin text-text-primary p-2 rounded-full border border-text-hover"></i>
          ) : (
            <>
              <i className="fas fa-question-circle p-2 rounded-full border border-text-hover hover:bg-[#454545] transition"></i>
              <span className="tooltip-text">Quiz Mode</span>
            </>
          )}
        </button>
        <button
          onClick={handleDeepSearchClick}
          className="text-text-primary hover:text-text-hover relative tooltip"
          disabled={isLoading.deep}
        >
          {isLoading.deep ? (
            <i className="fa-solid fa-circle-notch fa-spin text-text-primary p-2 rounded-full border border-text-hover"></i>
          ) : (
            <>
              <i className="fas fa-search-plus p-2 rounded-full border border-text-hover hover:bg-[#454545] transition"></i>
              <span className="tooltip-text">Deep Search</span>
            </>
          )}
        </button>
        <button
          onClick={onSaveToLibrary}
          className="text-text-primary hover:text-text-hover relative tooltip"
        >
          <i className="fas fa-save p-2 rounded-full border border-text-hover hover:bg-[#454545] transition"></i>
          <span className="tooltip-text">Save to Library</span>
        </button>
        <button
          onClick={handleCopy}
          className="text-text-primary hover:text-text-hover relative tooltip"
        >
          <i className="fas fa-copy p-2 rounded-full border border-text-hover hover:bg-[#454545] transition"></i>
          <span className="tooltip-text">Copy to Clipboard</span>
        </button>
      </div>

      {/* Transcript Container */}
      <div className="caption-container bg-dark-sidebar p-4 rounded-lg shadow-lg hidden md:block h-[400px] overflow-y-auto">
        <h3 className="text-lg font-semibold text-text-primary mb-12">Transcript</h3>
        <div className="text-text-primary">{updatePagination()}</div>
        <div className="flex justify-between items-center mt-12 w-full px-4">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="text-text-primary hover:text-text-hover relative tooltip disabled:opacity-50"
          >
            <i className="fas fa-arrow-left p-2 rounded-full border border-text-hover hover:bg-[#454545] transition"></i>
            <span className="tooltip-text">Previous</span>
          </button>
          <div className="flex gap-2">{renderPageNumbers()}</div>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="text-text-primary hover:text-text-hover relative tooltip"
          >
            <i className="fas fa-arrow-right p-2 rounded-full border border-text-hover hover:bg-[#454545] transition"></i>
            <span className="tooltip-text">Next</span>
          </button>
        </div>
        <div className="text-text-primary text-center mt-6">
          Page {currentPage} of {totalPages}
        </div>
        {toast && <div className="toast show">{toast}</div>}
        {showQuizModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-dark-sidebar p-6 rounded-lg shadow-lg w-full max-w-md">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Set Up Your Quiz</h3>
              <div className="mb-4">
                <label className="block text-text-primary mb-2">Number of Questions (1-25):</label>
                <input
                  type="number"
                  min="1"
                  max="25"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                  className="w-full p-2 rounded bg-dark-nav text-text-primary border border-text-hover focus:outline-none focus:ring-2 focus:ring-primary-blue"
                />
              </div>
              <div className="mb-4">
                <label className="block text-text-primary mb-2">Question Type:</label>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value as 'mcq' | 'true_false' | 'mixed')}
                  className="w-full p-2 rounded bg-dark-nav text-text-primary border border-text-hover focus:outline-none focus:ring-2 focus:ring-primary-blue"
                >
                  <option value="mcq">Multiple Choice (MCQ)</option>
                  <option value="true_false">True/False</option>
                  <option value="mixed">Mixed (MCQ & True/False)</option>
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowQuizModal(false)}
                  className="px-4 py-2 bg-transparent border border-text-hover text-text-primary rounded hover:bg-[#454545] transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuizModalSubmit}
                  className="px-4 py-2 bg-primary-blue text-white rounded hover:bg-blue-600 transition"
                >
                  Start Quiz
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CaptionsDisplay;