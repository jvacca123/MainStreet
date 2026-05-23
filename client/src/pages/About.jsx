import { Link } from 'react-router-dom';

export default function About() {
  return (
    <article className="container-narrow py-12">
      <h1 className="font-display text-4xl text-brand-900 mb-4">About MainStreet</h1>
      <p className="text-lg text-brand-700 mb-6">
        MainStreet is a platform built for the next chapter of American small business. Our thesis is
        simple: the succession problem isn't a shortage of buyers — it's that sellers aren't ready and
        buyers aren't prepared. We help both sides get there, together.
      </p>

      <h2 className="font-display text-2xl text-brand-900 mt-10 mb-3">Who we serve</h2>
      <p className="text-brand-700 mb-3">
        We focus on owner-operated small businesses (typically $500K–$10M revenue) and community-rooted
        buyers — military veterans, immigrant entrepreneurs, long-tenured employees, first-generation
        owners, and career changers ready to build something of their own.
      </p>

      <h2 className="font-display text-2xl text-brand-900 mt-10 mb-3">How we make money</h2>
      <p className="text-brand-700">
        Today MainStreet is free. As we add real introductions, due-diligence tooling, and document
        workflows, we'll roll out paid features. We will never sell your data.
      </p>

      <h2 className="font-display text-2xl text-brand-900 mt-10 mb-3">Get in touch</h2>
      <p className="text-brand-700">
        Have feedback or a partnership idea?{' '}
        <a href="mailto:hello@mainstreet.local" className="text-brand-800 underline">hello@mainstreet.local</a>
      </p>

      <div className="mt-10">
        <Link to="/" className="btn-outline">Back home</Link>
      </div>
    </article>
  );
}
