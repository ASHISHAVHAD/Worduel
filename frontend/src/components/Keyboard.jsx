import React from 'react';

const ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫'],
];

export default function Keyboard({ onKey, letterStatuses = {}, disabled = false }) {
  return (
    <div className={`wordle-keyboard ${disabled ? 'keyboard-disabled' : ''}`}>
      {ROWS.map((row, i) => (
        <div key={i} className="keyboard-row">
          {row.map(key => {
            const status = letterStatuses[key] || '';
            const isWide = key === 'ENTER' || key === '⌫';
            return (
              <button
                key={key}
                className={`key-btn ${status} ${isWide ? 'key-wide' : ''}`}
                onClick={() => !disabled && onKey(key)}
                disabled={disabled}
              >
                {key}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
