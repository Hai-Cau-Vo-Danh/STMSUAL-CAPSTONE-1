import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './DashboardAdmin.css'; 
import { 
  BsGrid1X2Fill, BsPeopleFill, BsCollectionFill, 
  BsBoxArrowRight, BsPlusLg, BsTrash, BsPencilSquare,
  BsShieldExclamation, BsCheckCircleFill, BsExclamationTriangleFill 
} from 'react-icons/bs';
import { IoClose } from 'react-icons/io5';
import axios from 'axios';

// ⚠️ ĐÃ SỬA: Dùng VITE_BACKEND_URL thay vì localhost
const API_URL = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, '');

// =========================================
// 1. SIDEBAR COMPONENT
// =========================================
const AdminSidebar = ({ onLogout, activeView, setActiveView }) => {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-header"> 
        <span className="admin-logo">STMSU-AI</span>
        <span className="admin-title">Control Center</span>
      </div>
      
      <ul className="admin-nav-list">
        <li className={`admin-nav-item ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveView('dashboard')}>
          <BsGrid1X2Fill size={20} /> <span>Dashboard</span>
        </li>
        <li className={`admin-nav-item ${activeView === 'users' ? 'active' : ''}`} onClick={() => setActiveView('users')}>
          <BsPeopleFill size={20} /> <span>Quản lý User</span>
        </li>
        <li className={`admin-nav-item ${activeView === 'posts' ? 'active' : ''}`} onClick={() => setActiveView('posts')}>
          <BsCollectionFill size={20} /> <span>Quản lý Bài viết</span>
        </li>
        <li className={`admin-nav-item ${activeView === 'reports' ? 'active' : ''}`} onClick={() => setActiveView('reports')}>
          <BsShieldExclamation size={20} /> <span>Xử lý Vi phạm</span>
        </li>
      </ul>

      <div className="admin-sidebar-footer"> 
        <button className="admin-logout-btn" onClick={onLogout}>
          <BsBoxArrowRight size={20} /> <span>Thoát hệ thống</span>
        </button>
      </div>
    </aside>
  );
};

// =========================================
// 2. FORM MODAL COMPONENT
// =========================================
const AdminModal = ({ title, children, onClose }) => (
  <div className="admin-modal-overlay" onClick={onClose}>
    <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h3>{title}</h3>
        <button onClick={onClose} className="close-modal"><IoClose /></button>
      </div>
      <div className="modal-body">{children}</div>
    </div>
  </div>
);

// =========================================
// 3. CONFIRM/ALERT DIALOG COMPONENT
// =========================================
const ConfirmDialog = ({ isOpen, type, title, message, onConfirm, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-dialog-content" onClick={(e) => e.stopPropagation()}>
        <div className={`dialog-icon ${type}`}>
          {type === 'confirm' || type === 'error' ? <BsExclamationTriangleFill /> : <BsCheckCircleFill />}
        </div>
        <h3 className="dialog-title">{title}</h3>
        <p className="dialog-message">{message}</p>
        
        <div className="dialog-actions">
          {type === 'confirm' ? (
            <>
              <button className="dialog-btn cancel" onClick={onClose}>Hủy bỏ</button>
              <button className="dialog-btn confirm" onClick={() => { onConfirm(); onClose(); }}>
                Xác nhận
              </button>
            </>
          ) : (
            <button className="dialog-btn close" onClick={onClose}>Đóng</button>
          )}
        </div>
      </div>
    </div>
  );
};

// =========================================
// 4. MAIN DASHBOARD COMPONENT
// =========================================
const DashboardAdmin = ({ onLogout }) => {
  const token = localStorage.getItem('token'); 
  const [activeView, setActiveView] = useState('dashboard');
  const [stats, setStats] = useState({ totalUsers: 0, totalPosts: 0 });
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State cho Modal Form (Add/Edit)
  const [modalState, setModalState] = useState({ isOpen: false, type: null, data: null });
  const [formData, setFormData] = useState({});

  // State cho Dialog (Confirm/Alert)
  const [dialog, setDialog] = useState({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
    onConfirm: null
  });

  const authHeader = { headers: { 'Authorization': `Bearer ${token}` } };

  // --- Helper Functions cho Dialog ---
  const showConfirm = (title, message, onConfirmAction) => {
    setDialog({ isOpen: true, type: 'confirm', title, message, onConfirm: onConfirmAction });
  };
  const showAlert = (title, message, type = 'success') => {
    setDialog({ isOpen: true, type, title, message, onConfirm: null });
  };
  const closeDialog = () => setDialog({ ...dialog, isOpen: false });

  // --- Fetch Data ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsRes, usersRes, postsRes, reportsRes] = await Promise.all([
          axios.get(`${API_URL}/api/admin/stats`, authHeader),
          axios.get(`${API_URL}/api/admin/users`, authHeader),
          axios.get(`${API_URL}/api/admin/posts`, authHeader),
          axios.get(`${API_URL}/api/admin/reports/posts`, authHeader),
        ]);
        setStats(statsRes.data);
        setUsers(usersRes.data);
        setPosts(postsRes.data);
        setReports(reportsRes.data);
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
            onLogout(); 
        }
      } finally { setLoading(false); }
    };
    if (token) fetchData(); 
  }, [token]);

  // --- Handlers Form ---
  const openModal = (type, data = null) => {
    setModalState({ isOpen: true, type, data });
    if (type === 'editUser' && data) setFormData(data);
    else if (type === 'addUser') setFormData({ username: '', email: '', password: '', role: 'user' });
  };
  const closeModal = () => setModalState({ isOpen: false, type: null, data: null });
  const handleFormChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  
  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/admin/users`, formData, authHeader);
      setUsers([...users, res.data]); 
      closeModal();
      showAlert("Thành công", "Đã thêm user mới!", "success");
    } catch (e) { showAlert("Lỗi", e.response?.data?.message || "Thất bại", "error"); }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put(`${API_URL}/api/admin/users/${modalState.data.user_id}`, formData, authHeader);
      setUsers(users.map(u => u.user_id === res.data.user_id ? res.data : u)); 
      closeModal();
      showAlert("Thành công", "Cập nhật user thành công!", "success");
    } catch (e) { showAlert("Lỗi", e.response?.data?.message || "Thất bại", "error"); }
  };

  // --- Handlers Delete/Action (Dùng Dialog Mới) ---
  const handleDeleteUser = (id) => {
    showConfirm("Xóa thành viên?", "Hành động này không thể hoàn tác.", async () => {
        try {
          await axios.delete(`${API_URL}/api/admin/users/${id}`, authHeader);
          setUsers(prev => prev.filter(u => u.user_id !== id));
          showAlert("Đã xóa", "User đã bị xóa khỏi hệ thống.", "success");
        } catch(e) { showAlert("Lỗi", e.response?.data?.message || "Không thể xóa.", "error"); }
    });
  };

  const handleDeletePost = (id) => {
    showConfirm("Xóa bài viết?", "Bài viết sẽ bị gỡ bỏ vĩnh viễn.", async () => {
        try { 
          await axios.delete(`${API_URL}/api/admin/posts/${id}`, authHeader); 
          setPosts(prev => prev.filter(p => p.post_id !== id)); 
          showAlert("Đã xóa", "Bài viết đã bị xóa.", "success");
        } catch(e) { showAlert("Lỗi", e.response?.data?.message, "error"); }
    });
  };

  const handleResolveReport = (id, action) => {
    const title = action === 'delete' ? "Xóa bài viết vi phạm?" : "Bỏ qua báo cáo?";
    showConfirm(title, "Xác nhận hành động xử lý báo cáo này.", async () => {
        try {
          await axios.put(`${API_URL}/api/admin/reports/resolve/${id}`, { action }, authHeader);
          setReports(prev => prev.filter(r => r.report_id !== id));
          if(action === 'delete') {
              const r = reports.find(i => i.report_id === id);
              if(r) setPosts(prev => prev.filter(p => p.post_id !== r.post.post_id));
          }
          showAlert("Thành công", "Đã xử lý báo cáo.", "success");
        } catch(e) { showAlert("Lỗi", e.response?.data?.message, "error"); }
    });
  };

  return (
    <div className="admin-layout">
      {/* Background FX */}
      <div className="admin-bg-grid"></div>
      <div className="admin-bg-glow"></div>

      <AdminSidebar onLogout={onLogout} activeView={activeView} setActiveView={setActiveView} />
      
      <main className="admin-content">
        <div className="content-header">
            <h1>{activeView === 'dashboard' ? 'Dashboard Overview' : activeView === 'users' ? 'User Management' : activeView === 'posts' ? 'Post Management' : 'Report Center'}</h1>
            <p>Hệ thống quản trị viên STMSU.</p>
        </div>

        {/* --- DASHBOARD HOME --- */}
        {activeView === 'dashboard' && (
          <div className="stat-card-grid">
            <div className="admin-stat-card">
              <div className="stat-icon"><BsPeopleFill /></div>
              <div className="stat-data">
                <span className="stat-value">{stats.totalUsers}</span>
                <span className="stat-label">Thành viên</span>
              </div>
            </div>
            <div className="admin-stat-card">
              <div className="stat-icon"><BsCollectionFill /></div>
              <div className="stat-data">
                <span className="stat-value">{stats.totalPosts}</span>
                <span className="stat-label">Tổng bài viết</span>
              </div>
            </div>
            <div className="admin-stat-card" style={{borderColor: reports.length > 0 ? '#ef4444' : ''}}>
              <div className="stat-icon" style={{color: reports.length > 0 ? '#ef4444' : ''}}><BsShieldExclamation /></div>
              <div className="stat-data">
                <span className="stat-value">{reports.length}</span>
                <span className="stat-label">Cảnh báo</span>
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW: USERS --- */}
        {(activeView === 'dashboard' || activeView === 'users') && (
          <div className="admin-section">
            <div className="section-header">
              <h2>Danh sách User</h2>
              <button className="admin-btn primary" onClick={() => openModal('addUser')}><BsPlusLg /> Thêm mới</button>
            </div>
            <div className="table-wrapper">
              <table className="admin-table">
                <thead><tr><th>ID</th><th>User Info</th><th>Vai trò</th><th>Ngày tham gia</th><th>Tác vụ</th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.user_id}>
                      <td style={{fontFamily:'monospace', color:'#94a3b8'}}>#{u.user_id}</td>
                      <td>
                        <div style={{fontWeight:'bold', color:'white'}}>{u.username}</div>
                        <div style={{fontSize:'0.8rem', color:'#94a3b8'}}>{u.email}</div>
                      </td>
                      <td><span className={`role-badge ${u.role}`}>{u.role}</span></td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="actions">
                          <button className="icon-btn edit" onClick={() => openModal('editUser', u)}><BsPencilSquare /></button>
                          <button className="icon-btn delete" onClick={() => handleDeleteUser(u.user_id)}><BsTrash /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- VIEW: POSTS --- */}
        {activeView === 'posts' && (
          <div className="admin-section">
            <div className="section-header"><h2>Quản lý Bài viết</h2></div>
            <div className="table-wrapper">
              <table className="admin-table">
                <thead><tr><th>ID</th><th>Nội dung</th><th>Tác giả</th><th>Ngày đăng</th><th>Tác vụ</th></tr></thead>
                <tbody>
                  {posts.map(p => (
                    <tr key={p.post_id}>
                      <td>#{p.post_id}</td>
                      <td style={{maxWidth:'300px'}}>{p.content.substring(0,60)}...</td>
                      <td>{p.author.username}</td>
                      <td>{new Date(p.created_at).toLocaleDateString()}</td>
                      <td>
                        <button className="icon-btn delete" onClick={() => handleDeletePost(p.post_id)}><BsTrash /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- VIEW: REPORTS --- */}
        {activeView === 'reports' && (
          <div className="admin-section">
            <div className="section-header"><h2>Xử lý Báo cáo</h2></div>
            <div className="table-wrapper">
              <table className="admin-table">
                <thead><tr><th>Lý do</th><th>Nội dung bị báo cáo</th><th>Người báo cáo</th><th>Xử lý</th></tr></thead>
                <tbody>
                  {reports.length === 0 ? <tr><td colSpan="4" style={{textAlign:'center', padding:'30px'}}>Hệ thống trong sạch ✨</td></tr> : 
                   reports.map(r => (
                    <tr key={r.report_id}>
                      <td style={{color:'#fca5a5'}}>{r.reason}</td>
                      <td style={{maxWidth:'350px'}}>{r.post.content.substring(0,80)}...</td>
                      <td>{r.reporter.username}</td>
                      <td>
                        <div className="actions">
                          <button className="icon-btn ignore" title="Bỏ qua" onClick={() => handleResolveReport(r.report_id, 'ignore')}><BsCheckCircleFill /></button>
                          <button className="icon-btn delete" title="Xóa bài" onClick={() => handleResolveReport(r.report_id, 'delete')}><BsTrash /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* --- MODAL ADD/EDIT USER --- */}
      {modalState.isOpen && (
        <AdminModal title={modalState.type === 'addUser' ? 'New User' : 'Update User'} onClose={closeModal}>
          <form onSubmit={modalState.type === 'addUser' ? handleAddUser : handleEditUser}>
            <div className="form-group">
                <label>Username</label>
                <input className="form-input" name="username" defaultValue={formData.username} onChange={handleFormChange} required />
            </div>
            <div className="form-group">
                <label>Email</label>
                <input className="form-input" type="email" name="email" defaultValue={formData.email} onChange={handleFormChange} required />
            </div>
            {modalState.type === 'addUser' && (
                <div className="form-group">
                    <label>Password</label>
                    <input className="form-input" type="password" name="password" onChange={handleFormChange} required />
                </div>
            )}
            <div className="form-group">
                <label>Role</label>
                <select className="form-select" name="role" defaultValue={formData.role || 'user'} onChange={handleFormChange}>
                    <option value="user">Member</option>
                    <option value="admin">Administrator</option>
                </select>
            </div>
            <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="admin-btn primary">Save Changes</button>
            </div>
          </form>
        </AdminModal>
      )}

      {/* --- CUSTOM DIALOG --- */}
      <ConfirmDialog 
        isOpen={dialog.isOpen}
        type={dialog.type}
        title={dialog.title}
        message={dialog.message}
        onConfirm={dialog.onConfirm}
        onClose={closeDialog}
      />
    </div>
  );
};

export default DashboardAdmin;
