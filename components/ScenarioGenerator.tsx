
import React, { useState, useEffect } from 'react';
import { getMnemonicScenario, generateMnemonicImage, MnemonicData } from '../services/gemini';

interface ScenarioGeneratorProps {
  word: string;
}

export const ScenarioGenerator: React.FC<ScenarioGeneratorProps> = ({ word }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MnemonicData | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const fetchScenario = async () => {
    if (word === 'Empty' || word === 'Vazio') return;
    setLoading(true);
    setData(null);
    setImageUrl(null);
    try {
      const mnemonic = await getMnemonicScenario(word);
      setData(mnemonic);
      
      const img = await generateMnemonicImage(mnemonic.visualPrompt);
      if (img) setImageUrl(img);
    } catch (error) {
      console.error("Error fetching scenario:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setData(null);
    setImageUrl(null);
  }, [word]);

  if (!data && !loading) {
    return (
      <button 
        onClick={fetchScenario}
        className="w-full h-20 flex items-center justify-center space-x-3 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-6 rounded-2xl shadow-sm transition-all transform hover:scale-[1.02] active:scale-[0.98]"
      >
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
           <i className="fas fa-brain text-sm"></i>
        </div>
        <span className="text-sm font-semibold tracking-wide">Gerar Memorização Visual</span>
      </button>
    );
  }

  return (
    <div className="w-full max-w-2xl bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border border-white/5 animate-fadeIn overflow-hidden relative">
      <div className="absolute top-0 right-0 p-6 opacity-10">
        <i className="fas fa-sparkles text-6xl text-white"></i>
      </div>

      <div className="flex items-center space-x-4 mb-8 relative z-10">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
          <i className="fas fa-brain"></i>
        </div>
        <div>
          <h4 className="text-white font-bold text-lg">Cenário Mnemônico</h4>
          <p className="text-[10px] text-indigo-400 uppercase font-black tracking-widest">IA Generativa Ativada</p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest animate-pulse">Consultando a IA...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 block">Cenário (Inglês)</span>
              <p className="text-white text-lg font-medium leading-relaxed italic">
                "{data?.scenarioEn}"
              </p>
            </div>
            
            <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2 block">Tradução (Português)</span>
              <p className="text-slate-300 text-sm leading-relaxed">
                {data?.scenarioPt}
              </p>
            </div>
          </div>

          <div className="relative group">
            {imageUrl ? (
              <div className="relative aspect-square overflow-hidden rounded-[2.5rem] border-2 border-white/10 shadow-2xl">
                <img 
                  src={imageUrl} 
                  alt="IA Mnemonic" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
            ) : (
              <div className="aspect-square bg-white/5 rounded-[2.5rem] border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-center p-6">
                <i className="fas fa-image text-3xl text-white/10 mb-3"></i>
                <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest">Criando Imagem...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
