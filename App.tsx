
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { CATEGORIES, FLASHCARDS } from './constants';
import { CategoryKey, Flashcard, AppMode, CardMode, UserStats, CustomList, AIExplanation } from './types';
import { Card } from './components/Card';
import { AITutor } from './components/AITutor';
import { GuessingGame } from './components/GuessingGame';
import { ScenarioGenerator } from './components/ScenarioGenerator';
import { generateSpeech, getWordFromWeb } from './services/gemini';
import { playPCM, speakWithDeviceVoice } from './utils/audio';

// Firebase Imports
import { auth, db } from './services/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  User 
} from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  getDoc
} from 'firebase/firestore';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');

  // App State
  const [appMode, setAppMode] = useState<AppMode>('study');
  const [trainingSubMode, setTrainingSubMode] = useState<'cards' | 'quiz' | 'select'>('select');
  const [trainingSource, setTrainingSource] = useState<'difficult' | 'mastered'>('difficult');
  const [cardMode, setCardMode] = useState<CardMode>('en-pt');
  const [currentCategory, setCurrentCategory] = useState<CategoryKey>('verbs_essentials');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('syncing');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);

  const [showNewListModal, setShowNewListModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newWordEn, setNewWordEn] = useState('');
  const [newWordPt, setNewWordPt] = useState('');

  const [stats, setStats] = useState<UserStats>({
    masteredWords: [],
    favoriteWords: [],
    difficultWords: [],
    customLists: [],
    streak: 0,
    lastStudyDate: new Date().toLocaleDateString()
  });

  // Monitorar estado de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const updateNetworkStatus = () => setSyncStatus(navigator.onLine ? 'syncing' : 'offline');
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    updateNetworkStatus();
    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, []);

  // Sincronizar dados do Firestore em tempo real
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    
    const unsubscribe = onSnapshot(userDocRef, { includeMetadataChanges: true }, (docSnap) => {
      setSyncStatus(docSnap.metadata.fromCache ? 'offline' : 'synced');
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStats({
          masteredWords: data.masteredWords || [],
          favoriteWords: data.favoriteWords || [],
          difficultWords: data.difficultWords || [],
          customLists: data.customLists || [],
          streak: data.streak || 0,
          lastStudyDate: data.lastStudyDate || new Date().toLocaleDateString()
        });
      } else {
        const initialStats: UserStats = {
          masteredWords: [],
          favoriteWords: [],
          difficultWords: [],
          customLists: [],
          streak: 0,
          lastStudyDate: new Date().toLocaleDateString()
        };
        setDoc(userDocRef, initialStats).catch(err => console.error("Erro ao criar perfil:", err));
      }
    }, (error) => {
      console.error("Erro no Firestore Snapshot:", error);
      setSyncStatus('offline');
    });

    return () => unsubscribe();
  }, [user]);

  const syncStats = async (newStats: UserStats) => {
    if (!user) return;
    try {
      setSyncStatus(navigator.onLine ? 'syncing' : 'offline');
      await setDoc(doc(db, "users", user.uid), newStats);
    } catch (e) {
      console.error("Erro ao sincronizar dados:", e);
      setSyncStatus('offline');
    }
  };

  const translateError = (code: string) => {
    switch (code) {
      case 'auth/invalid-credential': return 'E-mail ou senha incorretos.';
      case 'auth/user-not-found': return 'Usuário não encontrado.';
      case 'auth/wrong-password': return 'Senha incorreta.';
      case 'auth/email-already-in-use': return 'Este e-mail já está em uso.';
      case 'auth/weak-password': return 'A senha deve ter pelo menos 6 caracteres.';
      case 'auth/invalid-email': return 'E-mail inválido.';
      case 'auth/operation-not-allowed': return 'Login não ativado no Console.';
      default: return 'Erro ao autenticar. Tente novamente.';
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err: any) {
      setAuthError(translateError(err.code));
    }
  };

  const handleLogout = () => {
    setStats({
      masteredWords: [],
      favoriteWords: [],
      difficultWords: [],
      customLists: [],
      streak: 0,
      lastStudyDate: new Date().toLocaleDateString()
    });
    signOut(auth);
  };

  const activeCustomList = useMemo(() => {
    const lists = stats?.customLists || [];
    return lists.find(l => l.id === currentCategory);
  }, [stats?.customLists, currentCategory]);

  const allWordsFlattened = useMemo(() => {
    const defaultWords = Object.values(FLASHCARDS).flat();
    const customWords = (stats?.customLists || []).flatMap(l => l.words || []);
    const combined = [...defaultWords, ...customWords];
    return Array.from(new Map(combined.map(w => [w.en, w])).values());
  }, [stats?.customLists]);

  const filteredFlashcards = useMemo(() => {
    const mastered = stats?.masteredWords || [];
    const difficult = stats?.difficultWords || [];

    if (!searchQuery.trim()) {
      if (appMode === 'training') {
        const sourceWords = trainingSource === 'difficult' ? difficult : mastered;
        return allWordsFlattened.filter(f => sourceWords.includes(f.en));
      }
      if (activeCustomList) return activeCustomList.words || [];
      return FLASHCARDS[currentCategory] || [];
    }
    return allWordsFlattened.filter(w => 
      w.en.toLowerCase().includes(searchQuery.toLowerCase()) || 
      w.pt.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, currentCategory, appMode, trainingSource, stats, allWordsFlattened, activeCustomList]);

  const [shuffledCards, setShuffledCards] = useState<Flashcard[]>([]);

  useEffect(() => {
    setShuffledCards(filteredFlashcards);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [filteredFlashcards]);

  const currentFlashcard = useMemo(() => {
    if (shuffledCards.length > 0 && shuffledCards[currentIndex]) {
      return shuffledCards[currentIndex];
    }
    return { pt: 'Vazio', en: 'Empty' };
  }, [shuffledCards, currentIndex]);

  const handleMarkCategoryLearned = () => {
    const cards = activeCustomList ? activeCustomList.words : (FLASHCARDS[currentCategory] || []);
    if (cards.length === 0) return;
    const ens = cards.map(c => c.en);
    const newStats = {
      ...stats,
      masteredWords: Array.from(new Set([...stats.masteredWords, ...ens])),
      difficultWords: stats.difficultWords.filter(w => !ens.includes(w))
    };
    setStats(newStats);
    syncStats(newStats);
  };

  const handleWebSearch = async () => {
    if (!searchQuery.trim() || isSearchingWeb) return;
    setIsSearchingWeb(true);
    try {
      const data: AIExplanation = await getWordFromWeb(searchQuery);
      const newCard: Flashcard = { en: searchQuery, pt: data.explanation.split('.')[0] || searchQuery };
      if (activeCustomList) {
        const newStats = {
          ...stats,
          customLists: stats.customLists.map(l => l.id === activeCustomList.id ? { ...l, words: [newCard, ...(l.words || [])] } : l)
        };
        setStats(newStats);
        syncStats(newStats);
      } else {
        alert(`IA encontrou: ${newCard.pt}\nAbra uma lista personalizada para salvar.`);
      }
      setSearchQuery('');
    } catch (err) {
      alert("Erro ao buscar na web.");
    } finally {
      setIsSearchingWeb(false);
    }
  };

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    const newList: CustomList = { id: `list_${Date.now()}`, name: newListName.trim(), icon: '📝', words: [] };
    const newStats = { ...stats, customLists: [...(stats.customLists || []), newList] };
    setStats(newStats);
    syncStats(newStats);
    setCurrentCategory(newList.id);
    setNewListName('');
    setShowNewListModal(false);
  };

  const handleDeleteList = () => {
    if (!activeCustomList) return;
    const newStats = { ...stats, customLists: stats.customLists.filter(list => list.id !== activeCustomList.id) };
    setStats(newStats);
    syncStats(newStats);
    setCurrentCategory('verbs_essentials');
    setShowManageModal(false);
  };

  const handleAddWordToList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWordEn.trim() || !newWordPt.trim() || !activeCustomList) return;
    const newCard: Flashcard = { en: newWordEn.trim(), pt: newWordPt.trim() };
    const newStats = {
      ...stats,
      customLists: (stats.customLists || []).map(l => l.id === activeCustomList.id ? { ...l, words: [newCard, ...(l.words || [])] } : l)
    };
    setStats(newStats);
    syncStats(newStats);
    setNewWordEn('');
    setNewWordPt('');
    setCurrentIndex(0);
  };

  const handleRemoveWordFromList = (en: string) => {
    if (!activeCustomList) return;
    const newStats = {
      ...stats,
      customLists: (stats.customLists || []).map(l => l.id === activeCustomList.id ? { ...l, words: (l.words || []).filter(w => w.en !== en) } : l)
    };
    setStats(newStats);
    syncStats(newStats);
  };

  const handleToggleDifficult = useCallback((word: string) => {
    if (word === 'Empty') return;
    const difficult = stats?.difficultWords || [];
    const mastered = stats?.masteredWords || [];
    const isNowDifficult = !difficult.includes(word);
    
    const newStats = {
      ...stats,
      difficultWords: isNowDifficult ? [...difficult, word] : difficult.filter(w => w !== word),
      masteredWords: mastered.filter(w => w !== word)
    };
    setStats(newStats);
    syncStats(newStats);
  }, [stats, user]);

  const handleToggleMastered = useCallback((word: string) => {
    if (word === 'Empty') return;
    const difficult = stats?.difficultWords || [];
    const mastered = stats?.masteredWords || [];
    const isNowMastered = !mastered.includes(word);
    
    const newStats = {
      ...stats,
      masteredWords: isNowMastered ? [...mastered, word] : mastered.filter(w => w !== word),
      difficultWords: difficult.filter(w => w !== word)
    };
    setStats(newStats);
    syncStats(newStats);
    handleNext();
  }, [stats, shuffledCards.length, user]);

  const handleNext = useCallback(() => {
    if (shuffledCards.length === 0) return;
    setIsFlipped(false);
    setTimeout(() => { setCurrentIndex((prev) => (prev + 1) % shuffledCards.length); }, 150);
  }, [shuffledCards.length]);

  const handlePrev = useCallback(() => {
    if (shuffledCards.length === 0) return;
    setIsFlipped(false);
    setTimeout(() => { setCurrentIndex((prev) => (prev - 1 + shuffledCards.length) % shuffledCards.length); }, 150);
  }, [shuffledCards.length]);

  const handleShuffle = useCallback(() => {
    if (filteredFlashcards.length === 0) return;
    const newOrder = [...filteredFlashcards].sort(() => Math.random() - 0.5);
    setShuffledCards(newOrder);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [filteredFlashcards]);

  const handleSpeech = async (text: string) => {
    if (isSpeaking || text === 'Empty') return;
    setIsSpeaking(true);
    try {
      // Sem rede, a voz instalada no aparelho mantém a pronúncia disponível.
      if (!navigator.onLine) {
        await speakWithDeviceVoice(text);
        return;
      }

      const audioData = await generateSpeech(text);
      if (audioData) {
        await playPCM(audioData);
      } else {
        await speakWithDeviceVoice(text);
      }
    } catch (err) {
      console.error(err);
      try {
        await speakWithDeviceVoice(text);
      } catch (voiceError) {
        console.error(voiceError);
      }
    } finally {
      setIsSpeaking(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-10 shadow-2xl text-center animate-fadeIn">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-8 shadow-xl">
            <i className="fas fa-brain text-3xl"></i>
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Memorize Pro</h2>
          <p className="text-slate-400 text-sm font-medium mb-8">
            {isRegistering ? 'Crie sua conta' : 'Entre na sua conta'}
          </p>
          
          <form onSubmit={handleAuth} className="space-y-4 text-left">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-1 block">E-mail</label>
              <input 
                type="email" 
                placeholder="exemplo@email.com" 
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-indigo-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-1 block">Senha</label>
              <input 
                type="password" 
                placeholder="••••••" 
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-indigo-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {authError && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                <p className="text-red-600 text-[10px] font-black uppercase text-center">{authError}</p>
              </div>
            )}
            <button 
              type="submit"
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase shadow-lg active:scale-95 transition-transform"
            >
              {isRegistering ? 'Criar Conta' : 'Acessar App'}
            </button>
          </form>
          
          <button 
            onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }}
            className="mt-6 text-[10px] font-black text-indigo-600 uppercase tracking-widest"
          >
            {isRegistering ? 'Já tenho conta' : 'Criar uma nova conta'}
          </button>
        </div>
      </div>
    );
  }

  const categoriesWithDynamic = [...((stats?.customLists || []).map(l => ({ id: l.id, label: l.name, icon: l.icon }))), ...CATEGORIES];
  const activeCategoryInfo = categoriesWithDynamic.find(c => c.id === currentCategory) || categoriesWithDynamic[0];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center">
        <div className="flex flex-col">
          <h1 className="text-xl font-black tracking-tight text-slate-900">
            Memorize <span className="text-indigo-600">Pro</span>
          </h1>
          <span className={`text-[8px] font-black uppercase tracking-widest ${syncStatus === 'synced' ? 'text-emerald-500' : syncStatus === 'offline' ? 'text-amber-500' : 'text-slate-400'}`}>
            {syncStatus === 'synced' ? 'Sincronizado' : syncStatus === 'offline' ? 'Modo offline' : 'Sincronizando'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {/* Contagem de Difíceis Restaurada */}
          <div className="flex items-center space-x-1 bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-100">
            <i className="fas fa-bolt text-amber-500 text-[10px]"></i>
            <span className="text-[10px] font-black text-amber-900">{stats?.difficultWords?.length || 0}</span>
          </div>
          {/* Contagem de Aprendidas */}
          <div className="flex items-center space-x-1 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-100">
            <i className="fas fa-check-circle text-emerald-500 text-[10px]"></i>
            <span className="text-[10px] font-black text-emerald-900">{stats?.masteredWords?.length || 0}</span>
          </div>
          <button onClick={handleLogout} className="text-slate-300 hover:text-red-500 transition-colors p-1.5">
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-32 px-4 pt-6 max-w-2xl mx-auto w-full">
        <div className="mb-6 space-y-3">
          <div className="relative group">
            <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors"></i>
            <input 
              type="text" 
              placeholder="Buscar em todas as listas..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-6 text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
            />
          </div>
          {searchQuery && filteredFlashcards.length === 0 && (
            <button onClick={handleWebSearch} disabled={isSearchingWeb} className="w-full py-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl text-xs font-black uppercase flex items-center justify-center space-x-2">
              {isSearchingWeb ? <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div> : <><i className="fas fa-globe"></i><span>Buscar na Web</span></>}
            </button>
          )}
        </div>

        {appMode !== 'training' && !searchQuery && (
          <div className="mb-8 space-y-4">
            <div className="flex justify-between items-center px-1">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tópico Ativo</span>
               <button onClick={() => setShowNewListModal(true)} className="text-[10px] font-black text-indigo-600 uppercase">+ Criar Lista</button>
            </div>
            <select value={currentCategory} onChange={(e) => setCurrentCategory(e.target.value as CategoryKey)} className="w-full bg-white border border-slate-200 text-slate-700 font-bold py-3.5 px-5 rounded-2xl shadow-sm appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20">
              {categoriesWithDynamic.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>
              ))}
            </select>
          </div>
        )}

        {appMode === 'training' && trainingSubMode === 'select' && (
          <div className="space-y-4 animate-fadeIn">
            <h2 className="text-xl font-black text-slate-800 mb-6 text-center">Área de Treino</h2>
            <button onClick={() => { setTrainingSource('difficult'); setTrainingSubMode('cards'); }} className="w-full p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm flex items-center space-x-6">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600"><i className="fas fa-bolt text-2xl"></i></div>
              <div className="text-left"><h4 className="font-black text-slate-800 uppercase text-xs">Revisar Difíceis</h4><span className="text-[10px] font-black text-indigo-500">{stats?.difficultWords?.length || 0} palavras</span></div>
            </button>
            <button onClick={() => { setTrainingSource('mastered'); setTrainingSubMode('cards'); }} className="w-full p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm flex items-center space-x-6">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600"><i className="fas fa-check-double text-2xl"></i></div>
              <div className="text-left"><h4 className="font-black text-slate-800 uppercase text-xs">Treinar Aprendidas</h4><span className="text-[10px] font-black text-emerald-500">{stats?.masteredWords?.length || 0} palavras</span></div>
            </button>
            <button onClick={() => setAppMode('study')} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">Voltar</button>
          </div>
        )}

        {showNewListModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl animate-fadeIn">
              <h3 className="text-xl font-black text-slate-800 mb-6">Nova Lista</h3>
              <form onSubmit={handleCreateList} className="space-y-4">
                <input autoFocus type="text" placeholder="Ex: Viagem" value={newListName} onChange={e => setNewListName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-indigo-500" />
                <div className="flex space-x-3">
                  <button type="button" onClick={() => setShowNewListModal(false)} className="flex-1 py-4 text-xs font-black uppercase text-slate-400">Fechar</button>
                  <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase shadow-lg shadow-indigo-200">Criar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeCustomList && appMode === 'study' && !searchQuery && (
          <div className="bg-indigo-600 p-6 rounded-[2rem] shadow-xl shadow-indigo-100 mb-8 text-white">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-xs font-black uppercase">+ Adicionar Palavra</h3>
               <button onClick={() => setShowManageModal(true)} className="text-[10px] font-bold bg-white/20 px-3 py-1 rounded-full">Gerenciar</button>
             </div>
             <form onSubmit={handleAddWordToList} className="space-y-3">
               <input type="text" placeholder="English" value={newWordEn} onChange={e => setNewWordEn(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-xl py-3 px-4 text-sm placeholder:text-white/50 outline-none focus:bg-white/20" />
               <input type="text" placeholder="Português" value={newWordPt} onChange={e => setNewWordPt(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-xl py-3 px-4 text-sm placeholder:text-white/50 outline-none focus:bg-white/20" />
               <button type="submit" className="w-full bg-white text-indigo-600 rounded-xl py-3 font-black uppercase text-xs">Salvar</button>
             </form>
          </div>
        )}

        <section className="flex flex-col items-center">
          {((appMode === 'study' || searchQuery) || (appMode === 'training' && trainingSubMode === 'cards')) ? (
            <div className="w-full flex flex-col items-center space-y-8">
              {shuffledCards.length === 0 ? (
                <div className="py-16 text-center bg-white border border-slate-100 rounded-[2.5rem] w-full px-10 shadow-sm animate-fadeIn">
                  <p className="text-sm text-slate-400 font-medium">Nenhum resultado encontrado.</p>
                </div>
              ) : (
                <>
                  <div className="flex space-x-3">
                    <button onClick={() => setCardMode(prev => prev === 'pt-en' ? 'en-pt' : 'pt-en')} className="px-6 py-3 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                      {cardMode === 'pt-en' ? 'PT ➔ EN' : 'EN ➔ PT'}
                    </button>
                    {appMode === 'study' && !searchQuery && (
                      <button onClick={handleMarkCategoryLearned} className="px-6 py-3 bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center space-x-2">
                        <i className="fas fa-check-double"></i>
                        <span>Aprendi Lista</span>
                      </button>
                    )}
                    {appMode === 'training' && (
                      <button onClick={() => setTrainingSubMode('quiz')} className="px-6 py-3 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full text-[10px] font-black uppercase tracking-widest">
                        Modo Quiz
                      </button>
                    )}
                  </div>
                  
                  <Card 
                    card={currentFlashcard} 
                    isFlipped={isFlipped} 
                    isDifficult={(stats?.difficultWords || []).includes(currentFlashcard.en)} 
                    onFlip={() => setIsFlipped(!isFlipped)} 
                    onToggleFavorite={(e) => { e.stopPropagation(); handleToggleMastered(currentFlashcard.en); }} 
                    onToggleDifficult={(e) => { e.stopPropagation(); handleToggleDifficult(currentFlashcard.en); }} 
                    onSpeech={(e) => { e.stopPropagation(); handleSpeech(currentFlashcard.en); }} 
                    onDelete={(e) => { e.stopPropagation(); handleRemoveWordFromList(currentFlashcard.en); }} 
                    isSpeaking={isSpeaking} 
                    currentIndex={currentIndex} 
                    total={shuffledCards.length} 
                    mode={cardMode} 
                    isTrainingMode={appMode === 'training'} 
                    isCustomCard={!!activeCustomList} 
                  />

                  <div className="flex items-center space-x-6">
                    <button onClick={handlePrev} className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400"><i className="fas fa-chevron-left"></i></button>
                    <button onClick={handleShuffle} className="w-16 h-16 rounded-3xl bg-indigo-600 text-white shadow-xl flex items-center justify-center active:scale-90 transition-transform"><i className="fas fa-random"></i></button>
                    <button onClick={handleNext} className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400"><i className="fas fa-chevron-right"></i></button>
                  </div>

                  <div className="w-full space-y-4">
                    <AITutor word={currentFlashcard.en} category={activeCategoryInfo?.label || 'Geral'} />
                    <ScenarioGenerator word={currentFlashcard.en} />
                  </div>
                </>
              )}
            </div>
          ) : (
            (appMode === 'game' || (appMode === 'training' && trainingSubMode === 'quiz')) ? (
              <GuessingGame 
                category={appMode === 'training' ? (trainingSource === 'difficult' ? 'difficult' : 'mastered' as any) : currentCategory} 
                favoriteWords={stats?.masteredWords || []} 
                difficultWords={stats?.difficultWords || []} 
                customWords={allWordsFlattened} 
                onToggleFavorite={handleToggleMastered} 
                onToggleDifficult={handleToggleDifficult} 
                onSpeech={handleSpeech} 
              />
            ) : null
          )}
        </section>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bottom-nav-blur border-t border-slate-100 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-20 px-4">
          <button onClick={() => { setAppMode('study'); setTrainingSubMode('select'); setSearchQuery(''); }} className={`flex flex-col items-center justify-center w-full h-full ${appMode === 'study' && !searchQuery ? 'text-indigo-600' : 'text-slate-400'}`}>
            <i className="fas fa-book-open text-xl mb-1"></i>
            <span className="text-[9px] font-black uppercase tracking-tighter">Estudar</span>
          </button>
          <button onClick={() => { setAppMode('game'); setTrainingSubMode('select'); setSearchQuery(''); }} className={`flex flex-col items-center justify-center w-full h-full ${appMode === 'game' ? 'text-indigo-600' : 'text-slate-400'}`}>
            <i className="fas fa-gamepad text-xl mb-1"></i>
            <span className="text-[9px] font-black uppercase tracking-tighter">Quiz</span>
          </button>
          <button onClick={() => { setAppMode('training'); setTrainingSubMode('select'); setSearchQuery(''); }} className={`flex flex-col items-center justify-center w-full h-full ${appMode === 'training' ? 'text-indigo-600' : 'text-slate-400'}`}>
            <i className="fas fa-bolt text-xl mb-1"></i>
            <span className="text-[9px] font-black uppercase tracking-tighter">Treino</span>
          </button>
        </div>
      </nav>

      {showManageModal && activeCustomList && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowManageModal(false)}>
          <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 w-full max-w-sm animate-fadeIn" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black text-slate-800 mb-6 text-center">Opções da Lista</h3>
            <button onClick={handleDeleteList} className="w-full py-5 bg-red-50 text-red-600 rounded-2xl font-black uppercase text-xs mb-3">Excluir Lista</button>
            <button onClick={() => setShowManageModal(false)} className="w-full py-5 text-slate-400 font-black uppercase text-xs">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
