import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Mail } from 'lucide-react';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you'd send a reset email here.
    setSubmitted(true);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-xl w-full max-w-md text-center">
        <Mail className="mx-auto h-12 w-12 text-blue-600 mb-4" />
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Forgot Password?</h2>
        
        {submitted ? (
          <div>
            <p className="text-gray-600 my-6">
              If an account with that email exists, we've sent a password reset link to it. Please check your inbox.
            </p>
            <Link to="/login">
              <Button variant="secondary">Return to Login</Button>
            </Link>
          </div>
        ) : (
          <>
            <p className="text-gray-500 mb-6">Enter your email and we'll send you a link to reset your password.</p>
            <form onSubmit={handleSubmit} className="text-left">
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <Button type="submit" className="w-full" size="lg">
                Send Reset Link
              </Button>
            </form>
            <div className="mt-6 text-sm">
                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                    Remember your password? Login
                </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;