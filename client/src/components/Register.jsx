import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./auth.css";
import loginArt from "../assets/DangNhap/login-art.png";
import { BsPerson, BsEnvelope, BsLock, BsArrowLeft, BsExclamationCircle } from "react-icons/bs";

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const validateForm = () => {
    const { name, email, password } = formData;
    if (!name || !email || !password) {
      setError("Vui lòng nhập đầy đủ thông tin!");
      return false;
    }
    if (name.trim().length < 2) {
      setError("Họ và tên phải có ít nhất 2 ký tự!");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Email không đúng định dạng!");
      return false;
    }
    if (password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự!");
      return false;
    }
    // Bạn có thể bật lại check regex mạnh hơn nếu muốn
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;

    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("🎉 Đăng ký thành công! Vui lòng đăng nhập.");
        navigate("/login");
      } else {
        setError(data.message || "Lỗi đăng ký");
      }
    } catch (error) {
      console.error("Lỗi:", error);
      setError("Không thể kết nối đến server!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Link to="/" className="btn-back-home"><BsArrowLeft /> Trang chủ</Link>

      <div className="auth-box">
        <div className="auth-left">
          <img src={loginArt} alt="Register Illustration" className="auth-img" />
        </div>
        <div className="auth-right">
          <div className="auth-header">
            <h2>Tạo tài khoản</h2>
            <p className="auth-subtitle">Bắt đầu hành trình năng suất cùng STMSU</p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="message-box error">
                <BsExclamationCircle /> {error}
              </div>
            )}

            <div className="form-group">
              <BsPerson className="input-icon" />
              <input
                type="text"
                name="name"
                className="auth-input"
                placeholder="Họ và tên"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <BsEnvelope className="input-icon" />
              <input
                type="email"
                name="email"
                className="auth-input"
                placeholder="Email"
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
                placeholder="Mật khẩu (Tối thiểu 8 ký tự)"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? "Đang xử lý..." : "Đăng ký tài khoản"}
            </button>

            <div className="auth-links" style={{ justifyContent: "center" }}>
              <p>
                Đã có tài khoản?{" "}
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

export default Register;