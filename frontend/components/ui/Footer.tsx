import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { subscribeToNewsletter } from '../../services/api';

const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
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
    <footer className="bg-gray-900 text-gray-300 mt-12">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4 text-white">Vadali Media</h3>
            <p className="text-gray-400">Your trusted source for news and information. We provide unbiased reporting on topics that matter.</p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><Link to="/about" className="hover:text-blue-400">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-blue-400">Contact</Link></li>
              <li><Link to="/advertise" className="hover:text-blue-400">Advertise</Link></li>
              <li><Link to="/editorial-policy" className="hover:text-blue-400">Editorial Policy</Link></li>
              <li><Link to="/privacy" className="hover:text-blue-400">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-blue-400">Terms of Service</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Categories</h4>
            <ul className="space-y-2">
              <li><Link to="/category/technology" className="hover:text-blue-400">Technology</Link></li>
              <li><Link to="/category/business" className="hover:text-blue-400">Business</Link></li>
              <li><Link to="/category/politics" className="hover:text-blue-400">Politics</Link></li>
              <li><Link to="/category/sports" className="hover:text-blue-400">Sports</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Subscribe</h4>
            <p className="text-gray-400 mb-2">Get the latest news in your inbox.</p>
            <form onSubmit={handleSubscribe} className="flex">
              <input 
                type="email" 
                placeholder="Your email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
                className="w-full px-3 py-2 text-gray-800 rounded-l-md focus:outline-none" 
              />
              <button disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-md disabled:bg-blue-400">
                {isSubmitting ? '...' : 'Subscribe'}
              </button>
            </form>
            {message && <p className="text-sm mt-2 text-green-400">{message}</p>}
            <Link to="/subscribe" className="text-sm mt-3 inline-block text-blue-300 hover:text-white">Or visit our dedicated subscription page &rarr;</Link>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-700 pt-6 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Vadali Media. All rights reserved.</p>
          <p className="text-sm mt-2">
            Developed by <a href="https://axzellin.com" target="_blank" rel="noopener noreferrer" className="hover:text-white underline">axzell innovations</a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;