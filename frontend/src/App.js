import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import DemoSection from './components/DemoSection';
import FeaturesSection from './components/FeaturesSection';
import StatsSection from './components/StatsSection';
import PartnersSection from './components/PartnersSection';
import CTASection from './components/CTASection';
import Footer from './components/Footer';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import TermsPage from './pages/TermsPage';
import LearnPage from './pages/LearnPage';

const Home = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0f] dark:bg-[#0a0a0f] light:bg-gray-50 text-white dark:text-white light:text-gray-900 overflow-x-hidden w-full transition-colors duration-300">
      <Navbar />
      <main className="overflow-x-hidden">
        <HeroSection />
        <DemoSection />
        <FeaturesSection />
        <StatsSection />
        <PartnersSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/learn" element={<LearnPage />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </BrowserRouter>
      </div>
    </ThemeProvider>
  );
}

export default App;
