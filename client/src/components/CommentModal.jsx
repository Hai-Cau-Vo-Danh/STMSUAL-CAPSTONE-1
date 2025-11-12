// src/components/CommentModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import './Forum.css'; // Dùng chung CSS
import { BsX, BsSend } from 'react-icons/bs';
import defaultAvatar from '../assets/Trangchu/avt.png'; // Avatar mèo mặc định

const CommentModal = ({ post, token, onClose, currentUserAvatar, onCommentPosted }) => {
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [loadingCommentPost, setLoadingCommentPost] = useState(false);
  const commentListRef = useRef(null);

  // 1. Fetch comments khi modal mở
  useEffect(() => {
    const fetchComments = async () => {
      setLoadingComments(true);
      try {
        const res = await fetch(`http://localhost:5000/api/posts/${post.id}/comments`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Không thể tải bình luận');
        const data = await res.json();
        setComments(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingComments(false);
      }
    };
    fetchComments();
  }, [post.id, token]);

  // 2. Tự động cuộn xuống cuối khi có comment mới
  useEffect(() => {
    if (commentListRef.current) {
      commentListRef.current.scrollTop = commentListRef.current.scrollHeight;
    }
  }, [comments]);

  // 3. Xử lý Gửi Comment
  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!commentContent.trim() || loadingCommentPost) return;
    
    setLoadingCommentPost(true);
    try {
      const res = await fetch(`http://localhost:5000/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: commentContent })
      });
      if (!res.ok) throw new Error('Bình luận thất bại');
      
      const newComment = await res.json();
      setComments([...comments, newComment]); // Thêm comment mới vào state
      setCommentContent('');
      onCommentPosted(post.id); // Báo cho Forum.jsx cập nhật count
      
    } catch (err) {
       console.error(err);
    } finally {
       setLoadingCommentPost(false);
    }
  }

  // Format thời gian
  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
  }

  return (
    <div className="comment-modal-overlay" onClick={onClose}>
      <div className="comment-modal-content" onClick={(e) => e.stopPropagation()}>
        
        {/* Header Modal */}
        <div className="comment-modal-header">
          <h3>Bài viết của {post.author.username}</h3>
          <button onClick={onClose} className="modal-close-btn">
            <BsX />
          </button>
        </div>

        {/* Danh sách bình luận */}
        <div className="comment-modal-list" ref={commentListRef}>
          {loadingComments && <p style={{textAlign: 'center'}}>Đang tải bình luận...</p>}
          
          {/* Post content (để xem lại) */}
          <div className="comment-post-content">
            <p>{post.content}</p>
            {post.image_url && <img src={post.image_url} alt="Post" />}
          </div>
          
          <hr />

          {comments.map(comment => (
            <div key={comment.comment_id} className="comment-item">
              <img 
                src={comment.author.avatar_url || defaultAvatar} 
                alt="Commenter Avatar" 
              />
              <div className="comment-content">
                <strong>{comment.author.username}</strong>
                <p>{comment.content}</p>
                <span className="comment-time">{formatTime(comment.created_at)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Form viết bình luận */}
        <form className="comment-form" onSubmit={handlePostComment}>
          <img src={currentUserAvatar} alt="My Avatar" />
          <input 
            type="text" 
            placeholder="Viết bình luận..." 
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            disabled={loadingCommentPost}
          />
          <button type="submit" disabled={loadingCommentPost || !commentContent.trim()}>
            <BsSend />
          </button>
        </form>

      </div>
    </div>
  );
};

export default CommentModal;