import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  // 💡 FIX QUAN TRỌNG: Thêm 'base' để dùng đường dẫn tương đối (giúp Vercel tìm thấy Assets)
  base: './', 
  
  // 🔥 KHỐI BUILD (Cần cho Vercel/Production)
  build: {
    outDir: 'dist', 
    rollupOptions: {
      external: [
        // THƯ VIỆN GÂY LỖI: Cần khai báo external để Rollup không cố gắng đóng gói nó.
        'i18next-browser-languagedetector', 
        'i18next-http-backend' 
      ],
    },
  },
  
  // 🔥 KHỐI SERVER (Chỉ hoạt động khi chạy local 'npm run dev')
  // Chúng ta GIỮ NGUYÊN khối này để bạn vẫn có thể phát triển cục bộ dễ dàng.
  server: {
    proxy: {
      // Proxy để chuyển tiếp yêu cầu API sang backend Flask khi chạy cục bộ
      '/api': {
        target: 'http://localhost:5000', 
        changeOrigin: true, 
        secure: false,
      }
    }
  }
});
