import React from 'react';
import { Button } from '../shared/ui';

interface LandingPageProps {
    onStart: () => void;
    onStartDemo: () => void;
    onShowTutorial: () => void;
}

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="bg-white p-6 rounded-lg shadow-lg text-center transform hover:scale-105 transition-transform duration-300">
        <div className="flex justify-center items-center mb-4">
            <div className="bg-[#E0F7FA] p-4 rounded-full">
                {icon}
            </div>
        </div>
        <h3 className="text-xl font-semibold mb-2 text-slate-800">{title}</h3>
        <p className="text-slate-600">{children}</p>
    </div>
);

export const LandingPage: React.FC<LandingPageProps> = ({ onStart, onStartDemo, onShowTutorial }) => {
    return (
        <div className="space-y-16 md:space-y-24">
            {/* Hero Section */}
            <section className="text-center pt-12 md:pt-20">
                <h1 className="text-5xl md:text-6xl font-bold text-[#00BCD4]">
                    Kitalytics
                </h1>
                <p className="mt-4 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
                    Datenvisualisierung für Kindergärten. Einfach, sicher und aufschlussreich.
                </p>
                <p className="mt-2 text-sm text-slate-500 max-w-2xl mx-auto">
                    Erfassen Sie Anwesenheiten, analysieren Sie die Auslastung und optimieren Sie Ihre Planung – alles datenschutzkonform und lokal auf Ihrem Gerät.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                     <Button onClick={onStartDemo} className="px-8 py-3 text-lg">
                        Demo starten
                    </Button>
                    <Button onClick={onShowTutorial} variant="secondary" className="px-8 py-3 text-lg">
                        Anleitung
                    </Button>
                </div>
            </section>

            {/* Features Section */}
            <section>
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-slate-800">Für jede Rolle die passende Ansicht</h2>
                    <p className="mt-2 text-slate-500">Kitalytics passt sich Ihren Bedürfnissen an.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <FeatureCard
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#00BCD4]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>}
                        title="Für Erzieher"
                    >
                        Erfassen Sie Kinderzahlen live per Klick oder tragen Sie Daten ganzer Tage schnell und unkompliziert manuell nach.
                    </FeatureCard>
                    <FeatureCard
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#00BCD4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                        title="Für Leitungen"
                    >
                        Führen Sie Daten mehrerer Gruppen zusammen, visualisieren Sie Frequenzverläufe und identifizieren Sie Auslastungsmuster auf einen Blick.
                    </FeatureCard>
                    <FeatureCard
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#00BCD4]" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>}
                        title="Für die Verwaltung"
                    >
                        Bündeln Sie die Daten ganzer Einrichtungen, erstellen Sie übergreifende Statistiken und gewinnen Sie wertvolle Einblicke für die strategische Planung.
                    </FeatureCard>
                </div>
            </section>
            
            {/* Privacy Section */}
            <section className="bg-slate-100 rounded-lg p-8">
                 <div className="max-w-4xl mx-auto text-center">
                    <div className="flex justify-center items-center mb-4">
                        <div className="bg-white p-4 rounded-full shadow-md">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#00BCD4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800">Ihre Daten gehören Ihnen.</h2>
                    <p className="mt-4 text-slate-600">
                        Kitalytics wurde mit einem "Privacy-First"-Ansatz entwickelt. Alle von Ihnen eingegebenen Daten werden <strong>ausschließlich lokal auf Ihrem Computer</strong> in einer Datei gespeichert. Es gibt keine Server, keine Clouds und keine Datenübertragung. Sie behalten die volle Kontrolle.
                    </p>
                </div>
            </section>

            {/* Final CTA Section */}
            <section className="text-center pb-12">
                 <h2 className="text-3xl font-bold text-slate-800">Bereit, loszulegen?</h2>
                 <p className="mt-2 text-slate-500">Starten Sie jetzt und bringen Sie Klarheit in Ihre Nutzerfrequenz.</p>
                 <div className="mt-8">
                    <Button onClick={onStart} className="px-8 py-3 text-lg">
                        App starten
                    </Button>
                </div>
            </section>
        </div>
    );
};
