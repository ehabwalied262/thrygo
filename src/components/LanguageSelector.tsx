'use client'
import { useState } from 'react';
import { useSetRecoilState } from 'recoil';
import { captionsAtom, totalPagesAtom, currentPageAtom, recommendedQuestionsAtom, videoTitleAtom } from '../recoil/atoms';
import { fetchCaptions } from '../utils/api';

interface Language {
  name: string;
  code: string;
  base_url: string;
  is_auto: boolean;
}

interface LanguageSelectorProps {
  languages: Language[];
  videoTitle: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ languages, videoTitle }) => {
  const setCaptions = useSetRecoilState(captionsAtom);
  const setTotalPages = useSetRecoilState(totalPagesAtom);
  const setCurrentPage = useSetRecoilState(currentPageAtom);
  const setRecommendedQuestions = useSetRecoilState(recommendedQuestionsAtom);
  const setVideoTitle = useSetRecoilState(videoTitleAtom);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLanguageClick = async (lang: Language) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchCaptions(lang.base_url, lang.code, lang.is_auto, videoTitle);
      if (data.captions) {
        setCaptions(data.captions);
        setTotalPages(data.total_pages);
        setCurrentPage(1);
        setVideoTitle(data.video_title);
        setRecommendedQuestions(data.recommended_questions || []);
      } else {
        setError(data.error || 'Failed to fetch captions.');
      }
    } catch (e: any) {
      setError(`An error occurred: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg text-text-primary mb-4">Available Languages</h2>
      <div className="flex flex-wrap gap-4 mb-4">
        {languages.map((lang) => (
          <button
            key={lang.code}
            className="bg-[#e8eddf] text-[#333533] py-2 px-4 rounded-lg hover:bg-[#cfdbd5] transition inline-flex items-center whitespace-nowrap min-w-fit"
            onClick={() => handleLanguageClick(lang)}
            disabled={loading}
          >
            <span>{lang.name}</span>
          </button>
        ))}
      </div>
      {loading && (
        <div className="flex justify-center items-center">
          <div className="spinner"></div>
        </div>
      )}
      {error && <p className="text-red-400 mt-2">{error}</p>}
    </div>
  );
};

export default LanguageSelector;