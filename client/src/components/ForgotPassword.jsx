import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './auth.css'; 
import loginArt from "../assets/DangNhap/login-art.png";
import { BsEnvelope, BsArrowLeft, BsCheckCircle, BsExclamationCircle } from "react-icons/bs";

// ⚠️ ĐÃ SỬA: Định nghĩa API_BASE từ biến môi trường
const API_BASE = import.meta.env.VITE_BACKEND_URL || '';

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      // ⚠️ ĐÃ SỬA: Sử dụng API_BASE thay vì localhost
      const res = await fetch(`${API_BASE}/api/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Không thể kết nối đến server!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Link to="/login" className="btn-back-home"><BsArrowLeft /> Quay lại</Link>

      <div className="auth-box">
        <div className="auth-left">
          <img src={loginArt} alt="Forgot Password" className="auth-img" />
        </div>
        <div className="auth-right">
          <div className="auth-header">
            <h2>Quên mật khẩu?</h2>
            <p className="auth-subtitle">Đừng lo, chúng tôi sẽ gửi link đặt lại cho bạn.</p>
          </div>

          <form onSubmit={handleSubmit}>
            {message && (
               <div className="message-box success">
                 <BsCheckCircle /> {message}
               </div>
            )}
            {error && (
               <div className="message-box error">
                 <BsExclamationCircle /> {error}
               </div>
            )}
            
            <div className="form-group">
              <BsEnvelope className="input-icon" />
              <input
                type="email"
                name="email"
                className="auth-input"
                placeholder="Nhập email của bạn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? "Đang gửi..." : "Gửi link khôi phục"}
            </button>
            
            <div className="auth-links" style={{ justifyContent: "center" }}>
              <Link to="/login" className="auth-link">
                Quay lại đăng nhập
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
