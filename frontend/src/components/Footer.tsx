import React from 'react';

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 mt-auto py-8 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-between gap-4 md:flex-row">
        <p className="text-sm text-gray-500 text-center md:text-left">
          &copy; {new Date().getFullYear()} Bug Tracker. All rights reserved.
        </p>
        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm text-gray-500">
          <a href="#" className="hover:text-gray-900 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-gray-900 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-gray-900 transition-colors">Support</a>
        </div>
      </div>
    </footer>
  );
}
