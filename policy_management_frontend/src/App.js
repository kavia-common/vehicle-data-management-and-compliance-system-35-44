import React, { useState, useEffect } from 'react';
import './App.css';
import VehicleManagementPage from './components/VehicleManagement/VehicleManagementPage';

// PUBLIC_INTERFACE
function App() {
  const [theme, setTheme] = useState('light');

  // Effect to apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="App">
      <header className="App-header" style={{ minHeight: 'auto', padding: 16 }}>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
        <div style={{ width: '100%', maxWidth: 1280, margin: '0 auto' }}>
          <VehicleManagementPage />
        </div>
      </header>
    </div>
  );
}

export default App;
