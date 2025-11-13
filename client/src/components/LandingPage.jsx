import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

const LandingPage = () => {
  const navigate = useNavigate();
  
  // State quản lý FAQ (chỉ mở 1 câu hỏi cùng lúc)
  const [activeIndex, setActiveIndex] = useState(null);

  const toggleFAQ = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  // Dữ liệu FAQ chi tiết & Chuyên nghiệp
  const faqData = [
    {
      question: "STMSU có thực sự miễn phí không?",
      answer:
        "Chính xác! Chúng tôi cam kết gói 'Starter' sẽ miễn phí trọn đời. Bạn được sử dụng không giới hạn các tính năng cốt lõi: Tạo Todo-list, Pomodoro Timer và Lịch cơ bản. Gói Pro (chỉ bằng 1 cốc cà phê/tháng) sẽ mở khóa sức mạnh của AI, phân tích sâu và không giới hạn dự án."
    },
    {
      question: "Cơ chế AI hoạt động như thế nào để giúp tôi?",
      answer:
        "Không chỉ là sắp xếp ngẫu nhiên. STMSU sử dụng Machine Learning để học thói quen làm việc của bạn. Nó phân tích 'Khung giờ vàng' (lúc bạn tập trung nhất) và tự động đề xuất lịch trình tối ưu. Ví dụ: AI sẽ đẩy các task khó vào buổi sáng khi bạn tỉnh táo và các task hành chính nhẹ nhàng vào buổi chiều."
    },
    {
      question: "Dữ liệu của tôi có được bảo mật không?",
      answer:
        "Tuyệt đối an toàn. Chúng tôi sử dụng chuẩn mã hóa TLS 1.3 cho dữ liệu truyền tải và AES-256 cho dữ liệu lưu trữ (tương đương chuẩn ngân hàng). Dữ liệu của bạn là của riêng bạn, chúng tôi không bao giờ bán thông tin cho bên thứ ba quảng cáo."
    },
    {
      question: "Tôi có thể dùng Offline khi không có mạng?",
      answer:
        "Có thể. Phiên bản Mobile App (iOS/Android) hỗ trợ chế độ 'Offline First'. Bạn có thể tích task, chạy Pomodoro trên máy bay hoặc nơi không có sóng. Ngay khi có Internet, dữ liệu sẽ tự động đồng bộ hóa lên đám mây (Cloud) trong tíc tắc."
    },
    {
      question: "Gói Team/Doanh nghiệp có tính năng gì đặc biệt?",
      answer:
        "Gói Team cho phép chia sẻ không gian làm việc (Shared Workspace), giao việc cho thành viên và theo dõi tiến độ thời gian thực (Real-time). Ngoài ra còn có tính năng xuất báo cáo hiệu suất PDF để dùng cho các cuộc họp tuần."
    }
  ];

  // Logic Scroll Animation
  useEffect(() => {
    const revealElements = document.querySelectorAll(".reveal");
    const revealOnScroll = () => {
      const windowHeight = window.innerHeight;
      const elementVisible = 100;
      revealElements.forEach((el) => {
        const elementTop = el.getBoundingClientRect().top;
        if (elementTop < windowHeight - elementVisible) {
          el.classList.add("active");
        }
      });
    };
    window.addEventListener("scroll", revealOnScroll);
    revealOnScroll(); // Trigger once on load
    return () => window.removeEventListener("scroll", revealOnScroll);
  }, []);

  return (
    <div className="landing-container-new">
      {/* --- 1. HEADER --- */}
      <header className="header-new">
        <a href="/" className="header-logo">
          STMSU <span className="gradient-text">- AI</span>
        </a>
        <nav className="header-nav">
          <a href="#features" className="nav-link">Tính năng</a>
          <a href="#pricing" className="nav-link">Bảng giá</a>
          <a href="#testimonials" className="nav-link">Đánh giá</a>
          <a href="#faq" className="nav-link">FAQs</a>
        </nav>
        <div className="header-actions">
          <button className="btn-login" onClick={() => navigate("/login")}>Đăng nhập</button>
          <button className="btn-signup" style={{ marginLeft: "10px" }} onClick={() => navigate("/register")}>Đăng ký</button>
        </div>
      </header>

      {/* --- 2. HERO SECTION --- */}
      <section className="hero-new">
        {/* Hiệu ứng Orbs nền */}
        <div className="hero-visual-orbs">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
        </div>

        <div className="hero-content reveal">
          <div className="hero-tag-wrapper">
            <span className="hero-tag">🚀 AI Productivity App #1 2025</span>
          </div>
          <h1 className="hero-title">
            Làm chủ thời gian <br />
            với <span className="gradient-text">Trí tuệ Nhân tạo.</span>
          </h1>
          <p className="hero-desc">
            STMSU - AI biến sự hỗn loạn thành trật tự. Một trợ lý ảo thấu hiểu cách bạn làm việc, 
            giúp bạn đạt được trạng thái "Deep Work" và cân bằng cuộc sống chỉ trong vài cú nhấp chuột.
          </p>
          
          {/* Nút bấm (Đã sửa lỗi hiển thị) */}
          <div className="hero-btns">
            <button className="btn-primary-new" onClick={() => navigate("/register")}>Bắt đầu miễn phí</button>
            <button className="btn-outline-new">Xem Demo 1 phút</button>
          </div>

          {/* Social Proof nhỏ dưới nút */}
          <p className="hero-micro-text">
            ✨ Không cần thẻ tín dụng • Hủy bất kỳ lúc nào
          </p>
        </div>
      </section>

      {/* --- 3. STATS SECTION --- */}
      <div className="stats-section reveal">
        <div className="stat-item">
          <span className="stat-num gradient-text">10K+</span>
          <span className="stat-label">Người dùng Active</span>
        </div>
        <div className="stat-item">
          <span className="stat-num gradient-text">2M+</span>
          <span className="stat-label">Tasks hoàn thành</span>
        </div>
        <div className="stat-item">
          <span className="stat-num gradient-text">4.9/5</span>
          <span className="stat-label">Rating App Store</span>
        </div>
      </div>

      {/* --- 4. FEATURES SECTION --- */}
      <section id="features" className="section-padding">
        <div className="section-title reveal">
          <h2>Công nghệ định hình tương lai</h2>
          <p>Chúng tôi không chỉ xây dựng một to-do list. Chúng tôi xây dựng hệ điều hành cho công việc của bạn.</p>
        </div>
        
        <div className="features-grid reveal">
          <div className="feature-card glass-panel glow-effect">
            <div className="icon-box">🧠</div>
            <h3>Smart AI Scheduling</h3>
            <p>Thuật toán tự động sắp xếp lại lịch trình dựa trên deadline và mức độ ưu tiên, đảm bảo bạn không bao giờ trễ hẹn.</p>
          </div>
          <div className="feature-card glass-panel glow-effect">
            <div className="icon-box">🍅</div>
            <h3>Focus Pomodoro 2.0</h3>
            <p>Đồng hồ đếm ngược tích hợp âm thanh White Noise giúp não bộ đi vào trạng thái tập trung nhanh gấp 2 lần.</p>
          </div>
          <div className="feature-card glass-panel glow-effect">
            <div className="icon-box">📊</div>
            <h3>Insight Analytics</h3>
            <p>Biểu đồ trực quan giúp bạn nhìn thấy mình đã dành bao nhiêu thời gian cho công việc, học tập và giải trí.</p>
          </div>
          <div className="feature-card glass-panel glow-effect">
            <div className="icon-box">🔄</div>
            <h3>Seamless Sync</h3>
            <p>Bắt đầu trên Laptop, tiếp tục trên Mobile. Dữ liệu đồng bộ tức thì, mọi lúc, mọi nơi.</p>
          </div>
        </div>
      </section>

      {/* --- 5. TESTIMONIALS --- */}
      <section id="testimonials" className="section-padding" style={{ background: "var(--lp-bg-alt)" }}>
        <div className="section-title reveal">
          <h2>Cộng đồng nói gì?</h2>
          <p>Gia nhập cùng hàng ngàn người đang thay đổi cách họ làm việc.</p>
        </div>
        
        <div className="testimonials-grid reveal">
          <div className="testi-card glass-panel">
            <p className="testi-content">"AI của STMSU thực sự hiểu tôi hơn cả bản thân tôi. Nó biết chính xác khi nào tôi mệt và gợi ý nghỉ ngơi. Năng suất x2!"</p>
            <div className="testi-user">
              <div className="user-avatar" style={{background: "linear-gradient(135deg, #ff9a9e, #fecfef)"}}>MA</div>
              <div className="user-info">
                <h4>Minh Anh</h4>
                <span>Senior Designer</span>
              </div>
            </div>
          </div>
          <div className="testi-card glass-panel">
            <p className="testi-content">"Giao diện Clean và Modern. Pomodoro Timer tích hợp sẵn giúp mình tập trung ôn thi cực hiệu quả mà không cần tải app khác."</p>
            <div className="testi-user">
              <div className="user-avatar" style={{background: "linear-gradient(135deg, #a18cd1, #fbc2eb)"}}>HN</div>
              <div className="user-info">
                <h4>Hoàng Nam</h4>
                <span>Sinh viên Bách Khoa</span>
              </div>
            </div>
          </div>
          <div className="testi-card glass-panel">
            <p className="testi-content">"Là Freelancer quản lý 5 dự án cùng lúc, tôi từng bị burn-out. STMSU đã cứu rỗi sự nghiệp của tôi."</p>
            <div className="testi-user">
              <div className="user-avatar" style={{background: "linear-gradient(135deg, #84fab0, #8fd3f4)"}}>TH</div>
              <div className="user-info">
                <h4>Thu Hà</h4>
                <span>Content Creator</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- 6. PRICING --- */}
      <section id="pricing" className="section-padding">
        <div className="section-title reveal">
          <h2>Bảng giá linh hoạt</h2>
          <p>Đầu tư cho bản thân là khoản đầu tư sinh lời nhất.</p>
        </div>

        <div className="pricing-grid reveal">
          {/* Free Plan */}
          <div className="price-card glass-panel">
            <h3>Starter</h3>
            <div className="price-amount">0đ</div>
            <span className="price-period">/ trọn đời</span>
            <ul className="price-features">
              <li><span className="check-icon">✓</span> 5 Dự án cá nhân</li>
              <li><span className="check-icon">✓</span> Pomodoro Timer cơ bản</li>
              <li><span className="check-icon">✓</span> Đồng bộ 2 thiết bị</li>
            </ul>
            <button className="btn-outline-new" style={{width: '100%', marginTop: '20px'}} onClick={() => navigate("/register")}>Đăng ký ngay</button>
          </div>

          {/* Pro Plan */}
          <div className="price-card glass-panel popular">
            <div className="badge-popular">Được chọn nhiều nhất</div>
            <h3 className="gradient-text">Pro AI</h3>
            <div className="price-amount">99k</div>
            <span className="price-period">/ tháng</span>
            <ul className="price-features">
              <li><span className="check-icon">✓</span> <strong>Không giới hạn</strong> dự án</li>
              <li><span className="check-icon">✓</span> <strong>AI Smart Scheduling</strong></li>
              <li><span className="check-icon">✓</span> Phân tích biểu đồ sâu</li>
              <li><span className="check-icon">✓</span> Hỗ trợ ưu tiên 24/7</li>
            </ul>
            <button className="btn-primary-new" style={{width: '100%', marginTop: '20px'}} onClick={() => navigate("/register")}>Dùng thử 14 ngày</button>
          </div>

          {/* Team Plan */}
          <div className="price-card glass-panel">
            <h3>Team</h3>
            <div className="price-amount">299k</div>
            <span className="price-period">/ tháng</span>
            <ul className="price-features">
              <li><span className="check-icon">✓</span> Mọi tính năng Pro</li>
              <li><span className="check-icon">✓</span> Shared Workspaces</li>
              <li><span className="check-icon">✓</span> Giao việc & Bình luận</li>
              <li><span className="check-icon">✓</span> Xuất báo cáo PDF</li>
            </ul>
            <button className="btn-outline-new" style={{width: '100%', marginTop: '20px'}} onClick={() => navigate("/register")}>Liên hệ Sale</button>
          </div>
        </div>
      </section>

      {/* --- 7. FAQ (ACCORDION NÂNG CẤP) --- */}
      <section id="faq" className="section-padding" style={{ background: "var(--lp-bg-alt)" }}>
        <div className="section-title reveal">
          <h2>Câu hỏi thường gặp</h2>
          <p>Mọi thông tin bạn cần biết để bắt đầu hành trình năng suất.</p>
        </div>
        
        <div className="faq-container reveal">
          {faqData.map((item, index) => (
            <div 
              key={index} 
              className={`faq-item-new ${activeIndex === index ? "active" : ""}`}
              onClick={() => toggleFAQ(index)}
            >
              <div className="faq-question-new">
                {item.question}
                <span className="faq-icon-new">{activeIndex === index ? "−" : "+"}</span>
              </div>
              <div className="faq-answer-wrapper">
                <div className="faq-answer-inner">
                  {item.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- 8. CALL TO ACTION --- */}
      <section className="cta-new reveal">
        <div className="cta-inner">
          <h2>Sẵn sàng bứt phá năng suất?</h2>
          <p>Đừng để thời gian trôi qua lãng phí. Tham gia cùng 10,000+ người dùng đang làm việc thông minh hơn mỗi ngày.</p>
          <button className="btn-cta-white" onClick={() => navigate("/register")}>Tạo tài khoản miễn phí</button>
          <p className="cta-subtext">Không yêu cầu thẻ tín dụng. Setup trong 30 giây.</p>
        </div>
      </section>

      {/* --- 9. FOOTER --- */}
      <footer className="footer-new">
        <div className="footer-top">
          <div className="footer-brand">
            <h3>STMSU - AI</h3>
            <p>Nền tảng quản lý công việc thông minh, tối ưu hóa thời gian và nâng cao chất lượng cuộc sống của bạn.</p>
          </div>
          <div className="footer-col">
            <h4>Sản phẩm</h4>
            <a href="#">Tính năng</a>
            <a href="#">Bảng giá</a>
            <a href="#">Tải ứng dụng</a>
            <a href="#">API</a>
          </div>
          <div className="footer-col">
            <h4>Công ty</h4>
            <a href="#">Về chúng tôi</a>
            <a href="#">Tuyển dụng</a>
            <a href="#">Blog</a>
            <a href="#">Liên hệ</a>
          </div>
          <div className="footer-col">
            <h4>Pháp lý</h4>
            <a href="#">Điều khoản</a>
            <a href="#">Bảo mật</a>
            <a href="#">Chính sách Cookie</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2025 STMSU - AI Inc. All rights reserved.</span>
          <div className="footer-socials">
            <span>Facebook</span> • <span>Twitter</span> • <span>LinkedIn</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;