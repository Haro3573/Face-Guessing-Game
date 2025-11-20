import React, { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Language, GamePhase, PhotoEntry, GameState, GameQuestion } from './types';
import { TRANSLATIONS } from './constants';
import { generateDescription } from './services/gemini';
import { saveSession, clearSession } from './services/db';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { Button } from './components/Button';

export default function App() {
  // --- State ---
  const [language, setLanguage] = useState<Language>('en');
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    currentQuestionIndex: 0,
    questions: [],
    startTime: null,
    endTime: null,
  });
  
  // Processing State
  const [processingIndex, setProcessingIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Game Interaction State
  const [currentGuess, setCurrentGuess] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrectGuess, setIsCorrectGuess] = useState(false);

  const t = TRANSLATIONS[language];

  // --- Setup Phase Handlers ---

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newPhotos: PhotoEntry[] = Array.from(event.target.files).map(file => ({
        id: uuidv4(),
        file,
        previewUrl: URL.createObjectURL(file),
        primaryName: '',
        aliases: []
      }));
      
      // Max 10
      const total = [...photos, ...newPhotos].slice(0, 10);
      setPhotos(total);
    }
  };

  const removePhoto = (id: string) => {
    setPhotos(prev => {
      const target = prev.find(p => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(p => p.id !== id);
    });
  };

  const updatePhotoName = (id: string, name: string) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, primaryName: name } : p));
  };

  const updatePhotoAliases = (id: string, aliasesStr: string) => {
    const aliases = aliasesStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, aliases } : p));
  };

  const startProcessing = () => {
    setPhase('processing');
    setProcessingIndex(0);
    setIsProcessing(true);
  };

  // --- Processing Phase Logic ---

  useEffect(() => {
    const processQueue = async () => {
      if (phase !== 'processing' || !isProcessing) return;

      if (processingIndex >= photos.length) {
        // All done
        setIsProcessing(false);
        await saveSession(photos);
        initializeGame();
        return;
      }

      const photo = photos[processingIndex];
      
      // Skip if already described (e.g. retry)
      if (photo.description && photo.isValid) {
        setProcessingIndex(prev => prev + 1);
        return;
      }

      try {
        const result = await generateDescription(photo.file, language);
        
        setPhotos(prev => prev.map(p => {
          if (p.id !== photo.id) return p;
          return {
            ...p,
            description: result.success ? result.text : undefined,
            isValid: result.success && result.text !== "INVALID_IMAGE",
            validationError: !result.success || result.text === "INVALID_IMAGE" ? t.errorNoFace : undefined
          };
        }));

      } catch (err) {
        console.error("Processing error:", err instanceof Error ? err.message : "Unknown error");
        setProcessingError(t.errorGemini);
      } finally {
        setProcessingIndex(prev => prev + 1);
      }
    };

    processQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isProcessing, processingIndex, language]); // photos excluded to avoid loops

  // --- Game Logic ---

  const initializeGame = useCallback(() => {
    // Filter valid photos only
    const validPhotos = photos.filter(p => p.isValid && p.description);
    
    if (validPhotos.length < 1) {
      setPhase('setup');
      alert(t.errorNoFace);
      return;
    }

    // Shuffle
    const shuffled = [...validPhotos].sort(() => Math.random() - 0.5);
    
    const questions: GameQuestion[] = shuffled.map(p => ({
      id: uuidv4(),
      photoEntryId: p.id,
      description: p.description!,
      previewUrl: p.previewUrl,
      correctNames: [p.primaryName, ...p.aliases].map(n => n.toLowerCase().trim())
    }));

    setGameState({
      score: 0,
      currentQuestionIndex: 0,
      questions,
      startTime: Date.now(),
      endTime: null
    });

    setPhase('game');
  }, [photos, t.errorNoFace]);

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const currentQ = gameState.questions[gameState.currentQuestionIndex];
    const normalizedGuess = currentGuess.toLowerCase().trim();
    
    const isCorrect = currentQ.correctNames.includes(normalizedGuess);
    
    setIsCorrectGuess(isCorrect);
    setShowFeedback(true);

    // Update current question state
    const updatedQuestions = [...gameState.questions];
    updatedQuestions[gameState.currentQuestionIndex] = {
      ...currentQ,
      userAnswer: currentGuess,
      isCorrect
    };

    setGameState(prev => ({
      ...prev,
      questions: updatedQuestions,
      score: isCorrect ? prev.score + 1 : prev.score
    }));
  };

  const nextQuestion = () => {
    setShowFeedback(false);
    setCurrentGuess('');
    
    if (gameState.currentQuestionIndex + 1 >= gameState.questions.length) {
      setGameState(prev => ({ ...prev, endTime: Date.now() }));
      setPhase('results');
    } else {
      setGameState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1
      }));
    }
  };

  const restartGame = async () => {
    await clearSession();
    setPhotos([]);
    setPhase('setup');
  };

  const replayGame = () => {
    initializeGame();
  };

  // --- Clean up ---
  useEffect(() => {
    return () => {
      photos.forEach(p => URL.revokeObjectURL(p.previewUrl));
    };
  }, []); // Run once on unmount

  // --- Renders ---

  const renderHeader = () => (
    <header className="w-full bg-white border-b border-slate-200 p-4 sticky top-0 z-10">
      <div className="max-w-4xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <span className="material-icons text-white text-xl">face</span>
          </div>
          <h1 className="font-bold text-xl text-slate-800 hidden sm:block">{t.title}</h1>
        </div>
        {phase === 'setup' && (
          <LanguageSwitcher current={language} onChange={setLanguage} />
        )}
      </div>
    </header>
  );

  const renderSetup = () => (
    <div className="max-w-2xl mx-auto w-full animate-fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{t.uploadTitle}</h2>
        <p className="text-slate-600 mb-6">{t.uploadDesc}</p>
        
        <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-8 hover:bg-slate-50 transition-colors text-center cursor-pointer group">
          <input 
            type="file" 
            multiple 
            accept="image/*" 
            onChange={handleFileUpload} 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-indigo-600 transition-colors">
            <span className="material-icons text-4xl">cloud_upload</span>
            <span className="font-medium">{t.dropzone}</span>
          </div>
        </div>
      </div>

      {photos.length > 0 && (
        <div className="space-y-4 mb-8">
          {photos.map((photo, idx) => (
            <div key={photo.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex gap-4 items-start animate-slide-up" style={{ animationDelay: `${idx * 50}ms` }}>
              <div className="relative w-20 h-20 flex-shrink-0">
                <img src={photo.previewUrl} alt="Upload" className="w-full h-full object-cover rounded-lg" />
                <button 
                  onClick={() => removePhoto(photo.id)}
                  className="absolute -top-2 -right-2 bg-white text-rose-500 rounded-full p-1 shadow-md hover:bg-rose-50"
                >
                  <span className="material-icons text-sm">close</span>
                </button>
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{t.nameLabel}</label>
                  <input
                    type="text"
                    value={photo.primaryName}
                    onChange={(e) => updatePhotoName(photo.id, e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="e.g. John"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{t.aliasLabel}</label>
                  <input
                    type="text"
                    value={photo.aliases.join(', ')}
                    onChange={(e) => updatePhotoAliases(photo.id, e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="e.g. Johnny, J.Smith"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="sticky bottom-6">
        <Button 
          onClick={startProcessing} 
          disabled={photos.length < 2 || photos.some(p => !p.primaryName)}
          className="w-full shadow-xl"
        >
          <span className="material-icons">play_arrow</span>
          {t.startBtn}
        </Button>
        {photos.length > 0 && photos.length < 2 && (
          <p className="text-center text-amber-600 text-sm mt-2 bg-amber-50 py-1 rounded-md">{t.uploadLimit}</p>
        )}
      </div>
    </div>
  );

  const renderProcessing = () => {
    const progress = (processingIndex / photos.length) * 100;
    
    return (
      <div className="max-w-md mx-auto w-full text-center mt-12">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <span className="material-icons text-indigo-600 text-3xl">psychology</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">{t.processingTitle}</h2>
          <p className="text-slate-500 mb-8">{t.processingDesc}</p>
          
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-4">
            <div 
              className="bg-indigo-600 h-full transition-all duration-500 ease-out" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-slate-400 font-mono">
            {processingIndex} / {photos.length}
          </p>

          {processingError && (
             <div className="mt-4 p-3 bg-rose-50 text-rose-600 rounded-lg text-sm">
               {processingError}
             </div>
          )}
        </div>
      </div>
    );
  };

  const renderGame = () => {
    const question = gameState.questions[gameState.currentQuestionIndex];
    
    return (
      <div className="max-w-xl mx-auto w-full flex flex-col h-[calc(100vh-100px)] justify-between py-4">
        <div className="flex justify-between items-center mb-4 px-2">
          <div className="text-sm font-medium text-slate-500">
            Question {gameState.currentQuestionIndex + 1} / {gameState.questions.length}
          </div>
          <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold">
            Score: {gameState.score}
          </div>
        </div>

        {/* Game Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 flex-1 flex flex-col">
          {/* Image/Content Area */}
          <div className="relative flex-1 bg-slate-50 flex items-center justify-center p-6 overflow-hidden">
             {showFeedback ? (
               <div className="relative w-full h-full animate-fade-in">
                 <img 
                   src={question.previewUrl} 
                   alt="Reveal" 
                   className="w-full h-full object-contain rounded-xl shadow-inner"
                 />
                 <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full font-bold text-white shadow-lg backdrop-blur-md ${isCorrectGuess ? 'bg-green-500/90' : 'bg-rose-500/90'}`}>
                    {isCorrectGuess ? t.correct : `${t.incorrect}: ${question.correctNames[0]}`}
                 </div>
               </div>
             ) : (
               <div className="text-center max-w-md animate-fade-in">
                 <div className="w-16 h-16 bg-white rounded-full shadow-md flex items-center justify-center mx-auto mb-6">
                    <span className="material-icons text-indigo-600 text-3xl">format_quote</span>
                 </div>
                 <p className="text-lg md:text-xl font-medium text-slate-700 leading-relaxed italic">
                   "{question.description}"
                 </p>
               </div>
             )}
          </div>

          {/* Controls Area */}
          <div className="p-6 bg-white border-t border-slate-100">
            {!showFeedback ? (
              <form onSubmit={handleGuessSubmit} className="flex gap-3">
                <input
                  type="text"
                  value={currentGuess}
                  onChange={(e) => setCurrentGuess(e.target.value)}
                  placeholder={t.gameInputPlaceholder}
                  autoFocus
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-lg"
                />
                <Button type="submit" disabled={!currentGuess.trim()}>
                  <span className="material-icons">send</span>
                </Button>
              </form>
            ) : (
              <Button onClick={nextQuestion} className="w-full">
                {t.nextQuestion}
                <span className="material-icons">arrow_forward</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderResults = () => {
    const accuracy = Math.round((gameState.score / gameState.questions.length) * 100);
    const duration = gameState.endTime && gameState.startTime 
      ? Math.round((gameState.endTime - gameState.startTime) / 1000) 
      : 0;

    return (
      <div className="max-w-4xl mx-auto w-full pb-12">
        <div className="bg-indigo-600 text-white rounded-3xl p-8 mb-8 shadow-xl text-center">
          <h2 className="text-3xl font-bold mb-6">{t.resultsTitle}</h2>
          <div className="flex justify-center gap-8 md:gap-16">
            <div>
              <div className="text-indigo-200 text-sm uppercase tracking-wider font-medium mb-1">{t.scoreLabel}</div>
              <div className="text-4xl font-bold">{gameState.score}/{gameState.questions.length}</div>
            </div>
            <div>
              <div className="text-indigo-200 text-sm uppercase tracking-wider font-medium mb-1">{t.accuracyLabel}</div>
              <div className="text-4xl font-bold">{accuracy}%</div>
            </div>
            <div>
              <div className="text-indigo-200 text-sm uppercase tracking-wider font-medium mb-1">{t.timeLabel}</div>
              <div className="text-4xl font-bold">{duration}s</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {gameState.questions.map((q, idx) => (
            <div key={q.id} className={`bg-white p-4 rounded-xl border-2 ${q.isCorrect ? 'border-green-100' : 'border-rose-100'} shadow-sm flex gap-4`}>
              <img src={q.previewUrl} alt="Result" className="w-24 h-24 object-cover rounded-lg bg-slate-100" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`material-icons text-sm ${q.isCorrect ? 'text-green-500' : 'text-rose-500'}`}>
                    {q.isCorrect ? 'check_circle' : 'cancel'}
                  </span>
                  <span className="font-bold text-slate-800 truncate">{q.correctNames[0]}</span>
                </div>
                <div className="text-xs text-slate-500 mb-2 truncate">You guessed: <span className={q.isCorrect ? 'text-green-600' : 'text-rose-600'}>{q.userAnswer || '-'}</span></div>
                <p className="text-xs text-slate-600 line-clamp-3 bg-slate-50 p-2 rounded border border-slate-100">
                  {q.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-4 justify-center">
          <Button variant="secondary" onClick={restartGame}>
            {t.newGame}
          </Button>
          <Button onClick={replayGame}>
            {t.replay}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {renderHeader()}
      <main className="flex-1 p-4 md:p-6 w-full">
        {phase === 'setup' && renderSetup()}
        {phase === 'processing' && renderProcessing()}
        {phase === 'game' && renderGame()}
        {phase === 'results' && renderResults()}
      </main>
    </div>
  );
}