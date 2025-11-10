import React, { useEffect, useRef, useState } from 'react';
import { authService } from '../services/authService';

const TelegramLoginWidget = ({ onLoginSuccess, onError }) => {
  const divRef = useRef(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    // Ensure we have the required environment variable
    if (!import.meta.env.VITE_TELEGRAM_BOT_USERNAME) {
      console.error('VITE_TELEGRAM_BOT_USERNAME environment variable is missing');
      return;
    }

    // Define the callback function
    const onTelegramAuth = async (user) => {
      try {
        // Add current timestamp for auth_date
        const authData = {
          ...user,
          auth_date: Math.floor(Date.now() / 1000)
        };

        const result = await authService.telegramLoginWidget(authData);

        if (onLoginSuccess) {
          onLoginSuccess(result);
        }
      } catch (error) {
        console.error('Telegram login failed:', error);
        if (onError) {
          onError(error);
        }
      }
    };

    // Store the callback in window for the Telegram widget to access
    window.onTelegramAuth = onTelegramAuth;

    // Load Telegram Login Widget script if not already loaded
    if (!document.getElementById('telegram-widget-script')) {
      const script = document.createElement('script');
      script.id = 'telegram-widget-script';
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.async = true;
      script.onload = () => setIsScriptLoaded(true);
      document.head.appendChild(script);
    } else {
      setIsScriptLoaded(true);
    }

    // Clean up
    return () => {
      delete window.onTelegramAuth;
    };
  }, [onLoginSuccess, onError]);

  useEffect(() => {
    if (isScriptLoaded && divRef.current && import.meta.env.VITE_TELEGRAM_BOT_USERNAME) {
      // Wait a bit for the Telegram script to be ready, then create the widget
      setTimeout(() => {
        // The Telegram script should have processed the element by now
        // If not, we can try to manually trigger the widget creation
        if (window.Telegram && window.Telegram.LoginWidget) {
          // This should already be handled by the script tag approach
        } else {
          // Create the widget manually if needed
          const widgetContainer = divRef.current;
          if (widgetContainer && !widgetContainer.querySelector('.telegram-login-button')) {
            const buttonElement = document.createElement('div');
            buttonElement.className = 'telegram-login-button';
            buttonElement.setAttribute('data-telegram-login', import.meta.env.VITE_TELEGRAM_BOT_USERNAME);
            buttonElement.setAttribute('data-size', 'large');
            buttonElement.setAttribute('data-onauth', 'onTelegramAuth(user)');
            buttonElement.setAttribute('data-request-access', 'write');
            widgetContainer.appendChild(buttonElement);
          }
        }
      }, 100);
    }
  }, [isScriptLoaded]);

  return (
    <div ref={divRef} className="flex justify-center">
      {/* This div will contain the Telegram login button */}
      <div 
        className="telegram-login-button"
        data-telegram-login={import.meta.env.VITE_TELEGRAM_BOT_USERNAME}
        data-size="large"
        data-onauth="onTelegramAuth(user)"
        data-request-access="write"
      />
    </div>
  );
};

export default TelegramLoginWidget;