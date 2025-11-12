
import React, { useEffect, useRef } from 'react';
import { authService } from '../services/authService';

const TelegramLoginWidget = ({ onLoginSuccess, onError }) => {
  const ref = useRef();

  useEffect(() => {
    // Ensure the environment variable is available
    if (!import.meta.env.VITE_TELEGRAM_BOT_USERNAME) {
      console.error('VITE_TELEGRAM_BOT_USERNAME environment variable is missing');
      return;
    }

    // Define the callback function that the Telegram script will call
    const onTelegramAuth = async (user) => {
      try {
        const authData = { ...user, auth_date: Math.floor(Date.now() / 1000) };
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

    // Attach the callback function to the window object
    window.onTelegramAuth = onTelegramAuth;

    // Load the Telegram widget script
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', import.meta.env.VITE_TELEGRAM_BOT_USERNAME);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');

    ref.current.appendChild(script);

    // Clean up the function from the window object when the component unmounts
    return () => {
      delete window.onTelegramAuth;
    };
  }, [onLoginSuccess, onError]);

  return <div ref={ref} />;
};

export default TelegramLoginWidget;
