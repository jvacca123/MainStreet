export default function Privacy() {
  return (
    <article className="container-narrow py-12 prose-styled">
      <header className="mb-8">
        <h1 className="font-display text-4xl text-brand-900 mb-2">Privacy Policy</h1>
        <p className="text-brand-500 text-sm">Last updated: {new Date().toISOString().slice(0, 10)}</p>
      </header>

      <Section title="The short version">
        <p>
          MainStreet exists to help small business owners hand off their businesses to community-rooted
          buyers. To do that we need to collect some information about you. We collect the minimum we
          need to make matches work, never sell your data to third parties, and let you delete your
          account and download your data at any time.
        </p>
      </Section>

      <Section title="What we collect">
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Account info:</strong> name, email, hashed password, role (seller or buyer).</li>
          <li><strong>Profile info:</strong> business details (sellers), background and acquisition readiness (buyers).</li>
          <li><strong>Activity:</strong> connections you request, items you mark complete on your roadmap, and basic audit timestamps for sensitive actions.</li>
          <li><strong>Technical:</strong> IP address used at sign-up and login for security/abuse prevention.</li>
        </ul>
      </Section>

      <Section title="How we use it">
        <ul className="list-disc pl-6 space-y-1">
          <li>To match you with relevant counterparties.</li>
          <li>To send transactional emails (verification, password reset, connection notifications).</li>
          <li>To detect and prevent abuse.</li>
        </ul>
      </Section>

      <Section title="Who sees your data">
        <p>
          Other MainStreet members see only the profile information you choose to share via your
          profile and connection requests. We do not sell, lease, or share your personal data with
          advertisers or data brokers.
        </p>
      </Section>

      <Section title="Your rights">
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Export:</strong> download all of your data as JSON from <em>Account settings</em>.</li>
          <li><strong>Delete:</strong> permanently delete your account from <em>Account settings</em>. We anonymize your profile and revoke all sessions.</li>
          <li><strong>Correct:</strong> update your profile any time.</li>
        </ul>
      </Section>

      <Section title="Cookies">
        <p>
          We use one cookie to keep you signed in: a session refresh token, marked <code>httpOnly</code>{' '}
          and <code>Secure</code>, scoped to the auth endpoints. We do not use third-party tracking cookies.
        </p>
      </Section>

      <Section title="Contact">
        <p>Questions? Email <strong>privacy@mainstreet.local</strong> (replace with your real contact when you have one).</p>
      </Section>
    </article>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="font-display text-2xl text-brand-900 mb-3">{title}</h2>
      <div className="text-brand-700 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}
