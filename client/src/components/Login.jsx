import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./auth.css"; // Dùng chung CSS
import loginArt from "../assets/DangNhap/login-art.png";

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
    setLoading(true); // <-- Bật loading ở đầu
    const { email, password } = formData;

    if (!email || !password) {
      setError("Vui lòng nhập đầy đủ thông tin!");
      setLoading(false); // Tắt loading nếu lỗi
      return;
    }

    if (!validateEmail(email)) { // <-- Áp dụng cho cả admin
      setError("Email không đúng định dạng (ví dụ: example@domain.com)");
      setLoading(false); // Tắt loading nếu lỗi
      return;
    }

    // --- (ĐÃ XÓA) Toàn bộ khối "if (email === 'admin' ...)" đã bị xóa ---

    // Login (gọi API cho CẢ user và admin)
    try {
      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // API trả về role thật (user hoặc admin)
        localStorage.setItem("role", data.user.role); 
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token); // API trả về token thật
        onLoginSuccess();
        // Không gọi setLoading(false) khi thành công (để App.jsx lo chuyển hướng)
      } else {
        setError(data.message || "Đã xảy ra lỗi");
        setLoading(false); // Tắt loading nếu API lỗi
      }
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      setError("Không thể kết nối đến máy chủ!");
      setLoading(false); // Tắt loading nếu fetch lỗi
    } 
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-left">
          <img src={loginArt} alt="Login Illustration" className="auth-img" />
        </div>

        <div className="auth-right">
          <form onSubmit={handleSubmit}>
            <h2>Đăng nhập</h2>

            <input
              type="text"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Mật khẩu"
              value={formData.password}
              onChange={handleChange}
              required
            />

            {error && <p className="error">{error}</p>}

            <button type="submit" disabled={loading}>
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>

            <div className="auth-links">
              <p>
                Chưa có tài khoản?{" "}
                <a href="/register" className="auth-link">
                  Đăng ký
                </a>
              </p>
              <a href="/forgot-password" className="auth-link forgot-link">
                Quên mật khẩu?
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;