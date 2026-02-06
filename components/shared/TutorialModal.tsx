
import React, { useState, ReactNode } from 'react';
import { Modal, Button } from './ui';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccordionSection: React.FC<{
  title: string;
  sectionId: string;
  openSection: string | null;
  setOpenSection: (id: string | null) => void;
  children: ReactNode;
}> = ({ title, sectionId, openSection, setOpenSection, children }) => {
  const isOpen = openSection === sectionId;

  const toggleSection = () => {
    setOpenSection(isOpen ? null : sectionId);
  };

  return (
    <div className="border-b border-slate-200 last:border-b-0">
      <button
        onClick={toggleSection}
        className="w-full flex justify-between items-center py-4 text-left font-semibold text-lg text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00BCD4] rounded-md"
        aria-expanded={isOpen}
        aria-controls={`content-${sectionId}`}
      >
        <span className="px-2">{title}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-6 w-6 transform transition-transform duration-300 mr-2 ${isOpen ? 'rotate-180 text-[#00BCD4]' : 'rotate-0 text-slate-500'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div id={`content-${sectionId}`} className="pb-6 pr-4 pl-4 text-slate-700 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
};

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  const [openSection, setOpenSection] = useState<string | null>('grundprinzipien');

  return (
    <Modal isOpen={isOpen} size="4xl">
      <h2 className="text-3xl font-bold mb-4 text-slate-800">Anleitung &amp; Erste Schritte</h2>
      <div className="text-slate-700 max-h-[70vh] overflow-y-auto -mr-2 pr-2">
        
        <AccordionSection title="Grundprinzipien: Ihre Daten, Ihre Kontrolle" sectionId="grundprinzipien" openSection={openSection} setOpenSection={setOpenSection}>
            <p>Willkommen bei Kitalytics! Diese Anwendung wurde entwickelt, um Ihnen eine einfache und datenschutzkonforme Möglichkeit zur Analyse der Nutzerfrequenz zu geben. Das Wichtigste zuerst:</p>
            <ul className="list-disc space-y-2 pl-6 mt-2">
                <li>
                    <strong>Lokal & Sicher:</strong> Kitalytics speichert <strong>alle Daten ausschließlich in Dateien auf Ihrem Computer</strong>. Es gibt keine Cloud, keine Server und keine Datenübertragung. Sie behalten die volle Kontrolle.
                </li>
                <li>
                    <strong>Dateibasierter Workflow:</strong> Die gesamte App basiert auf dem Öffnen und Bearbeiten von spezifischen Arbeitsdateien. Für jede Rolle gibt es einen eigenen Dateityp. Änderungen werden automatisch gespeichert, solange die Datei geöffnet ist.
                </li>
                <li>
                    <strong>Rollen & Datenfluss:</strong> Der Datenaustausch erfolgt durch den Export und Import von Zeiträumen. Der Datenfluss ist klar definiert: <strong>Erzieher ➔ Leitung ➔ Verwaltung</strong>.
                </li>
            </ul>
        </AccordionSection>

        <AccordionSection title="Rolle: Erzieher/in" sectionId="erzieher" openSection={openSection} setOpenSection={setOpenSection}>
            <p><strong>Ziel:</strong> Detaillierte Erfassung der Anwesenheit für eine einzelne Gruppe.</p>
            <ol className="list-decimal space-y-3 pl-6 mt-2">
                <li><strong>Gruppendatei erstellen:</strong><br/>
                Starten Sie, indem Sie eine neue Gruppendatei erstellen. Diese Datei mit der Endung <code>.klgruppe</code> ist Ihr zentraler Speicherort für alle Daten dieser einen Gruppe.</li>
                
                <li><strong>Zeitraum anlegen:</strong><br/>
                Daten werden in Zeiträumen organisiert (z.B. "Schuljahr 2023/24"). Erstellen Sie einen Zeitraum, um die Erfassungen darin zu bündeln.</li>

                <li><strong>Daten erfassen:</strong><br/>
                Sie haben zwei Möglichkeiten:
                <ul className="list-disc space-y-1 mt-2 pl-6">
                    <li><strong>Live-Erfassung:</strong> Ideal für den aktuellen Tag. Starten Sie die Erfassung und klicken Sie bei Ankunft oder Abholung eines Kindes auf "+" oder "-". Am Ende des Tages beenden Sie die Erfassung, und der Frequenzverlauf wird automatisch gespeichert.</li>
                    <li><strong>Manuelle Erfassung:</strong> Perfekt zum Nachtragen von Daten. Wählen Sie ein Datum, erstellen Sie einen Zeitstrahl und tragen Sie die Anzahl der anwesenden Kinder für jedes 15-Minuten-Intervall ein.</li>
                </ul>
                </li>
                <li><strong>Daten exportieren:</strong><br/>
                Um Ihre Daten der Kitaleitung zur Verfügung zu stellen, wählen Sie den gewünschten Zeitraum aus und klicken auf "Exportieren". Es wird eine <code>.klgrpperiod</code>-Datei erstellt, die Sie weitergeben können.</li>
            </ol>
        </AccordionSection>

        <AccordionSection title="Rolle: Leitung" sectionId="leitung" openSection={openSection} setOpenSection={setOpenSection}>
            <p><strong>Ziel:</strong> Bündelung, Verwaltung und Analyse der Daten von allen Gruppen einer Einrichtung.</p>
            <ol className="list-decimal space-y-3 pl-6 mt-2">
                <li><strong>Einrichtungsdatei erstellen:</strong><br/>
                Ihre Arbeitsgrundlage ist eine Einrichtungsdatei mit der Endung <code>.kleinrichtung</code>. Erstellen Sie diese beim ersten Start.</li>
                
                <li><strong>Zeiträume anlegen:</strong><br/>
                Erstellen Sie die gleichen Zeiträume, die auch von den Erzieher/innen verwendet werden (z.B. "Schuljahr 2023/24"). Dies ist die Basis für die Organisation der Daten.</li>

                <li><strong>Gruppendaten verwalten:</strong><br/>
                Sie haben mehrere Möglichkeiten, die Daten Ihrer Gruppen zu pflegen:
                <ul className="list-disc space-y-1 mt-2 pl-6">
                    <li><strong>Import (empfohlen):</strong> Sammeln Sie die <code>.klgrpperiod</code>-Dateien von Ihren Erzieher/innen und importieren Sie diese. Die App fügt die Daten automatisch der richtigen Gruppe hinzu oder erstellt eine neue Gruppe.</li>
                    <li><strong>Manuelle Erstellung:</strong> Sie können auch direkt in der Leitungsansicht neue Gruppen erstellen und über die Funktion "Manuelle Erfassung hinzufügen" komplette Anwesenheitsverläufe eintragen. Dies ist nützlich, wenn Daten auf Papier erfasst und von Ihnen digitalisiert werden.</li>
                </ul>
                </li>
                
                <li><strong>Daten analysieren:</strong><br/>
                Wechseln Sie zwischen den Gruppen-Tabs, um einzelne Verläufe zu sehen, oder nutzen Sie den "Statistik"-Tab, um eine aggregierte Ansicht über alle Gruppen hinweg zu erhalten.</li>
                
                <li><strong>Daten für die Verwaltung exportieren:</strong><br/>
                Um die gesammelten Daten dem Träger bereitzustellen, exportieren Sie den gewünschten Zeitraum. Dadurch wird eine <code>.kleinrperiod</code>-Datei erzeugt.</li>
            </ol>
        </AccordionSection>

        <AccordionSection title="Rolle: Verwaltung" sectionId="verwaltung" openSection={openSection} setOpenSection={setOpenSection}>
            <p><strong>Ziel:</strong> Übergreifende Analyse und Vergleich der Daten von mehreren Einrichtungen.</p>
            <ol className="list-decimal space-y-3 pl-6 mt-2">
                <li><strong>Workspace-Datei erstellen:</strong><br/>
                Die zentrale Datei für die Verwaltung ist der Workspace mit der Endung <code>.klworkspace</code>. In dieser Datei werden die Daten aller zugehörigen Einrichtungen gebündelt.</li>
                
                <li><strong>Workspace-Zeiträume anlegen:</strong><br/>
                Definieren Sie übergreifende Zeiträume für den gesamten Workspace (z.B. "Schuljahr 2023/24").</li>

                <li><strong>Einrichtungs-Zeiträume importieren:</strong><br/>
                Sammeln Sie die <code>.kleinrperiod</code>-Dateien von den Leitungen der einzelnen Einrichtungen. Wählen Sie den entsprechenden Workspace-Zeitraum aus und importieren Sie die Dateien.</li>
                
                <li><strong>Daten analysieren und vergleichen:</strong><br/>
                Im "Statistik"-Tab können Sie nun umfassende Analysen durchführen. Filtern Sie nach einzelnen Einrichtungen oder Gruppen, um Vergleiche anzustellen und Muster zu erkennen. In den einzelnen Einrichtungs-Tabs sehen Sie die detaillierten Daten pro Kita.</li>
            </ol>
        </AccordionSection>

      </div>
      <div className="mt-6 text-right">
        <Button onClick={onClose}>Verstanden</Button>
      </div>
    </Modal>
  );
};
