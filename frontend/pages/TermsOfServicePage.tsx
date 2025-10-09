import React from 'react';

const TermsOfServicePage: React.FC = () => {
  return (
    <div className="bg-white py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center text-gray-800 mb-4">Terms of Service</h1>
          <p className="text-center text-gray-500 mb-10">Last updated: July 23, 2024</p>
          
          <div className="prose lg:prose-lg mx-auto text-gray-700">
            <h2 className="text-2xl font-bold mt-8">1. Acceptance of Terms</h2>
            <p>
              By accessing and using this website ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services. Any participation in this service will constitute acceptance of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>

            <h2 className="text-2xl font-bold mt-8">2. User Conduct</h2>
            <p>
              You agree not to use the Service to:
            </p>
            <ul>
                <li>Post or transmit any content that is disruptive, uncivil, abusive, vulgar, profane, obscene, hateful, fraudulent, threatening, harassing, defamatory, or which discloses private or personal matters concerning any person.</li>
                <li>Post or transmit any material that you don't have the right to transmit under law (such as copyright, trade secret or securities) or under contractual or fiduciary relationships (such as nondisclosure agreements).</li>
                <li>Violate any applicable local, state, national, or international law.</li>
            </ul>

            <h2 className="text-2xl font-bold mt-8">3. Intellectual Property</h2>
            <p>
              The Service and its original content, features, and functionality are and will remain the exclusive property of Vadali Media and its licensors. The Service is protected by copyright, trademark, and other laws of both the country and foreign countries. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of Vadali Media.
            </p>

            <h2 className="text-2xl font-bold mt-8">4. Limitation of Liability</h2>
            <p>
              In no event shall Vadali Media, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
            </p>

            <h2 className="text-2xl font-bold mt-8">5. Governing Law</h2>
            <p>
              These Terms shall be governed and construed in accordance with the laws of the jurisdiction, without regard to its conflict of law provisions.
            </p>

            <h2 className="text-2xl font-bold mt-8">6. Changes</h2>
            <p>
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms of Service on this page. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;