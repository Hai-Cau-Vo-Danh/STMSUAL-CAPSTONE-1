import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => { // 💡 Chỉnh sửa quan trọng: Lấy 'mode'
  
  // Kiểm tra xem chúng ta đang ở chế độ DEV hay PRODUCTION
  const isDevelopment = mode === 'development';

  return {
    plugins: [react()],
    
    // FIX 1: Thêm 'base' để dùng đường dẫn tương đối (Base path fix)
    base: './', 
    
    // FIX 2: Chỉ sử dụng Proxy trong môi trường DEV
    server: isDevelopment ? {
      proxy: {
        // Proxy để chuyển tiếp yêu cầu API sang backend Flask khi chạy cục bộ
        '/api': {
          target: 'http://localhost:5000', 
          changeOrigin: true, 
          secure: false,
        }
      }
    } : {}, // TRẢ VỀ OBJECT RỖNG KHI CHẠY TRÊN VERCEL/PRODUCTION

    // KHỐI BUILD
    build: {
      outDir: 'dist', 
      rollupOptions: {
        external: [
          'i18next-browser-languagedetector', 
          'i18next-http-backend' 
        ],
      },
    },
  };
});
