import React, { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useI18n, LANGUAGES } from '../context/I18nContext';

const LanguageSwitcher = ({ compact }) => {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`searchable-select lang-dropdown${compact ? ' lang-dropdown--compact' : ''}${open ? ' open' : ''}`} ref={ref}>
      <button
        type="button"
        className="ss-trigger lang-trigger"
        onClick={() => setOpen(prev => !prev)}
      >
        <Globe size={compact ? 13 : 14} className="lang-trigger-icon" />
        <span className="lang-trigger-label">{LANGUAGES[lang]}</span>
        <span className="ss-arrow" />
      </button>
      {open && (
        <div className="ss-dropdown lang-dropdown-menu">
          <ul className="ss-options">
            {Object.entries(LANGUAGES).map(([code, name]) => (
              <li
                key={code}
                className={`ss-option${code === lang ? ' selected' : ''}`}
                onClick={() => { setLang(code); setOpen(false); }}
              >
                {name}
                {code === lang && <span className="ss-check">✔</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
