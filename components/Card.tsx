
import React from 'react';
import { Flashcard, CardMode } from '../types';

interface CardProps {
  card: Flashcard;
  isFlipped: boolean;
  isDifficult: boolean;
  onFlip: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onToggleDifficult: (e: React.MouseEvent) => void;
  onSpeech: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  isSpeaking: boolean;
  currentIndex: number;
  total: number;
  mode: CardMode;
  isTrainingMode?: boolean;
  isCustomCard?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  card, 
  isFlipped, 
  isDifficult,
  onFlip, 
  onToggleFavorite,
  onToggleDifficult,
  onSpeech, 
  onDelete,
  isSpeaking, 
  currentIndex, 
  total,
  mode,
  isTrainingMode = false,
  isCustomCard = false
}) => {
  const getFontSizeClass = (text: string) => {
    if (text.length > 25) return 'text-xl md:text-2xl';
    if (text.length > 15) return 'text-2xl md:text-3xl';
    return 'text-3xl md:text-5xl';
  };

  const frontText = mode === 'pt-en' ? card.pt : card.en;
  const backText = mode === 'pt-en' ? card.en : card.pt;
  const frontLabel = mode === 'pt-en' ? 'Português' : 'English';
  const backLabel = mode === 'pt-en' ? 'English' : 'Português';

  return (
    <div className="card-container w-full max-w-sm h-72 md:h-80 perspective-1000 cursor-pointer group" onClick={onFlip}>
      <div className={`card relative w-full h-full transition-transform duration-700 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        
        {/* Face Frontal */}
        <div className="front absolute inset-0 backface-hidden flex flex-col items-center justify-center bg-white rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.04)] border border-slate-100 p-6 text-center transition-all group-hover:shadow-[0_40px_80px_rgba(0,0,0,0.06)]">
          {isCustomCard && (
            <button 
              onClick={onDelete}
              className="absolute top-6 left-7 text-slate-200 hover:text-red-400 transition-colors p-2"
              title="Remover"
            >
              <i className="fas fa-trash-alt"></i>
            </button>
          )}

          {!isTrainingMode && !isCustomCard && (
            <button 
              onClick={onToggleDifficult}
              className={`absolute top-6 left-7 text-xl transition-all transform active:scale-90 p-2 ${isDifficult ? 'text-indigo-500' : 'text-slate-200'}`}
            >
              <i className="fas fa-bolt"></i>
            </button>
          )}

          {isTrainingMode && (
            <button 
              onClick={onToggleFavorite}
              className="absolute top-5 left-7 flex flex-col items-center text-emerald-500 transition-all p-2 z-10"
            >
              <i className="fas fa-check-circle text-2xl"></i>
              <span className="block text-[8px] font-black uppercase mt-1">Aprendi</span>
            </button>
          )}

          {/* Botão de Pronúncia na Face Frontal - Sempre visível no topo direito */}
          <button
            onClick={onSpeech}
            disabled={isSpeaking}
            className={`absolute top-5 right-7 w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 transform active:scale-90 shadow-sm border z-10 ${
              isSpeaking 
              ? 'bg-slate-50 text-slate-300' 
              : 'bg-indigo-50 text-indigo-600 border-indigo-100'
            }`}
          >
            {isSpeaking ? (
              <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            ) : (
              <i className="fas fa-volume-up text-lg"></i>
            )}
          </button>

          <div className="absolute top-7 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-slate-50 rounded-full text-[9px] font-bold text-slate-400 tracking-[0.2em] uppercase">
            {frontLabel}
          </div>
          
          <h2 className={`${getFontSizeClass(frontText)} font-light text-slate-800 tracking-tight transition-all duration-300 px-4 mt-4`}>
            {frontText}
          </h2>
          
          <div className="mt-6 flex items-center space-x-2 text-indigo-400 opacity-60">
            <i className="fas fa-sync-alt text-[10px] animate-spin-slow"></i>
            <span className="text-[9px] font-bold uppercase tracking-widest">Toque para ver tradução</span>
          </div>

          <div className="absolute bottom-7 text-[9px] text-slate-300 font-bold tracking-[0.3em] uppercase">
            {currentIndex + 1} / {total}
          </div>
        </div>

        {/* Face Traseira */}
        <div className="back absolute inset-0 backface-hidden rotate-y-180 flex flex-col items-center justify-center bg-indigo-600 rounded-[2.5rem] shadow-2xl p-6 text-center overflow-hidden border border-indigo-500">
          <div className="absolute top-7 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-white/10 rounded-full text-[9px] font-bold text-white/70 tracking-[0.2em] uppercase border border-white/10">
            {backLabel}
          </div>
          
          <h2 className={`${getFontSizeClass(backText)} font-bold text-white tracking-tight drop-shadow-md transition-all duration-300 px-4`}>
            {backText}
          </h2>

          <div className="mt-8 flex items-center space-x-2 text-white/40">
            <i className="fas fa-sync-alt text-[10px] opacity-50"></i>
            <span className="text-[9px] font-bold uppercase tracking-widest">Toque para voltar</span>
          </div>
        </div>
      </div>
    </div>
  );
};
