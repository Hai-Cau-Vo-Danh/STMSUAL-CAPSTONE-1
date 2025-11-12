// src/components/WorkspaceSettings.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BsPeopleFill, BsTrash, BsArrowLeft } from 'react-icons/bs';
import { IoMdClose } from 'react-icons/io';
import { workspaceService } from '../services/workspaceService';
import './WorkspaceSettings.css'; // Chúng ta sẽ tạo file CSS này
import avt from "../assets/Trangchu/avt.png"; 

function WorkspaceSettings() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState(null);
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  // Lấy User ID của người đang đăng nhập
  const currentUserId = JSON.parse(localStorage.getItem('user'))?.user_id;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Lấy data từ API (giống hệt WorkspaceDetail)
        const data = await workspaceService.getWorkspaceDetail(id);
        setWorkspace(data.workspace);
        setMembers(data.members);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setLoading(false);
        alert('Không thể tải cài đặt workspace.');
      }
    };
    fetchData();
  }, [id]);

  // --- Logic quản lý thành viên (Chuyển từ WorkspaceDetail) ---
  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return;
    try {
      const result = await workspaceService.inviteMember(id, inviteEmail, inviteRole);
      setMembers([...members, result.member]);
      alert(`Đã gửi lời mời đến ${inviteEmail}`);
      setInviteEmail("");
      setInviteRole("member");
    } catch (err) {
      console.error('Error inviting member:', err);
      alert(err.response?.data?.error || 'Không thể mời thành viên.');
    }
  };

  const handleChangeRole = async (memberId, newRole) => {
    try {
      await workspaceService.updateMemberRole(id, memberId, newRole);
      setMembers(members.map(m => 
        m.id === memberId ? { ...m, role: newRole } : m
      ));
      alert(`Đã thay đổi vai trò thành ${newRole}`);
    } catch (err) {
      console.error('Error changing role:', err);
      alert('Không thể thay đổi vai trò.');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (window.confirm("Bạn có chắc muốn xóa thành viên này?")) {
      try {
        await workspaceService.removeMember(id, memberId);
        setMembers(members.filter(m => m.id !== memberId));
        alert("Đã xóa thành viên");
      } catch (err) {
        console.error('Error removing member:', err);
        alert('Không thể xóa thành viên.');
      }
    }
  };
  
  // --- Logic Xóa Workspace (Chuyển từ Workspaces.jsx) ---
  const handleDeleteWorkspace = async () => {
    if (window.confirm("BẠN CÓ CHẮC KHÔNG?\nThao tác này sẽ xóa vĩnh viễn workspace, bao gồm tất cả bảng, danh sách và thẻ. Không thể hoàn tác.")) {
      if (window.confirm("XÁC NHẬN LẦN CUỐI: Bạn có thực sự muốn xóa?")) {
        try {
          await workspaceService.deleteWorkspace(id);
          alert("Đã xóa workspace thành công.");
          navigate('/workspaces'); // Quay về trang danh sách
        } catch (err) {
          console.error('Error deleting workspace:', err);
          alert(err.response?.data?.error || 'Không thể xóa workspace.');
        }
      }
    }
  };
  
  // Kiểm tra quyền Owner
  const isOwner = workspace?.owner_id === currentUserId; // (Giả sử workspace có trường owner_id)
  // Nếu chưa tải xong, hoặc API không trả về owner_id, hãy tìm trong members
  const ownerRole = members.find(m => m.id === currentUserId)?.role;
  const isOwnerOrAdmin = ownerRole === 'owner' || ownerRole === 'admin';


  if (loading) {
    return (
      <div className="workspace-settings-container loading-state">
        <div className="spinner"></div>
        <p>Đang tải cài đặt...</p>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="workspace-settings-container error-state">
        <p>Không tìm thấy workspace.</p>
        <Link to="/workspaces" className="back-link">
          <BsArrowLeft /> Quay lại
        </Link>
      </div>
    );
  }

  return (
    <div className="workspace-settings-container">
      {/* Header của trang */}
      <div className="settings-header">
        <div className="header-left">
          <Link to={`/app/workspace/${id}`} className="back-link">
            <BsArrowLeft />
          </Link>
          <div className="header-title">
            <h2>Cài đặt Workspace</h2>
            <p>Quản lý workspace: {workspace.name}</p>
          </div>
        </div>
      </div>

      <div className="settings-content">
        
        {/* Phần quản lý thành viên (Bê từ modal cũ) */}
        <div className="settings-section">
          <h3><BsPeopleFill /> Quản lý thành viên</h3>
          
          {isOwnerOrAdmin && (
            <div className="invite-section">
              <h4>Mời thành viên mới</h4>
              <div className="invite-form">
                <input
                  type="email"
                  placeholder="Nhập email..."
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="email-input"
                />
                <select 
                  value={inviteRole} 
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="role-select"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <button onClick={handleInviteMember} className="invite-btn">
                  Gửi lời mời
                </button>
              </div>
            </div>
          )}

          <div className="members-section">
            <h4>Danh sách thành viên ({members.length})</h4>
            <div className="members-table">
              <div className="table-header">
                <div className="col-member">Thành viên</div>
                <div className="col-email">Email</div>
                <div className="col-role">Vai trò</div>
                <div className="col-joined">Tham gia</div>
                <div className="col-actions">Thao tác</div>
              </div>
              
              {members.map(member => (
                <div key={member.id} className="table-row">
                  <div className="col-member">
                    <img 
                      src={member.avatar || avt}
                      alt={member.name}
                      className="member-avatar-small"
                    />
                    <span className="member-name">{member.name}</span>
                  </div>
                  <div className="col-email">{member.email}</div>
                  <div className="col-role">
                    {member.role === "owner" ? (
                      <span className="role-badge owner">Owner</span>
                    ) : (
                      // Chỉ Owner/Admin mới được đổi vai trò, và không thể đổi vai trò của Owner
                      isOwnerOrAdmin ? (
                        <select 
                          value={member.role}
                          onChange={(e) => handleChangeRole(member.id, e.target.value)}
                          className="role-select-inline"
                          disabled={member.role === 'owner'}
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className="role-badge">{member.role}</span>
                      )
                    )}
                  </div>
                  <div className="col-joined">{member.joinedDate}</div>
                  <div className="col-actions">
                    {/* Chỉ Owner/Admin mới được xóa, và không ai được xóa Owner */}
                    {isOwnerOrAdmin && member.role !== "owner" && (
                      <button 
                        onClick={() => handleRemoveMember(member.id)}
                        className="remove-member-btn"
                        title="Xóa thành viên"
                      >
                        <BsTrash />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* (Chúng ta có thể thêm Tab Cài đặt chung (Sửa tên...) ở đây sau) */}
        
        {/* Phần Vùng nguy hiểm */}
        {ownerRole === 'owner' && (
          <div className="settings-section danger-zone">
            <h3>Vùng nguy hiểm</h3>
            <div className="danger-zone-item">
              <div className="danger-info">
                <h4>Xóa Workspace này</h4>
                <p>Thao tác này sẽ xóa vĩnh viễn tất cả dữ liệu, không thể hoàn tác.</p>
              </div>
              <button className="btn-danger" onClick={handleDeleteWorkspace}>
                Xóa Workspace
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default WorkspaceSettings;