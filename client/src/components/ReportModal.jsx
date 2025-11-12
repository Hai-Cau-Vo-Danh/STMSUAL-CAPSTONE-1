// src/components/ReportModal.jsx
import React, { useState } from 'react';
import './Forum.css'; // Dùng chung CSS
import { IoClose } from 'react-icons/io5';

const ReportModal = ({ post, token, onClose }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do báo cáo.');
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`http://localhost:5000/api/posts/${post.id}/report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: reason })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gửi báo cáo thất bại');
      }

      setSuccess('Đã gửi báo cáo thành công. Cảm ơn bạn!');
      // Tự động đóng sau 2 giây
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h3>Báo cáo bài viết</h3>
          <button onClick={onClose} className="admin-modal-close-btn">
            <IoClose />
          </button>
        </div>
        
        <div className="admin-modal-body">
          {success ? (
            <p className="report-success">{success}</p>
          ) : (
            <form onSubmit={handleSubmit} className="admin-form">
              <div className="form-group">
                <label>Bài viết của: <strong>{post.author.username}</strong></label>
                <p className="report-post-content">{post.content.substring(0, 150)}...</p>
              </div>
              <div className="form-group">
                <label htmlFor="reason">Lý do báo cáo:</label>
                <textarea
                  id="reason"
                  name="reason"
                  rows="4"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Vui lòng mô tả vi phạm..."
                  required
                />
              </div>
              
              {error && <p className="form-error" style={{textAlign: 'left', marginTop: 0}}>{error}</p>}

              <div className="form-actions">
                <button type="button" className="admin-btn" onClick={onClose} disabled={loading}>
                  Hủy
                </button>
                <button type="submit" className="admin-btn delete" disabled={loading}>
                  {loading ? 'Đang gửi...' : 'Gửi báo cáo'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportModal;