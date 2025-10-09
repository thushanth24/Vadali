import React from 'react';

const EditorialPolicyPage: React.FC = () => {
  return (
    <div className="bg-white py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center text-gray-800 mb-4">Editorial Policy</h1>
          <p className="text-lg text-center text-gray-600 mb-12">
            Our commitment to journalistic integrity and excellence.
          </p>

          <div className="prose lg:prose-lg mx-auto text-gray-700">
            <p>
              At Vadali Media, we are committed to producing journalism that is accurate, fair, and independent. Our reputation rests on the trust of our readers, and we strive to uphold the highest ethical standards in all of our work. This document outlines the principles that guide our reporting.
            </p>
            
            <h2 className="text-2xl font-bold mt-8">Accuracy and Fact-Checking</h2>
            <p>
              We have a rigorous process for verifying information before it is published. Our journalists are expected to use primary sources whenever possible, and all claims are checked for accuracy by our editorial team. We are transparent about what we don't know and are committed to avoiding speculation.
            </p>

            <h2 className="text-2xl font-bold mt-8">Impartiality and Fairness</h2>
            <p>
              Our reporting aims to be impartial and free of bias. We present all relevant sides of a story and give individuals or groups who are the subject of our reporting a fair opportunity to respond. Our journalists do not allow their personal opinions to influence their work.
            </p>
            
            <h2 className="text-2xl font-bold mt-8">Corrections Policy</h2>
            <p>
              We are accountable for our mistakes. When we publish an error, we will correct it as quickly and transparently as possible. Significant corrections will be noted at the top of an article. If you believe we have published an error, please contact us at <a href="mailto:corrections@vadalimedia.com">corrections@vadalimedia.com</a>.
            </p>
            
            <h2 className="text-2xl font-bold mt-8">Sources and Attribution</h2>
            <p>
              We strive to be transparent about our sources. We will grant anonymity to sources only when they may face danger or retribution for providing information, and only when the information is of significant public interest. We will explain why a source has been granted anonymity.
            </p>

            <h2 className="text-2xl font-bold mt-8">Independence</h2>
            <p>
              Vadali Media is editorially independent. Our news coverage is not influenced by our advertisers, investors, or any other external parties. A clear line is maintained between our advertising and editorial departments.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorialPolicyPage;