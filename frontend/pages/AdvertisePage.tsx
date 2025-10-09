import React from 'react';
import Button from '../components/ui/Button';
import { Mail } from 'lucide-react';

const AdvertisePage: React.FC = () => {
  return (
    <div className="bg-white py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center text-gray-800 mb-4">Advertise With Us</h1>
          <p className="text-lg text-center text-gray-600 mb-12">
            Reach a dedicated audience of informed readers.
          </p>
          
          <div className="prose lg:prose-lg mx-auto text-gray-700">
            <p>
              Vadali Media offers a unique opportunity to connect with a highly engaged and influential audience. Our readers are curious, intelligent, and passionate about staying informed on the most important topics of our time. By advertising with us, you place your brand at the center of conversations that matter.
            </p>

            <h2 className="text-2xl font-bold mt-8">Why Advertise with Vadali Media?</h2>
            <ul>
              <li><strong>Targeted Audience:</strong> Connect with readers interested in technology, business, politics, and more.</li>
              <li><strong>High Engagement:</strong> Our content sparks conversation and encourages deep reading.</li>
              <li><strong>Brand Safety:</strong> Associate your brand with trusted, high-quality journalism.</li>
              <li><strong>Flexible Options:</strong> From sponsored content to display advertising, we have a solution that fits your needs.</li>
            </ul>

            <h2 className="text-2xl font-bold mt-8">Our Offerings</h2>
            <p>We provide a range of advertising solutions to help you achieve your marketing goals:</p>
            <dl>
                <dt className="font-bold">Sponsored Content</dt>
                <dd className="mb-2">Collaborate with our team to create compelling articles that resonate with our audience while highlighting your brand's message.</dd>
                <dt className="font-bold">Display Advertising</dt>
                <dd className="mb-2">Place your brand front and center with our premium display ad units across the site.</dd>
                <dt className="font-bold">Newsletter Sponsorship</dt>
                <dd className="mb-2">Reach our subscribers directly in their inbox with a placement in our daily or weekly newsletters.</dd>
            </dl>

             <div className="mt-10 text-center bg-gray-50 p-8 rounded-lg">
                <h3 className="text-2xl font-bold">Ready to get started?</h3>
                <p className="mt-2 mb-4">Contact our sales team to discuss your campaign and receive our media kit.</p>
                <a href="mailto:ads@vadalimedia.com">
                    <Button size="lg" className="inline-flex items-center">
                        <Mail className="mr-2 h-5 w-5" />
                        Contact Sales
                    </Button>
                </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvertisePage;