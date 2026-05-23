import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-brand-100 bg-cream-dark mt-12">
      <div className="container-wide py-8 flex flex-col sm:flex-row gap-4 items-center justify-between text-sm text-brand-600">
        <div>© {new Date().getFullYear()} MainStreet · Built for the next generation of community owners</div>
        <div className="flex gap-5">
          <Link to="/about"   className="hover:text-brand-800">About</Link>
          <Link to="/privacy" className="hover:text-brand-800">Privacy</Link>
          <Link to="/terms"   className="hover:text-brand-800">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
