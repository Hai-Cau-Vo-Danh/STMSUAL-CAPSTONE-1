import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './DashboardAdmin.css'; 
import { 
  BsFillGrid3X3GapFill, BsPeopleFill, BsFileEarmarkTextFill, 
  BsBoxArrowRight, BsPlusCircleFill, BsTrash, BsPencil,
  BsExclamationOctagonFill, // (MỚI) Icon Báo cáo
  BsShieldCheck, // (MỚI) Icon Bỏ qua
} from 'react-icons/bs';
import { IoClose } from 'react-icons/io5';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ===== COMPONENT SIDEBAR (ĐÃ SỬA) =====
const AdminSidebar = ({ onLogout, activeView, setActiveView }) => {
  const { t } = useTranslation();
  
  return (
    <nav className="admin-sidebar">
      <div className="admin-sidebar-header">
        <span className="admin-logo">STMSUAI</span>
        <span className="admin-title">Admin Panel</span>
      </div>
      <ul className="admin-nav-list">
        {/* Nút 1: Dashboard (Mặc định) */}
        <li 
          className={`admin-nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveView('dashboard')}
        >
          <BsFillGrid3X3GapFill />
          <span>Dashboard</span>
        </li>
        {/* Nút 2: User Bị báo cáo */}
        <li 
          className={`admin-nav-item ${activeView === 'reported_users' ? 'active' : ''}`}
          onClick={() => setActiveView('reported_users')}
        >
          <BsPeopleFill />
          <span>User Bị báo cáo</span>
        </li>
        {/* Nút 3: Bài viết Bị báo cáo */}
        <li 
          className={`admin-nav-item ${activeView === 'reported_posts' ? 'active' : ''}`}
          onClick={() => setActiveView('reported_posts')}
        >
          <BsExclamationOctagonFill />
          <span>Bài viết Bị báo cáo</span>
        </li>
      </ul>
      <div className="admin-sidebar-footer">
        <button className="admin-logout-btn" onClick={onLogout}>
          <BsBoxArrowRight />
          <span>Đăng xuất</span>
        </button>
      </div>
    </nav>
  );
};
// ===== KẾT THÚC SỬA SIDEBAR =====

// (Modal giữ nguyên)
const AdminModal = ({ title, children, onClose }) => (
  <div className="admin-modal-overlay" onClick={onClose}>
    <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="admin-modal-header">
        <h3>{title}</h3>
        <button onClick={onClose} className="admin-modal-close-btn"><IoClose /></button>
      </div>
      <div className="admin-modal-body">{children}</div>
    </div>
  </div>
);


// ===== COMPONENT CHÍNH: DashboardAdmin =====
const DashboardAdmin = ({ onLogout }) => {
  const { t, i18n } = useTranslation();
  const token = localStorage.getItem('token'); 

  // (MỚI) State để điều khiển giao diện
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard', 'reported_users', 'reported_posts'

  const [stats, setStats] = useState({ totalUsers: 0, totalPosts: 0, newUsers: 0 });
  const [users, setUsers] = useState([]); // State cho TẤT CẢ user
  const [posts, setPosts] = useState([]); // State cho TẤT CẢ bài viết
  const [reports, setReports] = useState([]); // (MỚI) State cho Báo cáo
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalState, setModalState] = useState({ isOpen: false, type: null, data: null });
  const [formData, setFormData] = useState({});

  const authHeader = { headers: { 'Authorization': `Bearer ${token}` } };

  // (ĐÃ SỬA) useEffect sẽ tải TẤT CẢ data (cả báo cáo)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsRes, usersRes, postsRes, reportsRes] = await Promise.all([
          axios.get(`${API_URL}/api/admin/stats`, authHeader),
          axios.get(`${API_URL}/api/admin/users`, authHeader),
          axios.get(`${API_URL}/api/admin/posts`, authHeader),
          axios.get(`${API_URL}/api/admin/reports/posts`, authHeader), // (MỚI) Tải báo cáo
        ]);
        
        setStats(statsRes.data);
        setUsers(usersRes.data);
        setPosts(postsRes.data);
        setReports(reportsRes.data); // (MỚI) Lưu báo cáo
        
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu admin:", err);
        if (err.response?.status === 401 || err.response?.status === 403) {
            alert("Phiên đăng nhập hết hạn hoặc không có quyền. Vui lòng đăng nhập lại.");
            onLogout(); 
        } else {
            setError("Không thể tải dữ liệu. Vui lòng thử lại.");
        }
      } finally {
        setLoading(false);
      }
    };
    
    if (token) {
        fetchData(); 
    }
  }, [token, onLogout]);
  
  // (Các hàm CRUD và Modal giữ nguyên)
  const openModal = (type, data = null) => {
    setModalState({ isOpen: true, type, data });
    if (type === 'editUser' && data) { setFormData(data); } 
    else if (type === 'addUser') { setFormData({ username: '', email: '', password: '', role: 'user' }); }
    else { setFormData({}); }
  };
  const closeModal = () => setModalState({ isOpen: false, type: null, data: null });
  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/admin/users`, formData, authHeader);
      setUsers([...users, res.data]); // Cập nhật state 'users'
      closeModal();
    } catch (err) { alert("Lỗi: " + err.response?.data?.message); }
  };
  const handleEditUser = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put(`${API_URL}/api/admin/users/${modalState.data.user_id}`, formData, authHeader);
      setUsers(users.map(u => (u.user_id === res.data.user_id ? res.data : u))); // Cập nhật state 'users'
      closeModal();
    } catch (err) { alert("Lỗi: " + err.response?.data?.message); }
  };
  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Bạn có chắc muốn xóa user này?")) return;
    try {
      await axios.delete(`${API_URL}/api/admin/users/${userId}`, authHeader);
      setUsers(users.filter(u => u.user_id !== userId)); // Cập nhật state 'users'
    } catch (err) { alert("Lỗi: " + err.response?.data?.message); }
  };
  const handleDeletePost = async (postId) => {
    if (!window.confirm("Bạn có chắc muốn xóa bài viết này?")) return;
    try {
      await axios.delete(`${API_URL}/api/admin/posts/${postId}`, authHeader);
      setPosts(posts.filter(p => p.post_id !== postId)); // Cập nhật state 'posts'
    } catch (err) { alert("Lỗi: " + err.response?.data?.message); }
  };
  
  // (MỚI) Hàm xử lý báo cáo
  const handleResolveReport = async (reportId, action) => {
    const confirmationText = action === 'delete' 
      ? "Bạn có chắc muốn XÓA bài viết này vĩnh viễn?" 
      : "Bạn có chắc muốn BỎ QUA báo cáo này?";
      
    if (!window.confirm(confirmationText)) return;

    try {
      await axios.put(`${API_URL}/api/admin/reports/resolve/${reportId}`, { action }, authHeader);
      // Xóa báo cáo khỏi danh sách UI
      setReports(reports.filter(r => r.report_id !== reportId));
      
      // (Nâng cao) Nếu action là 'delete', xóa post đó khỏi bảng 'posts' luôn
      if (action === 'delete') {
          const report = reports.find(r => r.report_id === reportId);
          if (report) {
              setPosts(posts.filter(p => p.post_id !== report.post.post_id));
          }
      }
      alert(`Đã xử lý báo cáo (Hành động: ${action})`);
    } catch (err) {
      alert("Lỗi: " + err.response?.data?.message);
    }
  };

  // (MỚI) Hàm chọn tiêu đề
  const renderTitle = () => {
    if (activeView === 'reported_users') return "User Bị báo cáo";
    if (activeView === 'reported_posts') return "Bài viết Bị báo cáo";
    return "Dashboard Quản trị";
  };
  
  // (MỚI) Hàm chọn lời chào
  const renderSubtitle = () => {
    if (activeView === 'reported_users') return "Xem xét và xử lý các user bị báo cáo.";
    if (activeView === 'reported_posts') return "Xem xét và xử lý các bài viết bị báo cáo.";
    return "Chào mừng Admin, đây là trung tâm điều hành của bạn.";
  }

  return (
    <div className="admin-layout">
      {/* Truyền 'activeView' và 'setActiveView' vào Sidebar */}
      <AdminSidebar 
        onLogout={onLogout} 
        activeView={activeView} 
        setActiveView={setActiveView} 
      />
      
      <main className="admin-content">
        <h1>{renderTitle()}</h1> 
        <p>{renderSubtitle()}</p>

        {/* --- (ĐÃ SỬA) Hiển thị nội dung theo 'activeView' --- */}

        {/* --- 1. View DASHBOARD (Stats, All Users, All Posts) --- */}
        {activeView === 'dashboard' && (
          <>
            {/* --- Stats Cards --- */}
            <div className="stat-card-grid">
              <div className="admin-stat-card">
                <div className="stat-icon users"><BsPeopleFill /></div>
                <div className="stat-info">
                  <span className="stat-value">{loading ? '...' : stats.totalUsers}</span>
                  <span className="stat-label">Tổng số User</span>
                </div>
              </div>
              <div className="admin-stat-card">
                <div className="stat-icon posts"><BsFileEarmarkTextFill /></div>
                <div className="stat-info">
                  <span className="stat-value">{loading ? '...' : stats.totalPosts}</span>
                  <span className="stat-label">Tổng số Bài viết</span>
                </div>
              </div>
              <div className="admin-stat-card">
                <div className="stat-icon new-users"><BsExclamationOctagonFill /></div>
                <div className="stat-info">
                  <span className="stat-value">{loading ? '...' : reports.length}</span>
                  <span className="stat-label">Báo cáo đang chờ</span>
                </div>
              </div>
            </div>

            {/* --- User Management --- */}
            <div className="admin-section">
              <div className="admin-section-header">
                <h2>Quản lý User</h2>
                <button className="admin-btn primary" onClick={() => openModal('addUser')}>
                  <BsPlusCircleFill /> Thêm User
                </button>
              </div>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User ID</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Vai trò</th>
                      <th>Ngày tham gia</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && <tr><td colSpan="6">Đang tải...</td></tr>}
                    {error && <tr><td colSpan="6" style={{color: 'red'}}>{error}</td></tr>}
                    {users.map(user => (
                      <tr key={user.user_id}>
                        <td>{user.user_id}</td>
                        <td>{user.username}</td>
                        <td>{user.email}</td>
                        <td><span className={`role-badge ${user.role}`}>{user.role}</span></td>
                        <td>{new Date(user.created_at).toLocaleDateString()}</td>
                        <td className="actions">
                          <button className="admin-btn edit" onClick={() => openModal('editUser', user)}>
                            <BsPencil />
                          </button>
                          <button className="admin-btn delete" onClick={() => handleDeleteUser(user.user_id)}>
                            <BsTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* --- Post Management --- */}
            <div className="admin-section">
              <div className="admin-section-header">
                <h2>Quản lý Bài viết Forum</h2>
              </div>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Post ID</th>
                      <th>Nội dung</th>
                      <th>Người đăng</th>
                      <th>Ngày đăng</th>
                      <th>Reactions</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && <tr><td colSpan="6">Đang tải...</td></tr>}
                    {posts.map(post => (
                      <tr key={post.post_id}>
                        <td>{post.post_id}</td>
                        <td className="post-content-cell">{post.content.substring(0, 100)}...</td>
                        <td>{post.author.username} (ID: {post.author.user_id})</td>
                        <td>{new Date(post.created_at).toLocaleDateString()}</td>
                        <td>{Object.values(post.reaction_counts).reduce((a, b) => a + b, 0)}</td>
                        <td className="actions">
                          <button className="admin-btn delete" onClick={() => handleDeletePost(post.post_id)}>
                            <BsTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        
        {/* --- 2. View USER BỊ BÁO CÁO --- */}
        {activeView === 'reported_users' && (
          <div className="admin-section">
            <div className="admin-section-header">
              <h2>User Bị báo cáo (Chưa xử lý)</h2>
            </div>
            <div style={{padding: '20px'}}>
              <p>Chức năng này sẽ được phát triển trong tương lai.</p>
            </div>
          </div>
        )}

        {/* --- 3. View BÀI VIẾT BỊ BÁO CÁO --- */}
        {activeView === 'reported_posts' && (
           <div className="admin-section">
            <div className="admin-section-header">
              <h2>Bài viết Bị báo cáo (Đang chờ)</h2>
            </div>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Report ID</th>
                    <th>Lý do Báo cáo</th>
                    <th>Nội dung Bài viết</th>
                    <th>Người Báo cáo</th>
                    <th>Tác giả Bài viết</th>
                    <th>Ngày Báo cáo</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && <tr><td colSpan="7">Đang tải...</td></tr>}
                  {error && <tr><td colSpan="7" style={{color: 'red'}}>{error}</td></tr>}
                  {!loading && reports.length === 0 && <tr><td colSpan="7">Không có báo cáo nào đang chờ.</td></tr>}
                  
                  {reports.map(report => (
                    <tr key={report.report_id}>
                      <td>{report.report_id}</td>
                      <td className="report-reason-cell">{report.reason}</td>
                      <td className="post-content-cell">{report.post.content.substring(0, 100)}...</td>
                      <td>{report.reporter.username} (ID: {report.reporter.user_id})</td>
                      <td>{report.post.author.username} (ID: {report.post.author.user_id})</td>
                      <td>{new Date(report.report_date).toLocaleDateString()}</td>
                      <td className="actions">
                        <button 
                          className="admin-btn ignore" 
                          title="Bỏ qua báo cáo"
                          onClick={() => handleResolveReport(report.report_id, 'ignore')}
                        >
                          <BsShieldCheck /> Bỏ qua
                        </button>
                        <button 
                          className="admin-btn delete" 
                          title="Xóa bài viết này"
                          onClick={() => handleResolveReport(report.report_id, 'delete')}
                        >
                          <BsTrash /> Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* --- KẾT THÚC HIỂN THỊ THEO VIEW --- */}

      </main>

      {/* (Modal giữ nguyên) */}
      {modalState.isOpen && modalState.type === 'addUser' && (
        <AdminModal title="Tạo User Mới" onClose={closeModal}>
          <form onSubmit={handleAddUser} className="admin-form">
            <div className="form-group"><label>Username</label><input type="text" name="username" onChange={handleFormChange} required /></div>
            <div className="form-group"><label>Email</label><input type="email" name="email" onChange={handleFormChange} required /></div>
            <div className="form-group"><label>Password</label><input type="password" name="password" onChange={handleFormChange} required /></div>
            <div className="form-group">
              <label>Vai trò</label>
              <select name="role" defaultValue="user" onChange={handleFormChange}>
                <option value="user">User</option><option value="admin">Admin</option>
              </select>
            </div>
            <div className="form-actions">
              <button type="button" className="admin-btn" onClick={closeModal}>Hủy</button>
              <button type="submit" className="admin-btn primary">Tạo</button>
            </div>
          </form>
        </AdminModal>
      )}
      {modalState.isOpen && modalState.type === 'editUser' && (
        <AdminModal title={`Sửa User: ${modalState.data.username}`} onClose={closeModal}>
          <form onSubmit={handleEditUser} className="admin-form">
            <div className="form-group"><label>Username</label><input type="text" name="username" defaultValue={formData.username} onChange={handleFormChange} required /></div>
            <div className="form-group"><label>Email</label><input type="email" name="email" defaultValue={formData.email} onChange={handleFormChange} required /></div>
            <div className="form-group">
              <label>Vai trò</label>
              <select name="role" defaultValue={formData.role} onChange={handleFormChange}>
                <option value="user">User</option><option value="admin">Admin</option>
              </select>
            </div>
            <div className="form-actions">
              <button type="button" className="admin-btn" onClick={closeModal}>Hủy</button>
              <button type="submit" className="admin-btn primary">Lưu thay đổi</button>
            </div>
          </form>
        </AdminModal>
      )}

    </div>
  );
};

export default DashboardAdmin;