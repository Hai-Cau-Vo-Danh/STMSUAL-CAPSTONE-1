// client/src/context/NotificationContext.jsx
import React, { createContext, useState, useContext } from 'react';

// 1. Tạo Context
const NotificationContext = createContext();

// 2. Tạo Hook để dễ sử dụng
export const useNotificationClick = () => {
  return useContext(NotificationContext);
};

// 3. Tạo Provider
export const NotificationProvider = ({ children }) => {
  // State này sẽ lưu thông tin về thông báo vừa được nhấn
  // Ví dụ: { type: 'new_comment', postId: 123 }
  const [notificationToOpen, setNotificationToOpen] = useState(null);

  const clearNotification = () => {
    setNotificationToOpen(null);
  };

  const value = {
    notificationToOpen,
    setNotificationToOpen,
    clearNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};