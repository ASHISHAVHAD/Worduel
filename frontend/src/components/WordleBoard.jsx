import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ROWS = 6;
const COLS = 5;

function Tile({ letter, status, revealed, delay = 0 }) {
  return (
    <motion.div
      className={`wordle-tile ${status || ''} ${letter ? 'filled' : ''}`}
      initial={letter && !revealed ? { scale: 0.8 } : {}}
      animate={letter && !revealed ? { scale: 1 } : {}}
      transition={{ duration: 0.1 }}
    >
      {revealed ? (
        <motion.div
          className="tile-inner"
          initial={{ rotateX: 0 }}
          animate={{ rotateX: [0, -90, 0] }}
          transition={{ duration: 0.5, delay, ease: 'easeInOut' }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {letter}
        </motion.div>
      ) : (
        <span>{letter}</span>
      )}
    </motion.div>
  );
}

export default function WordleBoard({
  guesses = [],         // [{guess, result}]
  currentGuess = '',
  shake = false,
  disabled = false,
}) {
  const rows = [];

  // Fill completed rows
  for (let i = 0; i < guesses.length; i++) {
    const g = guesses[i];
    rows.push(
      <motion.div
        key={i}
        className="wordle-row"
        animate={shake && i === guesses.length - 1 ? { x: [-8, 8, -6, 6, -4, 4, 0] } : {}}
        transition={{ duration: 0.4 }}
      >
        {g.result.map((r, j) => (
          <Tile
            key={j}
            letter={r.letter}
            status={r.status}
            revealed={true}
            delay={j * 0.1}
          />
        ))}
      </motion.div>
    );
  }

  // Current row
  if (guesses.length < ROWS) {
    const cur = currentGuess.toUpperCase().padEnd(5, ' ').split('');
    rows.push(
      <motion.div
        key="current"
        className="wordle-row"
        animate={shake ? { x: [-8, 8, -6, 6, -4, 4, 0] } : {}}
        transition={{ duration: 0.4 }}
      >
        {cur.map((l, j) => (
          <Tile key={j} letter={l.trim()} status="" revealed={false} />
        ))}
      </motion.div>
    );
  }

  // Empty rows
  const remaining = ROWS - rows.length;
  for (let i = 0; i < remaining; i++) {
    rows.push(
      <div key={`empty-${i}`} className="wordle-row">
        {Array(COLS).fill('').map((_, j) => (
          <Tile key={j} letter="" status="" revealed={false} />
        ))}
      </div>
    );
  }

  return (
    <div className={`wordle-board ${disabled ? 'board-disabled' : ''}`}>
      {rows}
    </div>
  );
}
