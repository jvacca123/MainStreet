export default function Terms() {
  return (
    <article className="container-narrow py-12">
      <header className="mb-8">
        <h1 className="font-display text-4xl text-brand-900 mb-2">Terms of Service</h1>
        <p className="text-brand-500 text-sm">Last updated: {new Date().toISOString().slice(0, 10)}</p>
      </header>

      <Section title="What MainStreet is">
        <p>
          MainStreet is a platform that helps connect retiring small business owners with community-rooted
          buyers. By creating an account you agree to use the platform in good faith for that purpose.
        </p>
      </Section>

      <Section title="Account responsibility">
        <ul className="list-disc pl-6 space-y-1">
          <li>You must be 18+ and have legal authority to act for any business you list.</li>
          <li>Keep your password private. You're responsible for activity on your account.</li>
          <li>One person, one account. Don't create accounts for people who haven't given you permission.</li>
        </ul>
      </Section>

      <Section title="Acceptable use">
        <ul className="list-disc pl-6 space-y-1">
          <li>Be honest about your business, your background, and your capital position.</li>
          <li>Don't harass, threaten, or harm other members.</li>
          <li>Don't scrape data or attempt to circumvent the platform's controls.</li>
          <li>We reserve the right to suspend accounts that violate these terms.</li>
        </ul>
      </Section>

      <Section title="No professional advice">
        <p>
          The Transferability Score, Readiness Score, valuation estimates, and educational content are
          information tools — <strong>not</strong> legal, tax, accounting, or financial advice. Always consult
          your own licensed professionals before making decisions about your business.
        </p>
      </Section>

      <Section title="Disclaimers">
        <p>
          MainStreet is provided "as is". We don't guarantee that a match will result in a sale, that any
          valuation estimate is accurate, or that any counterparty is who they claim to be. Do your own
          due diligence.
        </p>
      </Section>

      <Section title="Termination">
        <p>
          You can delete your account at any time from your <em>Account settings</em>. We may suspend or
          remove accounts that violate these terms or applicable law.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We may update these terms as the platform evolves. Significant changes will be communicated
          to you by email. Continued use after a change means you accept the new terms.
        </p>
      </Section>

      <Section title="Contact">
        <p>Email <strong>support@mainstreet.local</strong> with any questions about these terms.</p>
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
