import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./auth.css";
import loginArt from "../assets/DangNhap/login-art.png";

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  // --- (CODE MỚI) Thêm state cho loading và error ---
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // --- KẾT THÚC CODE MỚI ---

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(""); // Xóa lỗi khi nhập
  };

  // --- (CODE MỚI) Các hàm validation ---
  const validateForm = () => {
    const { name, email, password } = formData;

    // 1. Kiểm tra rỗng
    if (!name || !email || !password) {
      setError("Vui lòng nhập đầy đủ thông tin!");
      return false;
    }

    // 2. Kiểm tra tên (ít nhất 2 ký tự)
    if (name.trim().length < 2) {
      setError("Họ và tên phải có ít nhất 2 ký tự!");
      return false;
    }

    // 3. Kiểm tra email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Email không đúng định dạng (ví dụ: example@domain.com)");
      return false;
    }

    // 4. Kiểm tra mật khẩu
    const uppercaseRegex = /[A-Z]/;
    const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

    if (password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự!");
      return false;
    }
    if (!uppercaseRegex.test(password)) {
      setError("Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa!");
      return false;
    }
    if (!specialCharRegex.test(password)) {
      setError("Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt!");
      return false;
    }

    // Nếu tất cả đều qua
    setError("");
    return true;
  };
  // --- KẾT THÚC CODE MỚI ---

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Xóa lỗi cũ

    // --- (CODE MỚI) Chạy validation ---
    if (!validateForm()) {
      return; // Dừng lại nếu validation thất bại
    }
    // --- KẾT THÚC CODE MỚI ---

    setLoading(true); // Bắt đầu loading

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
        alert("🎉 Đăng ký thành công! Vui lòng đăng nhập."); // Giữ alert cho thành công
        navigate("/login");
      } else {
        setError(data.message || "Lỗi đăng ký"); // (CODE MỚI)
      }
    } catch (error) {
      console.error("Lỗi:", error);
      setError("Không thể kết nối đến server!"); // (CODE MỚI)
    } finally {
      setLoading(false); // (CODE MỚI)
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-left">
          <img src={loginArt} alt="Register Illustration" className="auth-img" />
        </div>
        <div className="auth-right">
          <form onSubmit={handleSubmit}>
            <h2>Đăng ký tài khoản</h2>
            <input
              type="text"
              name="name"
              placeholder="Họ và tên"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Mật khẩu(Tối thiểu 8 ký tự, 1 hoa, 1 ký tự đặc biệt)" // (CODE MỚI) Thêm gợi ý
              value={formData.password}
              onChange={handleChange}
              required
            />

            {/* --- (CODE MỚI) Hiển thị lỗi --- */}
            {error && <p className="error">{error}</p>}

            {/* --- (CODE MỚI) Cập nhật button --- */}
            <button type="submit" disabled={loading}>
              {loading ? "Đang xử lý..." : "Đăng ký"}
            </button>

            {/* --- (CODE MỚI) Đồng bộ style link --- */}
            <div className="auth-links" style={{ justifyContent: "center" }}>
              <p>
                Đã có tài khoản?{" "}
                <a href="/login" className="auth-link">
                  Đăng nhập
                </a>
              </p>
            </div>
            {/* --- KẾT THÚC CODE MỚI --- */}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;