import React, { useState, useEffect } from 'react';
import './App.css';
import Toolbar from './components/Toolbar';
import DataMapper from './components/DataMapper';

function App() {
  const [isToolbar, setIsToolbar] = useState(false);
  const [showMapper, setShowMapper] = useState(false);
  const [copiedData, setCopiedData] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('toolbar') === 'true') {
      setIsToolbar(true);
    }
  }, []);

  const handleCopy = async () => {
    try {
      let data;
      
      if (window.electronAPI) {
        data = await window.electronAPI.clipboard.read();
      } else {
        const text = prompt('Paste your clipboard text here:') || '';
        data = { text, hasImage: false, imageDataUrl: null };
      }
      
      if (data.error) {
        alert('Error: ' + data.error);
        return;
      }
      setCopiedData(data);
      setShowMapper(true);
    } catch (error) {
      alert('Clipboard error: ' + error.message);
    }
  };

  if (isToolbar) {
    return <Toolbar onCopy={handleCopy} />;
  }

  return (
    <div className="app">
      {showMapper && copiedData ? (
        <DataMapper data={copiedData} onClose={() => setShowMapper(false)} />
      ) : (
        <div className="welcome-screen">
          <h1>ScraperX Autofill</h1>
          <p>Intelligent clipboard data extraction and mapping</p>
          <button onClick={handleCopy} className="btn-primary">
            Start: Copy from Clipboard
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
