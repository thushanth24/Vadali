import React from 'react';

const AboutUsPage: React.FC = () => {
  return (
    <div className="bg-white py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center text-gray-800 mb-4">About Vadali Media</h1>
          <p className="text-lg text-center text-gray-600 mb-12">
            Your most trusted source for timely and unbiased news.
          </p>

          <div className="prose lg:prose-lg mx-auto text-gray-700">
            <p>
              Welcome to Vadali Media, where we are dedicated to bringing you the most accurate, comprehensive, and impartial news from around the corner and around the world. In an age of information overload, we strive to be a beacon of clarity and truth, providing content that is not only informative but also engaging and thought-provoking.
            </p>
            
            <h2 className="text-2xl font-bold mt-8">Our Mission</h2>
            <p>
              Our mission is simple: to empower our readers with knowledge. We believe that a well-informed public is essential for a healthy society. We are committed to upholding the highest standards of journalism, including accuracy, fairness, and independence. Our team works tirelessly to report stories that matter, from in-depth political analysis to the latest breakthroughs in science and technology.
            </p>

            <h2 className="text-2xl font-bold mt-8">Our Team</h2>
            <p>
              Behind Vadali Media is a diverse team of passionate journalists, editors, designers, and technologists. Our reporters come from various backgrounds, bringing with them a wealth of experience and expertise. We are united by our dedication to journalistic integrity and our curiosity about the world.
            </p>

            <h2 className="text-2xl font-bold mt-8">Our Values</h2>
            <ul>
              <li><strong>Integrity:</strong> We adhere to a strict ethical code. Our reporting is honest and our sources are verified.</li>
              <li><strong>Accuracy:</strong> We double-check our facts to ensure that what we publish is correct and reliable.</li>
              <li><strong>Impartiality:</strong> We present all sides of the story without bias, allowing you to form your own opinions.</li>
              <li><strong>Accountability:</strong> We are transparent about our processes and quick to correct any errors.</li>
            </ul>

            <p className="mt-8">
              Thank you for choosing Vadali Media. We are honored to have you as a reader and look forward to being your trusted news source for years to come.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutUsPage;