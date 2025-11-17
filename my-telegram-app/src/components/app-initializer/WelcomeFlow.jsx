import React, { useState, useEffect } from 'react';
import WelcomeOnboardingModal from '../WelcomeOnboardingModal';

const WelcomeFlow = ({ hasSeenWelcome, onFinishWelcome, onLoginSuccess }) => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showLoginView, setShowLoginView] = useState(false);

  useEffect(() => {
    if (!hasSeenWelcome) {
      setShowOnboarding(true);
      setShowLoginView(false);
    } else {
      setShowOnboarding(false);
      setShowLoginView(true);
    }
  }, [hasSeenWelcome]);

  // Handle finishing the welcome slides
  const handleFinishWelcome = () => {
    try {
      localStorage.setItem("hasSeenWelcome_v1", "true");
    } catch {}
    onFinishWelcome();
  };

  // Handle successful login
  const handleLoginSuccess = () => {
    onLoginSuccess();
  };

  // 1. Show Welcome Slides if they haven't been seen
  if (showOnboarding) {
    return (
      <WelcomeOnboardingModal
        key="slides"
        isOpen={true}
        onFinish={handleFinishWelcome}
        version="v1"
        showLogin={false} // Explicitly show slides
      />
    );
  }

  // 2. Show Login View if slides are done or were already seen
  if (showLoginView) {
    return (
      <WelcomeOnboardingModal
        key="login"
        isOpen={true}
        onFinish={handleLoginSuccess}
        version="v1"
        showLogin={true} // Explicitly show login
      />
    );
  }

  return null;
};

export default WelcomeFlow;