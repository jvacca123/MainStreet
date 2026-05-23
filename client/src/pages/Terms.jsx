import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="container-narrow py-16">
      <div className="card card-pad max-w-2xl mx-auto">
        <h1 className="font-display text-4xl text-brand-900 mb-2">Terms of Service</h1>
        <p className="text-brand-500 text-sm mb-8">Last updated: {new Date().getFullYear()}</p>

        <section className="mb-8">
          <h2 className="font-display text-2xl text-brand-900 mb-3">1. Acceptance of Terms</h2>
          <p className="text-brand-700">By creating an account on MainStreet, you agree to these Terms of Service. If you do not agree, do not use the platform.</p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-2xl text-brand-900 mb-3">2. Use of the Platform</h2>
          <ul className="list-disc pl-5 text-brand-700 space-y-2">
            <li>MainStreet is a matching platform. We connect business sellers with potential buyers. We do not broker transactions, provide legal advice, or guarantee any outcome.</li>
            <li>You must provide accurate information on your profile. Misrepresentation is grounds for account termination.</li>
            <li>You must be at least 18 years old to use the platform.</li>
            <li>You may not use the platform for spam, fraud, or any illegal purpose.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-2xl text-brand-900 mb-3">3. No Brokerage or Legal Advice</h2>
          <p className="text-brand-700">MainStreet is a technology platform, not a licensed business broker or legal advisor. Scores, valuations, and match recommendations are informational only. Always consult qualified professionals before entering any business transaction.</p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-2xl text-brand-900 mb-3">4. Accounts</h2>
          <ul className="list-disc pl-5 text-brand-700 space-y-2">
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>Notify us immediately if you suspect unauthorized access to your account.</li>
            <li>You may delete your account at any time. See our Privacy Policy for data handling upon deletion.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-2xl text-brand-900 mb-3">5. Content</h2>
          <p className="text-brand-700">You retain ownership of the content you provide (business descriptions, motivations, etc.). By posting content, you grant MainStreet a limited license to display it to matched users on the platform.</p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-2xl text-brand-900 mb-3">6. Limitation of Liability</h2>
          <p className="text-brand-700">MainStreet is provided "as is." We are not liable for any damages arising from your use of the platform, including any business transaction made through a connection facilitated by MainStreet.</p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-2xl text-brand-900 mb-3">7. Changes</h2>
          <p className="text-brand-700">We may update these terms from time to time. Continued use of the platform constitutes acceptance of the updated terms.</p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-2xl text-brand-900 mb-3">8. Contact</h2>
          <p className="text-brand-700">Questions? Contact us at hello@mainstreet.com.</p>
        </section>

        <div className="mt-8 pt-6 border-t border-brand-100">
          <Link to="/" className="text-brand-700 hover:underline">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
