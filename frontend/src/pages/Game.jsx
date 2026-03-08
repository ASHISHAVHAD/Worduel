import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { getRoom, getGame, submitGuess, nextRound } from '../services/api';
import WordleBoard from '../components/WordleBoard';
import Keyboard from '../components/Keyboard';

function Timer({ seconds, active, onExpire }) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { clearInterval(id); onExpire?.(); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [active, seconds]);

  const pct = (remaining / seconds) * 100;
  const color = remaining > 10 ? '#22c55e' : remaining > 5 ? '#f59e0b' : '#ef4444';

  return (
    <div className="timer-widget">
      <div className="timer-ring" style={{ '--pct': pct, '--color': color }}>
        <span className="timer-num" style={{ color }}>{remaining}</span>
      </div>
    </div>
  );
}

export default function GamePage() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [game, setGame] = useState(null);
  const [currentGuess, setCurrentGuess] = useState('');
  const [shake, setShake] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [roundWinner, setRoundWinner] = useState(null);
  const [matchOver, setMatchOver] = useState(false);
  const [coinToss, setCoinToss] = useState(null);
  const pollRef = useRef(null);

  const myId = user?.username;
  const isMyTurn = game?.mode === 'duel'
    ? game?.current_turn === myId
    : !game?.eliminated?.includes(myId);

  const myGuesses = game?.guesses?.[myId] || [];
  const letterStatuses = {};
  myGuesses.forEach(g => {
    g.result.forEach(r => {
      const prev = letterStatuses[r.letter];
      if (prev === 'correct') return;
      if (prev === 'present' && r.status !== 'correct') return;
      letterStatuses[r.letter] = r.status;
    });
  });

  const fetchAll = useCallback(async () => {
    try {
      const rRes = await getRoom(roomId);
      setRoom(rRes.data);
      if (rRes.data.current_game_id) {
        const gRes = await getGame(rRes.data.current_game_id, myId);
        setGame(gRes.data);
        if (gRes.data.status === 'round_over' && !showResult) {
          setRoundWinner(gRes.data.winner);
          setShowResult(true);
        }
      }
      if (rRes.data.status === 'finished') {
        setMatchOver(true);
        clearInterval(pollRef.current);
      }
    } catch (err) { /* ignore */ }
  }, [roomId, myId, showResult]);

  useEffect(() => {
    // Show coin toss on round 1
    if (game?.round === 1 && game?.mode === 'duel' && game?.first_guesser) {
      setCoinToss(game.first_guesser);
      setTimeout(() => setCoinToss(null), 3000);
    }
  }, [game?.round, game?.mode, game?.first_guesser]);

  useEffect(() => {
    fetchAll();
    pollRef.current = setInterval(fetchAll, 1500);
    return () => clearInterval(pollRef.current);
  }, [roomId]);

  const handleKey = useCallback(async (key) => {
    if (!isMyTurn || game?.status !== 'active') return;
    if (key === '⌫') {
      setCurrentGuess(g => g.slice(0, -1));
    } else if (key === 'ENTER') {
      if (currentGuess.length !== 5) {
        setShake(true);
        setTimeout(() => setShake(false), 500);
        toast.error('Word must be 5 letters');
        return;
      }
      try {
        const res = await submitGuess(game.game_id, myId, currentGuess);
        setCurrentGuess('');
        setGame(res.data.game);
        if (res.data.solved) {
          toast.success('🎉 You solved it!');
        }
        if (res.data.game.status === 'round_over') {
          setRoundWinner(res.data.game.winner);
          setShowResult(true);
          setGame({ ...res.data.game, word: res.data.word || res.data.game.word });
        }
      } catch (err) {
        toast.error(err.response?.data?.detail || 'Invalid guess');
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } else if (currentGuess.length < 5) {
      setCurrentGuess(g => (g + key).toUpperCase());
    }
  }, [isMyTurn, game, currentGuess, myId]);

  useEffect(() => {
    const handler = (e) => {
      const key = e.key;
      if (key === 'Backspace') handleKey('⌫');
      else if (key === 'Enter') handleKey('ENTER');
      else if (/^[a-zA-Z]$/.test(key)) handleKey(key.toUpperCase());
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKey]);

  const handleNextRound = async () => {
    setShowResult(false);
    setRoundWinner(null);
    setCurrentGuess('');
    try {
      const res = await nextRound(roomId);
      setRoom(res.data.room);
      setGame(res.data.game);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not start next round');
    }
  };

  if (!room || !game) {
    return <div className="loading-screen">⚔️ Loading game...</div>;
  }

  const opponents = room.players.filter(p => p !== myId);
  const isHost = room.host === myId;

  return (
    <div className="game-page">
      {/* Coin Toss Overlay */}
      <AnimatePresence>
        {coinToss && (
          <motion.div
            className="coin-toss-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="coin-toss-card"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', duration: 0.8 }}
            >
              <div className="coin-emoji">🪙</div>
              <h3>{coinToss === myId ? 'You go first!' : `${coinToss} goes first!`}</h3>
              <p className="text-muted">Coin toss decided</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Match Over Overlay */}
      <AnimatePresence>
        {matchOver && (
          <motion.div
            className="coin-toss-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="result-card"
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring' }}
            >
              <div className="result-emoji">{room.match_winner === myId ? '🏆' : '💀'}</div>
              <h2 className="result-title">
                {room.match_winner === myId ? 'VICTORY!' : 'DEFEAT'}
              </h2>
              <p className="text-muted">
                {room.match_winner === myId ? `You won the match!` : `${room.match_winner} won the match`}
              </p>
              <div className="score-final mt-3 mb-4">
                {room.players.map(p => (
                  <div key={p} className={`score-row ${p === myId ? 'you' : ''}`}>
                    <span>{p === myId ? '👤 You' : `👾 ${p}`}</span>
                    <span className="fw-bold">{room.scores[p]} rounds</span>
                  </div>
                ))}
              </div>
              <button className="btn btn-warning fw-bold px-4" onClick={() => navigate('/play')}>
                Play Again
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Round Result Overlay */}
      <AnimatePresence>
        {showResult && !matchOver && (
          <motion.div
            className="round-result-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="round-result-card"
              initial={{ y: -40, scale: 0.9 }}
              animate={{ y: 0, scale: 1 }}
            >
              <div className="round-result-emoji">
                {roundWinner === myId ? '🎉' : roundWinner ? '😤' : '🤝'}
              </div>
              <h3>
                {roundWinner === myId
                  ? 'Round Won!'
                  : roundWinner
                  ? `${roundWinner} won this round`
                  : "It's a draw!"}
              </h3>
              {game.word && (
                <div className="word-reveal mt-2">
                  The word was: <strong className="text-warning">{game.word}</strong>
                </div>
              )}
              <div className="scores-mini mt-3">
                {room.players.map(p => (
                  <span key={p} className={`score-chip ${p === myId ? 'you' : ''}`}>
                    {p}: {room.scores[p]}
                  </span>
                ))}
              </div>
              {isHost && room.current_round < room.rounds && (
                <button className="btn btn-warning mt-3 fw-bold" onClick={handleNextRound}>
                  Next Round ▶
                </button>
              )}
              {!isHost && (
                <p className="text-muted mt-3 small">Waiting for host...</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game UI */}
      <div className="game-layout">
        {/* Left Panel: Info */}
        <div className="game-sidebar">
          <div className="round-info">
            <span className="round-badge">Round {game.round}/{room.rounds}</span>
          </div>

          <div className="scores-panel mt-3">
            {room.players.map(p => (
              <div key={p} className={`score-entry ${p === myId ? 'me' : ''} ${game.eliminated?.includes(p) ? 'elim' : ''}`}>
                <span className="score-name">{p === myId ? '👤 You' : `👾 ${p}`}</span>
                <span className="score-val">{room.scores[p]}</span>
              </div>
            ))}
          </div>

          {game.mode === 'duel' && (
            <div className="turn-indicator mt-3">
              {isMyTurn ? (
                <motion.div
                  className="your-turn"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                >
                  ⚡ YOUR TURN
                </motion.div>
              ) : (
                <div className="opp-turn">⏳ {game.current_turn}'s turn</div>
              )}
              {isMyTurn && room.time_limit > 0 && (
                <Timer
                  key={game.current_turn}
                  seconds={room.time_limit}
                  active={isMyTurn && game.status === 'active'}
                />
              )}
            </div>
          )}

          {game.mode === 'battle_royale' && (
            <div className="br-status mt-3">
              <div className="text-muted small">Active Players</div>
              <div className="fw-bold text-warning">
                {room.players.length - (game.eliminated?.length || 0)} / {room.players.length}
              </div>
              {game.eliminated?.includes(myId) && (
                <div className="eliminated-msg mt-2">💀 Eliminated</div>
              )}
            </div>
          )}

          {/* Opponent board preview for duel */}
          {game.mode === 'duel' && opponents.length > 0 && (
            <div className="opp-preview mt-4">
              <div className="text-muted small mb-2">Opponent's guesses</div>
              <div className="opp-guess-count">
                {(game.guesses?.[opponents[0]] || []).length} / 6 guesses
              </div>
              <div className="opp-mini-board">
                {(game.guesses?.[opponents[0]] || []).map((g, i) => (
                  <div key={i} className="opp-row">
                    {g.result.map((r, j) => (
                      <div key={j} className={`opp-tile ${r.status}`} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center: Board */}
        <div className="game-center">
          <WordleBoard
            guesses={myGuesses}
            currentGuess={isMyTurn ? currentGuess : ''}
            shake={shake}
            disabled={!isMyTurn || game.status !== 'active'}
          />
          <Keyboard
            onKey={handleKey}
            letterStatuses={letterStatuses}
            disabled={!isMyTurn || game.status !== 'active'}
          />
        </div>
      </div>
    </div>
  );
}
