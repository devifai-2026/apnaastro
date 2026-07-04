import React from 'react';

/**
 * Catches render/runtime errors and recovers by reloading ONCE. This handles the
 * "TypeError: r is not a function" that appears on first load right after a
 * Vercel redeploy (the cached HTML shell briefly mismatches the new JS bundle) —
 * a hard reload fetches a consistent set and fixes it. A sessionStorage guard
 * prevents an infinite reload loop if the error is genuine and persistent.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { errored: false };
  }

  static getDerivedStateFromError() {
    return { errored: true };
  }

  componentDidCatch(error) {
    const KEY = 'owner_reloaded_after_error';
    const alreadyReloaded = sessionStorage.getItem(KEY);
    if (!alreadyReloaded) {
      // First crash this session → assume stale bundle, reload once.
      sessionStorage.setItem(KEY, '1');
      window.location.reload();
    } else {
      // Reloaded already and still crashing → real bug; log for diagnosis.
      // eslint-disable-next-line no-console
      console.error('Persistent render error after reload:', error);
    }
  }

  render() {
    if (this.state.errored) {
      // Shown only if the reload didn't clear it (persistent error).
      return (
        <div style={{ display: 'grid', placeItems: 'center', height: '100vh', fontFamily: 'sans-serif', color: '#ccc', background: '#0e0f1a' }}>
          <div style={{ textAlign: 'center' }}>
            <p>Something went wrong.</p>
            <button
              onClick={() => { sessionStorage.removeItem('owner_reloaded_after_error'); window.location.reload(); }}
              style={{ padding: '10px 22px', borderRadius: 999, border: 'none', background: '#7c4dff', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
