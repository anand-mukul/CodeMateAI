import React from 'react';
import { Terminal } from 'lucide-react';

export const SUPPORTED_LANGUAGES = [
  { id: 'cpp', label: 'C++', ext: 'cpp' },
  { id: 'python', label: 'Python', ext: 'py' },
  { id: 'java', label: 'Java', ext: 'java' },
  { id: 'c', label: 'C', ext: 'c' },
  { id: 'javascript', label: 'JavaScript', ext: 'js' },
  { id: 'go', label: 'Go', ext: 'go' },
];

interface LanguageSelectorProps {
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onSelectLanguage,
}) => {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
      <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
        <Terminal className="w-3.5 h-3.5 text-indigo-400" />
        <span>Target Language</span>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto">
        <select
          value={selectedLanguage}
          onChange={(e) => onSelectLanguage(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-2 py-0.5 outline-none focus:border-indigo-500 font-medium cursor-pointer"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.id} value={lang.label}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

