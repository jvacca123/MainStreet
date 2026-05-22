import { Link } from 'react-router-dom';

const STATS = [
  { value: '2.9M', label: 'businesses at risk of closing' },
  { value: '70%', label: 'of owners have no succession plan' },
  { value: '$1.4T', label: 'in business value needs a home' },
];

const STEPS = [
  {
    n: '01',
    title: 'Assess',
    body: 'Sellers complete a transferability assessment. Buyers map their readiness. Each side gets a score and a clear path forward.',
  },
  {
    n: '02',
    title: 'Match',
    body: 'Our matching engine pairs sellers with community buyers — veterans, immigrants, employees — based on industry, capital, geography, and values.',
  },
  {
    n: '03',
    title: 'Transition',
    body: 'A structured roadmap walks both sides through documentation, financing, and a mentored handoff so the business carries forward.',
  },
];

const TESTIMONIALS = [
  {
    quote: "I didn't want a fund. I wanted my diner to stay a diner. MainStreet helped me find Priya — she'd run two restaurants in Mumbai and wanted to keep our regulars happy.",
    by: 'Margaret A., diner owner, Akron, OH',
  },
  {
    quote: "Twelve years in the Army taught me operations. MainStreet showed me how to put that to work owning a real business in my own community.",
    by: 'Marcus R., veteran buyer, Lancaster, PA',
  },
  {
    quote: "I spent eleven years on the crew. The owner trained me to run the books. MainStreet helped us figure out the financing so I could buy her out.",
    by: 'Devon C., employee buyer, Asheville, NC',
  },
];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="hero-gradient text-cream">
        <div className="container-wide py-20 sm:py-28">
          <div className="max-w-3xl">
            <span className="inline-block rounded-full bg-cream/10 px-3 py-1 text-xs font-medium tracking-wide text-amber-200 mb-6">
              Community-rooted business succession
            </span>
            <h1 className="font-display text-5xl sm:text-6xl font-semibold leading-[1.05] mb-6">
              Your business deserves the right next owner.
            </h1>
            <p className="text-lg sm:text-xl text-cream/85 mb-8 max-w-2xl">
              MainStreet connects retiring owners with community buyers — veterans, immigrants, and workers ready to carry your legacy forward.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/register?role=seller" className="btn-amber">
                I'm a Business Owner
              </Link>
              <Link to="/register?role=buyer" className="btn-outline">
                I Want to Buy a Business
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-brand-100 bg-cream-dark">
        <div className="container-wide py-10 grid grid-cols-1 sm:grid-cols-3 gap-8">
          {STATS.map((s) => (
            <div key={s.label} className="text-center sm:text-left">
              <div className="font-display text-4xl text-brand-800 font-semibold">{s.value}</div>
              <div className="text-sm text-brand-600 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="container-wide py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-display text-4xl text-brand-900 mb-3">How MainStreet works</h2>
          <p className="text-brand-600 text-lg">
            The problem isn't finding buyers — it's that sellers aren't ready and buyers aren't prepared. We solve both, simultaneously.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((s) => (
            <div key={s.n} className="card card-pad">
              <div className="font-display text-amber-400 text-3xl font-semibold">{s.n}</div>
              <h3 className="font-display text-2xl text-brand-900 mt-2 mb-3">{s.title}</h3>
              <p className="text-brand-600 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Side-by-side: For sellers / For buyers */}
      <section className="bg-cream-dark">
        <div className="container-wide py-20 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="card card-pad border border-brand-100">
            <div className="text-xs font-semibold tracking-widest text-brand-600 mb-2">FOR OWNERS</div>
            <h3 className="font-display text-3xl text-brand-900 mb-4">
              Find a buyer who carries the work forward.
            </h3>
            <ul className="space-y-3 text-brand-700">
              <li>• <strong>Transferability assessment</strong> tells you exactly what's holding back your sale price.</li>
              <li>• <strong>Readiness roadmap</strong> walks you from financials to handoff in eight steps.</li>
              <li>• <strong>Matched buyers</strong> — veterans, immigrants, your own employees — vetted on community fit, not just capital.</li>
            </ul>
            <Link to="/register?role=seller" className="btn-primary mt-6">
              Start your owner profile
            </Link>
          </div>
          <div className="card card-pad border border-brand-100">
            <div className="text-xs font-semibold tracking-widest text-brand-600 mb-2">FOR BUYERS</div>
            <h3 className="font-display text-3xl text-brand-900 mb-4">
              Own a real business in a community that needs you.
            </h3>
            <ul className="space-y-3 text-brand-700">
              <li>• <strong>Readiness score</strong> shows you what to fix before you put in an offer.</li>
              <li>• <strong>Learning center</strong> teaches valuation, SBA financing, and due diligence.</li>
              <li>• <strong>Mentored transitions</strong> — sellers often stay on for 6–12 months to walk you through the business.</li>
            </ul>
            <Link to="/register?role=buyer" className="btn-primary mt-6">
              Start your buyer profile
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container-wide py-20">
        <h2 className="font-display text-4xl text-brand-900 text-center mb-10">Stories from MainStreet</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <figure key={i} className="card card-pad">
              <blockquote className="text-brand-800 leading-relaxed">"{t.quote}"</blockquote>
              <figcaption className="mt-4 text-sm text-brand-500">— {t.by}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* CTA footer */}
      <section className="hero-gradient text-cream">
        <div className="container-wide py-16 text-center">
          <h2 className="font-display text-4xl mb-4">Built for Main Street, not Wall Street.</h2>
          <p className="text-cream/80 mb-6 max-w-2xl mx-auto">
            Sign in to see how MainStreet would match your business or your buyer profile.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Link to="/login" className="btn-amber">Sign in</Link>
            <Link to="/register" className="btn-outline">Create an account</Link>
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-sm text-brand-500">
        © {new Date().getFullYear()} MainStreet · Built for the next generation of community owners
      </footer>
    </div>
  );
}
