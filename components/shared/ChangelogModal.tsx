import React from 'react';
import { Modal, Button } from './ui';
import { RELEASE_NOTES } from '../../lib/releaseNotes';
import { Sparkles, Wrench, RefreshCcw } from 'lucide-react';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} size="2xl">
      <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Was ist neu?</h2>
            <p className="text-sm text-slate-500">Änderungshistorie von Kitalytics</p>
        </div>
        <div className="bg-[#E0F7FA] text-[#00BCD4] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            Changelog
        </div>
      </div>
      
      <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2 -mr-2">
        {RELEASE_NOTES.map((release, index) => {
            const Icon = release.icon;
            const isLatest = index === 0;

            return (
                <div key={release.version} className={`relative pl-8 border-l-2 ${isLatest ? 'border-[#00BCD4]' : 'border-slate-200'} pb-8 last:pb-0`}>
                    {/* Timestamp Dot */}
                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white ${isLatest ? 'bg-[#00BCD4]' : 'bg-slate-300'}`} />
                    
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-slate-800">v{release.version}</h3>
                                {release.optionalTitle && <span className="text-slate-600 font-medium">– {release.optionalTitle}</span>}
                                {isLatest && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Neu</span>}
                            </div>
                            <span className="text-xs text-slate-400">{release.date}</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg text-slate-400">
                            <Icon size={20} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        {release.whatsNew.length > 0 && (
                            <div className="bg-green-50/50 rounded-lg p-4 border border-green-100">
                                <h4 className="flex items-center gap-2 text-sm font-bold text-green-800 mb-2">
                                    <Sparkles size={16} /> Neuheiten
                                </h4>
                                <ul className="space-y-2">
                                    {release.whatsNew.map((item, i) => (
                                        <li key={i} className="text-sm text-slate-700 leading-relaxed pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-green-400">
                                            <span dangerouslySetInnerHTML={{ __html: item }} />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {release.bugFixes.length > 0 && (
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-red-800 mb-2">
                                    <Wrench size={16} /> Fehlerbehebungen
                                </h4>
                                <ul className="space-y-1">
                                    {release.bugFixes.map((item, i) => (
                                        <li key={i} className="text-sm text-slate-600 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-red-300">
                                            <span dangerouslySetInnerHTML={{ __html: item }} />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {release.adjustments.length > 0 && (
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                                    <RefreshCcw size={16} /> Anpassungen
                                </h4>
                                <ul className="space-y-1">
                                    {release.adjustments.map((item, i) => (
                                        <li key={i} className="text-sm text-slate-600 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-slate-300">
                                            <span dangerouslySetInnerHTML={{ __html: item }} />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            );
        })}
      </div>

      <div className="mt-8 text-right pt-4 border-t border-slate-100">
        <Button onClick={onClose} variant="secondary">Schließen</Button>
      </div>
    </Modal>
  );
};
