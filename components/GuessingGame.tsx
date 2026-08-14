import React, { useState, useEffect, useCallback } from 'react';
import { Flashcard, CategoryKey } from '../types';
import { FLASHCARDS, CATEGORIES } from '../constants';

interface GuessingGameProps {
  category: CategoryKey;
  favoriteWords: string[];
  difficultWords: string[];
  customWords?: Flashcard[]; 
  onToggleFavorite: (word: string) => void;
  onToggleDifficult: (word: string) => void;
  onSpeech: (text: string) => Promise<void>;
}

export const GuessingGame: React.FC<GuessingGameProps> = ({ 
  category, 
  favoriteWords,
  difficultWords, 
  customWords = [],
  onToggleDifficult, 
  onSpeech 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'result'>('idle');
  const [isPaused, setIsPaused] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [shuffledCards, setShuffledCards] = useState<Flashcard[]>([]);
  const [currentOptions, setCurrentOptions] = useState<Flashcard[]>([]);

  const getCardsForCategory = useCallback(() => {
    // Modo Treino: Palavras Difíceis
    if (category === 'difficult') {
      const flatAll = [...Object.values(FLASHCARDS).flat(), ...customWords];
      const unique = Array.from(new Map(flatAll.map(item => [item.en, item])).values());
      return unique.filter(f => difficultWords.includes(f.en));
    }
    // Modo Treino: Palavras Aprendidas (Mastered)
    if (category === 'mastered') {
      const flatAll = [...Object.values(FLASHCARDS).flat(), ...customWords];
      const unique = Array.from(new Map(flatAll.map(item => [item.en, item])).values());
      return unique.filter(f => favoriteWords.includes(f.en));
    }
    // Listas Customizadas
    if (category.toString().startsWith('list_')) {
      return customWords.filter(f => !favoriteWords.includes(f.en));
    }
    // Categorias Padrão
    return FLASHCARDS[category] || [];
  }, [category, difficultWords, favoriteWords, customWords]);

  const startGame = () => {
    const cards = [...getCardsForCategory()].sort(() => Math.random() - 0.5);
    if (cards.length < 1) return;
    setShuffledCards(cards);
    setCurrentIndex(0);
    setScore(0);
    setTimeLeft(10);
    setGameState('playing');
    setIsPaused(false);
    setSelectedOption(null);
    setFeedback(null);
  };

  const stopGame = () => {
    setGameState('idle');
    setIsPaused(false);
  };

  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  const currentWord = shuffledCards[currentIndex];

  useEffect(() => {
    if (!currentWord) {
      setCurrentOptions([]);
      return;
    }
    
    const flatAll = [...Object.values(FLASHCARDS).flat(), ...customWords];
    const unique = Array.from(new Map(flatAll.map(item => [item.en, item])).values());
    
    const others = unique
      .filter(c => c.en !== currentWord.en)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    const newOptions = [currentWord, ...others].sort(() => Math.random() - 0.5);
    setCurrentOptions(newOptions);
  }, [currentWord, customWords]);

  const handleNext = useCallback(() => {
    if (currentIndex + 1 < shuffledCards.length) {
      setCurrentIndex(prev => prev + 1);
      setTimeLeft(10);
      setSelectedOption(null);
      setFeedback(null);
    } else {
      setGameState('result');
    }
  }, [currentIndex, shuffledCards.length]);

  const handleSkip = () => {
    if (selectedOption || gameState !== 'playing' || isPaused) return;
    setSelectedOption('skipped');
    setFeedback('wrong');
    setTimeout(handleNext, 800);
  };

  useEffect(() => {
    if (gameState !== 'playing' || selectedOption || isPaused) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setFeedback('wrong');
          setSelectedOption('timeout');
          setTimeout(handleNext, 1500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, selectedOption, isPaused, handleNext]);

  const handleSelect = (option: string) => {
    if (selectedOption || gameState !== 'playing' || isPaused) return;
    
    setSelectedOption(option);
    if (option === currentWord.pt) {
      setScore(prev => prev + 1);
      setFeedback('correct');
      onSpeech(currentWord.en);
    } else {
      setFeedback('wrong');
    }

    setTimeout(handleNext, 1500);
  };

  if (gameState === 'idle') {
    const cardsAvailable = getCardsForCategory();
    const isCategoryEmpty = cardsAvailable.length === 0;
    const catInfo = CATEGORIES.find(c => c.id === category) || 
                   (category === 'difficult' ? { label: 'Difíceis', icon: '⚡' } : 
                    (category === 'mastered' ? { label: 'Aprendidas', icon: '✅' } :
                    (category.toString().startsWith('list_') ? { label: 'Minha Lista', icon: '📝' } : { label: 'Geral', icon: '🎯' })));

    return (
      <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 text-center animate-fadeIn">
        <div className="w-24 h-24 bg-indigo-50 rounded-3xl flex items-center justify-center text-4xl shadow-inner border border-white mx-auto mb-8">
          {catInfo.icon}
        </div>
        <h2 className="text-3xl font-black text-slate-800 mb-2">Quiz Rápido</h2>
        <p className="text-slate-400 text-sm font-medium mb-10 uppercase tracking-widest">Tema: {catInfo.label}</p>
        <div className="space-y-4">
          {isCategoryEmpty ? (
            <div className="py-4">
              <p className="text-slate-400 text-xs italic mb-2">Nenhuma palavra nesta lista.</p>
            </div>
          ) : (
            <button onClick={startGame} className="w-full py-5 bg-indigo-600 text-white rounded-[1.8rem] font-black uppercase text-xs shadow-xl active:scale-95 flex items-center justify-center space-x-3">
              <i className="fas fa-play text-[10px]"></i>
              <span>Iniciar ({cardsAvailable.length})</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (gameState === 'result') {
    return (
      <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 text-center animate-fadeIn">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mx-auto mb-6">
          <i className="fas fa-trophy text-3xl"></i>
        </div>
        <h2 className="text-3xl font-black text-slate-800 mb-2">Fim de Jogo!</h2>
        <div className="text-6xl font-black text-indigo-600 mb-10">{score} <span className="text-2xl text-slate-300 font-light">/ {shuffledCards.length}</span></div>
        <button onClick={() => setGameState('idle')} className="w-full py-5 bg-slate-900 text-white rounded-[1.8rem] font-black uppercase text-xs">
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md flex flex-col items-center relative">
      <div className="w-full flex justify-between items-center mb-6 px-2">
        <div className="flex space-x-2">
          <button onClick={stopGame} className="px-4 py-2 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase text-slate-400"><i className="fas fa-stop mr-2"></i> Sair</button>
          <button onClick={togglePause} className="px-4 py-2 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase text-indigo-600"><i className={`fas ${isPaused ? 'fa-play' : 'fa-pause'} mr-2`}></i> {isPaused ? 'Recomeçar' : 'Pausa'}</button>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score</span>
          <span className="text-xl font-black text-indigo-600 leading-none">{score}</span>
        </div>
      </div>

      <div className="w-full relative">
        {isPaused && (
          <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-md rounded-[2.5rem] flex flex-col items-center justify-center border border-slate-200 shadow-2xl animate-fadeIn">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">Pausado</h3>
            <button onClick={togglePause} className="mt-6 px-8 py-3 bg-indigo-600 text-white rounded-full font-black uppercase text-[10px]">Retomar</button>
          </div>
        )}

        <div className="w-full bg-white rounded-[2.5rem] p-12 shadow-xl border border-slate-50 text-center mb-6 relative overflow-hidden">
          {feedback && (
            <div className={`absolute inset-0 z-10 flex items-center justify-center ${feedback === 'correct' ? 'bg-emerald-500/90' : 'bg-red-500/90'}`}>
              <i className={`fas ${feedback === 'correct' ? 'fa-check' : 'fa-times'} text-white text-7xl animate-bounce`}></i>
            </div>
          )}
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-6 block">English</span>
          <h2 className={`text-5xl font-black text-slate-800 transition-all ${isPaused ? 'blur-lg' : ''}`}>
            {currentWord?.en}
          </h2>
          <div className="mt-8 flex items-center justify-center space-x-6">
             <div className="text-[10px] text-slate-300 font-black uppercase tracking-[0.2em] bg-slate-50 py-2 px-4 rounded-full">
               {currentIndex + 1} / {shuffledCards.length}
             </div>
             <div className={`text-sm font-black ${timeLeft < 4 ? 'text-red-500 animate-pulse' : 'text-indigo-600'}`}>
                {timeLeft}s
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 w-full mb-8">
          {currentOptions.map((opt, idx) => (
            <button
              key={idx}
              disabled={!!selectedOption || isPaused}
              onClick={() => handleSelect(opt.pt)}
              className={`w-full p-6 rounded-[1.5rem] text-left font-bold transition-all border-2 ${
                selectedOption === opt.pt
                  ? opt.pt === currentWord.pt ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-red-500 border-red-500 text-white'
                  : selectedOption && opt.pt === currentWord.pt ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-50 text-slate-600 shadow-sm'
              }`}
            >
              <span className="text-lg">{opt.pt}</span>
            </button>
          ))}
        </div>
      </div>

      <button onClick={handleSkip} disabled={!!selectedOption || isPaused} className="flex items-center space-x-2 text-[11px] font-black uppercase text-slate-400">
        <span>Não sei</span>
        <i className="fas fa-forward"></i>
      </button>
    </div>
  );
};