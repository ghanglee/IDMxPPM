import React from 'react';
import { useTheme } from '../../hooks/useTheme';
import { SunIcon, MoonIcon } from '../icons';
import './SpecNameBar.css';

/**
 * SpecNameBar Component
 * Top bar displaying specification name and theme toggle
 */
const SpecNameBar = ({ specName = 'Untitled Project' }) => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <div className="spec-name-bar">
      <div className="spec-name-bar-left">
        {/* Space reserved for Mac window buttons */}
      </div>

      <div className="spec-name-bar-center">
        <span className="spec-name">{specName || 'Untitled Project'}</span>
      </div>

      <div className="spec-name-bar-right">
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
        </button>
      </div>
    </div>
  );
};

export default SpecNameBar;
