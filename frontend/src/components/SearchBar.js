import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, Search, Users, X } from 'lucide-react';
import { FaHorse } from 'react-icons/fa';
import SearchService from '../services/searchService';
import { useI18n } from '../context/I18nContext';
import './SearchBar.css';

const SearchBar = ({ placeholder }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ horses: [], employees: [], tasks: [] });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (query.trim().length < 1) {
        setResults({ horses: [], employees: [], tasks: [] });
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      const searchResults = await SearchService.searchAll(query);
      setResults(searchResults);
      setIsOpen(true);
      setIsLoading(false);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (type, item) => {
    switch (type) {
      case 'horse':
        navigate(`/horses?highlight=${item.id}`);
        break;
      case 'employee':
        navigate(`/employees?highlight=${item.id}`);
        break;
      case 'task':
        navigate(`/tasks/${item.id}`);
        break;
      default:
        break;
    }
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setResults({ horses: [], employees: [], tasks: [] });
    setIsOpen(false);
  };

  const totalResults = results.horses.length + results.employees.length + results.tasks.length;

  return (
    <div className="search-bar-container" ref={searchRef}>
      <div className="search-bar-wrapper">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder={placeholder || t('Command + K to search...')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => query.trim().length >= 1 && setIsOpen(true)}
          className="search-input"
        />
        {query && (
          <button onClick={handleClear} className="search-clear" type="button" aria-label="Clear search">
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="search-results-dropdown">
          {isLoading ? (
            <div className="search-loading">
              <div className="spinner" />
              {t('Searching...')}
            </div>
          ) : totalResults > 0 ? (
            <>
              {results.horses.length > 0 && (
                <div className="results-section">
                  <div className="results-section-title">
                    <FaHorse size={14} style={{ marginRight: 6 }} /> {t('Horses')}
                  </div>
                  <ul className="results-list">
                    {results.horses.map((horse) => (
                      <li key={horse.id}>
                        <button className="result-item" type="button" onClick={() => handleResultClick('horse', horse)}>
                          <span className="result-name">{horse.name}</span>
                          {horse.breed && <span className="result-meta">{horse.breed}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {results.employees.length > 0 && (
                <div className="results-section">
                  <div className="results-section-title">
                    <Users size={14} style={{ marginRight: 6 }} /> {t('Employees')}
                  </div>
                  <ul className="results-list">
                    {results.employees.map((employee) => (
                      <li key={employee.id}>
                        <button className="result-item" type="button" onClick={() => handleResultClick('employee', employee)}>
                          <span className="result-name">{employee.fullName}</span>
                          {employee.designation && <span className="result-meta">{employee.designation}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {results.tasks.length > 0 && (
                <div className="results-section">
                  <div className="results-section-title">
                    <CheckSquare size={14} style={{ marginRight: 6 }} /> {t('Tasks')}
                  </div>
                  <ul className="results-list">
                    {results.tasks.map((task) => (
                      <li key={task.id}>
                        <button className="result-item" type="button" onClick={() => handleResultClick('task', task)}>
                          <span className="result-name">{task.title}</span>
                          {task.dueDate && <span className="result-meta">Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="search-empty">
              {t('No results found for')} "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
