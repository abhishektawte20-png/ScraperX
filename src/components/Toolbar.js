import React, { useState, useEffect, useRef } from 'react';
import './Toolbar.css';

function Toolbar({ onCopy }) {
  const [status, setStatus] = useState('ready');
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseDown = (e) => {
      if (e.target.closest('.toolbar-header')) {
        setIsDragging(true);
        setDragOffset({
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        });
      }
    };

    const handleMouseMove = (e) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, position]);

  const handleCopy = async () => {
    setStatus('copying');
    try {
      await onCopy();
      setStatus('copied');
      setTimeout(() => setStatus('ready'), 2000);
    } catch (error) {
      setStatus('error');
      setTimeout(() => setStatus('ready'), 3000);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'copied': return '#4CAF50';
      case 'error': return '#f44336';
      case 'copying': return '#2196F3';
      default: return '#666';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'copied': return '✓ Copied';
      case 'error': return '✗ Error';
      case 'copying': return '⊙ Copying...';
      default: return '○ Ready';
    }
  };

  const toolbarStyle = {
    transform: 'translate(' + position.x + 'px, ' + position.y + 'px)',
    cursor: isDragging ? 'grabbing' : 'grab'
  };

  return (
    <div className="toolbar" style={toolbarStyle}>
      <div className="toolbar-header">
        <span className="toolbar-title">Clipboard AI</span>
      </div>
      <div className="toolbar-body">
        <div className="status-indicator" style={{ color: getStatusColor() }}>
          {getStatusText()}
        </div>
        <button className="toolbar-btn" onClick={handleCopy} disabled={status === 'copying'}>
          📋
        </button>
        <button className="toolbar-btn" onClick={() => window.electronAPI?.toolbar.hide()}>
          ✕
        </button>
      </div>
    </div>
  );
}

export default Toolbar;
