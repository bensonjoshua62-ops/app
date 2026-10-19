import React from 'react';
import { Link } from 'react-router-dom';
import { Twitter, Github, Linkedin, Youtube } from 'lucide-react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_forex-buddy-10/artifacts/qq95ijqq_IMG_4116.webp";

const Footer = () => {
  // Footer links with proper URLs pointing to jcelerita.com
  const footerLinks = {
    Product: [
      { name: 'Features', url: 'https://jcelerita.com/features' },
      { name: 'Pricing', url: 'https://jcelerita.com/pricing' },
      { name: 'Dashboard', url: 'https://jcelerita.com/dashboard' },
      { name: 'Mobile App', url: 'https://jcelerita.com/mobile-app' },
      { name: 'API', url: 'https://jcelerita.com/api' }
    ],
    Resources: [
      { name: 'Learn', url: '/learn', internal: true },
      { name: 'Documentation', url: 'https://jcelerita.com/documentation' },
      { name: 'Blog', url: 'https://jcelerita.com/blog' },
      { name: 'Tutorials', url: 'https://jcelerita.com/tutorials' },
      { name: 'Help Center', url: 'https://jcelerita.com/help-center' },
      { name: 'Community', url: 'https://jcelerita.com/community' }
    ],
    Company: [
      { name: 'About Us', url: 'https://jcelerita.com/about-us' },
      { name: 'Careers', url: 'https://jcelerita.com/careers' },
      { name: 'Press', url: 'https://jcelerita.com/press' },
      { name: 'Contact', url: 'https://jcelerita.com/contact' },
      { name: 'Partners', url: 'https://jcelerita.com/partners' }
    ],
    Legal: [
      { name: 'Privacy Policy', url: 'https://jcelerita.com/privacy-policy' },
      { name: 'Terms of Service', url: 'https://jcelerita.com/terms-of-service' },
      { name: 'Cookie Policy', url: 'https://jcelerita.com/cookie-policy' },
      { name: 'Risk Disclosure', url: 'https://jcelerita.com/risk-disclosure' }
    ]
  };

  return (
    <footer className="relative border-t border-white/5 py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <a href="https://jcelerita.com" className="flex items-center gap-2 mb-4">
              <img src={LOGO_URL} alt="IGRIS Logo" className="w-7 h-7 object-contain" />
              <span className="text-xl font-semibold">
                <span className="text-white">IG</span>
                <span className="text-[#FFA500]">RIS</span>
              </span>
            </a>
            <p className="text-gray-500 text-sm mb-6 max-w-xs">
              The world's first AI-powered trading platform. Built for traders, by traders.
            </p>
            {/* Social links */}
            <div className="flex items-center gap-4">
              <a href="https://jcelerita.com/twitter" className="text-gray-500 hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="https://jcelerita.com/github" className="text-gray-500 hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
                <Github className="w-5 h-5" />
              </a>
              <a href="https://jcelerita.com/linkedin" className="text-gray-500 hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="https://jcelerita.com/youtube" className="text-gray-500 hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-white font-semibold mb-4">{title}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    {link.internal ? (
                      <Link to={link.url} className="text-gray-500 hover:text-white transition-colors text-sm">
                        {link.name}
                      </Link>
                    ) : (
                      <a href={link.url} className="text-gray-500 hover:text-white transition-colors text-sm" target="_blank" rel="noopener noreferrer">
                        {link.name}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} <a href="https://jcelerita.com" className="hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">IGRIS</a>. All rights reserved.
          </p>
          <p className="text-gray-600 text-xs">
            Trading involves risk. Past performance is not indicative of future results.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
