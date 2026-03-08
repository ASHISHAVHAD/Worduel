import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { login as apiLogin, register as apiRegister } from '../services/api';
import { useAuth } from '../context/AuthContext';

function AuthForm({ mode }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const isLogin = mode === 'login';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('Please fill all fields');
      return;
    }
    setLoading(true);
    try {
      const fn = isLogin ? apiLogin : apiRegister;
      const res = await fn(username.trim(), password);
      signIn(res.data.token, res.data.user);
      toast.success(isLogin ? 'Welcome back!' : 'Account created!');
      navigate('/play');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page d-flex align-items-center justify-content-center">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="auth-logo mb-3">W</div>
        <h2 className="auth-title">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        <p className="auth-subtitle">{isLogin ? 'Sign in to your account' : 'Join the arena today'}</p>

        <form onSubmit={handleSubmit} className="mt-4">
          <div className="mb-3">
            <label className="form-label text-light">Username</label>
            <input
              className="form-control auth-input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username"
              autoFocus
            />
          </div>
          <div className="mb-4">
            <label className="form-label text-light">Password</label>
            <input
              type="password"
              className="form-control auth-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>
          <button
            type="submit"
            className="btn btn-warning w-100 fw-bold"
            disabled={loading}
          >
            {loading ? '...' : (isLogin ? 'Sign In' : 'Register')}
          </button>
        </form>

        <p className="text-center text-muted mt-3 mb-0">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <Link to={isLogin ? '/register' : '/login'} className="text-warning">
            {isLogin ? 'Register' : 'Login'}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export function LoginPage() { return <AuthForm mode="login" />; }
export function RegisterPage() { return <AuthForm mode="register" />; }
