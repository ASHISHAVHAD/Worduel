import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handlePlay = () => navigate(user ? '/play' : '/login');

  return (
    <div className="home-page">
      {/* Hero */}
      <section className="hero-section text-center py-5">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="hero-title-wrap mb-3">
            <h1 className="hero-title">
              <span className="letter-w">W</span>
              <span className="letter-o">O</span>
              <span className="letter-r">R</span>
              <span className="letter-d">D</span>
              <span className="letter-u">U</span>
              <span className="letter-e">E</span>
              <span className="letter-l">L</span>
            </h1>
          </div>
          <p className="hero-subtitle">
            Competitive Wordle — Battle Royale &amp; Duels &amp; Ranked ELO
          </p>
          <div className="d-flex justify-content-center gap-3 mt-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn btn-warning btn-lg fw-bold px-5"
              onClick={handlePlay}
            >
              ⚔️ Play Now
            </motion.button>
            <Link to="/leaderboard" className="btn btn-outline-light btn-lg px-4">
              🏆 Leaderboard
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Mode Cards */}
      <section className="modes-section container py-5">
        <h2 className="section-title text-center mb-5">Game Modes</h2>
        <div className="row g-4 justify-content-center">
          {/* Battle Royale */}
          <div className="col-md-5">
            <motion.div
              className="mode-card br-card h-100"
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              whileHover={{ y: -6 }}
            >
              <div className="mode-icon">💥</div>
              <h3 className="mode-title">Battle Royale</h3>
              <p className="mode-subtitle">1 vs All</p>
              <ul className="mode-features">
                <li>Up to 8 players per session</li>
                <li>Everyone guesses the same word simultaneously</li>
                <li>First to solve wins the round</li>
                <li>Wrong guesses revealed to all after each round</li>
                <li>Last player standing wins the match</li>
                <li>Skill-based matchmaking</li>
              </ul>
              <div className="mode-tag">ELO RANKED</div>
            </motion.div>
          </div>

          {/* Duel */}
          <div className="col-md-5">
            <motion.div
              className="mode-card duel-card h-100"
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              whileHover={{ y: -6 }}
            >
              <div className="mode-icon">⚔️</div>
              <h3 className="mode-title">Duel</h3>
              <p className="mode-subtitle">1 vs 1</p>
              <ul className="mode-features">
                <li>Head-to-head on the <em>same board</em></li>
                <li>Alternating turns, time-bound per guess</li>
                <li>Coin toss decides who goes first in Round 1</li>
                <li>Best of 3 or Best of 5 formats</li>
                <li>See opponent's guesses in real time</li>
                <li>Skill-based matchmaking</li>
              </ul>
              <div className="mode-tag">ELO RANKED</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Strip */}
      <section className="features-strip py-5">
        <div className="container">
          <div className="row g-3 text-center">
            {[
              { icon: '📊', title: 'ELO Ranking', desc: 'Iron → Grandmaster progression' },
              { icon: '🤝', title: 'Smart Matchmaking', desc: 'Matched by skill, not luck' },
              { icon: '🏆', title: 'Leaderboards', desc: 'Compete globally, rise to the top' },
              { icon: '🔥', title: 'Streaks & Stats', desc: 'Track every win and loss' },
            ].map((f, i) => (
              <motion.div
                key={i}
                className="col-6 col-md-3"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="feature-card">
                  <div className="feature-icon">{f.icon}</div>
                  <div className="feature-title">{f.title}</div>
                  <div className="feature-desc">{f.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {!user && (
        <section className="cta-section text-center py-5">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
          >
            <h3 className="cta-title">Ready to prove your word power?</h3>
            <div className="d-flex justify-content-center gap-3 mt-3">
              <Link to="/register" className="btn btn-warning btn-lg fw-bold">
                Create Account
              </Link>
              <Link to="/login" className="btn btn-outline-light btn-lg">
                Sign In
              </Link>
            </div>
          </motion.div>
        </section>
      )}
    </div>
  );
}
