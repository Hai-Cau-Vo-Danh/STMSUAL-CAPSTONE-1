// src/components/Workspaces.jsx
import React, { useState, useEffect } from "react";
import "./Workspaces.css";
import { BsPlus, BsThreeDots, BsStar, BsStarFill, BsPeopleFill, BsLock, BsGlobe, BsPencil, BsTrash } from "react-icons/bs"; // Thêm icon
import { FiSearch, FiGrid, FiList } from "react-icons/fi";
import { IoMdClose } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import { workspaceService } from "../services/workspaceService";

function Workspaces() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState("grid"); // grid or list
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); // all, starred, private, public
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Workspaces data from API
  const [workspaces, setWorkspaces] = useState([]);

  // --- (CODE MỚI) ---
  const [isEditMode, setIsEditMode] = useState(false); // Trạng thái Sửa hay Tạo
  const [currentWsId, setCurrentWsId] = useState(null); // ID của workspace đang sửa
  const [menuOpenFor, setMenuOpenFor] = useState(null); // ID của workspace đang mở menu
  // --- (KẾT THÚC CODE MỚI) ---

  const [newWorkspace, setNewWorkspace] = useState({
    name: "",
    description: "",
    type: "private",
    color: "#667eea",
    icon: "💼"
  });

  // (useEffect fetch data giữ nguyên)
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
      console.warn('⚠️ User not logged in. Redirecting to login...');
      navigate('/login');
      return;
    }
    
    fetchWorkspaces();
  }, [navigate]); // Thêm navigate vào dependency array

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const data = await workspaceService.getAllWorkspaces();
      setWorkspaces(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching workspaces:', err);
      if (err.response?.status === 401) {
        setError('Bạn cần đăng nhập để xem workspaces.');
      } else {
        setError('Không thể tải danh sách workspace. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  // (Filter workspaces giữ nguyên)
  const filteredWorkspaces = workspaces.filter(ws => {
    const matchSearch = ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       (ws.description && ws.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchFilter = filterType === "all" ||
                       (filterType === "starred" && ws.starred) ||
                       (filterType === "private" && ws.type === "private") ||
                       (filterType === "public" && ws.type === "public");
    return matchSearch && matchFilter;
  });

  // --- (HÀM ĐÃ SỬA) ---
  const handleOpenCreateModal = () => {
    setIsEditMode(false); // Chế độ Tạo mới
    setNewWorkspace({ // Reset form
      name: "",
      description: "",
      type: "private",
      color: "#667eea",
      icon: "💼"
    });
    setShowCreateModal(true);
  };
  
  // --- (HÀM MỚI) ---
  const handleOpenEditModal = (workspace) => {
    setIsEditMode(true); // Chế độ Sửa
    setCurrentWsId(workspace.id); // Lưu ID
    setNewWorkspace({ // Điền form
      name: workspace.name,
      description: workspace.description || "",
      type: workspace.type,
      color: workspace.color,
      icon: workspace.icon
    });
    setShowCreateModal(true);
    setMenuOpenFor(null); // Đóng menu
  };

  // --- (HÀM ĐÃ SỬA) ---
  const handleSubmitWorkspace = async () => {
    if (!newWorkspace.name.trim()) return;
    
    if (isEditMode) {
      // Logic SỬA
      try {
        const updated = await workspaceService.updateWorkspace(currentWsId, newWorkspace);
        setWorkspaces(workspaces.map(ws => 
          ws.id === currentWsId ? { ...ws, ...updated } : ws
        ));
        setShowCreateModal(false);
      } catch (err) {
        console.error('Error updating workspace:', err);
        alert(err.response?.data?.error || 'Không thể cập nhật. Vui lòng thử lại.');
      }
    } else {
      // Logic TẠO MỚI (như cũ)
      try {
        const created = await workspaceService.createWorkspace(newWorkspace);
        setWorkspaces([created, ...workspaces]);
        setShowCreateModal(false);
      } catch (err) {
        console.error('Error creating workspace:', err);
        alert('Không thể tạo workspace. Vui lòng thử lại.');
      }
    }
  };

  // --- (HÀM MỚI) ---
  const handleDeleteWorkspace = async (workspaceId) => {
    setMenuOpenFor(null); // Đóng menu
    if (window.confirm("Bạn có chắc muốn xóa workspace này? MỌI DỮ LIỆU (bảng, thẻ...) bên trong sẽ bị xóa vĩnh viễn.")) {
      try {
        await workspaceService.deleteWorkspace(workspaceId);
        setWorkspaces(workspaces.filter(ws => ws.id !== workspaceId));
      } catch (err) {
        console.error('Error deleting workspace:', err);
        alert(err.response?.data?.error || 'Không thể xóa. Vui lòng thử lại.');
      }
    }
  };
  
  // (toggleStar, openWorkspace giữ nguyên)
  const toggleStar = async (id) => {
    try {
      const workspace = workspaces.find(ws => ws.id === id);
      await workspaceService.updateWorkspace(id, { starred: !workspace.starred });
      setWorkspaces(workspaces.map(ws => 
        ws.id === id ? { ...ws, starred: !ws.starred } : ws
      ));
    } catch (err) {
      console.error('Error toggling star:', err);
    }
  };

  const openWorkspace = (id) => {
    navigate(`/app/workspace/${id}`);
  };

  const predefinedColors = [
    "#667eea", "#f59e0b", "#10b981", "#ec4899", 
    "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6"
  ];

  const predefinedIcons = ["💼", "💻", "📢", "🔬", "🎨", "📚", "🚀", "⚡", "🎯", "💡"];

  return (
    <div className="workspaces-container">
      {/* Header */}
      <div className="workspaces-header">
        <div className="header-left">
          <h1>Workspaces</h1>
          <p className="workspace-subtitle">Quản lý các không gian làm việc của bạn</p>
        </div>
        {/* --- (SỬA LẠI) --- */}
        <button className="btn-create-workspace" onClick={handleOpenCreateModal}>
          <BsPlus /> Tạo Workspace
        </button>
      </div>

      {/* Toolbar (giữ nguyên) */}
      <div className="workspaces-toolbar">
        {/* ... (search-filter-group và view-toggle giữ nguyên) ... */}
         <div className="search-filter-group">
          <div className="search-box">
            <FiSearch />
            <input
              type="text"
              placeholder="Tìm kiếm workspace..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="filter-buttons">
             <button 
              className={filterType === "all" ? "active" : ""}
              onClick={() => setFilterType("all")}
            >
              Tất cả
            </button>
            <button 
              className={filterType === "starred" ? "active" : ""}
              onClick={() => setFilterType("starred")}
            >
              <BsStarFill /> Yêu thích
            </button>
            <button 
              className={filterType === "private" ? "active" : ""}
              onClick={() => setFilterType("private")}
            >
              <BsLock /> Riêng tư
            </button>
            <button 
              className={filterType === "public" ? "active" : ""}
              onClick={() => setFilterType("public")}
            >
              <BsGlobe /> Công khai
            </button>
          </div>
        </div>
        <div className="view-toggle">
          <button 
            className={viewMode === "grid" ? "active" : ""}
            onClick={() => setViewMode("grid")}
          >
            <FiGrid />
          </button>
          <button 
            className={viewMode === "list" ? "active" : ""}
            onClick={() => setViewMode("list")}
          >
            <FiList />
          </button>
        </div>
      </div>

      {/* Workspaces Grid/List (Loading/Error giữ nguyên) */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Đang tải workspaces...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <p>{error}</p>
          {error.includes('đăng nhập') ? (
            <button onClick={() => navigate('/login')} className="retry-btn">
              Đăng nhập
            </button>
          ) : (
            <button onClick={fetchWorkspaces} className="retry-btn">Thử lại</button>
          )}
        </div>
      ) : (
        <div className={`workspaces-content ${viewMode}`}>
          {filteredWorkspaces.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📂</div>
              <h3>Không tìm thấy workspace</h3>
              <p>Thử tìm kiếm với từ khóa khác hoặc tạo workspace mới</p>
            </div>
          ) : (
            filteredWorkspaces.map(workspace => (
            <div 
              key={workspace.id} 
              className="workspace-card"
              onClick={() => openWorkspace(workspace.id)}
            >
              <div className="workspace-header-card">
                <div 
                  className="workspace-icon" 
                  style={{ backgroundColor: workspace.color }}
                >
                  {workspace.icon}
                </div>
                
                {/* --- (SỬA LẠI) Logic Nút 3 chấm --- */}
                <div className="workspace-actions">
                  <button 
                    className={`star-btn ${workspace.starred ? 'starred' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleStar(workspace.id); }}
                  >
                    {workspace.starred ? <BsStarFill /> : <BsStar />}
                  </button>
                  
                  {/* Chỉ Owner mới thấy nút 3 chấm */}
                  {workspace.role === 'owner' && (
                    <button 
                      className="menu-btn" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenFor(menuOpenFor === workspace.id ? null : workspace.id);
                      }}
                    >
                      <BsThreeDots />
                    </button>
                  )}

                  {/* Pop-up Menu (CODE MỚI) */}
                  {menuOpenFor === workspace.id && (
                    <div className="workspace-menu-popup" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleOpenEditModal(workspace)}>
                        <BsPencil /> Sửa
                      </button>
                      <button onClick={() => handleDeleteWorkspace(workspace.id)} className="delete">
                        <BsTrash /> Xóa
                      </button>
                    </div>
                  )}
                </div>
                {/* --- (KẾT THÚC SỬA) --- */}

              </div>

              <div className="workspace-body">
                <h3>{workspace.name}</h3>
                <p className="workspace-description">{workspace.description}</p>

                <div className="workspace-stats">
                  <div className="stat-item">
                    <span className="stat-value">{workspace.tasksCount}</span>
                    <span className="stat-label">Tasks</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{workspace.notesCount}</span>
                    <span className="stat-label">Notes</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{workspace.members}</span>
                    <span className="stat-label">Members</span>
                  </div>
                </div>
              </div>

              <div className="workspace-footer">
                <div className="workspace-meta">
                  <span className={`badge ${workspace.type}`}>
                    {workspace.type === "private" ? <BsLock /> : <BsGlobe />}
                    {workspace.type === "private" ? "Riêng tư" : "Công khai"}
                  </span>
                  <span className="role-badge">{workspace.role}</span>
                </div>
                <span className="last-updated">{workspace.lastUpdated}</span>
              </div>
            </div>
          ))
        )}
        </div>
      )}

      {/* Create/Edit Workspace Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              {/* --- (SỬA LẠI) Tiêu đề động --- */}
              <h2>{isEditMode ? "Chỉnh sửa Workspace" : "Tạo Workspace Mới"}</h2>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>
                <IoMdClose />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Tên Workspace *</label>
                <input
                  type="text"
                  placeholder="VD: Dự án Web App"
                  value={newWorkspace.name}
                  onChange={(e) => setNewWorkspace({ ...newWorkspace, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Mô tả</label>
                <textarea
                  placeholder="Mô tả ngắn về workspace..."
                  value={newWorkspace.description}
                  onChange={(e) => setNewWorkspace({ ...newWorkspace, description: e.target.value })}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Loại Workspace</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="type"
                      value="private"
                      checked={newWorkspace.type === "private"}
                      onChange={(e) => setNewWorkspace({ ...newWorkspace, type: e.target.value })}
                    />
                    <BsLock /> Riêng tư (Chỉ thành viên được mời)
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="type"
                      value="public"
                      checked={newWorkspace.type === "public"}
                      onChange={(e) => setNewWorkspace({ ...newWorkspace, type: e.target.value })}
                    />
                    <BsGlobe /> Công khai (Mọi người có thể xem)
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Chọn Icon</label>
                <div className="icon-picker">
                  {predefinedIcons.map(icon => (
                    <button
                      key={icon}
                      className={`icon-option ${newWorkspace.icon === icon ? 'selected' : ''}`}
                      onClick={() => setNewWorkspace({ ...newWorkspace, icon })}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Chọn Màu</label>
                <div className="color-picker">
                  {predefinedColors.map(color => (
                    <button
                      key={color}
                      className={`color-option ${newWorkspace.color === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewWorkspace({ ...newWorkspace, color })}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowCreateModal(false)}>
                Hủy
              </button>
              {/* --- (SỬA LẠI) --- */}
              <button className="btn-submit" onClick={handleSubmitWorkspace}>
                {isEditMode ? "Lưu thay đổi" : "Tạo Workspace"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Workspaces;