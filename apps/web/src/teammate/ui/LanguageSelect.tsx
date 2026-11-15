// Language selector: native <select> (keyboard, screen readers and phones handle it), self-named options, no flags.
import { Languages } from 'lucide-react';
import { useI18n } from '../i18n';
import { LOCALE_LABEL, LOCALE_SHORT, LOCALES, isLocale } from '../i18n/locale';

export function LanguageSelect({ compact = false, id = 'idioma' }: { compact?: boolean; id?: string }) {
  const { chosen, setLocale, t } = useI18n();
  return (
    <label className="lang-select" htmlFor={id} title="Language">
      <Languages size={18} aria-hidden />
      <span className="sr-only">{t('lang.label')} (Language)</span>
      <select id={id} className="lang-select__input" value={chosen} onChange={(e) => { if (isLocale(e.target.value)) setLocale(e.target.value); }} data-testid="language-select">
        {LOCALES.map((l) => <option key={l} value={l} lang={l}>{compact ? LOCALE_SHORT[l] : LOCALE_LABEL[l]}</option>)}
      </select>
    </label>
  );
}
