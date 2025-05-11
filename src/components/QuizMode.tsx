'use client'

import { useState, useEffect } from 'react';

interface Question {
  type: 'mcq' | 'true_false';
  question: string;
  options?: string[];
  correct_answer: string | boolean;
}
type QuestionType = 'multiple_choice' | 'true_false' | 'open_ended';

interface QuizModeProps {
  onBack: () => void;
  videoId: string;
  numQuestions: number;
  questionType: QuestionType;
}

const QuizMode: React.FC<QuizModeProps> = ({ onBack, videoId, numQuestions = 5, questionType = 'multiple_choice' }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<(string | boolean | null)[]>([]);
  const [refreshCounts, setRefreshCounts] = useState<number[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [quizResult, setQuizResult] = useState<{
    score: number;
    total: number;
    percentage: number;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false); // State to show feedback after checking
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null); // State to track if the answer is correct

  useEffect(() => {
    const fetchQuiz = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('http://localhost:5000/generate_quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            num_questions: numQuestions,
            question_type: questionType,
            video_id: videoId,
          }),
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        setQuestions(data.questions);
        setSessionId(data.session_id);
        setUserAnswers(new Array(data.questions.length).fill(null));
        setRefreshCounts(new Array(data.questions.length).fill(0));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuiz();
  }, [videoId, numQuestions, questionType]);

  const handleAnswerChange = (answer: string | boolean) => {
    const newAnswers = [...userAnswers];
    newAnswers.splice(currentQuestionIndex, 1); 
    setUserAnswers(newAnswers);
    setShowFeedback(false); // Reset feedback when answer changes
    setIsCorrect(null);
  };

  const handleRefresh = async () => {
    if (!sessionId || refreshCounts[currentQuestionIndex] >= 5) return;

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/refresh_quiz_question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          question_index: currentQuestionIndex,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const newQuestions = [...questions];
      newQuestions[currentQuestionIndex] = data.new_question;
      setQuestions(newQuestions);

      const newRefreshCounts = [...refreshCounts];
      newRefreshCounts[currentQuestionIndex] = data.refresh_count;
      setRefreshCounts(newRefreshCounts);

      const newAnswers = [...userAnswers];
      newAnswers[currentQuestionIndex] = null;
      setUserAnswers(newAnswers);

      setShowFeedback(false);
      setIsCorrect(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckAnswer = () => {
    const userAnswer = userAnswers[currentQuestionIndex];
    const correctAnswer = questions[currentQuestionIndex].correct_answer;

    if (userAnswer === null) return;

    if (questions[currentQuestionIndex].type === 'true_false') {
      const normalizedUserAnswer = typeof userAnswer === 'string' ? userAnswer.toLowerCase() === 'true' : userAnswer;
      setIsCorrect(normalizedUserAnswer === correctAnswer);
    } else {
      setIsCorrect(String(userAnswer).toLowerCase() === String(correctAnswer).toLowerCase());
    }
    setShowFeedback(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowFeedback(false);
      setIsCorrect(null);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setShowFeedback(false);
      setIsCorrect(null);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!sessionId) return;

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/submit_quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          answers: userAnswers,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setQuizResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <i className="fa-solid fa-spinner fa-spin text-text-primary text-3xl"></i>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-text-primary text-center">
        <p>Error: {error}</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-transparent ring-1 ring-white/10 border-text-hover text-text-primary rounded hover:bg-[#454545] transition"
        >
          Back
        </button>
      </div>
    );
  }

  if (quizResult) {
    return (
      <div className="bg-dark-sidebar p-6 rounded-lg shadow-lg text-text-primary">
        <h2 className="text-2xl font-semibold mb-4">Quiz Results</h2>
        <p className="text-lg mb-2">
          You scored {quizResult.score} out of {quizResult.total}!
        </p>
        <p className="text-lg mb-4">Percentage: {quizResult.percentage.toFixed(2)}%</p>
        <p className="mb-6">{quizResult.message}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-transparent ring-1 ring-white/10 border-text-hover text-text-primary rounded hover:bg-[#454545] transition"
        >
          Back
        </button>
      </div>
    );
  }

  if (questions.length === 0) return null;

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="bg-dark-sidebar p-6 rounded-lg shadow-lg text-text-primary">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={onBack}
          className="text-text-primary hover:text-text-hover flex items-center"
        >
          <i className="fas fa-arrow-left mr-2"></i> Back
        </button>
        <span>
          Question {currentQuestionIndex + 1} of {questions.length}
        </span>
      </div>
      <h2 className="text-xl font-semibold mb-4">{currentQuestion.question}</h2>
      {currentQuestion.type === 'mcq' ? (
        <div className="space-y-3 mb-6">
          {currentQuestion.options?.map((option, index) => (
            <label key={index} className="flex items-center space-x-2">
              <input
                type="radio"
                name={`question-${currentQuestionIndex}`}
                value={option}
                checked={userAnswers[currentQuestionIndex] === option}
                onChange={() => handleAnswerChange(option)}
                className="form-radio text-primary-blue focus:ring-primary-blue"
                disabled={showFeedback}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name={`question-${currentQuestionIndex}`}
              value="true"
              checked={userAnswers[currentQuestionIndex] === true}
              onChange={() => handleAnswerChange(true)}
              className="form-radio text-primary-blue focus:ring-primary-blue"
              disabled={showFeedback}
            />
            <span>True</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name={`question-${currentQuestionIndex}`}
              value="false"
              checked={userAnswers[currentQuestionIndex] === false}
              onChange={() => handleAnswerChange(false)}
              className="form-radio text-primary-blue focus:ring-primary-blue"
              disabled={showFeedback}
            />
            <span>False</span>
          </label>
        </div>
      )}
      {showFeedback && (
        <div className="mb-4">
          {isCorrect ? (
            <div className="flex items-center text-green-500">
              <i className="fas fa-check-circle mr-2"></i>
              <span>Correct!</span>
            </div>
          ) : (
            <div className="text-red-500">
              Incorrect. The correct answer is: {String(currentQuestion.correct_answer)}
            </div>
          )}
        </div>
      )}
      <div className="flex justify-between items-center">
        <div className="flex gap-3">
          <button
            onClick={handlePrevQuestion}
            disabled={currentQuestionIndex === 0}
            className="px-4 py-2 bg-transparent ring-1 ring-white/10 border-text-hover text-text-primary rounded hover:bg-[#454545] transition disabled:opacity-50"
          >
            Previous
          </button>
          {!showFeedback ? (
            <button
              onClick={handleCheckAnswer}
              disabled={userAnswers[currentQuestionIndex] === null}
              className="px-4 py-2 bg-primary-blue text-white rounded hover:bg-blue-600 transition disabled:opacity-50"
            >
              Check
            </button>
          ) : currentQuestionIndex < questions.length - 1 ? (
            <button
              onClick={handleNextQuestion}
              className="px-4 py-2 bg-primary-blue text-white rounded hover:bg-blue-600 transition"
            >
              Next
            </button>
          ) : null}
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshCounts[currentQuestionIndex] >= 5 || showFeedback}
            className="px-4 py-2 bg-transparent ring-1 ring-white/10 border-text-hover text-text-primary rounded hover:bg-[#454545] transition disabled:opacity-50"
          >
            Refresh ({5 - refreshCounts[currentQuestionIndex]} left)
          </button>
          {currentQuestionIndex === questions.length - 1 && showFeedback && (
            <button
              onClick={handleSubmitQuiz}
              disabled={userAnswers.some((answer) => answer === null)}
              className="px-4 py-2 bg-primary-blue text-white rounded hover:bg-blue-600 transition disabled:opacity-50"
            >
              Submit Quiz
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizMode;