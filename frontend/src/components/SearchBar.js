import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchService from '../services/searchService';
import { Search, X, Users, CheckSquare } from 'lucide-react';
import { FaHorse } from 'react-icons/fa';
import { useI18n } from '../context/I18nContext';
import './SearchBar.css';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ horses: [], employees: [], tasks: [] });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();
  const { t } = useI18n();

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length >= 1) {
        setIsLoading(true);
        console.log('🔍 Searching for:', query);
        const searchResults = await SearchService.searchAll(query);
        console.log('✓ Search results:', searchResults);
        setResults(searchResults);
        setIsOpen(true);
        setIsLoading(false);
      } else {
        setResults({ horses: [], employees: [], tasks: [] });
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close search when clicking outside
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
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder={t("Search horses, emp..")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 1 && setIsOpen(true)}
          className="search-input"
        />
        {query && (
          <button onClick={handleClear} className="search-clear">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="search-results-dropdown">
          {isLoading ? (
            <div className="search-loading">
              <div className="spinner"></div>
              {t('Searching...')}
            </div>
          ) : totalResults > 0 ? (
            <>
              {/* Horses Results */}
              {results.horses.length > 0 && (
                <div className="results-section">
                  <div className="results-section-title">
                    <FaHorse size={14} style={{ marginRight: '6px' }} /> {t('Horses')}
                  </div>
                  <ul className="results-list">
                    {results.horses.map((horse) => (
                      <li key={horse.id}>
                        <button
                          className="result-item"
                          onClick={() => handleResultClick('horse', horse)}
                        >
                          <span className="result-name">{horse.name}</span>
                          {horse.breed && <span className="result-meta">{horse.breed}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Employees Results */}
              {results.employees.length > 0 && (
                <div className="results-section">
                  <div className="results-section-title">
                    <Users size={14} style={{ marginRight: '6px' }} /> {t('Employees')}
                  </div>
                  <ul className="results-list">
                    {results.employees.map((employee) => (
                      <li key={employee.id}>
                        <button
                          className="result-item"
                          onClick={() => handleResultClick('employee', employee)}
                        >
                          <span className="result-name">{employee.fullName}</span>
                          {employee.designation && (
                            <span className="result-meta">{employee.designation}</span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tasks Results */}
              {results.tasks.length > 0 && (
                <div className="results-section">
                  <div className="results-section-title">
                    <CheckSquare size={14} style={{ marginRight: '6px' }} /> {t('Tasks')}
                  </div>
                  <ul className="results-list">
                    {results.tasks.map((task) => (
                      <li key={task.id}>
                        <button
                          className="result-item"
                          onClick={() => handleResultClick('task', task)}
                        >
                          <span className="result-name">{task.title}</span>
                          {task.dueDate && (
                            <span className="result-meta">
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
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
