import React, { useState, useEffect } from 'react';
import { getAuthState } from '../../lib/auth';

export default function Support() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [subject, setSubject] = useState('Technical Issue');
  const [message, setMessage] = useState('');
  
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const initAuth = async () => {
      const auth = await getAuthState();
      if (auth.session?.user) {
        setUserId(auth.session.user.id);
        setUserEmail(auth.session.user.email || '');
      }
    };
    void initAuth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          user_email: userEmail,
          subject: subject,
          message: message,
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit ticket');
      }

      setSubmitted(true);
      setMessage('');
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 sm:p-10 max-w-2xl mx-auto w-full">
      <h1 className="text-3xl font-bold mb-4">Support & Help Center</h1>
      <p className="text-[var(--muted-text)] mb-8">Need help with Bug Tracker? Our team is here to assist you.</p>

      {submitted ? (
        <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-600 dark:text-emerald-400 p-6 rounded-2xl text-center">
          <h2 className="text-xl font-bold mb-2">Message Sent!</h2>
          <p>Thank you for reaching out. We will get back to you shortly at {userEmail}.</p>
          <button 
            onClick={() => setSubmitted(false)}
            className="mt-4 text-sm font-bold text-blue-600 hover:underline"
          >
            Send another message
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card bg-[var(--soft-surface)] border-none">
            <h2 className="text-lg font-bold mb-4">Contact Support</h2>
            
            {error && (
              <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5">Subject</label>
                <select 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--card-color)] px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Technical Issue</option>
                  <option>Account Access</option>
                  <option>Feature Request</option>
                  <option>Billing Question</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">How can we help?</label>
                <textarea 
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue in detail..."
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--card-color)] px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 py-3 text-white font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
              </div>
              <h3 className="font-bold mb-1">Live Chat</h3>
              <p className="text-xs text-[var(--muted-text)]">Available Mon-Fri<br/>9AM - 6PM EST</p>
            </div>
            <div className="card p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
              </div>
              <h3 className="font-bold mb-1">Documentation</h3>
              <p className="text-xs text-[var(--muted-text)]">Read our guides<br/>and tutorials</p>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
