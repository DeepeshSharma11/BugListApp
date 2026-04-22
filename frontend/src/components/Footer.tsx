import React from 'react';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--border-color)] bg-[var(--surface-color)] py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-between gap-4 md:flex-row">
        <p className="text-center text-sm text-[var(--muted-text)] md:text-left">
          &copy; {new Date().getFullYear()} Bug Tracker. All rights reserved.
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-sm text-[var(--muted-text)] sm:gap-6">
          <a href="#" className="transition-colors hover:text-[var(--text-color)]">Privacy Policy</a>
          <a href="#" className="transition-colors hover:text-[var(--text-color)]">Terms of Service</a>
          <a href="#" className="transition-colors hover:text-[var(--text-color)]">Support</a>
        </div>
      </div>
    </footer>
  );
}
