import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  // Khắc phục lỗi module resolution (Đã sửa ở bước trước)
  optimizeDeps: {
    include: [
      'i18next-browser-languagedetector',
      'i18next-http-backend' 
    ]
  },
  
  // KHỐI BUILD (Giữ lại)
  build: {
    outDir: 'dist', 
  },
  
  // 🔥 KHỐI SERVER: ĐÃ SỬA TARGET ĐỂ TRỎ VỀ RENDER BACKEND
  server: {
    proxy: {
      // Khi chạy LOCAL, mọi yêu cầu /api sẽ được chuyển đến URL Render
      '/api': {
        // ĐÂY LÀ PHẦN ĐÃ SỬA: SỬ DỤNG URL CỦA BẠN TRÊN RENDER
        target: 'https://stmsuai-capstone.onrender.com', 
        changeOrigin: true, 
        secure: false, 
      }
    }
  }
});
