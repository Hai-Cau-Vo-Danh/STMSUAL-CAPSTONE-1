import React, { useEffect, useRef } from "react"; // Thêm useEffect và useRef
import { useNavigate } from "react-router-dom";
import "./LandingPage.css"; 

const LandingPage = () => {
  const navigate = useNavigate();

  // --- LOGIC ANIMATION MỚI ---
  // Tạo 'ref' để gắn vào các phần tử JSX
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const ctaRef = useRef(null);
  const footerRef = useRef(null);

  useEffect(() => {
    // Tạo một observer
    const observer = new IntersectionObserver(
      (entries) => {
        // Lặp qua các phần tử được quan sát
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Nếu phần tử lọt vào màn hình, thêm class 'is-visible'
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target); // Ngừng quan sát sau khi đã kích hoạt
          }
        });
      },
      {
        threshold: 0.1, // Kích hoạt khi 10% phần tử xuất hiện
      }
    );

    // Gắn observer vào các ref
    const elementsToObserve = [heroRef, featuresRef, ctaRef, footerRef];
    elementsToObserve.forEach((ref) => {
      if (ref.current) {
        observer.observe(ref.current);
      }
    });

    // Dọn dẹp khi component unmount
    return () => {
      elementsToObserve.forEach((ref) => {
        if (ref.current) {
          observer.unobserve(ref.current);
        }
      });
    };
  }, []); // Chạy 1 lần duy nhất khi component mount

  // Dữ liệu tính năng (giữ nguyên)
  const features = [
    {
      icon: "⏰",
      title: "Tập trung & Quản lý thời gian",
      description:
        "Pomodoro giúp bạn duy trì sự tập trung, xây dựng kỷ luật và hoàn thành mục tiêu từng bước một.",
    },
    {
      icon: "🧠",
      title: "Trí tuệ Nhân tạo hỗ trợ",
      description:
        "AI hiểu bạn, giúp bạn sắp xếp công việc thông minh, gợi ý thời gian học tối ưu và tự động hóa nhắc nhở.",
    },
    {
      icon: "📈",
      title: "Theo dõi tiến trình phát triển",
      description:
        "Biểu đồ và thống kê giúp bạn nhìn lại hành trình – mỗi ngày là một bước tiến gần hơn đến thành công.",
    },
  ];

  return (
    <div className="landing-container-new">
      
      {/* Hero Section - Thêm ref và class animation */}
      <section className="hero-new animate-on-scroll" ref={heroRef}>
        <div className="hero-text">
          {/* Các phần tử con cũng sẽ có hiệu ứng trễ */}
          <h1 className="hero-title-new">
            <span className="gradient-text-new">STMSUAI.</span> <br />
            <span className="hero-sub-new">Tập trung. Hoàn thành.</span>
          </h1>
          <p className="hero-desc-new">
            Một không gian số giúp bạn sắp xếp công việc, học tập hiệu quả, và
            nuôi dưỡng kỷ luật cá nhân bằng Pomodoro và AI.
          </p> {/* <--- ĐÃ SỬA LỖI: Thêm thẻ đóng </p> tại đây */}
          
          <div className="hero-buttons-new">
            <button className="btn-primary-new" onClick={() => navigate("/login")}>
              🚀 Bắt đầu ngay
            </button>
            <button className="btn-outline-new" onClick={() => navigate("/register")}>
              Đăng ký miễn phí
            </button>
          </div>
        </div>
        
        {/* --- PHẦN ĐÃ NÂNG CẤP LÊN 7 BONG BÓNG --- */}
        <div className="hero-visual">
          {/* "Mặt trời" */}
          <div className="shape shape-1"></div>
          
          {/* 6 "Hành tinh" */}
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
          <div className="shape shape-5"></div>
          <div className="shape shape-6"></div>
          <div className="shape shape-7"></div>
        </div>
      </section>

      {/* Features Section - Thêm ref và class animation */}
      <section className="features-new animate-on-scroll" ref={featuresRef}>
        <div className="section-header-new">
          <span className="badge-new">Tính năng chính</span>
          <h2>Ba Trụ Cột Giúp Bạn Duy Trì Động Lực</h2>
        </div>

        <div className="features-grid-new">
          {features.map((f, i) => (
            // Bỏ animation delay inline, CSS sẽ tự xử lý
            <div className="feature-card-new" key={i}>
              <div className="feature-icon-new">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Call To Action - Thêm ref và class animation */}
      <section className="cta-new animate-on-scroll" ref={ctaRef}>
        <div className="cta-box-new">
          <h2>Bắt đầu thay đổi thói quen học tập của bạn ngay hôm nay</h2>
          <p>
            Từng phút giây bạn tập trung hôm nay — là nền tảng cho phiên bản
            xuất sắc của bạn ngày mai.
          </p>
          <button className="btn-cta-new" onClick={() => navigate("/register")}>
            Tham gia miễn phí →
          </button>
        </div>
      </section>

      {/* Footer - Thêm ref và class animation */}
      <footer className="footer-new animate-on-scroll" ref={footerRef}>
        <div className="footer-inner-new">
          <h3>STMSUAL</h3>
          <div className="footer-links-new">
            <a href="#features">Tính năng</a>
            <a href="#contact">Liên hệ</a>
          </div>
          <p className="footer-bottom-new">
            © 2025 STMSUAI — Hành trình học tập bắt đầu từ sự tập trung.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;