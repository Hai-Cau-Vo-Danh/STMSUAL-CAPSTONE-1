// src/components/Login.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./auth.css";
import loginArt from "../assets/DangNhap/login-art.png";
import { BsEnvelope, BsLock, BsArrowLeft, BsExclamationCircle } from "react-icons/bs";
// 1. Import Google Login Component
import { GoogleLogin } from '@react-oauth/google';

const Login = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(""); 
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  // Xử lý đăng nhập thường
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { email, password } = formData;

    if (!email || !password) {
      setError("Vui lòng nhập đầy đủ thông tin!");
      setLoading(false);
      return;
    }

    if (!validateEmail(email)) {
      setError("Email không đúng định dạng!");
      setLoading(false);
      return;
    }

    try {
      // Sử dụng biến môi trường
      const API_URL = import.meta.env.VITE_BACKEND_URL || "";
      
      const res = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        handleLoginSuccessData(data);
      } else {
        setError(data.message || "Đã xảy ra lỗi");
        setLoading(false);
      }
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      setError("Không thể kết nối đến máy chủ!");
      setLoading(false);
    } 
  };

  // 2. Xử lý Đăng nhập Google thành công
  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError("");
    try {
      const API_URL = import.meta.env.VITE_BACKEND_URL || "";
      
      // Gửi token của Google về Backend để xác thực
      const res = await fetch(`${API_URL}/api/google-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      const data = await res.json();

      if (res.ok) {
        handleLoginSuccessData(data);
      } else {
        setError(data.message || "Đăng nhập Google thất bại");
        setLoading(false);
      }
    } catch (error) {
      console.error("Lỗi Google Login:", error);
      setError("Không thể kết nối đến máy chủ!");
      setLoading(false);
    }
  };

  // Hàm chung để lưu data và chuyển hướng
  const handleLoginSuccessData = (data) => {
    localStorage.setItem("role", data.user.role); 
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("token", data.token);
    onLoginSuccess();
    // Chuyển hướng sau khi đăng nhập thành công (thường là vào dashboard)
    navigate("/app/dashboard"); 
  };

  return (
    <div className="auth-container">
      {/* Nút quay về trang chủ */}
      <Link to="/" className="btn-back-home"><BsArrowLeft /> Trang chủ</Link>

      <div className="auth-box">
        <div className="auth-left">
          <img src={loginArt} alt="Login Illustration" className="auth-img" />
        </div>

        <div className="auth-right">
          <div className="auth-header">
            <h2>Chào mừng trở lại!</h2>
            <p className="auth-subtitle">Đăng nhập để tiếp tục quản lý công việc</p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="message-box error">
                <BsExclamationCircle /> {error}
              </div>
            )}

            <div className="form-group">
              <BsEnvelope className="input-icon" />
              <input
                type="text"
                name="email"
                className="auth-input"
                placeholder="Email của bạn"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <BsLock className="input-icon" />
              <input
                type="password"
                name="password"
                className="auth-input"
                placeholder="Mật khẩu"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="auth-links" style={{marginBottom: '20px', justifyContent: 'flex-end'}}>
               <Link to="/forgot-password" className="auth-link" style={{fontSize: '0.9rem'}}>
                 Quên mật khẩu?
               </Link>
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? "Đang xác thực..." : "Đăng nhập ngay"}
            </button>

            {/* 3. Phần Google Login UI */}
            <div className="divider-or" style={{margin: '20px 0', textAlign: 'center', color: '#888', fontSize: '0.9rem'}}>
                <span>Hoặc</span>
            </div>
            
            <div style={{display: 'flex', justifyContent: 'center', marginBottom: '20px'}}>
                <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => {
                        setError("Đăng nhập Google thất bại");
                        setLoading(false);
                    }}
                    useOneTap
                    theme="outline"
                    shape="pill"
                    width="100%"
                    text="signin_with"
                />
            </div>

            <div className="auth-links" style={{justifyContent: 'center'}}>
              <p>
                Chưa có tài khoản?{" "}
                <Link to="/register" className="auth-link">
                  Tạo tài khoản mới
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;