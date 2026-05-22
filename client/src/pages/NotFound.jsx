import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container-narrow py-20 text-center">
      <h1 className="font-display text-5xl text-brand-900 mb-3">Lost your way?</h1>
      <p className="text-brand-600 mb-6">This page isn't on MainStreet. Let's get you back.</p>
      <Link to="/" className="btn-primary">Back to home</Link>
    </div>
  );
}
