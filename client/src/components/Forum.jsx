// src/components/Forum.jsx
import React, { useState, useEffect, useCallback } from 'react'; // <-- Thêm useCallback
import PostCard from './PostCard';
import CommentModal from './CommentModal'; 
import ReportModal from './ReportModal'; 
import './Forum.css';
import defaultAvatar from '../assets/Trangchu/avt.png';

// --- (CODE MỚI) ---
import { useNotificationClick } from '../context/NotificationContext'; 
// --- (KẾT THÚC CODE MỚI) ---

// ⚠️ ĐỊNH NGHĨA BIẾN API_BASE Ở NGOÀI COMPONENT
const API_BASE = import.meta.env.VITE_BACKEND_URL || '';

const Forum = () => {
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // State cho Comment Modal
  const [selectedPost, setSelectedPost] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State cho Report Modal
  const [reportPost, setReportPost] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // --- (CODE MỚI) ---
  // Lấy state và hàm clear từ Context
  const { notificationToOpen, clearNotification } = useNotificationClick();
  // --- (KẾT THÚC CODE MỚI) ---

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  const userAvatar = user?.avatar_url || defaultAvatar;

  // 1. Fetch tất cả posts (ĐÃ SỬA URL)
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        // 1. SỬ DỤNG API_BASE
        const res = await fetch(`${API_BASE}/api/posts`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Không thể tải bài đăng');
        const data = await res.json();
        setPosts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [token]);

  // 2. Xử lý đăng bài mới (ĐÃ SỬA URL)
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Bạn chưa nhập nội dung!');
      return;
    }
    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('content', content);
    if (imageFile) {
      formData.append('image_file', imageFile);
    }
    try {
      // 2. SỬ DỤNG API_BASE
      const res = await fetch(`${API_BASE}/api/posts`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Lỗi khi đăng bài');
      }
      const newPost = await res.json();
      setPosts([newPost, ...posts]);
      setContent('');
      setImageFile(null);
      e.target.reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Xử lý khi file ảnh được chọn (giữ nguyên)
  const handleFileChange = (e) => { setImageFile(e.target.files[0]); };

  // 4. Xử lý cập nhật Reaction (giữ nguyên)
  const handleReactionUpdate = (postId, newReactionCounts, newUserReaction) => {
    setPosts(posts.map(post => 
      post.id === postId ? { ...post, reaction_counts: newReactionCounts, user_reaction: newUserReaction } : post
    ));
  };
  
  // 5. Xử lý Comment (giữ nguyên)
  const handleNewComment = (postId) => {
     setPosts(posts.map(post => 
      post.id === postId ? { ...post, comment_count: post.comment_count + 1 } : post
    ));
  }

  // 6. Logic mở/đóng Comment Modal (giữ nguyên)
  const openCommentModal = useCallback((post) => { 
    setSelectedPost(post); 
    setIsModalOpen(true); 
  }, []); 
  
  const closeCommentModal = useCallback(() => { 
    setIsModalOpen(false); 
    setSelectedPost(null); 
  }, []);

  // Logic mở/đóng Report Modal (giữ nguyên)
  const openReportModal = (post) => {
    setReportPost(post);
    setIsReportModalOpen(true);
  };
  const closeReportModal = () => {
    setIsReportModalOpen(false);
    setReportPost(null);
  };


  // --- (CODE MỚI) ---
  // useEffect này "lắng nghe" sự thay đổi từ Context
  useEffect(() => {
    if (notificationToOpen && notificationToOpen.type === 'new_comment' && posts.length > 0) {
      
      const postToOpen = posts.find(p => p.id === notificationToOpen.postId);

      if (postToOpen) {
        openCommentModal(postToOpen);
      } else {
        console.warn(`Không tìm thấy Post ID ${notificationToOpen.postId} trong feed hiện tại.`);
        
        // 3. FETCH RIÊNG POST NẾU KHÔNG CÓ TRONG FEED (ĐÃ SỬA URL)
        const fetchSinglePost = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/posts/${notificationToOpen.postId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('Không thể tải bài đăng');
                const singlePost = await res.json();
                openCommentModal(singlePost);
            } catch (err) {
                console.error("Lỗi khi fetch post riêng lẻ:", err.message);
            }
        };
        fetchSinglePost();
      }
      
      clearNotification();
    }
  }, [notificationToOpen, posts, openCommentModal, clearNotification, token]);
  // --- (KẾT THÚC CODE MỚI) ---


  return (
    <div className="forum-container">
      {/* --- Form Đăng Bài --- */}
      <form className="post-create-form" onSubmit={handleCreatePost}>
        <div className="form-input-area">
          <img src={userAvatar} alt="Avatar" className="post-form-avatar" />
          <textarea
            placeholder={`Bạn đang nghĩ gì, ${user?.username}?`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="form-actions">
          <label className="file-input-label">
            📷 Thêm ảnh
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              disabled={loading}
              style={{ display: 'none' }}
            />
          </label>
          {imageFile && <span className="file-name">{imageFile.name}</span>}
          <button type="submit" disabled={loading || !content.trim()}>
            {loading ? 'Đang đăng...' : 'Đăng bài'}
          </button>
        </div>
        {error && <p className="form-error">{error}</p>}
      </form>

      {/* --- Dòng Thời Gian --- */}
      <div className="post-feed">
        {loading && posts.length === 0 && <p style={{textAlign: 'center'}}>Đang tải feed...</p>}
        {posts.map(post => (
          <PostCard 
            key={post.id} 
            post={post} 
            token={token}
            onReactionUpdate={handleReactionUpdate} 
            onOpenCommentModal={openCommentModal}
            onOpenReportModal={openReportModal}
          />
        ))}
      </div>

      {/* --- Render Comment Modal --- */}
      {isModalOpen && selectedPost && (
        <CommentModal 
          post={selectedPost}
          token={token}
          onClose={closeCommentModal}
          currentUserAvatar={userAvatar}
          onCommentPosted={handleNewComment}
        />
      )}

      {/* --- Render Report Modal --- */}
      {isReportModalOpen && reportPost && (
        <ReportModal 
          post={reportPost}
          token={token}
          onClose={closeReportModal}
        />
      )}
    </div>
  );
};

export default Forum;
