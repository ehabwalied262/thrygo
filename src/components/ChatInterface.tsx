'use client'
import { useState, useEffect, useRef } from 'react';
import { useRecoilValue } from 'recoil';
import { recommendedQuestionsAtom } from '../recoil/atoms';
import { askQuestion } from '../utils/api';

interface ChatInterfaceProps {
  onBack: () => void;
}

interface Message {
  sender: string;
  text: string;
  isTyping?: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onBack }) => {
  const recommendedQuestions = useRecoilValue(recommendedQuestionsAtom);
  const chatContainerRef = useRef<HTMLDivElement>(null);

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
        className="question-box flex items-center justify-between p-3 bg-gray-200 rounded-md cursor-pointer hover:bg-gray-300 transition-all shadow-sm flex-1"
        onClick={() => handleAskQuestion(q)}
      >
        <span className="text-gray-800 flex-1 text-sm">{q}</span>
        <i className="fas fa-sparkles text-yellow-400 sparkle-icon text-sm"></i>
      </div>
    ));
  };

  const handleAskQuestion = async (question: string) => {
    if (isTyping) {
      setIsTyping(false);
      return;
    }

    // Add user message
    setChatHistory((prev) => [...prev, { sender: 'user', text: question }]);
    setIsTyping(true);

    try {
      const data = await askQuestion(question);
      const answer = data.answer || data.error || 'Failed to get an answer.';

      // Add bot message with typing effect
      setChatHistory((prev) => [
        ...prev,
        { sender: 'bot', text: '', isTyping: true },
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
          setTimeout(typeCharacter, 10); // 50ms delay per character
        } else {
          setChatHistory((prev) => {
            const updated = [...prev];
            updated[updated.length - 1].isTyping = false;
            return updated;
          });
          setIsTyping(false);
        }
      };
      setTimeout(typeCharacter, 500); // Initial delay before typing starts
    } catch (e: any) {
      setChatHistory((prev) => [
        ...prev,
        { sender: 'bot', text: `Error: ${e.message}`, isTyping: false },
      ]);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && userQuestion.trim() && !isTyping) {
      handleAskQuestion(userQuestion);
      setUserQuestion('');
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
    <div className="flex flex-col bg-dark-nav rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="welcome-box p-4 rounded-md">
          <h3 className="text-lg font-semibold text-gray-100 mb-2">Hello!</h3>
          <p className="text-gray-300 text-sm">
            I'm here to help you explore the content. Ask me anything or pick a suggested question below.
          </p>
        </div>
        <button
          onClick={handleBackClick}
          className="text-gray-600 hover:text-gray-800 flex items-center gap-2 border border-gray-200 rounded-md px-3 py-1.5 transition-all bg-white shadow-sm"
          disabled={isLoading}
        >
          {isLoading ? (
          <i className="fa-solid fa-spinner fa-spin text-gray-600 text-sm"></i>
        ) : (
          <i className="fas fa-arrow-left text-sm"></i>
        )}
        </button>
      </div>
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-medium text-gray-100">Suggested Questions:</h3>
          <button className="text-gray-600 text-gray-100 hover:text-gray-300">
            <i className="fas fa-sync-alt text-sm"></i>
          </button>
        </div>
        <div className="flex gap-3 mt-2">{displayRecommendedQuestions()}</div>
      </div>
      <div className="flex-1 flex flex-col">
        <div
          ref={chatContainerRef}
          className="p-4 flex-1 overflow-y-auto mb-4"
        >
          <div className="min-h-full flex flex-col gap-4">
            {chatHistory.map((msg, index) => (
              <div
                key={index}
                className={`flex ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-xl shadow-md transition-all ${
                    msg.sender === 'user'
                      ? 'bg-green-50 border border-green-200 text-black'
                      : 'bg-blue-50 border border-blue-200 text-black'
                  } ${msg.isTyping ? 'animate-pulse' : ''}`}
                >
                  <span className="text-sm">{msg.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={userQuestion}
            onChange={(e) => setUserQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 p-2.5 rounded-lg bg-white border border-gray-200 text-gray-800 placeholder-gray-400 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all"
            placeholder="Ask a question about the content..."
            disabled={isTyping}
          />
          <button
            onClick={() => {
              if (userQuestion.trim() && !isTyping) {
                handleAskQuestion(userQuestion);
                setUserQuestion('');
              }
            }}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center w-10 h-10 shadow-md"
          >
            {isTyping ? (
              <svg
                className="w-5 h-5"
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
                className="w-5 h-5"
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
    </div>
  );
};

export default ChatInterface;