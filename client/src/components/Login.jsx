import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./auth.css";
import loginArt from "../assets/DangNhap/login-art.png";
import { BsEnvelope, BsLock, BsArrowLeft, BsExclamationCircle } from "react-icons/bs"; // Thêm icons

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
      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("role", data.user.role); 
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);
        onLoginSuccess();
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