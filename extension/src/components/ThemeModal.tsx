import React from 'react';
import { ArrowLeft, Check, Palette } from 'lucide-react';
import { useTheme, THEME_OPTIONS } from '../context/ThemeContext';

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeModal: React.FC<ThemeModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col font-sans animate-fade-in">
      {/* Header with Back Navigation */}
      <div className="flex items-center justify-between p-3.5 bg-slate-950/80 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Back to Workspace"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">Theme & Appearance</h3>
            <p className="text-[10px] text-slate-400">Personalize your CodeMate AI companion interface</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
        >
          Done
        </button>
      </div>

      {/* Theme Options List */}
      <div className="p-3.5 flex flex-col gap-2 max-h-[70vh] overflow-y-auto">
        {THEME_OPTIONS.map((opt) => {
          const isSelected = theme === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => {
                setTheme(opt.id);
              }}
              className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-800 border-indigo-500 shadow-md shadow-indigo-500/10'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Theme Palette Circle Preview */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center border shadow-inner relative overflow-hidden shrink-0"
                  style={{
                    backgroundColor: opt.previewBg,
                    borderColor: isSelected ? opt.previewAccent : 'rgba(255,255,255,0.1)',
                  }}
                >
                  <div
                    className="w-3.5 h-3.5 rounded-full shadow-sm"
                    style={{ backgroundColor: opt.previewAccent }}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white">{opt.name}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{opt.description}</p>
                </div>
              </div>

              <div className="flex items-center shrink-0">
                {isSelected ? (
                  <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                    <Check className="w-3 h-3 stroke-[2.5]" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border border-slate-700" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-[11px] text-slate-400">
        <span className="text-[10px]">Themes apply instantly across panel & popup.</span>
      </div>
    </div>
  );
};
