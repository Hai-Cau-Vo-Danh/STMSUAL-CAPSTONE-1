// src/components/Header.jsx
import React, { useState, useEffect } from "react";
import "./Header.css";
import { BsBellFill, BsSearch } from "react-icons/bs";
import { IoMdArrowDropdown } from "react-icons/io";
import { useNavigate, Link } from "react-router-dom";
import defaultAvatar from "../assets/Trangchu/avt.png";
import logoImage from "../assets/LOGO.png";
import { useTranslation } from 'react-i18next';
import axios from 'axios'; 
import { useNotificationClick } from '../context/NotificationContext'; 

// ⚠️ ĐÃ SỬA: Dùng VITE_BACKEND_URL cho đồng bộ với toàn bộ dự án
const API_URL = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, '');

function Header({ onLogout, isLoggedIn }) { 
  const { t } = useTranslation();
  const [searchId, setSearchId] = useState("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const navigate = useNavigate(); 
  const { setNotificationToOpen } = useNotificationClick(); 

  const [username, setUsername] = useState("User");
  const [avatar, setAvatar] = useState(defaultAvatar);

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const searchSuggestionList = [
    { title: "Dashboard", keywords: ["dashboard", "trang chủ"], route: "/app/dashboard", icon: "📊" },
    { title: "Tasks", keywords: ["task", "nhiệm vụ"], route: "/app/tasks", icon: "✅" },
    { title: "Notes", keywords: ["note", "ghi chú"], route: "/app/notes", icon: "📝" },
    { title: "Calendar", keywords: ["calendar", "lịch"], route: "/app/calendar", icon: "📅" },
    { title: "Pomodoro", keywords: ["pomodoro", "hẹn giờ"], route: "/app/pomodoro", icon: "⏰" },
    { title: "AI Assistant", keywords: ["ai", "assistant", "trợ lý"], route: "/app/ai-assistant", icon: "🤖" },
    { title: "Workspaces", keywords: ["workspace", "nhóm"], route: "/app/workspaces", icon: "🏢" },
    { title: "Study Room", keywords: ["study", "học", "phòng học"], route: "/app/study-room", icon: "📚" },
    { title: "Settings", keywords: ["setting", "cài đặt"], route: "/app/settings", icon: "⚙️" },
    { title: "Profile", keywords: ["profile", "hồ sơ"], route: "/app/profile", icon: "👤" },
    { title: "Forum", keywords: ["forum", "diễn đàn", "bài viết"], route: "/app/forum", icon: "💬" },
  ];

  useEffect(() => {
    try {
      const userString = localStorage.getItem("user");
      if (userString) {
        const userData = JSON.parse(userString);
        setUsername(userData.username || "User");
        setAvatar(userData.avatar_url || defaultAvatar);
      }
    } catch (e) { console.error("Lỗi localStorage:", e); }
  }, []);

  // (useEffect Lấy Thông báo giữ nguyên)
  useEffect(() => {
    if (!isLoggedIn) return; 

    const fetchNotifications = async () => {
      const token = localStorage.getItem('token');
      if (!token) return; 

      setLoadingNotifs(true);
      try {
        const authHeader = { headers: { 'Authorization': `Bearer ${token}` } };
        const res = await axios.get(`${API_URL}/api/notifications`, authHeader); 
        setNotifications(res.data.notifications);
        setNotificationCount(res.data.unread_count);
      } catch (err) {
        console.error("Lỗi tải thông báo:", err);
      } finally {
        setLoadingNotifs(false);
      }
    };
    
    fetchNotifications();
    
    const interval = setInterval(fetchNotifications, 60000); // 1 phút
    return () => clearInterval(interval);
    
  }, [isLoggedIn]); 

  // (Các hàm Search giữ nguyên)
  const handleSearchInput = (event) => {
    const value = event.target.value;
    setSearchQuery(value);
    if (value.trim().length > 0) {
      const filtered = searchSuggestionList.filter(item =>
        item.keywords.some(keyword => keyword.includes(value.toLowerCase())) ||
        item.title.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 5));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };
  const handleSuggestionClick = (route) => {
    navigate(route);
    setSearchQuery("");
    setShowSuggestions(false);
  };
  const handleSearch = (event) => {
    if (event.key === 'Enter') {
      const query = event.target.value.trim();
      if (!query) return;
      const match = searchSuggestionList.find(item =>
        item.keywords.some(keyword => query.toLowerCase().includes(keyword))
      );
      if (match) { navigate(match.route); } 
      else { navigate(`/app/search?query=${encodeURIComponent(query)}`); }
      setSearchQuery("");
      setShowSuggestions(false);
    }
  };

  // (useEffect Click Outside giữ nguyên)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('.header-user-profile')) {
        setShowUserMenu(false);
      }
      if (showNotifications && !event.target.closest('.notification-wrapper')) {
        setShowNotifications(false);
      }
      if (showSuggestions && !event.target.closest('.header-search')) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => { document.removeEventListener('mousedown', handleClickOutside); };
  }, [showUserMenu, showNotifications, showSuggestions]);

  // (Hàm Xóa tất cả Thông báo giữ nguyên)
  const handleClearAll = async () => {
    if (notificationCount === 0) return;
    
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const authHeader = { headers: { 'Authorization': `Bearer ${token}` } };
      await axios.post(`${API_URL}/api/notifications/mark-read`, {}, authHeader);
      setNotificationCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Lỗi khi xóa thông báo:", err);
    }
  };
  
  // (Hàm Format Thời gian giữ nguyên)
  const formatTimeAgo = (isoDate) => {
    const date = new Date(isoDate);
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " năm trước";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " tháng trước";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " ngày trước";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " giờ trước";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " phút trước";
    return "Vài giây trước";
  };

  // --- Nâng cấp hàm click thông báo ---
  const handleNotificationClick = (notif) => {
    setShowNotifications(false);
    
    // Nhóm Forum
    if (notif.type === 'new_comment' || notif.type === 'new_reaction') {
      setNotificationToOpen({ type: 'new_comment', postId: notif.reference_id });
      navigate('/app/forum');
    } 
    // Nhóm Workspace
    else if (notif.type === 'workspace_invite') {
      navigate('/app/workspaces');
    } 
    // Cả hai loại này đều trỏ đến workspace
    else if (notif.type === 'card_assigned' || notif.type === 'new_card_comment') {
      navigate(`/app/workspace/${notif.reference_id}`);
    } 
    // Nhóm Lịch
    else if (notif.type === 'event_reminder') {
      navigate('/app/calendar');
    }
    // Nhóm Task
    else if (
        notif.type === 'task_completed' || 
        notif.type === 'task_due_soon' ||
        notif.type === 'task_overdue_1' ||
        notif.type === 'task_overdue_2_email'
    ) {
      navigate('/app/tasks');
    }
    // Nhóm Admin (không cần click)
    else if (notif.type === 'report_resolved' || notif.type === 'post_deleted_by_admin') {
      // Không làm gì cả
    }
  };


  return (
    <header className="header">
      <Link to="/app/dashboard" className="header-logo"> 
        <img src={logoImage} alt="STMSUAL Logo" />
      </Link>

      <div className="header-center">
        <div className="header-search">
          <BsSearch className="search-icon" />
          <input 
            id={searchId} 
            value={searchQuery}
            onChange={handleSearchInput}
            onKeyDown={handleSearch} 
            type="text" 
            placeholder={t('header.searchPlaceholder')} 
            className="search-input" 
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="search-suggestions">
              {suggestions.map((item, index) => (
                <div
                  key={index}
                  className="suggestion-item"
                  onClick={() => handleSuggestionClick(item.route)}
                >
                  <span className="suggestion-icon">{item.icon}</span>
                  <span className="suggestion-title">{item.title}</span>
                  <span className="suggestion-keywords">
                    {item.keywords.slice(0, 2).join(", ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="header-right">
        <div className="notification-wrapper">
          <button
            className="icon-btn notification-btn"
            aria-label={t('header.notifications')}
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <BsBellFill />
            {notificationCount > 0 && (
              <span className="notification-badge">{notificationCount}</span>
            )}
          </button>

          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <h3>{t('header.notifications')}</h3>
                <button
                  className="clear-btn"
                  onClick={handleClearAll}
                >
                  {t('header.clearAll')}
                </button>
              </div>
              
              <div className="notification-list">
                {loadingNotifs && (
                  <div className="notification-item notification-empty">Đang tải...</div>
                )}
                {!loadingNotifs && notifications.length === 0 && (
                  <div className="notification-item notification-empty">
                    Không có thông báo mới.
                  </div>
                )}
                
                {!loadingNotifs && notifications.map((notif) => (
                  <div 
                    key={notif.notification_id} 
                    className={`notification-item ${!notif.is_read ? "unread" : ""}`}
                    onClick={() => handleNotificationClick(notif)} 
                    style={{ cursor: 'pointer' }} 
                  >
                    <div className="notification-content">
                      <p className="notification-message">{notif.content}</p>
                      <span className="notification-time">{formatTimeAgo(notif.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="header-user-profile">
          <div
            className="user-profile-toggle"
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-expanded={showUserMenu}
            aria-haspopup="true"
          >
            <img src={avatar} alt="Avatar" className="user-avatar" />
            <span className="user-name">{username}</span>
            <IoMdArrowDropdown className={`dropdown-icon ${showUserMenu ? 'active' : ''}`} />
          </div>
          
          {showUserMenu && (
            <div className="user-dropdown">
              <Link to="/app/profile" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                👤 {t('header.profile')}
              </Link>
              <Link to="/app/settings" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                ⚙️ {t('header.settings')}
              </Link>
              <div className="dropdown-divider"></div>
              <div 
                role="button" 
                tabIndex={0} 
                className="dropdown-item logout" 
                onClick={() => { 
                  if (onLogout) { onLogout(); } 
                  navigate("/login"); 
                  setShowUserMenu(false); 
                }}
              >
                🚪 {t('header.logout')}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
