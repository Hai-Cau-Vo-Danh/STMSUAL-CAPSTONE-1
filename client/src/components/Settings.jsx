import React, { useState, useEffect } from 'react';
import './Settings.css';
import { useTranslation } from 'react-i18next';
import { 
  BsGearFill, BsPersonFill, BsShieldLockFill, BsBellFill, 
  BsMoonStarsFill, BsGlobe, BsBoxArrowRight, BsTrash 
} from 'react-icons/bs';

// Giả lập lấy user từ localStorage (bạn có thể thay bằng Context)
const getUser = () => {
    try {
        return JSON.parse(localStorage.getItem('user')) || { username: 'User', email: 'user@example.com' };
    } catch { return { username: 'User', email: 'user@example.com' }; }
};

const Settings = () => {
  const { t, i18n } = useTranslation();
  const user = getUser();
  
  // State quản lý Tab hiện tại
  const [activeTab, setActiveTab] = useState('general');

  // States cài đặt
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [notifications, setNotifications] = useState(true);
  const [sound, setSound] = useState(true);
  const [autoSave, setAutoSave] = useState(true);

  // Effect đổi theme
  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleThemeToggle = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const handleLangChange = (e) => i18n.changeLanguage(e.target.value);

  // --- MENU ITEMS ---
  const menuItems = [
    { id: 'general', icon: <BsGearFill />, label: 'Chung' },
    { id: 'account', icon: <BsPersonFill />, label: 'Tài khoản' },
    { id: 'security', icon: <BsShieldLockFill />, label: 'Bảo mật' },
    { id: 'notifications', icon: <BsBellFill />, label: 'Thông báo' },
  ];

  // --- RENDER CONTENT THEO TAB ---
  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="settings-card">
            {/* Giao diện (Theme) */}
            <div className="card-row">
              <div className="row-info">
                <div className="row-icon icon-theme"><BsMoonStarsFill /></div>
                <div className="row-text">
                  <h4>Chế độ tối (Dark Mode)</h4>
                  <p>Giảm mỏi mắt khi làm việc ban đêm</p>
                </div>
              </div>
              <label className="switch">
                <input type="checkbox" checked={theme === 'dark'} onChange={handleThemeToggle} />
                <span className="slider"></span>
              </label>
            </div>

            {/* Ngôn ngữ */}
            <div className="card-row">
              <div className="row-info">
                <div className="row-icon icon-lang"><BsGlobe /></div>
                <div className="row-text">
                  <h4>Ngôn ngữ</h4>
                  <p>Chọn ngôn ngữ hiển thị của ứng dụng</p>
                </div>
              </div>
              <select 
                className="custom-select" 
                value={i18n.language.startsWith('vi') ? 'vi' : 'en'}
                onChange={handleLangChange}
              >
                <option value="vi">Tiếng Việt</option>
                <option value="en">English (US)</option>
              </select>
            </div>

            {/* Tự động lưu */}
            <div className="card-row">
              <div className="row-info">
                <div className="row-icon" style={{background: '#ecfccb', color:'#65a30d'}}><BsGearFill /></div>
                <div className="row-text">
                  <h4>Tự động lưu</h4>
                  <p>Lưu thay đổi task ngay lập tức</p>
                </div>
              </div>
              <label className="switch">
                <input type="checkbox" checked={autoSave} onChange={() => setAutoSave(!autoSave)} />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        );

      case 'account':
        return (
          <div className="settings-card">
            <div className="card-row">
              <div className="profile-card-mini" style={{border: 'none', padding: 0, margin: 0}}>
                <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="Avatar" className="mini-avatar" />
                <div className="mini-info">
                    <h3>{user.username}</h3>
                    <span>{user.email}</span> <br/>
                    <span className="badge">Thành viên Pro</span>
                </div>
              </div>
              <button className="btn-danger-outline" style={{borderColor:'#ccc', color:'#666'}}>Chỉnh sửa</button>
            </div>
            
            <div className="card-row">
              <div className="row-info">
                <div className="row-icon icon-danger"><BsBoxArrowRight /></div>
                <div className="row-text">
                  <h4>Đăng xuất</h4>
                  <p>Thoát khỏi tài khoản hiện tại</p>
                </div>
              </div>
              <button className="btn-danger-outline">Đăng xuất</button>
            </div>
          </div>
        );

      case 'notifications':
        return (
           <div className="settings-card">
             <div className="card-row">
              <div className="row-info">
                <div className="row-icon icon-noti"><BsBellFill /></div>
                <div className="row-text">
                  <h4>Thông báo đẩy</h4>
                  <p>Nhận thông báo về task và deadline</p>
                </div>
              </div>
              <label className="switch">
                <input type="checkbox" checked={notifications} onChange={() => setNotifications(!notifications)} />
                <span className="slider"></span>
              </label>
            </div>

            <div className="card-row">
              <div className="row-info">
                <div className="row-icon icon-noti"><BsBellFill /></div>
                <div className="row-text">
                  <h4>Âm thanh thông báo</h4>
                  <p>Phát âm thanh khi hoàn thành Pomodoro</p>
                </div>
              </div>
              <label className="switch">
                <input type="checkbox" checked={sound} onChange={() => setSound(!sound)} />
                <span className="slider"></span>
              </label>
            </div>
           </div>
        );
      
      default: return <p>Chức năng đang phát triển...</p>;
    }
  };

  return (
    <div className="settings-layout">
      {/* --- SIDEBAR --- */}
      <div className="settings-sidebar">
        {menuItems.map(item => (
          <div 
            key={item.id} 
            className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="sidebar-icon">{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>

      {/* --- CONTENT --- */}
      <div className="settings-content">
        <div className="settings-header">
          <h2>Cài đặt {menuItems.find(i => i.id === activeTab)?.label}</h2>
          <p>Quản lý tùy chọn và cấu hình ứng dụng của bạn.</p>
        </div>
        
        {renderContent()}
      </div>
    </div>
  );
};

export default Settings;