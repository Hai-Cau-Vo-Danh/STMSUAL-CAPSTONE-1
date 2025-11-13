// src/components/PostCard.jsx
import React, { useState } from 'react';
import './Forum.css'; // Dùng chung CSS
import { BsHeartFill, BsChatDots, BsThreeDots, BsFlag } from 'react-icons/bs'; // Thêm BsFlag
import defaultAvatar from '../assets/Trangchu/avt.png'; // Avatar mèo mặc định

// (Component Reaction Picker giữ nguyên)
const ReactionPicker = ({ onSelect, onMouseLeave }) => {
  const reactions = [
    { type: 'like', icon: '👍' },
    { type: 'haha', icon: '😆' },
    { type: 'sad', icon: '😢' },
    { type: 'angry', icon: '😡' },
  ];
  return (
    <div className="reaction-picker" onMouseLeave={onMouseLeave}>
      {reactions.map(r => (
        <span key={r.type} onClick={() => onSelect(r.type)}>
          {r.icon}
        </span>
      ))}
    </div>
  );
};

// (Component ReactionButton giữ nguyên)
const ReactionButton = ({ userReaction, onClick, onMouseEnter }) => {
  const reactionMap = {
    like: { text: 'Thích', icon: '👍', color: 'var(--primary-color)' },
    haha: { text: 'Haha', icon: '😆', color: '#f7b928' },
    sad: { text: 'Buồn', icon: '😢', color: '#f7b928' },
    angry: { text: 'Phẫn nộ', icon: '😡', color: '#e0245e' },
  };
  const currentReaction = reactionMap[userReaction] || { text: 'Thích', icon: '👍', color: 'var(--text-secondary-color)' };
  return (
    <button onClick={onClick} onMouseEnter={onMouseEnter} className="reaction-main-btn" style={{ color: currentReaction.color }}>
      <span className="reaction-icon">{currentReaction.icon}</span> {currentReaction.text}
    </button>
  );
};

// (Component ReactionCounts giữ nguyên)
const ReactionCounts = ({ counts }) => {
  const reactionIcons = { like: '👍', haha: '😆', sad: '😢', angry: '😡' };
  const sortedReactions = Object.keys(counts).filter(key => counts[key] > 0).sort((a, b) => counts[b] - counts[a]);
  const total = sortedReactions.reduce((acc, key) => acc + counts[key], 0);
  if (total === 0) return null;
  return (
    <div className="reaction-counts">
      <div className="reaction-icons-stack">
        {sortedReactions.slice(0, 3).map(type => (
          <span key={type} className="reaction-icon-small">{reactionIcons[type]}</span>
        ))}
      </div>
      <span className="reaction-total-count">{total}</span>
    </div>
  );
};


// ===== Component PostCard Chính (Đã cập nhật) =====
const PostCard = ({ post, token, onReactionUpdate, onOpenCommentModal, onOpenReportModal }) => { // (MỚI) Thêm prop onOpenReportModal
  const [loadingReaction, setLoadingReaction] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const authorAvatar = post.author.avatar_url || defaultAvatar;

  // 1. (ĐÃ SỬA) Xử lý khi chọn 1 reaction
  const handleReactionSelect = async (reactionType) => {
    if (loadingReaction) return;
    setLoadingReaction(true);
    setShowPicker(false); 
    const typeToSend = post.user_reaction === reactionType ? null : reactionType;
    try {
      const res = await fetch(`http://localhost:5000/api/posts/${post.id}/react`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction_type: typeToSend })
      });
      if (!res.ok) throw new Error('React thất bại');
      const data = await res.json();
      onReactionUpdate(post.id, data.reaction_counts, data.user_reaction);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReaction(false);
    }
  };
  
  // 2. Xử lý khi nhấn nút "Thích" (để toggle like)
  const handleLikeButtonClick = () => { handleReactionSelect('like'); }
  
  // 3. Xử lý hover/unhover
  let timer;
  const handleMouseEnter = () => { clearTimeout(timer); setShowPicker(true); }
  const handleMouseLeave = () => { timer = setTimeout(() => { setShowPicker(false); }, 500); }

  // Format thời gian
  const postTime = new Date(post.created_at).toLocaleString('vi-VN');

  return (
    <div className="post-card">
      <div className="post-header">
        <img src={authorAvatar} alt="Author Avatar" className="post-author-avatar" />
        <div className="post-author-info">
          {/* --- (CODE SỬA) Hiển thị tên màu và danh hiệu --- */}
          <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
            <span 
              className="post-author-name" 
              style={{ color: post.author.equipped_name_color || 'var(--text-color)' }}
            >
              {post.author.username}
            </span>
            
            {/* Hiển thị Rank Title (Vô Địch/Á Quân...) */}
            {post.author.rank_title && (
              <span className={`rank-badge ${
                  post.author.rank_title.includes('Vô Địch') ? 'top-1' : 
                  post.author.rank_title.includes('Á Quân') ? 'top-2' : 'top-3'
              }`} style={{fontSize: '0.6em', padding: '2px 6px', borderRadius: '8px', color: 'white', fontWeight: 'bold', background: post.author.rank_title.includes('Vô Địch') ? '#FFD700' : '#C0C0C0'}}>
                  {post.author.rank_title}
              </span>
            )}

            {/* Hiển thị Title (Học Bá...) */}
            {post.author.equipped_title && (
              <span style={{
                fontSize: '0.7em',
                background: 'linear-gradient(90deg, #FFD700, #FFA500)',
                color: 'white',
                padding: '1px 6px',
                borderRadius: '10px',
                fontWeight: 'normal'
              }}>
                {post.author.equipped_title}
              </span>
            )}
          </div>
          {/* --- KẾT THÚC SỬA --- */}
          
          <span className="post-time">{postTime}</span>
        </div>
        {/* --- (CODE MỚI) Nút Báo cáo --- */}
        <button className="post-options-btn post-report-btn" title="Báo cáo bài viết" onClick={() => onOpenReportModal(post)}>
          <BsFlag />
        </button>
        <button className="post-options-btn"><BsThreeDots /></button>
      </div>

      <div className="post-content">
        <p>{post.content}</p>
        {post.image_url && (
          <img src={post.image_url} alt="Post content" className="post-image" />
        )}
      </div>

      <div className="post-stats">
        <ReactionCounts counts={post.reaction_counts} />
        <span onClick={() => onOpenCommentModal(post)} className="comment-count-btn">
          {post.comment_count} Bình luận
        </span>
      </div>

      <div className="post-actions">
        <div className="reaction-btn-wrapper" onMouseLeave={handleMouseLeave}>
          {showPicker && <ReactionPicker onSelect={handleReactionSelect} onMouseLeave={handleMouseLeave} />}
          <ReactionButton userReaction={post.user_reaction} onClick={handleLikeButtonClick} onMouseEnter={handleMouseEnter} />
        </div>
        <button onClick={() => onOpenCommentModal(post)}>
          <BsChatDots /> Bình luận
        </button>
      </div>
    </div>
  );
};

export default PostCard;