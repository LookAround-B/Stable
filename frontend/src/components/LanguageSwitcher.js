import React, { useEffect, useRef, useState } from 'react';
import { Languages } from 'lucide-react';
import { useI18n, LANGUAGES } from '../context/I18nContext';

const LanguageSwitcher = ({ compact }) => {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`searchable-select lang-dropdown${compact ? ' lang-dropdown--compact' : ''}${open ? ' open' : ''}`} ref={ref}>
      <button type="button" className="ss-trigger lang-trigger" onClick={() => setOpen((prev) => !prev)}>
        <Languages size={compact ? 15 : 14} className="lang-trigger-icon" />
        {!compact && <span className="lang-trigger-label">{LANGUAGES[lang]}</span>}
        {!compact && <span className="ss-arrow" />}
      </button>

      {open && (
        <div className="ss-dropdown lang-dropdown-menu">
          <ul className="ss-options">
            {Object.entries(LANGUAGES).map(([code, name]) => (
              <li
                key={code}
                className={`ss-option${code === lang ? ' selected' : ''}`}
                onClick={() => {
                  setLang(code);
                  setOpen(false);
                }}
              >
                {name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
