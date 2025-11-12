
import React from 'react';
import { authService } from '../services/authService';

const DummyTelegramLogin = ({ onLoginSuccess, onError }) => {
  const handleDummyLogin = async () => {
    try {
      const result = await authService.devBypassLogin();
      if (onLoginSuccess) {
        onLoginSuccess(result);
      }
    } catch (error) {
      console.error('Dummy login failed:', error);
      if (onError) {
        onError(error);
      }
    }
  };

  return (
    <button
      onClick={handleDummyLogin}
      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
    >
      Login as Dummy User (Dev)
    </button>
  );
};

export default DummyTelegramLogin;
