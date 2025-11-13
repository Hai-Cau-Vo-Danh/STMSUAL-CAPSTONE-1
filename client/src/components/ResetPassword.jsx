import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import './auth.css'; // Dùng chung CSS "Tối thượng"
import loginArt from "../assets/DangNhap/login-art.png";
// Import các icon cần thiết
import { BsLock, BsShieldLock, BsArrowLeft, BsCheckCircle, BsExclamationCircle } from "react-icons/bs";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { token } = useParams(); // Lấy token từ URL

  const [formData, setFormData] = useState({ password: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Xóa thông báo lỗi khi người dùng bắt đầu gõ lại
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate cơ bản
    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp!");
      return;
    }
    if (formData.password.length < 8) {
        setError("Mật khẩu phải có ít nhất 8 ký tự!");
        return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("http://localhost:5000/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token,
          password: formData.password
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Thành công! Đang chuyển hướng về trang đăng nhập...");
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } else {
        setError(data.message || "Đã xảy ra lỗi khi đặt lại mật khẩu.");
      }
    } catch (err) {
      setError("Không thể kết nối đến server!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Nút quay lại trang Login */}
      <Link to="/login" className="btn-back-home">
        <BsArrowLeft /> Về đăng nhập
      </Link>

      <div className="auth-box">
        <div className="auth-left">
          <img src={loginArt} alt="Reset Password Illustration" className="auth-img" />
        </div>
        
        <div className="auth-right">
          <div className="auth-header">
            <h2>Đặt lại mật khẩu</h2>
            <p className="auth-subtitle">Tạo mật khẩu mới an toàn cho tài khoản của bạn.</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Hiển thị thông báo thành công */}
            {message && (
               <div className="message-box success">
                 <BsCheckCircle /> {message}
               </div>
            )}
            
            {/* Hiển thị thông báo lỗi */}
            {error && (
               <div className="message-box error">
                 <BsExclamationCircle /> {error}
               </div>
            )}

            {/* Input Mật khẩu mới */}
            <div className="form-group">
              <BsLock className="input-icon" />
              <input
                type="password"
                name="password"
                className="auth-input"
                placeholder="Mật khẩu mới"
                onChange={handleChange}
                required
              />
            </div>

            {/* Input Xác nhận mật khẩu */}
            <div className="form-group">
              <BsShieldLock className="input-icon" />
              <input
                type="password"
                name="confirmPassword"
                className="auth-input"
                placeholder="Xác nhận mật khẩu mới"
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" className="auth-btn" disabled={loading || message}>
              {loading ? "Đang lưu thay đổi..." : "Lưu mật khẩu mới"}
            </button>

            <div className="auth-links" style={{ justifyContent: "center" }}>
              <p>
                Nhớ mật khẩu cũ?{" "}
                <Link to="/login" className="auth-link">
                  Đăng nhập ngay
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;