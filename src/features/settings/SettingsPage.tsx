import { Database, FileJson, FolderOpen, Download, Globe, SlidersHorizontal, Sword } from 'lucide-react'
import { BrandMark, StatusDot } from '../../components/Brand'
import { useLanguage } from '../../i18n/LanguageContext'
import type { ScanResult } from '../../types'

export function SettingsPage({
  scan, onChoose, onOpenFolder, onExport,
}: { scan: ScanResult; onChoose: () => void; onOpenFolder: () => void; onExport: (format: 'json' | 'csv') => void }) {
  const { language, setLanguage } = useLanguage()

  return (
    <section className="settings-page">
      <div className="settings-card panel">
        <div className="settings-card__icon"><FolderOpen size={21} /></div>
        <div className="settings-card__content">
          <p className="eyebrow">ŹRÓDŁO DANYCH</p>
          <h3>Katalog zapisów</h3>
          <p>Aplikacja obserwuje ten katalog i odświeża listę przy każdej zmianie pliku.</p>
          <code>{scan.directory}</code>
          <div className="settings-actions">
            <button className="button button--secondary" onClick={onChoose}><SlidersHorizontal size={16} /> Zmień katalog</button>
            <button className="button button--ghost" onClick={onOpenFolder}><FolderOpen size={16} /> Otwórz w Eksploratorze</button>
          </div>
        </div>
        <span className="success-pill"><StatusDot /> Wykryto</span>
      </div>

      <div className="settings-card panel">
        <div className="settings-card__icon"><Globe size={21} /></div>
        <div className="settings-card__content">
          <p className="eyebrow">JĘZYK</p>
          <h3>Interfejs aplikacji</h3>
          <p>Nazwy przedmiotów, NPC i questów zawsze preferują polski tekst gry, jeśli jest dostępny — niezależnie od tego ustawienia.</p>
          <div className="settings-actions">
            <button className={`button ${language === 'pl' ? 'button--primary' : 'button--secondary'}`} onClick={() => setLanguage('pl')}>Polski</button>
            <button className={`button ${language === 'en' ? 'button--primary' : 'button--secondary'}`} onClick={() => setLanguage('en')}>English</button>
          </div>
        </div>
      </div>

      <div className="settings-card panel">
        <div className="settings-card__icon"><Database size={21} /></div>
        <div className="settings-card__content">
          <p className="eyebrow">PRZENOŚNE DANE</p>
          <h3>Eksport danych</h3>
          <p>Zapisz odczytane metadane zapisów bez miniaturek i bez modyfikowania oryginalnych plików gry. Aplikacja nigdy nie kopiuje zapisów — jedyną drogą wyjścia danych jest eksport.</p>
          <div className="settings-actions">
            <button className="button button--secondary" onClick={() => onExport('json')}><FileJson size={16} /> Eksport JSON</button>
            <button className="button button--ghost" onClick={() => onExport('csv')}><Download size={16} /> Eksport CSV</button>
          </div>
        </div>
      </div>

      <div className="settings-card panel settings-card--telemetry">
        <div className="settings-card__icon"><Sword size={21} /></div>
        <div className="settings-card__content">
          <p className="eyebrow">GŁĘBOKA TELEMETRIA</p>
          <h3>Dekoder rdzenia GSAV</h3>
          <p>Lokalnie rozpakowuje prywatną warstwę zapisu: atrybuty, umiejętności, pełny ekwipunek, zadania, NPC, handlarzy, kompendium, dziennik zdarzeń i stan fabuły. Oryginalny plik nigdy nie jest modyfikowany w trybie eksploratora.</p>
          <div className="connector-status">
            <span>Metadane i miniatury</span><b>ONLINE</b><i />
            <span>Rdzeń Oodle Kraken</span><b>ONLINE</b>
          </div>
        </div>
      </div>

      <div className="about-line"><BrandMark small /><div><strong>Gothic Remake Save Explorer</strong><span>wersja 1.0.0 · nieoficjalna aplikacja towarzysząca</span></div></div>
    </section>
  )
}
