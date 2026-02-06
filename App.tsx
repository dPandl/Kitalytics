import React, { useState, useEffect } from 'react';
import { EducatorView } from './components/views/EducatorView';
import { DirectorView } from './components/views/DirectorView';
import { AdminView } from './components/views/AdminView';
import { Modal, Button } from './components/shared/ui';
import { CookieBanner } from './components/shared/CookieBanner';
import { ImpressumModal } from './components/shared/ImpressumModal';
import { PrivacyPolicyModal } from './components/shared/PrivacyPolicyModal';
import { ToastProvider } from './components/shared/Toast';
import { LandingPage } from './components/views/LandingPage';
import { get as idbGet } from './lib/indexedDB';
import { verifyPermission } from './lib/fileSystem';
import { demoEducatorGroupData, demoDirectorKindergartenData, demoAdminWorkspaceData } from './lib/demoData';
import { DemoBanner } from './components/shared/DemoBanner';
import { TutorialModal } from './components/shared/TutorialModal';
import { ChangelogModal } from './components/shared/ChangelogModal';
import { APP_VERSION } from './lib/releaseNotes';

type Role = 'erzieher' | 'leitung' | 'verwaltung';
type ConsentStatus = 'pending' | 'accepted' | 'rejected';

const CONSENT_KEY = 'kitalytics_cookieConsent';

// --- Onboarding Steps Configuration ---
const ROLE_ONBOARDING_STEPS = {
  erzieher: [
    {
      title: "Gruppendatei erstellen",
      description: "Ihr Arbeitsbereich ist eine einzelne Datei (.klgruppe). Erstellen Sie diese zu Beginn, um alle Anwesenheitsdaten Ihrer Gruppe sicher und lokal zu speichern.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-[#00BCD4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      title: "Daten erfassen",
      description: "Nutzen Sie die Live-Erfassung für den täglichen Check-in/out oder tragen Sie Daten manuell nach. Alles wird automatisch in Ihrer Datei gespeichert.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-[#00BCD4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: "Export an die Leitung",
      description: "Am Ende eines Zeitraums exportieren Sie Ihre Daten mit einem Klick. Die erstellte Datei senden Sie an Ihre Kitaleitung.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-[#00BCD4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      )
    }
  ],
  leitung: [
    {
      title: "Einrichtung verwalten",
      description: "Sie starten mit einer Einrichtungsdatei (.kleinrichtung). Hier laufen alle Fäden Ihrer Kita zusammen.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-[#00BCD4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      title: "Gruppen importieren",
      description: "Erhalten Sie Dateien von Ihren Erziehern? Importieren Sie diese einfach, um alle Gruppenstatistiken zu bündeln und auszuwerten.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-[#00BCD4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      )
    },
    {
      title: "Bericht an den Träger",
      description: "Erstellen Sie Gesamtauswertungen und exportieren Sie die Einrichtungsdaten für die zentrale Verwaltung.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-[#00BCD4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    }
  ],
  verwaltung: [
    {
      title: "Workspace erstellen",
      description: "Verwalten Sie mehrere Einrichtungen in einem zentralen Workspace (.klworkspace).",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-[#00BCD4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      title: "Einrichtungen zusammenführen",
      description: "Importieren Sie die Berichte der Kitaleitungen, um einen Gesamtüberblick über Auslastung und Frequenzen aller Standorte zu erhalten.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-[#00BCD4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      title: "Strategische Planung",
      description: "Nutzen Sie die aggregierten Statistiken für fundierte Entscheidungen zur Bedarfsplanung.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-[#00BCD4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    }
  ]
};

const AppContent: React.FC = () => {
  const [activeRole, setActiveRole] = useState<Role>('erzieher');
  const [showApp, setShowApp] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>('pending');
  const [isImpressumOpen, setIsImpressumOpen] = useState<boolean>(false);
  const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState<boolean>(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState<boolean>(false);
  
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  
  // New Onboarding State
  const [onboardingStep, setOnboardingStep] = useState<number>(0); // 0 = Role Selection, 1+ = Tutorial Steps
  const [onboardingRole, setOnboardingRole] = useState<Role | null>(null);

  const [isViewSwitcherOpen, setIsViewSwitcherOpen] = useState<boolean>(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (consent === 'accepted') {
      setConsentStatus('accepted');
    } else if (consent === 'rejected') {
      setConsentStatus('rejected');
    }
  }, []);

  useEffect(() => {
    if (consentStatus !== 'accepted' || isDemoMode) {
        return;
    }
  
    const checkForHandle = async () => {
        const roleKeys: { role: Role, handleKey: string }[] = [
            { role: 'erzieher', handleKey: 'kitalytics_educator_filehandle' },
            { role: 'leitung', handleKey: 'kitalytics_director_filehandle' },
            { role: 'verwaltung', handleKey: 'kitalytics_admin_filehandle' },
        ];

        for (const keyInfo of roleKeys) {
            try {
                const handle = await idbGet<FileSystemFileHandle>(keyInfo.handleKey);
                if (handle && (await verifyPermission(handle))) {
                    setShowApp(true);
                    setActiveRole(keyInfo.role);
                    return; 
                }
            } catch (error) {
                console.error(`Error checking for handle for role ${keyInfo.role}:`, error);
            }
        }
    };
  
    checkForHandle();
  }, [consentStatus, isDemoMode]);


  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setConsentStatus('accepted');
  };

  const handleReject = () => {
    localStorage.setItem(CONSENT_KEY, 'rejected');
    setConsentStatus('rejected');
  };

  const handleStartDemo = () => {
    setIsDemoMode(true);
    setIsOnboardingOpen(true);
    setOnboardingStep(0); // Reset onboarding
  };

  const handleStartApp = () => {
    setIsOnboardingOpen(true);
    setOnboardingStep(0); // Reset onboarding
  };

  const handleRoleSelect = (role: Role) => {
    setOnboardingRole(role);
    setOnboardingStep(1); // Start tutorial
  };

  const handleOnboardingNext = () => {
      setOnboardingStep(prev => prev + 1);
  };

  const handleOnboardingPrev = () => {
      setOnboardingStep(prev => prev - 1);
  };
  
  const handleOnboardingFinish = () => {
      if (onboardingRole) {
          setActiveRole(onboardingRole);
          setShowApp(true);
          setIsOnboardingOpen(false);
          setIsViewSwitcherOpen(false);
          // Small timeout to reset state after animation closes
          setTimeout(() => {
              setOnboardingStep(0);
              setOnboardingRole(null);
          }, 500);
      }
  };
  
  const handleSwitchView = (role: Role) => {
      setActiveRole(role);
      setIsViewSwitcherOpen(false);
  }

  const handleGoHome = () => {
    setShowApp(false);
    setIsDemoMode(false);
    setIsOnboardingOpen(false);
    setOnboardingStep(0);
    setOnboardingRole(null);
  };

  const renderContent = () => {
    if (isDemoMode) {
      switch (activeRole) {
        case 'erzieher':
          return <EducatorView consentStatus="accepted" isDemoMode={true} demoData={demoEducatorGroupData} />;
        case 'leitung':
          return <DirectorView consentStatus="accepted" isDemoMode={true} demoData={demoDirectorKindergartenData} />;
        case 'verwaltung':
          return <AdminView consentStatus="accepted" isDemoMode={true} demoData={demoAdminWorkspaceData} />;
        default:
          return <EducatorView consentStatus="accepted" isDemoMode={true} demoData={demoEducatorGroupData} />;
      }
    }

    switch (activeRole) {
      case 'erzieher':
        return <EducatorView consentStatus={consentStatus} />;
      case 'leitung':
        return <DirectorView consentStatus={consentStatus} />;
      case 'verwaltung':
        return <AdminView consentStatus={consentStatus} />;
      default:
        return <EducatorView consentStatus={consentStatus} />;
    }
  };
  
  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <header className="bg-white shadow-md">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center">
                  <button 
                    onClick={handleGoHome} 
                    className="flex items-center text-left p-1 -ml-1 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00BCD4] transition-colors"
                    aria-label="Zurück zur Startseite"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#00BCD4]" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                      <div className="ml-2">
                          <div className="inline-block">
                              <h1 className="text-3xl font-bold text-[#00BCD4] leading-tight">
                              Kitalytics
                              </h1>
                              <div className="text-[10.5px] text-slate-500 uppercase text-justify [text-align-last:justify]">
                                  Nutzerfrequenzanalyse
                              </div>
                          </div>
                      </div>
                  </button>
              </div>
              <div>
                  <button 
                    onClick={() => setIsTutorialOpen(true)} 
                    className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400"
                    aria-label="Anleitung öffnen"
                    title="Anleitung öffnen"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                      </svg>
                  </button>
              </div>
            </div>
          </div>
        </header>
        {isDemoMode && <DemoBanner />}
        <main className="container mx-auto p-4 sm:p-6 lg:p-8 flex-grow">
          {showApp ? renderContent() : <LandingPage onStart={handleStartApp} onStartDemo={handleStartDemo} onShowTutorial={() => setIsTutorialOpen(true)} />}
        </main>
        <footer className="text-center p-4 text-slate-500 text-sm">
          <div className="space-x-4">
              <button onClick={() => setIsImpressumOpen(true)} className="hover:underline">Impressum</button>
              <span>|</span>
              <button onClick={() => setIsPrivacyPolicyOpen(true)} className="hover:underline">Datenschutz</button>
              <span>|</span>
              <button onClick={() => setIsChangelogOpen(true)} className="hover:underline text-slate-400">v{APP_VERSION}</button>
          </div>
          <p className="mt-2">© 2025 Pascal Pander. Alle Rechte vorbehalten.</p>
        </footer>

        {consentStatus === 'pending' && !isDemoMode && (
          <CookieBanner 
            onAccept={handleAccept} 
            onReject={handleReject}
            onShowImpressum={() => setIsImpressumOpen(true)}
            onShowPrivacy={() => setIsPrivacyPolicyOpen(true)}
          />
        )}

        {/* Onboarding Modal */}
        <Modal isOpen={isOnboardingOpen} size="3xl">
            {onboardingStep === 0 ? (
              /* Step 0: Role Selection */
              <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <h2 className="text-3xl font-bold mb-4 text-slate-800">Willkommen bei Kitalytics</h2>
                  <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
                      Bitte wählen Sie Ihren Arbeitsbereich aus, um die passende Ansicht für Ihre Aufgaben zu laden.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <button 
                          onClick={() => handleRoleSelect('erzieher')}
                          className="flex flex-col items-center p-6 bg-white border-2 border-slate-100 rounded-xl hover:border-[#00BCD4] hover:shadow-lg transition-all duration-200 group text-left"
                      >
                          <div className="bg-[#E0F7FA] p-4 rounded-full mb-4 group-hover:bg-[#00BCD4] transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#00BCD4] group-hover:text-white" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                              </svg>
                          </div>
                          <h3 className="text-xl font-bold text-slate-800 mb-2">Erzieher</h3>
                          <p className="text-sm text-slate-500 text-center">
                              Erfassung und Verwaltung der Anwesenheiten einer einzelnen Gruppe.
                          </p>
                      </button>

                      <button 
                          onClick={() => handleRoleSelect('leitung')}
                          className="flex flex-col items-center p-6 bg-white border-2 border-slate-100 rounded-xl hover:border-[#00BCD4] hover:shadow-lg transition-all duration-200 group text-left"
                      >
                          <div className="bg-[#E0F7FA] p-4 rounded-full mb-4 group-hover:bg-[#00BCD4] transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#00BCD4] group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                          </div>
                          <h3 className="text-xl font-bold text-slate-800 mb-2">Leitung</h3>
                          <p className="text-sm text-slate-500 text-center">
                              Organisation mehrerer Gruppen, Datenimport und Einrichtungs-Statistiken.
                          </p>
                      </button>

                      <button 
                          onClick={() => handleRoleSelect('verwaltung')}
                          className="flex flex-col items-center p-6 bg-white border-2 border-slate-100 rounded-xl hover:border-[#00BCD4] hover:shadow-lg transition-all duration-200 group text-left"
                      >
                          <div className="bg-[#E0F7FA] p-4 rounded-full mb-4 group-hover:bg-[#00BCD4] transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#00BCD4] group-hover:text-white" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                              </svg>
                          </div>
                          <h3 className="text-xl font-bold text-slate-800 mb-2">Verwaltung</h3>
                          <p className="text-sm text-slate-500 text-center">
                              Workspace-Management und übergreifende Analyse mehrerer Einrichtungen.
                          </p>
                      </button>
                  </div>
                  {isDemoMode && (
                      <button onClick={handleGoHome} className="mt-8 text-slate-400 hover:text-slate-600 text-sm underline">
                          Zurück zur Startseite
                      </button>
                  )}
              </div>
            ) : (
              /* Steps 1+: Role Tutorial Wizard */
              <div className="text-center max-w-xl mx-auto py-4">
                  {onboardingRole && ROLE_ONBOARDING_STEPS[onboardingRole] && (
                      <>
                          <div className="flex justify-center mb-8">
                              {/* Progress Indicators */}
                              <div className="flex space-x-2">
                                  {ROLE_ONBOARDING_STEPS[onboardingRole].map((_, index) => (
                                      <div 
                                          key={index}
                                          className={`h-2.5 rounded-full transition-all duration-300 ${index + 1 === onboardingStep ? 'w-8 bg-[#00BCD4]' : 'w-2.5 bg-slate-200'}`} 
                                      />
                                  ))}
                              </div>
                          </div>

                          {/* Content Animation Container */}
                          <div className="animate-in fade-in zoom-in-95 duration-300" key={onboardingStep}>
                              <div className="flex justify-center mb-6">
                                  <div className="p-6 bg-[#E0F7FA] rounded-full text-[#00BCD4]">
                                      {ROLE_ONBOARDING_STEPS[onboardingRole][onboardingStep - 1].icon}
                                  </div>
                              </div>
                              
                              <h3 className="text-2xl font-bold text-slate-800 mb-3">
                                  {ROLE_ONBOARDING_STEPS[onboardingRole][onboardingStep - 1].title}
                              </h3>
                              
                              <p className="text-slate-600 text-lg mb-8 min-h-[3.5rem]">
                                  {ROLE_ONBOARDING_STEPS[onboardingRole][onboardingStep - 1].description}
                              </p>
                          </div>

                          <div className="flex justify-between items-center mt-8">
                              {/* Back Button */}
                              <Button 
                                  variant="secondary" 
                                  onClick={onboardingStep === 1 ? () => setOnboardingStep(0) : handleOnboardingPrev}
                              >
                                  Zurück
                              </Button>

                              {/* Next/Finish Button */}
                              {onboardingStep < ROLE_ONBOARDING_STEPS[onboardingRole].length ? (
                                  <Button onClick={handleOnboardingNext}>
                                      Weiter
                                  </Button>
                              ) : (
                                  <Button onClick={handleOnboardingFinish}>
                                      {isDemoMode ? 'Demo starten' : 'Loslegen'}
                                  </Button>
                              )}
                          </div>
                      </>
                  )}
              </div>
            )}
        </Modal>

        {/* Floating View Switcher */}
        {showApp && (
          <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
              {isViewSwitcherOpen && (
                  <div className="mb-3 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden min-w-[220px] animate-in slide-in-from-bottom-5 fade-in duration-200">
                      <div className="p-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Ansicht wählen
                      </div>
                      <button 
                          onClick={() => handleSwitchView('erzieher')}
                          className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center justify-between ${activeRole === 'erzieher' ? 'bg-[#E0F7FA] text-[#00838F]' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                          <span>Erzieher</span>
                          {activeRole === 'erzieher' && <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </button>
                      <button 
                          onClick={() => handleSwitchView('leitung')}
                          className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center justify-between ${activeRole === 'leitung' ? 'bg-[#E0F7FA] text-[#00838F]' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                          <span>Leitung</span>
                          {activeRole === 'leitung' && <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </button>
                      <button 
                          onClick={() => handleSwitchView('verwaltung')}
                          className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center justify-between ${activeRole === 'verwaltung' ? 'bg-[#E0F7FA] text-[#00838F]' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                          <span>Verwaltung</span>
                          {activeRole === 'verwaltung' && <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </button>
                  </div>
              )}
              <button 
                  onClick={() => setIsViewSwitcherOpen(!isViewSwitcherOpen)}
                  className="bg-[#00BCD4] hover:bg-[#00ACC1] text-white pl-5 pr-6 py-3 rounded-full shadow-lg flex items-center gap-2 font-semibold transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00BCD4]"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Ansicht wechseln
              </button>
              {isViewSwitcherOpen && (
                  <div 
                      className="fixed inset-0 z-[-1]" 
                      onClick={() => setIsViewSwitcherOpen(false)}
                      aria-hidden="true"
                  />
              )}
          </div>
        )}

        <ImpressumModal isOpen={isImpressumOpen} onClose={() => setIsImpressumOpen(false)} />
        <PrivacyPolicyModal isOpen={isPrivacyPolicyOpen} onClose={() => setIsPrivacyPolicyOpen(false)} />
        <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />
        <ChangelogModal isOpen={isChangelogOpen} onClose={() => setIsChangelogOpen(false)} />
      </div>
    </ToastProvider>
  );
};

export default AppContent;