import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRankInfo } from '../utils/ranks';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    signOut();
    navigate('/');
  };

  const rankInfo = user ? getRankInfo(user.elo) : null;

  return (
    <nav className="navbar navbar-expand-lg navbar-dark worduel-navbar px-3">
      <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
        <span className="brand-logo">W</span>
        <span className="brand-text">ORDUEL</span>
      </Link>

      <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu">
        <span className="navbar-toggler-icon" />
      </button>

      <div className="collapse navbar-collapse" id="navMenu">
        <ul className="navbar-nav ms-auto align-items-center gap-2">
          {user ? (
            <>
              <li className="nav-item">
                <Link className="nav-link" to="/play">⚔️ Play</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/leaderboard">🏆 Leaderboard</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/profile">
                  <span className="rank-badge me-1" style={{ color: rankInfo?.color }}>
                    {rankInfo?.icon}
                  </span>
                  {user.username}
                  <span className="ms-2 elo-display">{user.elo} ELO</span>
                </Link>
              </li>
              <li className="nav-item">
                <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li className="nav-item">
                <Link className="nav-link" to="/leaderboard">🏆 Leaderboard</Link>
              </li>
              <li className="nav-item">
                <Link className="btn btn-outline-light btn-sm" to="/login">Login</Link>
              </li>
              <li className="nav-item">
                <Link className="btn btn-warning btn-sm fw-bold" to="/register">Register</Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}
