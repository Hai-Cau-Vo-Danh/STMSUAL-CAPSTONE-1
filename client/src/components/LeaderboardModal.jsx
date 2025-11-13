import React, { useState, useEffect } from 'react';
import { IoClose, IoTrophy } from 'react-icons/io5';
import { workspaceService } from '../services/workspaceService';
import avt from "../assets/Trangchu/avt.png";
import './LeaderboardModal.css'; // Sẽ tạo file này sau

const LeaderboardModal = ({ onClose }) => {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const data = await workspaceService.getLeaderboard();
        setLeaders(data);
      } catch (err) {
        console.error("Lỗi tải BXH:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const getRankIcon = (index) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return <span className="rank-number">{index + 1}</span>;
  };

  return (
    <div className="leaderboard-overlay" onClick={onClose}>
      <div className="leaderboard-content" onClick={e => e.stopPropagation()}>
        <div className="leaderboard-header">
          <h2><IoTrophy className="trophy-icon-header"/> Bảng Phong Thần</h2>
          <button className="close-btn" onClick={onClose}><IoClose /></button>
        </div>

        <div className="leaderboard-body">
          {loading ? <div className="spinner-small" style={{margin: '40px auto'}}></div> : (
            <div className="leaderboard-list">
              {leaders.map((user, index) => (
                <div key={user.user_id} className={`leader-item rank-${index + 1}`}>
                  
                  {/* Hạng */}
                  <div className="leader-rank">{getRankIcon(index)}</div>
                  
                  {/* Avatar + Khung */}
                  <div className="leader-avatar-wrapper">
                    <img src={user.avatar_url || avt} alt="avt" className="leader-avatar" />
                    {user.equipped_frame_url && (
                      <img src={user.equipped_frame_url} className="leader-frame" alt="frame" />
                    )}
                  </div>

                  {/* Thông tin */}
                  <div className="leader-info">
                    <div className="leader-name" style={{ color: user.equipped_name_color || 'inherit' }}>
                      {user.username}
                      {user.equipped_title && (
                        <span className="leader-title-badge">{user.equipped_title}</span>
                      )}
                    </div>
                  </div>

                  {/* Điểm số */}
                  <div className="leader-score">
                    {user.tomatoes} 🍅
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaderboardModal;