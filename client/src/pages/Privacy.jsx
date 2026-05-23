import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="container-narrow py-16">
      <div className="card card-pad max-w-2xl mx-auto prose prose-brand">
        <h1 className="font-display text-4xl text-brand-900 mb-2">Privacy Policy</h1>
        <p className="text-brand-500 text-sm mb-8">Last updated: {new Date().getFullYear()}</p>

        <section className="mb-8">
          <h2 className="font-display text-2xl text-brand-900 mb-3">What we collect</h2>
          <p className="text-brand-700 mb-3">MainStreet collects only the information needed to match business owners with community buyers:</p>
          <ul className="list-disc pl-5 text-brand-700 space-y-2">
            <li>Account information: name, email address, role (seller or buyer)</li>
            <li>Business profile: industry, revenue range, location, years in operation</li>
            <li>Buyer profile: background, capital range, industry preferences, motivation statement</li>
            <li>Connection activity: requests and messages between matched users</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-2xl text-brand-900 mb-3">How we use it</h2>
          <ul className="list-disc pl-5 text-brand-700 space-y-2">
            <li>To match sellers and buyers based on industry, geography, and values</li>
            <li>To send transactional emails (verification, password reset, connection notifications)</li>
            <li>To improve the matching algorithm and platform quality</li>
          </ul>
          <p className="text-brand-700 mt-3">We do not sell your data to third parties. We do not use your information for advertising.</p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-2xl text-brand-900 mb-3">Your rights</h2>
          <ul className="list-disc pl-5 text-brand-700 space-y-2">
            <li><strong>Access:</strong> You can export all your data from your account settings</li>
            <li><strong>Deletion:</strong> You can delete your account at any time from your account settings. Your data will be anonymized immediately.</li>
            <li><strong>Correction:</strong> Update your profile at any time through your dashboard</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-2xl text-brand-900 mb-3">Data retention</h2>
          <p className="text-brand-700">We retain your data while your account is active. Upon deletion, we anonymize your account data immediately and remove personally identifiable information.</p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-2xl text-brand-900 mb-3">Security</h2>
          <p className="text-brand-700">Passwords are hashed using bcrypt. Tokens are short-lived. All data is transmitted over HTTPS. We apply industry-standard security practices.</p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-2xl text-brand-900 mb-3">Contact</h2>
          <p className="text-brand-700">Questions about your data? Contact us at privacy@mainstreet.com.</p>
        </section>

        <div className="mt-8 pt-6 border-t border-brand-100">
          <Link to="/" className="text-brand-700 hover:underline">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
