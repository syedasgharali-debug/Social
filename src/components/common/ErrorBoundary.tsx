import React from 'react';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected application error occurred.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    let friendlyTitle = 'Something went wrong';
    let friendlyDetail = this.state.errorMessage;
    try {
      const parsed = JSON.parse(this.state.errorMessage);
      if (parsed && parsed.operationType && parsed.error) {
        friendlyTitle = 'Cloud Sync Permission or Connection Error';
        friendlyDetail = `${parsed.error} (${parsed.operationType} on ${parsed.path || 'Firestore'})`;
      }
    } catch {
      // Plain error message
    }

    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertTriangle size={22} />
          </div>
          <div>
            <h2 className="font-display text-lg font-extrabold text-slate-900 dark:text-white">
              {friendlyTitle}
            </h2>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed break-words">
              {friendlyDetail}
            </p>
          </div>
          <div className="flex items-center gap-2.5 pt-2">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 py-2.5 px-4 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={13} /> Reload App
            </button>
            <button
              onClick={async () => {
                await signOut(auth).catch(() => {});
                window.location.reload();
              }}
              className="py-2.5 px-4 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }
}
