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
      <div className="min-h-screen bg-[#F8F9FB] dark:bg-[#090A0D] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#FFFFFF] dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-xl p-6 space-y-4">
          <div className="w-10 h-10 rounded-lg bg-[#F97316]/10 border border-[#F97316]/25 text-[#F97316] flex items-center justify-center">
            <AlertTriangle size={18} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold tracking-[-0.02em] text-[#111827] dark:text-[#F3F4F6]">
              {friendlyTitle}
            </h2>
            <p className="mt-1.5 text-xs text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed break-words">
              {friendlyDetail}
            </p>
          </div>
          <div className="flex items-center gap-2.5 pt-2">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 py-2 px-4 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#FFFFFF] dark:hover:bg-[#E5E7EB] dark:text-[#090A0D] rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw size={13} strokeWidth={1.5} /> Reload App
            </button>
            <button
              onClick={async () => {
                await signOut(auth).catch(() => {});
                window.location.reload();
              }}
              className="py-2 px-4 border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6] rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <LogOut size={13} strokeWidth={1.5} /> Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }
}
