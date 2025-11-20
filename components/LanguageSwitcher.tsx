import React from 'react';
import { Language } from '../types';

interface Props {
  current: Language;
  onChange: (lang: Language) => void;
}

export const LanguageSwitcher: React.FC<Props> = ({ current, onChange }) => {
  return (
    <div className="flex bg-white rounded-full p-1 shadow-sm border border-slate-200">
      <button
        onClick={() => onChange('en')}
        className={`px-3 py-1 text-sm rounded-full transition-all ${
          current === 'en' 
            ? 'bg-indigo-600 text-white font-medium shadow-sm' 
            : 'text-slate-500 hover:bg-slate-50'
        }`}
      >
        English
      </button>
      <button
        onClick={() => onChange('kr')}
        className={`px-3 py-1 text-sm rounded-full transition-all ${
          current === 'kr' 
            ? 'bg-indigo-600 text-white font-medium shadow-sm' 
            : 'text-slate-500 hover:bg-slate-50'
        }`}
      >
        한국어
      </button>
    </div>
  );
};