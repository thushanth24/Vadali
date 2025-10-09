import React, { useState } from 'react';
import Button from '../components/ui/Button';
import { Mail } from 'lucide-react';
import { subscribeToNewsletter } from '../services/api';

const SubscribePage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    try {
      await subscribeToNewsletter(email);
      setMessage('Thank you for subscribing!');
      setEmail('');
    } catch {
      setMessage('Subscription failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-100 py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto bg-white p-10 rounded-xl shadow-lg text-center">
          <Mail className="mx-auto h-16 w-16 text-blue-600 mb-4" />
          <h1 className="text-4xl font-bold text-gray-800">Stay Informed</h1>
          <p className="text-gray-600 mt-4 mb-8">
            Subscribe to our newsletter to receive the latest news, in-depth analysis, and exclusive content delivered directly to your inbox. Never miss a story that matters.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              placeholder="Enter your email address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              className="flex-grow w-full px-4 py-3 text-gray-800 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button type="submit" size="lg" className="flex-shrink-0" disabled={isSubmitting}>
              {isSubmitting ? 'Subscribing...' : 'Subscribe Now'}
            </Button>
          </form>

          {message && (
            <p className="text-sm text-green-600 mt-5">{message}</p>
          )}

          <p className="text-xs text-gray-500 mt-5">
            We respect your privacy. Unsubscribe at any time.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscribePage;