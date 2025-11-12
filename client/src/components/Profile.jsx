// src/components/Profile.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Profile.css";
import axios from 'axios'; 

// Import ảnh mặc định
const defaultCover = "https://picsum.photos/seed/cover-photo/1200/300";
import avt from "../assets/Trangchu/avt.png"; 

// Import Icons
import { FaEnvelope, FaUser, FaCalendarAlt, FaCamera, FaChevronLeft } from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [newUsername, setNewUsername] = useState("");
  
  // State cho upload avatar
  const [avatarFile, setAvatarFile] = useState(null); 
  const [avatarPreview, setAvatarPreview] = useState(avt); 
  const fileInputRef = useRef(null); 
  const [isSaving, setIsSaving] = useState(false); 

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setNewUsername(parsedUser.username || "");
      setAvatarPreview(parsedUser.avatar_url || avt); 
    }
  }, []);

  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file); 
      setAvatarPreview(URL.createObjectURL(file)); 
    }
  };

  const handleUsernameChange = (e) => {
    setNewUsername(e.target.value);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!newUsername.trim()) {
      alert("Tên người dùng không được để trống!");
      return;
    }
    
    setIsSaving(true);
    const token = localStorage.getItem("token");

    const formData = new FormData();
    formData.append("user_id", user.user_id);
    formData.append("username", newUsername);
    formData.append("email", user.email); 
    
    if (avatarFile) {
      formData.append("avatar_file", avatarFile); 
    }

    try {
      const res = await axios.post(`${API_URL}/api/profile/update`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data' 
        }
      });
      
      const updatedUser = res.data.user;
      
      // Giữ lại các thông tin trang bị (cosmetics) khi update
      const preservedCosmetics = {
        equipped_frame_url: user.equipped_frame_url,
        equipped_title: user.equipped_title,
        equipped_name_color: user.equipped_name_color,
        tomatoes: user.tomatoes
      };

      const mergedUser = { ...updatedUser, ...preservedCosmetics };

      setUser(mergedUser);
      setAvatarPreview(updatedUser.avatar_url || avt);
      setAvatarFile(null); 
      
      // Cập nhật localStorage
      const storedUser = JSON.parse(localStorage.getItem("user"));
      localStorage.setItem("user", JSON.stringify({ 
        ...storedUser, 
        ...mergedUser
      }));

      alert("Cập nhật hồ sơ thành công!");
      
    } catch (err) {
      console.error("Lỗi cập nhật hồ sơ:", err);
      alert("Lỗi: " + (err.response?.data?.message || "Không thể cập nhật hồ sơ."));
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return <div>Đang tải hồ sơ...</div>;
  }
  
  const joinDate = new Date(user.created_at).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="profile-page-container">
      {/* HEADER: Ảnh bìa và Avatar */}
      <div className="profile-header-section">
        <div className="profile-cover-image">
          <img src={defaultCover} alt="Cover" />
        </div>
        <div className="profile-user-details-bar">
        
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: "none" }}
            accept="image/png, image/jpeg, image/gif"
          />
          
          <div 
            className="profile-avatar-wrapper" 
            onClick={handleAvatarClick} 
            title="Nhấp để thay đổi avatar"
          >
            <img src={avatarPreview} alt="Avatar" className="profile-avatar" />
            
            {/* --- (CODE MỚI) HIỂN THỊ KHUNG AVATAR --- */}
            {user.equipped_frame_url && (
              <img 
                src={user.equipped_frame_url} 
                alt="Frame" 
                className="profile-avatar-frame" 
              />
            )}
            {/* --- HẾT CODE MỚI --- */}

            <div className="avatar-upload-overlay">
              <FaCamera className="avatar-upload-icon" />
            </div>
          </div>

          <div className="profile-user-info-text">
            {/* --- (CODE MỚI) MÀU TÊN & DANH HIỆU --- */}
            <h2 
              className="profile-username" 
              style={{ color: user.equipped_name_color || 'var(--text-color)' }}
            >
              {user.username}
              {user.equipped_title && (
                <span className="profile-title-badge">{user.equipped_title}</span>
              )}
            </h2>
            {/* --- HẾT CODE MỚI --- */}

            <p className="profile-member-status">
              Thành viên <span className="dot">•</span> Tham gia từ {joinDate}
            </p>
          </div>
          
          <div className="profile-header-buttons">
            <button onClick={() => navigate("/app/dashboard")} className="profile-nav-btn">
              <FaChevronLeft /> Trở về Dashboard
            </button>
            <button onClick={() => navigate("/app/forum")} className="profile-nav-btn primary">
              Forum
            </button>
          </div>
        </div>
      </div>

      {/* THÔNG TIN CƠ BẢN VÀ CÀI ĐẶT TÀI KHOẢN */}
      <div className="profile-content-section">
        <div className="profile-info-column">
          <div className="info-card">
            <FaEnvelope className="info-icon" />
            <div className="info-details">
              <span className="info-label">Email</span>
              <span className="info-value">{user.email}</span>
            </div>
          </div>
          <div className="info-card">
            <FaUser className="info-icon" />
            <div className="info-details">
              <span className="info-label">Tên người dùng</span>
              <span className="info-value">{user.username}</span>
            </div>
          </div>
          <div className="info-card">
            <FaCalendarAlt className="info-icon" />
            <div className="info-details">
              <span className="info-label">Ngày tham gia</span>
              <span className="info-value">{joinDate}</span>
            </div>
          </div>
        </div>

        <div className="profile-settings-column">
          <div className="settings-card">
            <h3>Cài đặt tài khoản</h3>
            <div className="setting-item">
              <label htmlFor="username-input">Tên người dùng</label>
              <input
                id="username-input"
                type="text"
                value={newUsername}
                onChange={handleUsernameChange}
              />
            </div>
            
            {avatarFile && (
              <div className="setting-item">
                <label>Xem trước ảnh mới:</label>
                <img src={avatarPreview} alt="Xem trước" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover' }} />
              </div>
            )}
            
            <button 
              className="save-changes-btn" 
              onClick={handleSaveProfile}
              disabled={isSaving} 
            >
              {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </div>
      </div>
      
      <div className="floating-buttons">
        <button className="help-button">HỖ TRỢ</button>
        <button className="chat-button">CHAT</button>
      </div>
    </div>
  );
};

export default Profile;