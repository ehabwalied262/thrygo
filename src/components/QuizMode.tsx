'use client';

import { useState, useEffect } from 'react';

// Interface for a quiz question
interface Question {
  type: 'mcq' | 'true_false'; // Question type: multiple-choice or true/false
  question: string; // The question text
  options?: string[]; // Options for MCQ questions (optional)
  correct_answer: string | boolean; // Correct answer (string for MCQ, boolean for true/false)
}

// Interface for QuizMode component props
interface QuizModeProps {
  onBack: () => void; // Callback to navigate back
  videoId: string; // ID of the video associated with the quiz
  numQuestions: number; // Number of questions in the quiz
  questionType: 'mcq' | 'true_false' | 'mixed'; // Type of questions in the quiz
}

// QuizMode component: Handles the quiz functionality
const QuizMode: React.FC<QuizModeProps> = ({ onBack, videoId, numQuestions, questionType }) => {
  // State declarations
  const [questions, setQuestions] = useState<Question[]>([]); // List of quiz questions
  const [sessionId, setSessionId] = useState<string | null>(null); // Unique session ID for the quiz
  const [userAnswers, setUserAnswers] = useState<(string | boolean)[]>([]); // User's selected answers
  const [refreshCounts, setRefreshCounts] = useState<number[]>([]); // Tracks refresh attempts per question
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // Index of the current question
  const [isLoading, setIsLoading] = useState(false); // Loading state for API calls
  const [quizResult, setQuizResult] = useState<{
    score: number; // User's score
    total: number; // Total possible score
    percentage: number; // Percentage score
    message: string; // Result message
  } | null>(null); // Quiz result data
  const [error, setError] = useState<string | null>(null); // Error message if API call fails
  const [showFeedback, setShowFeedback] = useState(false); // Controls visibility of answer feedback
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null); // Tracks if the current answer is correct

  // Effect to fetch quiz data when component mounts or dependencies change
  useEffect(() => {
    // Async function to fetch quiz from the server
    const fetchQuiz = async () => {
      setIsLoading(true); // Set loading state
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
        if (data.error) throw new Error(data.error); // Handle server errors

        setQuestions(data.questions); // Store questions
        setSessionId(data.session_id); // Store session ID
        setUserAnswers(new Array(data.questions.length).fill(null)); // Initialize answers array
        setRefreshCounts(new Array(data.questions.length).fill(0)); // Initialize refresh counts
      } catch (err: any) {
        setError(err.message); // Set error message
      } finally {
        setIsLoading(false); // Reset loading state
      }
    };

    fetchQuiz(); // Trigger quiz fetch
  }, [videoId, numQuestions, questionType]); // Dependencies for re-fetching

  // Handle user selecting an answer
  const handleAnswerChange = (answer: string | boolean) => {
    const newAnswers = [...userAnswers]; // Copy current answers
    newAnswers[currentQuestionIndex] = answer; // Update answer for current question
    setUserAnswers(newAnswers); // Update state
    setShowFeedback(false); // Hide feedback when answer changes
    setIsCorrect(null); // Reset correctness state
  };

  // Handle refreshing the current question
  const handleRefresh = async () => {
    if (!sessionId || refreshCounts[currentQuestionIndex] >= 5) return; // Prevent refresh if limits reached

    setIsLoading(true); // Set loading state
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
      if (data.error) throw new Error(data.error); // Handle server errors

      // Update the current question
      const newQuestions = [...questions];
      newQuestions[currentQuestionIndex] = data.new_question;
      setQuestions(newQuestions);

      // Update refresh count
      const newRefreshCounts = [...refreshCounts];
      newRefreshCounts[currentQuestionIndex] = data.refresh_count;
      setRefreshCounts(newRefreshCounts);

      // Reset the user's answer for the refreshed question
      const newAnswers = [...userAnswers];
      newAnswers[currentQuestionIndex] = null;
      setUserAnswers(newAnswers);

      setShowFeedback(false); // Hide feedback
      setIsCorrect(null); // Reset correctness
    } catch (err: any) {
      setError(err.message); // Set error message
    } finally {
      setIsLoading(false); // Reset loading state
    }
  };

  // Check if the user's answer is correct
  const handleCheckAnswer = () => {
    const userAnswer = userAnswers[currentQuestionIndex]; // Get user's answer
    const correctAnswer = questions[currentQuestionIndex].correct_answer; // Get correct answer

    if (userAnswer === null) return; // Do nothing if no answer selected

    // Handle true/false questions
    if (questions[currentQuestionIndex].type === 'true_false') {
      const normalizedUserAnswer = typeof userAnswer === 'string' ? userAnswer.toLowerCase() === 'true' : userAnswer;
      setIsCorrect(normalizedUserAnswer === correctAnswer);
    } else {
      // Handle MCQ questions
      setIsCorrect(String(userAnswer).toLowerCase() === String(correctAnswer).toLowerCase());
    }
    setShowFeedback(true); // Show feedback
  };

  // Navigate to the next question
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1); // Move to next question
      setShowFeedback(false); // Hide feedback
      setIsCorrect(null); // Reset correctness
    }
  };

  // Navigate to the previous question
  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1); // Move to previous question
      setShowFeedback(false); // Hide feedback
      setIsCorrect(null); // Reset correctness
    }
  };

  // Submit the quiz and get results
  const handleSubmitQuiz = async () => {
    if (!sessionId) return; // Prevent submission without session ID

    setIsLoading(true); // Set loading state
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
      if (data.error) throw new Error(data.error); // Handle server errors
      setQuizResult(data); // Store quiz results
    } catch (err: any) {
      setError(err.message); // Set error message
    } finally {
      setIsLoading(false); // Reset loading state
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <i className="fa-solid fa-spinner fa-spin text-text-primary text-3xl"></i>
      </div>
    );
  }

  // Render error state
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

  // Render quiz results
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

  // Return null if no questions are loaded
  if (questions.length === 0) return null;

  const currentQuestion = questions[currentQuestionIndex]; // Current question data

  // Render quiz question interface
  return (
    <div className="bg-dark-sidebar p-6 rounded-lg shadow-lg text-text-primary">
      {/* Header with back button and question counter */}
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

      {/* Question text */}
      <h2 className="text-xl font-semibold mb-4">{currentQuestion.question}</h2>

      {/* Render MCQ options */}
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
        /* Render true/false options */
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

      {/* Show feedback after checking answer */}
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

      {/* Navigation and action buttons */}
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