import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="border-b border-white/5 bg-[#0a0a0f]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link 
            to="/signup" 
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign Up
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#FFA500]/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-[#FFA500]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
            <p className="text-gray-400">Last updated: January 2025</p>
          </div>
        </div>

        <div className="space-y-8 text-gray-300">
          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
            <p className="leading-relaxed">
              By accessing or using IGRIS ("the Service"), you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this service.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Use License</h2>
            <p className="leading-relaxed mb-4">
              Permission is granted to temporarily access the materials on IGRIS for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose or for any public display</li>
              <li>Attempt to reverse engineer any software contained on IGRIS</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. Trading Risks</h2>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4">
              <p className="text-amber-400 font-medium">
                Important: Trading involves substantial risk of loss and is not suitable for all investors. Past performance is not indicative of future results.
              </p>
            </div>
            <p className="leading-relaxed mb-4">
              The Service provides tools and information for trading purposes. You acknowledge that:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>All trading decisions are made at your own risk</li>
              <li>We do not provide investment advice</li>
              <li>AI-generated analysis is for informational purposes only</li>
              <li>You are responsible for understanding the risks involved in trading</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. Account Security</h2>
            <p className="leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to immediately notify us of any unauthorized use of your account or any other breach of security.
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Data and Privacy</h2>
            <p className="leading-relaxed">
              Your use of our Service is also governed by our Privacy Policy. By using the Service, you consent to our collection and use of personal data as outlined in the Privacy Policy.
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. Service Modifications</h2>
            <p className="leading-relaxed">
              We reserve the right to modify or discontinue the Service (or any part thereof) with or without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuance of the Service.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">7. Limitation of Liability</h2>
            <p className="leading-relaxed">
              In no event shall IGRIS, its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the Service.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">8. Governing Law</h2>
            <p className="leading-relaxed">
              These Terms shall be governed and construed in accordance with the laws of the jurisdiction in which IGRIS operates, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">9. Contact Information</h2>
            <p className="leading-relaxed mb-4">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white">Email: legal@igris.com</p>
            </div>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-wrap gap-4">
          <Link 
            to="/signup" 
            className="btn-glass btn-glass-primary btn-glass-sm"
          >
            Back to Sign Up
          </Link>
          <Link 
            to="/privacy" 
            className="btn-glass btn-glass-secondary btn-glass-sm"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
