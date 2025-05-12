'use client';

import { useState, useEffect, useRef } from 'react';
import { useRecoilValue } from 'recoil';
import { recommendedQuestionsAtom } from '../recoil/atoms';
import { askQuestion } from '../utils/api';
import ReactMarkdown from 'react-markdown';

interface ChatInterfaceProps {
  onBack: () => void;
}

interface Message {
  sender: string;
  text: string;
  isTyping?: boolean;
  originalText?: string; // Store original text for regeneration
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onBack }) => {
  const recommendedQuestions = useRecoilValue(recommendedQuestionsAtom);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load chat history from localStorage on mount
  const [chatHistory, setChatHistory] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chatHistory');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const [userQuestion, setUserQuestion] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedText, setEditedText] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    }
  }, [chatHistory]);

  // Auto-scroll to bottom when chat history changes
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [chatHistory]);

  const displayRecommendedQuestions = () => {
    return recommendedQuestions.slice(0, 2).map((q, index) => (
      <div
        key={index}
        className="question-box flex items-center justify-between p-2 sm:p-3 bg-gray-200 rounded-md cursor-pointer hover:bg-gray-300 transition-all shadow-sm flex-1 text-xs sm:text-sm"
        onClick={() => handleAskQuestion(q)}
      >
        <span className="text-gray-800 flex-1">{q}</span>
        <i className="fas fa-sparkles text-yellow-400 sparkle-icon text-xs sm:text-sm"></i>
      </div>
    ));
  };

  const handleAskQuestion = async (question: string) => {
    if (isTyping) {
      stopTyping();
      return;
    }

    // Add user message
    setChatHistory((prev) => [...prev, { sender: 'user', text: question }]);
    setIsTyping(true);

    // Scroll to bottom immediately
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }, 0);

    try {
      const data = await askQuestion(question);
      const answer = data.answer || data.error || 'Failed to get an answer.';

      // Add bot message with typing effect
      setChatHistory((prev) => [
        ...prev,
        { sender: 'bot', text: '', isTyping: true, originalText: answer },
      ]);

      let index = 0;
      const typeCharacter = () => {
        if (index < answer.length) {
          setChatHistory((prev) => {
            const updated = [...prev];
            updated[updated.length - 1].text = answer.slice(0, index + 1);
            return updated;
          });
          index++;
          typingTimeoutRef.current = setTimeout(typeCharacter, 5);
        } else {
          setChatHistory((prev) => {
            const updated = [...prev];
            updated[updated.length - 1].isTyping = false;
            return updated;
          });
          setIsTyping(false);
        }
      };
      setTimeout(typeCharacter, 200);
    } catch (e: any) {
      setChatHistory((prev) => [
        ...prev,
        { sender: 'bot', text: `**Error:** ${e.message}`, isTyping: false },
      ]);
      setIsTyping(false);
    }
  };

  const stopTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    setChatHistory((prev) => {
      const updated = [...prev];
      if (updated.length > 0 && updated[updated.length - 1].isTyping) {
        updated[updated.length - 1].isTyping = false;
      }
      return updated;
    });
    setIsTyping(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && userQuestion.trim() && !isTyping) {
      handleAskQuestion(userQuestion);
      setUserQuestion('');
    }
  };

  const handleEditMessage = (index: number, text: string) => {
    setEditingIndex(index);
    setEditedText(text);
  };

  const handleSaveEdit = async (index: number) => {
    if (editedText.trim()) {
      const updatedChat = [...chatHistory];
      updatedChat[index].text = editedText;
      setChatHistory(updatedChat);

      // Generate new response for the edited message
      if (index % 2 === 0) { // Assuming user messages are at even indices
        setChatHistory((prev) => {
          const newHistory = [...prev];
          newHistory.splice(index + 1, 1); // Remove the old response
          return newHistory;
        });
        setIsTyping(true);
        try {
          const data = await askQuestion(editedText);
          const answer = data.answer || data.error || 'Failed to get an answer.';
          setChatHistory((prev) => [
            ...prev,
            { sender: 'bot', text: '', isTyping: true, originalText: answer },
          ]);

          let newIndex = 0;
          const typeCharacter = () => {
            if (newIndex < answer.length) {
              setChatHistory((prev) => {
                const updated = [...prev];
                updated[updated.length - 1].text = answer.slice(0, newIndex + 1);
                return updated;
              });
              newIndex++;
              typingTimeoutRef.current = setTimeout(typeCharacter, 5);
            } else {
              setChatHistory((prev) => {
                const updated = [...prev];
                updated[updated.length - 1].isTyping = false;
                return updated;
              });
              setIsTyping(false);
            }
          };
          setTimeout(typeCharacter, 200);
        } catch (e: any) {
          setChatHistory((prev) => [
            ...prev,
            { sender: 'bot', text: `**Error:** ${e.message}`, isTyping: false },
          ]);
          setIsTyping(false);
        }
      }
    }
    setEditingIndex(null);
    setEditedText('');
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  const handleRegenerate = async (index: number) => {
    const originalText = chatHistory[index].originalText;
    if (originalText) {
      setChatHistory((prev) => {
        const updated = [...prev];
        updated[index].text = '';
        updated[index].isTyping = true;
        return updated;
      });
      setIsTyping(true);
      try {
        const data = await askQuestion(originalText);
        const answer = data.answer || data.error || 'Failed to get an answer.';
        setChatHistory((prev) => {
          const updated = [...prev];
          updated[index].text = answer;
          updated[index].isTyping = false;
          updated[index].originalText = answer;
          return updated;
        });
        setIsTyping(false);
      } catch (e: any) {
        setChatHistory((prev) => {
          const updated = [...prev];
          updated[index].text = `**Error:** ${e.message}`;
          updated[index].isTyping = false;
          return updated;
        });
        setIsTyping(false);
      }
    }
  };

  const handleClearChat = () => {
    setChatHistory([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('chatHistory');
    }
  };

  const handleBackClick = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onBack();
    }, 500);
  };

  return (
    <div className="flex flex-col bg-dark-nav rounded-xl shadow-lg p-4 sm:p-6 h-full max-w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-2">
        <div className="welcome-box p-3 sm:p-4 rounded-md w-full sm:w-auto">
          <h3 className="text-base sm:text-lg font-semibold text-gray-100 mb-1 sm:mb-2">Hello!</h3>
          <p className="text-gray-300 text-xs sm:text-sm">
            I'm here to help you explore the content. Ask me anything or pick a suggested question below.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleClearChat}
            className="text-gray-600 hover:text-gray-800 flex items-center gap-1 sm:gap-2 border border-gray-200 rounded-md px-2 sm:px-3 py-1 sm:py-1.5 transition-all bg-white shadow-sm text-xs sm:text-sm"
          >
            <i className="fas fa-trash text-xs sm:text-sm"></i>
            <span className="hidden sm:inline">Clear</span>
          </button>
          <button
            onClick={handleBackClick}
            className="text-gray-600 hover:text-gray-800 flex items-center gap-1 sm:gap-2 border border-gray-200 rounded-md px-2 sm:px-3 py-1 sm:py-1.5 transition-all bg-white shadow-sm text-xs sm:text-sm"
            disabled={isLoading}
          >
            {isLoading ? (
              <i className="fa-solid fa-spinner fa-spin text-gray-600 text-xs sm:text-sm"></i>
            ) : (
              <i className="fas fa-arrow-left text-xs sm:text-sm"></i>
            )}
            <span className="hidden sm:inline">Back</span>
          </button>
        </div>
      </div>
      <div className="mb-3 sm:mb-5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm sm:text-base font-medium text-gray-100">Suggested Questions:</h3>
          <button className="text-gray-600 text-gray-100 hover:text-gray-300">
            <i className="fas fa-sync-alt text-xs sm:text-sm"></i>
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-2">{displayRecommendedQuestions()}</div>
      </div>
      <div className="flex-1 flex flex-col">
        <div
          ref={chatContainerRef}
          className="p-3 sm:p-4 flex-1 overflow-y-auto mb-3 sm:mb-4 max-h-[60vh] sm:max-h-[70vh]"
        >
          <div className="min-h-full flex flex-col gap-3 sm:gap-4">
            {chatHistory.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] sm:max-w-[70%] p-2 sm:p-3 rounded-xl shadow-md transition-all ${
                    msg.sender === 'user'
                      ? 'bg-grey-50 ring-1 ring-white/10'
                      : 'text-white ring-1 ring-white/10' 
                  } ${msg.isTyping ? 'animate-pulse' : ''}`}
                >
                  {msg.sender === 'user' && editingIndex === index ? (
                    <>
                      <input
                        type="text"
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        className="w-full p-1 sm:p-2 rounded-lg bg-transparent text-black focus:outline-none text-xs sm:text-sm"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2 mt-1 sm:mt-2">
                        <button
                          onClick={() => handleSaveEdit(index)}
                          className="text-white bg-transparent hover:bg-gray-600 px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingIndex(null)}
                          className="text-white bg-transparent hover:bg-gray-600 px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {msg.sender === 'bot' ? (
                        <ReactMarkdown
                          components={{
                            p: ({ node, ...props }) => <p className="mb-1 sm:mb-2 text-xs sm:text-sm" {...props} />,
                            ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-1 sm:mb-2 text-xs sm:text-sm" {...props} />,
                            ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-1 sm:mb-2 text-xs sm:text-sm" {...props} />,
                            li: ({ node, ...props }) => <li className="ml-3 sm:ml-4 text-xs sm:text-sm" {...props} />,
                            h1: ({ node, ...props }) => <h1 className="text-base sm:text-lg font-bold mb-1 sm:mb-2 text-xs sm:text-sm" {...props} />,
                            h2: ({ node, ...props }) => <h2 className="text-sm sm:text-base font-bold mb-1 sm:mb-2 text-xs sm:text-sm" {...props} />,
                            h3: ({ node, ...props }) => <h3 className="text-xs sm:text-sm font-bold mb-1 sm:mb-2 text-xs sm:text-sm" {...props} />,
                            strong: ({ node, ...props }) => <strong className="font-semibold text-xs sm:text-sm" {...props} />,
                            em: ({ node, ...props }) => <em className="italic text-xs sm:text-sm" {...props} />,
                            root: ({ ...props }) => <div className="markdown-content text-xs sm:text-sm" {...props} />,
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      ) : (
                        <span className="text-xs sm:text-sm">{msg.text}</span>
                      )}
                      {msg.sender === 'user' && !msg.isTyping && !editingIndex && (
                        <div className="flex justify-end mt-1 sm:mt-2">
                          <button
                            onClick={() => handleEditMessage(index, msg.text)}
                            className="text-white bg-transparent hover:bg-gray-600 px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                        </div>
                      )}
                      {msg.sender === 'bot' && !msg.isTyping && (
                        <div className="flex justify-end mt-1 sm:mt-2 gap-2">
                          <button
                            onClick={() => handleCopy(msg.text, index)}
                            className="text-white bg-transparent px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm flex items-center gap-1"
                          >
                            <i className="fas fa-copy"></i>
                            {copiedIndex === index && <span className="text-green-600 text-xs">Copied!</span>}
                          </button>
                          <button
                            onClick={() => handleRegenerate(index)}
                            className="text-white bg-transparent hover:bg-gray-600 px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm flex items-center gap-1"
                          >
                            <i className="fas fa-redo"></i>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-1 sm:gap-2">
          <input
            type="text"
            value={userQuestion}
            onChange={(e) => setUserQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 p-2 sm:p-2.5 rounded-lg bg-white border border-gray-200 text-gray-800 placeholder-gray-400 text-xs sm:text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all"
            placeholder="Ask a question about the content..."
            disabled={isTyping}
          />
          <button
            onClick={() => {
              if (isTyping) {
                stopTyping();
              } else if (userQuestion.trim()) {
                handleAskQuestion(userQuestion);
                setUserQuestion('');
              }
            }}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center w-8 sm:w-10 h-8 sm:h-10 shadow-md"
          >
            {isTyping ? (
              <svg
                className="w-4 sm:w-5 h-4 sm:h-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 6h12v12H6z"
                />
              </svg>
            ) : (
              <svg
                className="w-4 sm:w-5 h-4 sm:h-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
      <style jsx>{`
        .markdown-content :where(h1, h2, h3, p, ul, ol, li, strong, em) {
          color: #fff;
        }
        .markdown-content p {
          margin-bottom: 0.5rem;
        }
        .markdown-content ul,
        .markdown-content ol {
          margin-bottom: 0.5rem;
          padding-left: 1rem;
        }
        .markdown-content li {
          margin-left: 1rem;
        }
      `}</style>
    </div>
  );
};

export default ChatInterface;