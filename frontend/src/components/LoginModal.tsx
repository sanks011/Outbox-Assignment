import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';

export const LoginModal: React.FC = () => {
  const { loginWithGoogle, loginWithEmail, loginDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email ID');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await loginWithEmail(email, password);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fallback to Google demo persona if Google Client ID is not yet configured in .env
      await loginWithGoogle(undefined, {
        email: 'oliver.brown@domain.io',
        name: 'Oliver Brown',
        picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FAFAFA] p-4">
      {/* Centered Login Card - Matches Figma Screenshot 1 */}
      <div className="w-full max-w-[420px] bg-white rounded-2xl border border-gray-100 shadow-sm p-8 md:p-10 flex flex-col items-center">
        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 text-center tracking-tight">
          Login
        </h1>

        {error && (
          <div className="w-full mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg text-center">
            {error}
          </div>
        )}

        {/* Google Login Button (Soft Mint Green pill) */}
        <button
          type="button"
          onClick={handleGoogleClick}
          disabled={loading}
          className="w-full py-3 px-4 bg-[#E8F5E9] hover:bg-[#DCEDC8] text-gray-800 font-medium text-sm rounded-lg flex items-center justify-center gap-3 transition-colors duration-150 mb-6"
        >
          {/* Multi-colored Google G Icon */}
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.02 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>Login with Google</span>
        </button>

        {/* Divider */}
        <div className="w-full flex items-center gap-3 mb-6">
          <div className="flex-1 h-[1px] bg-gray-200"></div>
          <span className="text-xs text-gray-400 whitespace-nowrap">or sign up through email</span>
          <div className="flex-1 h-[1px] bg-gray-200"></div>
        </div>

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email ID"
              className="w-full px-4 py-3 bg-[#F4F6F5] border border-transparent focus:border-gray-300 focus:bg-white text-gray-900 text-sm rounded-lg outline-none transition-all placeholder:text-gray-400"
            />
          </div>

          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 bg-[#F4F6F5] border border-transparent focus:border-gray-300 focus:bg-white text-gray-900 text-sm rounded-lg outline-none transition-all placeholder:text-gray-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-[#00A854] hover:bg-[#008744] text-white font-medium text-sm rounded-lg transition-colors duration-150 shadow-sm disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Quick Demo Persona Login */}
        <div className="mt-6 pt-4 border-t border-gray-100 w-full text-center">
          <button
            type="button"
            onClick={loginDemo}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            ⚡ One-Click Demo Login as Oliver Brown (Figma)
          </button>
        </div>
      </div>
    </div>
  );
};
