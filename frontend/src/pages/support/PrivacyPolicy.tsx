import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="p-6 sm:p-10">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="mb-4 text-[var(--muted-text)]">Last Updated: {new Date().toLocaleDateString()}</p>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
        <p className="mb-2">We collect information to provide better services to all our users. The types of information we collect include:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Personal Information:</strong> Name, email address, and profile details provided during registration.</li>
          <li><strong>Usage Data:</strong> Information about how you interact with our bug tracking tools, including bug reports, comments, and team activity.</li>
          <li><strong>Technical Data:</strong> Browser type, IP address, and device information to ensure security and performance.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
        <p className="mb-2">We use the collected data for various purposes:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>To maintain and improve the Bug Tracker service.</li>
          <li>To notify you about changes to our service.</li>
          <li>To provide customer support.</li>
          <li>To monitor the usage of our service and detect technical issues.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">3. Data Security</h2>
        <p>We implement a variety of security measures to maintain the safety of your personal information. Your data is stored securely using Supabase encryption standards.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">4. Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, please contact us at support@bugtracker.com.</p>
      </section>
    </div>
  );
}
