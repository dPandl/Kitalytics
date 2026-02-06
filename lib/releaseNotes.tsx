import { ReleaseNote } from '../types';
import { Rocket, ShieldCheck, PieChart, Users, WifiOff } from 'lucide-react';

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "1.0.1",
    date: "06.02.2026",
    icon: WifiOff,
    whatsNew: [
        "<strong>Offline-Modus (PWA):</strong> Kitalytics kann nun als App installiert und auch ohne Internetverbindung genutzt werden.",
        "<strong>Performance:</strong> Schnellere Ladezeiten durch Caching von Ressourcen."
    ],
    bugFixes: [
        "Problem mit Abhängigkeiten (React 19 Kompatibilität) behoben."
    ],
    adjustments: []
  },
  {
    version: "1.0.0",
    optionalTitle: "Kitalytics Launch",
    date: "06.02.2026",
    icon: Rocket,
    whatsNew: [
        "<strong>Erzieher-Ansicht:</strong> Live-Erfassung von Anwesenheiten (Check-in/out) und manuelle Nachpflege von Zeiträumen.",
        "<strong>Leitungs-Ansicht:</strong> Aggregation mehrerer Gruppen, Import von Gruppendateien und Einrichtungs-Statistiken.",
        "<strong>Verwaltungs-Ansicht:</strong> Workspace-Management zur Analyse mehrerer Einrichtungen übergeordnet.",
        "<strong>Privacy First:</strong> Lokale Datenspeicherung im Dateisystem des Browsers ohne Server-Upload."
    ],
    bugFixes: [],
    adjustments: [
        "Initiale Einrichtung der Dateiformate (.klgruppe, .kleinrichtung, .klworkspace)",
        "Implementierung der Diagramm-Visualisierung mit Recharts"
    ]
  }
];

// Helper to get current app version from the latest release note
export const APP_VERSION = RELEASE_NOTES[0].version;