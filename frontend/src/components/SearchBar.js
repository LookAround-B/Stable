import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Calendar,
  CheckSquare,
  Cog,
  DollarSign,
  FileText,
  Leaf,
  LayoutDashboard,
  Navigation,
  Package,
  Pill,
  Search,
  Settings2,
  Shield,
  ShoppingCart,
  Stethoscope,
  Users,
  UtensilsCrossed,
  X,
  Clipboard,
  DoorOpen,
  Heart,
  Scissors,
} from 'lucide-react';
import { FaHorse } from 'react-icons/fa';
import SearchService from '../services/searchService';
import { useI18n } from '../context/I18nContext';
import './SearchBar.css';

// All navigation items for global search
const NAVIGATION_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', group: 'Main', icon: LayoutDashboard },
  { to: '/analysis', label: 'Analysis', group: 'Main', icon: BarChart3 },
  // Organisation
  { to: '/horses', label: 'Horses', group: 'Organisation', icon: Settings2 },
  { to: '/employees', label: 'Team', group: 'Organisation', icon: Settings2 },
  // Tasks & Approvals
  { to: '/tasks', label: 'Tasks', group: 'Tasks & Approvals', icon: CheckSquare },
  { to: '/bookings', label: 'Bookings', group: 'Tasks & Approvals', icon: CheckSquare },
  { to: '/my-assigned-tasks', label: 'My Assigned Tasks', group: 'Tasks & Approvals', icon: CheckSquare },
  { to: '/pending-approvals', label: 'Approvals', group: 'Tasks & Approvals', icon: CheckSquare },
  { to: '/meetings', label: 'Meetings', group: 'Tasks & Approvals', icon: CheckSquare },
  // Stable Operations
  { to: '/medicine-logs', label: 'Medicine Logs', group: 'Stable Operations', icon: Stethoscope },
  { to: '/horse-care-team', label: 'Care Teams', group: 'Stable Operations', icon: Stethoscope },
  { to: '/medicine-inventory', label: 'Medicine Inventory', group: 'Stable Operations', icon: Stethoscope },
  { to: '/horse-feeds', label: 'Horse Feeds', group: 'Stable Operations', icon: Stethoscope },
  { to: '/feed-inventory', label: 'Feed Inventory', group: 'Stable Operations', icon: Stethoscope },
  { to: '/farrier-shoeing', label: 'Farrier Shoeing', group: 'Stable Operations', icon: Stethoscope },
  { to: '/tack-inventory', label: 'Tack Inventory', group: 'Stable Operations', icon: Stethoscope },
  { to: '/grass-bedding', label: 'Grass & Bedding', group: 'Stable Operations', icon: Stethoscope },
  { to: '/farrier-inventory', label: 'Farrier Inventory', group: 'Stable Operations', icon: Stethoscope },
  // Ground Operations
  { to: '/gate-entry', label: 'Gate Register', group: 'Ground Operations', icon: Cog },
  { to: '/gate-attendance', label: 'Gate Attendance', group: 'Ground Operations', icon: Cog },
  { to: '/daily-attendance', label: 'Daily Register', group: 'Ground Operations', icon: Cog },
  { to: '/team-attendance', label: 'Mark Attendance', group: 'Ground Operations', icon: Cog },
  { to: '/digital-attendance', label: 'Digital Attendance', group: 'Ground Operations', icon: Cog },
  { to: '/groom-worksheet', label: 'Groom Worksheet', group: 'Ground Operations', icon: Cog },
  { to: '/work-records', label: 'Work Record', group: 'Ground Operations', icon: Cog },
  { to: '/daily-work-records', label: 'Daily Work Records', group: 'Ground Operations', icon: Cog },
  { to: '/inspections', label: 'Inspection Rounds', group: 'Ground Operations', icon: Cog },
  { to: '/housekeeping-inventory', label: 'Housekeeping Inventory', group: 'Ground Operations', icon: Cog },
  // Restaurant
  { to: '/groceries-inventory', label: 'Groceries Inventory', group: 'Restaurant', icon: UtensilsCrossed },
  // Accounts & Finance
  { to: '/invoice-generation', label: 'Invoice Generation', group: 'Accounts & Finance', icon: DollarSign },
  { to: '/expenses', label: 'Expense Tracking', group: 'Accounts & Finance', icon: DollarSign },
  { to: '/fines', label: 'Fine System', group: 'Accounts & Finance', icon: DollarSign },
  // System
  { to: '/reports', label: 'Reports', group: 'System', icon: Shield },
  { to: '/permissions', label: 'Permissions', group: 'System', icon: Shield },
  { to: '/entity-map', label: 'Entity Map', group: 'System', icon: Shield },
  { to: '/profile', label: 'Profile', group: 'System', icon: Shield },
];

// Entity display configurations
const ENTITY_CONFIG = {
  horses: {
    icon: FaHorse,
    label: 'Horses',
    route: '/horses',
    getName: (item) => item.name,
    getMeta: (item) => item.breed,
  },
  employees: {
    icon: Users,
    label: 'Team Members',
    route: '/employees',
    getName: (item) => item.fullName || item.name,
    getMeta: (item) => item.designation || item.role,
  },
  tasks: {
    icon: CheckSquare,
    label: 'Tasks',
    route: '/tasks',
    getName: (item) => item.title || item.name,
    getMeta: (item) => item.status,
  },
  meetings: {
    icon: Calendar,
    label: 'Meetings',
    route: '/meetings',
    getName: (item) => item.title || item.name,
    getMeta: (item) => item.date ? new Date(item.date).toLocaleDateString() : null,
  },
  medicineLogs: {
    icon: Pill,
    label: 'Medicine Logs',
    route: '/medicine-logs',
    getName: (item) => item.medicineName || item.name || `Log #${item.id}`,
    getMeta: (item) => item.horseName || item.status,
  },
  medicineInventory: {
    icon: Pill,
    label: 'Medicine Inventory',
    route: '/medicine-inventory',
    getName: (item) => item.name || item.medicineName,
    getMeta: (item) => item.quantity ? `Qty: ${item.quantity}` : null,
  },
  feedInventory: {
    icon: Package,
    label: 'Feed Inventory',
    route: '/feed-inventory',
    getName: (item) => item.name || item.feedName,
    getMeta: (item) => item.quantity ? `Qty: ${item.quantity}` : null,
  },
  horseFeeds: {
    icon: UtensilsCrossed,
    label: 'Horse Feeds',
    route: '/horse-feeds',
    getName: (item) => item.horseName || item.name,
    getMeta: (item) => item.feedType,
  },
  tackInventory: {
    icon: Package,
    label: 'Tack Inventory',
    route: '/tack-inventory',
    getName: (item) => item.name || item.itemName,
    getMeta: (item) => item.category || item.type,
  },
  farrierShoeing: {
    icon: Scissors,
    label: 'Farrier Shoeing',
    route: '/farrier-shoeing',
    getName: (item) => item.horseName || item.name,
    getMeta: (item) => item.date ? new Date(item.date).toLocaleDateString() : null,
  },
  farrierInventory: {
    icon: Package,
    label: 'Farrier Inventory',
    route: '/farrier-inventory',
    getName: (item) => item.name || item.itemName,
    getMeta: (item) => item.quantity ? `Qty: ${item.quantity}` : null,
  },
  grassBedding: {
    icon: Leaf,
    label: 'Grass & Bedding',
    route: '/grass-bedding',
    getName: (item) => item.name || item.type,
    getMeta: (item) => item.quantity ? `Qty: ${item.quantity}` : null,
  },
  housekeepingInventory: {
    icon: Package,
    label: 'Housekeeping',
    route: '/housekeeping-inventory',
    getName: (item) => item.name || item.itemName,
    getMeta: (item) => item.quantity ? `Qty: ${item.quantity}` : null,
  },
  groceriesInventory: {
    icon: ShoppingCart,
    label: 'Groceries',
    route: '/groceries-inventory',
    getName: (item) => item.name || item.itemName,
    getMeta: (item) => item.quantity ? `Qty: ${item.quantity}` : null,
  },
  inspections: {
    icon: Clipboard,
    label: 'Inspections',
    route: '/inspections',
    getName: (item) => item.title || item.name || `Inspection #${item.id}`,
    getMeta: (item) => item.date ? new Date(item.date).toLocaleDateString() : item.status,
  },
  gateEntries: {
    icon: DoorOpen,
    label: 'Gate Entries',
    route: '/gate-entry',
    getName: (item) => item.visitorName || item.name || `Entry #${item.id}`,
    getMeta: (item) => item.entryTime ? new Date(item.entryTime).toLocaleString() : null,
  },
  expenses: {
    icon: DollarSign,
    label: 'Expenses',
    route: '/expenses',
    getName: (item) => item.description || item.name || item.category,
    getMeta: (item) => item.amount ? `$${item.amount}` : null,
  },
  fines: {
    icon: FileText,
    label: 'Fines',
    route: '/fines',
    getName: (item) => item.reason || item.description || `Fine #${item.id}`,
    getMeta: (item) => item.amount ? `$${item.amount}` : null,
  },
  healthRecords: {
    icon: Heart,
    label: 'Health Records',
    route: '/health-records',
    getName: (item) => item.horseName || item.diagnosis || `Record #${item.id}`,
    getMeta: (item) => item.date ? new Date(item.date).toLocaleDateString() : null,
  },
};

const SearchBar = ({ placeholder }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({});
  const [navResults, setNavResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { t } = useI18n();

  // Keyboard shortcut: Cmd+K / Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter navigation items and search API
  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (query.trim().length < 1) {
        setResults({});
        setNavResults([]);
        setIsOpen(false);
        return;
      }

      // Filter navigation items locally (instant)
      const lowerQuery = query.toLowerCase();
      const filteredNav = NAVIGATION_ITEMS.filter(
        (item) =>
          item.label.toLowerCase().includes(lowerQuery) ||
          item.group.toLowerCase().includes(lowerQuery)
      );
      setNavResults(filteredNav);

      // Search API for all entities
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

  const handleResultClick = (type, item, route) => {
    if (type === 'nav') {
      navigate(item.to);
    } else {
      navigate(`${route}?highlight=${item.id}`);
    }
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setResults({});
    setNavResults([]);
    setIsOpen(false);
  };

  // Calculate total results
  const totalResults = navResults.length + Object.values(results).reduce((acc, arr) => acc + (arr?.length || 0), 0);

  // Get non-empty entity results
  const entityResults = Object.entries(ENTITY_CONFIG)
    .filter(([key]) => results[key]?.length > 0)
    .map(([key, config]) => ({
      key,
      config,
      items: results[key],
    }));

  return (
    <div className="search-bar-container" ref={searchRef}>
      <div className="search-bar-wrapper">
        <Search size={16} className="search-icon" />
        <input
          ref={inputRef}
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
              {/* Navigation/Pages Results */}
              {navResults.length > 0 && (
                <div className="results-section">
                  <div className="results-section-title">
                    <Navigation size={14} style={{ marginRight: 6 }} /> {t('Pages')}
                  </div>
                  <ul className="results-list">
                    {navResults.slice(0, 6).map((item) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.to}>
                          <button className="result-item" type="button" onClick={() => handleResultClick('nav', item)}>
                            <Icon size={14} style={{ marginRight: 8, opacity: 0.6 }} />
                            <span className="result-name">{t(item.label)}</span>
                            <span className="result-meta">{t(item.group)}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* All Entity Results */}
              {entityResults.map(({ key, config, items }) => {
                const Icon = config.icon;
                return (
                  <div key={key} className="results-section">
                    <div className="results-section-title">
                      <Icon size={14} style={{ marginRight: 6 }} /> {t(config.label)}
                    </div>
                    <ul className="results-list">
                      {items.slice(0, 5).map((item) => (
                        <li key={item.id}>
                          <button
                            className="result-item"
                            type="button"
                            onClick={() => handleResultClick(key, item, config.route)}
                          >
                            <span className="result-name">{config.getName(item)}</span>
                            {config.getMeta(item) && <span className="result-meta">{config.getMeta(item)}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
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
