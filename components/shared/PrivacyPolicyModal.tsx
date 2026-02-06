
import React from 'react';
import { Modal, Button } from './ui';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} size="2xl">
      <h2 className="text-2xl font-bold mb-4">Datenschutzerklärung</h2>
      <div className="space-y-4 text-slate-700 max-h-[60vh] overflow-y-auto pr-2">
        <p><strong>Stand:</strong> Mai 2024</p>

        <h3 className="text-xl font-semibold mt-6">1. Allgemeine Hinweise und Pflichtinformationen</h3>

        <h4 className="text-lg font-semibold mt-4">1.1 Wer wir sind</h4>
        <p>Diese Datenschutzerklärung klärt Sie über die Art, den Umfang und den Zweck der Verarbeitung von personenbezogenen Daten innerhalb unserer Online-Anwendung „Kitalytics“ und der damit verbundenen Webseiten, Funktionen und Inhalte (nachfolgend gemeinsam „Online-Anwendung“ oder „App“) auf. Verantwortlich für die Datenverarbeitung im Sinne der Datenschutz-Grundverordnung (DSGVO) und anderer nationaler Datenschutzgesetze sowie sonstiger datenschutzrechtlicher Bestimmungen ist:</p>
        <p>
            Pascal Pander<br />
            Bahnhofstraße 39<br />
            78532 Tuttlingen<br />
            E-Mail: pascalpander@by-dp.de
        </p>

        <h4 className="text-lg font-semibold mt-4">1.2 Geltungsbereich</h4>
        <p>Diese Datenschutzerklärung gilt für alle Nutzer unserer Online-Anwendung, die unter den genannten Adressdaten erreichbar ist. Sie gilt für personenbezogene Daten im Sinne von Art. 4 Nr. 1 DSGVO, also alle Informationen, die sich auf eine identifizierte oder identifizierbare natürliche Person beziehen.</p>

        <h4 className="text-lg font-semibold mt-4">1.3 Rechtsgrundlagen der Datenverarbeitung</h4>
        <p>Nach Art. 6 Abs. 1 DSGVO und § 25 TDDDG ist die Verarbeitung personenbezogener Daten grundsätzlich untersagt, es sei denn, ein Gesetz erlaubt sie ausdrücklich oder Sie haben in die Verarbeitung eingewilligt. Die in dieser Datenschutzerklärung genannten Verarbeitungen stützen sich auf folgende Rechtsgrundlagen:</p>
        <ul className="list-disc list-inside space-y-1 pl-4">
            <li><strong>Art. 6 Abs. 1 lit. a DSGVO (Einwilligung):</strong> Soweit wir für bestimmte Verarbeitungen Ihre Einwilligung einholen.</li>
            <li><strong>Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung oder vorvertragliche Maßnahmen):</strong> Soweit die Verarbeitung zur Erfüllung eines Vertrags oder zur Durchführung vorvertraglicher Maßnahmen erforderlich ist.</li>
            <li><strong>Art. 6 Abs. 1 lit. f DSGVO (Berechtigte Interessen):</strong> Soweit die Verarbeitung zur Wahrung unserer berechtigten Interessen oder der berechtigten Interessen Dritter erforderlich ist und Ihre Interessen oder Grundrechte und Grundfreiheiten nicht überwiegen.</li>
            <li><strong>§ 25 Abs. 1 TDDDG (Einwilligung):</strong> Für das Speichern von oder den Zugriff auf Informationen in Ihrer Endeinrichtung, sofern keine der Ausnahmen nach § 25 Abs. 2 TDDDG greift.</li>
            <li><strong>§ 25 Abs. 2 TDDDG (Einwilligungsfreiheit):</strong> Wenn das Speichern von oder der Zugriff auf Informationen in Ihrer Endeinrichtung unbedingt erforderlich ist, um Ihnen einen von Ihnen ausdrücklich gewünschten digitalen Dienst zur Verfügung zu stellen.</li>
        </ul>

        <h4 className="text-lg font-semibold mt-4">1.4 Datensicherheit (SSL/TLS-Verschlüsselung)</h4>
        <p>Zum Schutz Ihrer übermittelten Daten nutzt unsere Website eine SSL/TLS-Verschlüsselung. Sie erkennen verschlüsselte Verbindungen an dem Präfix „https://“ in der Adresszeile Ihres Browsers und an dem Schloss-Symbol in der Browserzeile. Durch diese Verschlüsselung können Dritte die Daten, die Sie an uns übermitteln, nicht mitlesen. Dies entspricht den Sicherheitsanforderungen nach § 19 Abs. 4 TDDDG.</p>

        <h3 className="text-xl font-semibold mt-6">2. Hosting und Server-Logfiles</h3>

        <h4 className="text-lg font-semibold mt-4">2.1 Hosting der Online-Anwendung</h4>
        <p>Unsere Online-Anwendung wird über GitHub Pages gehostet. GitHub, Inc. ist der Betreiber dieser Hosting-Dienste.</p>
        <p><strong>Anschrift:</strong> GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA.</p>
        <p>Weitere Informationen zur Datenverarbeitung durch GitHub finden Sie in deren Datenschutzerklärung.</p>

        <h4 className="text-lg font-semibold mt-4">2.2 Server-Logfiles</h4>
        <p>Bei jedem Zugriff auf unsere Online-Anwendung werden automatisch Informationen in sogenannten Server-Logfiles gespeichert, die Ihr Browser an den GitHub-Server übermittelt. Dies sind insbesondere:</p>
        <ul className="list-disc list-inside space-y-1 pl-4">
            <li>IP-Adresse des zugreifenden Rechners</li>
            <li>Datum und Uhrzeit des Zugriffs</li>
            <li>URL der besuchten Seite</li>
            <li>Menge der übertragenen Daten in Byte</li>
            <li>Information über die Quelle, über die Sie auf die Seite gelangt sind</li>
            <li>Angabe des Browsers</li>
            <li>Information zum Betriebssystem</li>
        </ul>
        <p>GitHub protokolliert Ihre IP-Adresse aus Sicherheitsgründen, unabhängig davon, ob Sie bei GitHub angemeldet sind oder nicht. Diese Daten werden ausschließlich zu Sicherheitszwecken von GitHub erhoben und gespeichert. Wir haben keinen direkten Zugriff auf diese Logfiles und werten diese nicht für eigene Zwecke aus. Eine Zusammenführung dieser Daten mit anderen Datenquellen wird von uns nicht vorgenommen.</p>
        <p>Die Rechtsgrundlage für die Speicherung dieser Daten durch GitHub ist das berechtigte Interesse an der Gewährleistung der Sicherheit und Funktionsfähigkeit der Website gem. Art. 6 Abs. 1 lit. f DSGVO und § 19 TDDDG. Ein Auftragsverarbeitungsvertrag mit GitHub ist im Rahmen der Nutzung von GitHub Pages nicht erforderlich, da die Verarbeitung der Logfiles primär dem Interesse von GitHub an der Bereitstellung und Sicherung seiner Dienste dient.</p>

        <h3 className="text-xl font-semibold mt-6">3. Nutzung von externen Schriften und Dateien (CDNs)</h3>
        <p>Um die Funktionalität und das Design unserer Online-Anwendung zu gewährleisten, laden wir notwendige Bibliotheken von externen Servern (Content Delivery Networks – CDNs). Dies umfasst:</p>
        <ul className="list-disc list-inside space-y-1 pl-4">
            <li><strong>TailwindCSS</strong> (für das Design) von <code>cdn.tailwindcss.com</code></li>
            <li><strong>React und Recharts</strong> (die Kern-Bibliotheken der App) von <code>aistudiocdn.com</code></li>
        </ul>
        <p>Beim Laden dieser Dateien wird technisch bedingt Ihre IP-Adresse an die Server der jeweiligen CDNs übertragen. Dies ist erforderlich, damit die Inhalte an Ihren Browser ausgeliefert werden können. Es werden jedoch keine Anwendungsdaten (wie Gruppennamen oder Anwesenheitszahlen) übermittelt.</p>
        <p>Die Rechtsgrundlage für diese Datenübermittlung ist unser berechtigtes Interesse an einer technisch optimierten und sicheren Darstellung unserer Online-Anwendung gemäß Art. 6 Abs. 1 lit. f DSGVO und die technische Notwendigkeit nach § 25 Abs. 2 TDDDG, um Ihnen den von Ihnen ausdrücklich gewünschten Dienst zur Verfügung zu stellen.</p>

        <h3 className="text-xl font-semibold mt-6">4. Verwendung von Local Storage und Cookie-Einwilligung</h3>
        <p>Unsere Online-Anwendung setzt keine traditionellen Cookies im herkömmlichen Sinne. Stattdessen nutzen wir den "Local Storage" Ihres Browsers für einen einzigen, rein funktionalen Zweck:</p>
        <p>Wir speichern Ihre Entscheidung zur Datenschutzeinwilligung (akzeptiert/abgelehnt) unter dem Schlüssel <code>kitalytics_cookieConsent</code> im Local Storage Ihres Browsers. Dies dient ausschließlich dazu, das Cookie-Banner nach einer von Ihnen getroffenen Entscheidung nicht erneut anzuzeigen und Ihre Präferenz zu speichern. Es werden keinerlei Analyse- oder Marketingdaten gespeichert oder mit dieser Information verknüpft.</p>
        <p>Da der Zugriff auf den Local Storage für diese Funktion nicht unbedingt erforderlich ist, um einen von Ihnen ausdrücklich gewünschten Dienst bereitzustellen, holen wir Ihre Einwilligung über ein entsprechendes Cookie-Banner ein, bevor diese Information gespeichert wird.</p>
        <p><strong>Rechtsgrundlage:</strong> Die Speicherung Ihrer Einwilligung im Local Storage erfolgt auf Basis Ihrer Einwilligung gemäß § 25 Abs. 1 TDDDG und Art. 6 Abs. 1 lit. a DSGVO. Sie können Ihre Einwilligung jederzeit widerrufen, indem Sie die entsprechenden Einträge im Local Storage Ihres Browsers löschen oder Ihre Browsereinstellungen anpassen.</p>

        <h3 className="text-xl font-semibold mt-6">5. Keine Erfassung oder Verarbeitung weiterer personenbezogener Daten</h3>
        <p>Wir weisen ausdrücklich darauf hin, dass unsere Online-Anwendung, abgesehen von den bereits genannten Punkten (Hosting/Logfiles, externe CDNs, Local Storage für Einwilligung), keine weiteren personenbezogener Daten erhebt, verarbeitet oder speichert. Insbesondere:</p>
        <ul className="list-disc list-inside space-y-1 pl-4">
            <li>Es gibt <strong>kein Kontaktformular</strong>. Sie können uns über die im Impressum genannte E-Mail-Adresse kontaktieren.</li>
            <li>Es wird <strong>keine Tracking- oder Analyse-Software</strong> (wie Google Analytics, Matomo etc.) eingesetzt.</li>
            <li>Es sind <strong>keine Social Media Plugins</strong> integriert.</li>
            <li>Es werden <strong>keine Videos von externen Plattformen</strong> (wie YouTube, Vimeo etc.) eingebettet.</li>
        </ul>
        <p>Die Anwendung ist so konzipiert, dass alle von Ihnen eingegebenen Daten (z.B. Gruppennamen, Anwesenheitszahlen) ausschließlich lokal in Ihrem Browser verarbeitet und gespeichert werden. Diese Daten verlassen Ihren Rechner nicht und werden nicht an unsere Server oder Dritte übertragen.</p>

        <h3 className="text-xl font-semibold mt-6">6. Ihre Rechte als betroffene Person</h3>
        <p>Nach der DSGVO stehen Ihnen umfassende Rechte bezüglich Ihrer personenbezogenen Daten zu:</p>
        <ul className="list-disc list-inside space-y-1 pl-4">
            <li><strong>Recht auf Auskunft (Art. 15 DSGVO):</strong> Sie haben das Recht, Auskunft darüber zu verlangen, ob und welche personenbezogenen Daten von Ihnen verarbeitet werden.</li>
            <li><strong>Recht auf Berichtigung (Art. 16 DSGVO):</strong> Sie haben das Recht, die unverzügliche Berichtigung unrichtiger oder die Vervollständigung unvollständiger personenbezogener Daten zu verlangen.</li>
            <li><strong>Recht auf Löschung („Recht auf Vergessenwerden“) (Art. 17 DSGVO):</strong> Sie haben das Recht, die Löschung Ihrer bei uns gespeicherten personenbezogenen Daten zu verlangen, wenn diese nicht mehr erforderlich sind, widerrufen wurde oder unrechtmäßig verarbeitet werden.</li>
            <li><strong>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO):</strong> Sie haben das Recht, die Einschränkung der Verarbeitung Ihrer Daten zu verlangen, wenn deren Richtigkeit bestritten wird, die Verarbeitung unrechtmäßig ist oder Sie Widerspruch eingelegt haben.</li>
            <li><strong>Recht auf Datenübertragbarkeit (Art. 20 DSGVO):</strong> Sie haben das Recht, die Sie betreffenden personenbezogenen Daten, die Sie uns bereitgestellt haben, in einem strukturierten, gängigen und maschinenlesbaren Format zu erhalten, und Sie haben das Recht, diese Daten einem anderen Verantwortlichen ohne Behinderung zu übermitteln. Die Kernfunktion unserer App erlaubt es Ihnen, Ihre gesamten Anwendungsdaten (z.B. als JSON-Datei im Format .klgruppe, .kleinrichtung) direkt zu exportieren und zu speichern, was die technische Umsetzung dieses Rechts darstellt.</li>
            <li><strong>Widerspruchsrecht (Art. 21 DSGVO):</strong> Sie haben das Recht, aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit gegen die Verarbeitung Sie betreffender personenbezogener Daten, die aufgrund von Art. 6 Abs. 1 lit. e oder f DSGVO erfolgt, Widerspruch einzulegen.</li>
            <li><strong>Recht auf Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO):</strong> Sie haben unbeschadet eines anderweitigen verwaltungsrechtlichen oder gerichtlichen Rechtsbehelfs das Recht auf Beschwerde bei einer Aufsichtsbehörde, insbesondere in dem Mitgliedstaat Ihres Aufenthaltsorts, Ihres Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes, wenn Sie der Ansicht sind, dass die Verarbeitung der Sie betreffenden personenbezogenen Daten gegen die DSGVO verstößt.</li>
        </ul>

        <h3 className="text-xl font-semibold mt-6">7. Änderungen dieser Datenschutzerklärung</h3>
        <p>Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen rechtlichen Anforderungen entspricht oder um Änderungen unserer Leistungen in der Datenschutzerklärung umzusetzen, z. B. bei der Einführung neuer Dienste. Für Ihren erneuten Besuch gilt dann die neue Datenschutzerklärung.</p>
      </div>
      <div className="mt-6 text-right">
        <Button onClick={onClose} variant="secondary">Schließen</Button>
      </div>
    </Modal>
  );
};
