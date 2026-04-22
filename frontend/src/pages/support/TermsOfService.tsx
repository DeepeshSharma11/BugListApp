import React from 'react';

export default function TermsOfService() {
  return (
    <div className="p-6 sm:p-10">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <p className="mb-4 text-[var(--muted-text)]">Last Updated: {new Date().toLocaleDateString()}</p>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
        <p>By accessing or using Bug Tracker, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, do not use the service.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
        <p>Bug Tracker provides a platform for teams to report, manage, and resolve software bugs and issues. We reserve the right to modify or discontinue the service at any time.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">3. User Responsibilities</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>You are responsible for maintaining the confidentiality of your account.</li>
          <li>You agree not to use the service for any illegal or unauthorized purpose.</li>
          <li>You must not transmit any worms, viruses, or any code of a destructive nature.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">4. Limitation of Liability</h2>
        <p>Bug Tracker shall not be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use the service.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">5. Termination</h2>
        <p>We may terminate or suspend your account and access to the service immediately, without prior notice or liability, for any reason whatsoever.</p>
      </section>
    </div>
  );
}
