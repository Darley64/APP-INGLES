
import React, { useState, useEffect } from 'react';
import { AIExplanation } from '../types';
import { getWordExplanation } from '../services/gemini';

interface AITutorProps {
  word: string;
  category: string;
}

export const AITutor: React.FC<AITutorProps> = ({ word, category }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AIExplanation | null>(null);

  const fetchExplanation = async () => {
    setLoading(true);
    try {
      const res = await getWordExplanation(word, category);
      setData(res);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setData(null);
  }, [word]);

  if (!data && !loading) {
    return (
      <button 
        onClick={fetchExplanation}
        className="w-full h-20 flex items-center justify-center space-x-3 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-6 rounded-2xl shadow-sm transition-all transform hover:scale-[1.02] active:scale-[0.98]"
      >
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
           <i className="fas fa-magic text-sm"></i>
        </div>
        <span className="text-sm font-semibold tracking-wide">Insights da IA</span>
      </button>
    );
  }

  return (
    <div className="w-full max-w-2xl bg-white rounded-[2rem] p-8 shadow-[0_15px_40px_rgba(0,0,0,0.03)] border border-slate-100 animate-fadeIn">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <i className="fas fa-wand-magic-sparkles"></i>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Assistente de Contexto</h3>
            <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Gemini Powered Insight</p>
          </div>
        </div>
        {loading && <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>}
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center">
          <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
             <div className="h-full bg-indigo-500 w-1/3 animate-[progress_2s_infinite]"></div>
          </div>
          <p className="mt-4 text-xs font-bold text-slate-300 tracking-[0.2em] uppercase">Analisando contexto...</p>
        </div>
      ) : data ? (
        <div className="space-y-8">
          <div className="relative">
            <div className="absolute -left-4 top-0 bottom-0 w-1 bg-indigo-500/20 rounded-full"></div>
            <p className="text-slate-600 leading-relaxed text-md pl-4">
              {data.explanation}
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-[10px] font-bold text-indigo-400 tracking-[0.2em] uppercase">
               <i className="fas fa-bookmark"></i>
               <span>Exemplos Práticos</span>
            </div>
            <div className="grid gap-4">
              {data.examples.map((ex, idx) => (
                <div key={idx} className="group p-4 bg-slate-50 hover:bg-white border border-transparent hover:border-slate-100 rounded-2xl transition-all">
                  <p className="text-slate-700 text-sm italic leading-relaxed font-medium">
                    {ex}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
};
