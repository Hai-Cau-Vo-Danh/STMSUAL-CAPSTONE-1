// src/main.jsx
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

// 1. Import GoogleOAuthProvider
import { GoogleOAuthProvider } from '@react-oauth/google';

// 2. Khai báo Google Client ID
// Bạn nên lấy từ biến môi trường (Vite) hoặc dán trực tiếp chuỗi ID vào đây để test
// Ví dụ: "123456789-abc...apps.googleusercontent.com"
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID_HERE"; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<div>Loading translations...</div>}> 
      
      {/* 3. Bọc App bằng GoogleOAuthProvider */}
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <I18nextProvider i18n={i18n}>
          <App />
        </I18nextProvider>
      </GoogleOAuthProvider>

    </Suspense>
  </React.StrictMode>
);