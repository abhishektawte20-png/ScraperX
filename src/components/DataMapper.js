import React, { useState } from 'react';
import './DataMapper.css';

function DataMapper({ data, onClose }) {
  const [fields, setFields] = useState([
    { name: 'Content', value: data.text || '', checked: true }
  ]);

  const applyAll = async () => {
    const text = fields.filter(f => f.checked).map(f => f.name + ': ' + f.value).join('\n');
    try {
      await window.electronAPI.clipboard.write(text);
      alert('✓ Copied to clipboard!');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  return (
    <div className="mapper">
      <div className="mapper-header">
        <h1>Data Mapper</h1>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>
      <div className="mapper-fields">
        {fields.map((field, i) => (
          <div key={i} className="field-row">
            <input type="checkbox" checked={field.checked} onChange={() => {
              const updated = [...fields];
              updated[i].checked = !updated[i].checked;
              setFields(updated);
            }} />
            <div className="field-info">
              <label>{field.name}</label>
              <input type="text" value={field.value} onChange={(e) => {
                const updated = [...fields];
                updated[i].value = e.target.value;
                setFields(updated);
              }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mapper-footer">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={applyAll}>Apply All</button>
      </div>
    </div>
  );
}

export default DataMapper;
