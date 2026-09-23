/** session-timeout-modal.tsx — Warning modal shown before auto-logout. */
'use client';
import { Clock, LogOut, MousePointerClick } from 'lucide-react';

interface Props {
  remainingSeconds: number;
  onStayLoggedIn: () => void;
}

export default function SessionTimeoutModal({ remainingSeconds, onStayLoggedIn }: Props) {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeStr = minutes > 0 ? `${minutes}:${String(seconds).padStart(2, '0')}` : `${seconds}s`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6 animate-in fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-warning" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">Session Expiring</h2>
            <p className="text-sm text-text-secondary">You will be logged out due to inactivity</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded p-4 mb-5 text-center">
          <span className="text-3xl font-mono font-bold text-amber-600">{timeStr}</span>
          <p className="text-sm text-amber-700 mt-1">remaining before auto-logout</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onStayLoggedIn}
            className="flex-1 py-2.5 bg-dell-blue text-white text-sm font-semibold rounded hover:bg-dell-blue-hover transition-colors flex items-center justify-center gap-2"
          >
            <MousePointerClick className="w-4 h-4" /> Stay Logged In
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('user');
              window.location.href = '/login';
            }}
            className="flex-1 py-2.5 bg-gray-100 text-text-primary text-sm font-semibold rounded hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
