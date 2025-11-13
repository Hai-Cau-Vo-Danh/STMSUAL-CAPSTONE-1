import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  // 🔥 KHẮC PHỤC LỖI MODULE: Đảm bảo các thư viện i18next được Vite xử lý và tối ưu hóa đúng cách.
  // Đây là giải pháp đã được xác nhận để sửa lỗi "Failed to resolve module specifier".
  optimizeDeps: {
    include: [
      'i18next-browser-languagedetector',
      'i18next-http-backend' 
    ]
  },
  
  // 🔥 KHỐI BUILD (Đã bỏ phần external sai)
  build: {
    outDir: 'dist', 
    // BỎ KHỐI rollupOptions.external (Vì nó gây ra lỗi màn hình trắng)
  },
  
  // 🔥 KHỐI SERVER (Giữ lại cho Local Development)
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
