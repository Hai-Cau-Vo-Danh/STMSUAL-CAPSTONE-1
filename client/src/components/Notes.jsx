import React, { useState, useEffect } from 'react'; 
import './Notes.css';
import { BsPlus, BsSearch, BsTrash, BsPencil, BsPin, BsPinFill, BsTag } from 'react-icons/bs';
import { IoClose } from 'react-icons/io5';

// ⚠️ ĐÃ SỬA: Định nghĩa API_BASE từ biến môi trường
const API_BASE = import.meta.env.VITE_BACKEND_URL || '';

// --- (CODE MỚI) HÀM LẤY USER ID ---
const getUserId = () => {
    try {
      const userString = localStorage.getItem("user");
      if (userString) {
        const userData = JSON.parse(userString);
        return userData?.user_id;
      }
    } catch (e) {
      console.error("Lỗi đọc user ID:", e);
    }
    return null;
};

// --- (CODE MỚI) HÀM FORMAT NGÀY ---
const formatDate = (isoString) => {
    if (!isoString) return "Không rõ";
    try {
        return new Date(isoString).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (e) {
        return "Ngày không hợp lệ";
    }
};


const Notes = () => {
  const [notes, setNotes] = useState([]); 
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false); 
  
  const [modalFormData, setModalFormData] = useState({
    title: '',
    content: '',
    tags: [],
    color: '#e0f2fe'
  });

  const [tagInput, setTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const colors = [
    { name: 'Blue', value: '#e0f2fe' },
    { name: 'Yellow', value: '#fef3c7' },
    { name: 'Green', value: '#dcfce7' },
    { name: 'Red', value: '#fecaca' },
    { name: 'Purple', value: '#e9d5ff' },
    { name: 'Pink', value: '#fce7f3' }
  ];
  
  // --- (CODE MỚI) HÀM FETCH NOTES ---
  const fetchNotes = async () => {
      setIsLoading(true);
      setError(null);
      const userId = getUserId();
      if (!userId) {
          setError("Không tìm thấy thông tin người dùng.");
          setIsLoading(false);
          return;
      }
      try {
          // ⚠️ ĐÃ SỬA: Dùng API_BASE
          const response = await fetch(`${API_BASE}/api/notes?userId=${userId}`);
          if (!response.ok) {
              throw new Error(`Lỗi HTTP: ${response.status}`);
          }
          const data = await response.json();
          // Map lại data từ backend để khớp state (nếu cần)
          const formattedData = data.map(note => ({
              ...note,
              date: formatDate(note.date) // Format ngày
          }));
          setNotes(formattedData);
      } catch (err) {
          setError(err.message);
          console.error("Lỗi fetch notes:", err);
      } finally {
          setIsLoading(false);
      }
  };

  // Chạy fetchNotes khi component mount
  useEffect(() => {
    fetchNotes();
  }, []); 


  // Lọc notes (Giữ nguyên)
  const filteredNotes = notes.filter(note =>
    (note.title && note.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (note.content && note.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
  );
  const pinnedNotes = filteredNotes.filter(note => note.pinned);
  const unpinnedNotes = filteredNotes.filter(note => !note.pinned);
  
  // --- (CODE MỚI) HÀM MỞ MODAL ---
  // Mở modal để Tạo Mới
  const handleOpenCreateModal = () => {
      setModalFormData({ // Reset form
          title: '',
          content: '',
          tags: [],
          color: '#e0f2fe'
      });
      setTagInput('');
      setIsCreating(true); 
  };

  // Mở modal để Sửa
  const handleOpenEditModal = (note) => {
      setModalFormData({ 
          id: note.id, 
          title: note.title,
          content: note.content,
          tags: note.tags || [],
          color: note.color || '#e0f2fe'
      });
      setTagInput('');
      setSelectedNote(null); 
      setIsCreating(true); 
  };
  
  // Đóng modal (chung)
  const handleCloseModal = () => {
      setIsCreating(false);
      setSelectedNote(null);
      setIsSaving(false);
      setModalFormData({ title: '', content: '', tags: [], color: '#e0f2fe' });
      setTagInput('');
  };


  // --- (ĐÃ SỬA) HÀM LƯU NOTE (TẠO MỚI / CẬP NHẬT) ---
  const handleSaveNote = async () => {
      setIsSaving(true);

      const userId = getUserId();
      if (!userId) {
          alert("Lỗi: Không tìm thấy User ID.");
          setIsSaving(false);
          return;
      }
      
      const isEditing = !!modalFormData.id; 
      
      const method = isEditing ? 'PUT' : 'POST';
      
      // ⚠️ ĐÃ SỬA: Dùng API_BASE
      const url = isEditing 
          ? `${API_BASE}/api/notes/${modalFormData.id}` 
          : `${API_BASE}/api/notes`;

      // Chuẩn bị data
      const payload = {
          creator_id: userId, // Gửi cho Tạo Mới
          user_id: userId, // Gửi cho Cập Nhật (để xác thực)
          title: modalFormData.title,
          content: modalFormData.content,
          color: modalFormData.color,
          tags: modalFormData.tags 
      };

      try {
          const response = await fetch(url, {
              method: method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
          
          const resultData = await response.json();
          
          if (!response.ok) {
              throw new Error(resultData.message || 'Lỗi server');
          }
          
          const formattedResult = { ...resultData, date: formatDate(resultData.date) };

          if (isEditing) {
              setNotes(notes.map(n => n.id === formattedResult.id ? formattedResult : n));
          } else {
              setNotes([formattedResult, ...notes]);
          }
          handleCloseModal(); 

      } catch (err) {
          console.error("Lỗi lưu note:", err);
          alert(`Lỗi: ${err.message}`);
          setIsSaving(false);
      } 
  };


  // --- (ĐÃ SỬA) HÀM XÓA NOTE (GỌI API) ---
  const handleDeleteNote = async (noteId) => {
      if (!window.confirm("Bạn có chắc chắn muốn xóa ghi chú này?")) return;
      
      const userId = getUserId();
      if (!userId) {
          alert("Lỗi: Không tìm thấy User ID.");
          return;
      }

      try {
          // ⚠️ ĐÃ SỬA: Dùng API_BASE
          const response = await fetch(`${API_BASE}/api/notes/${noteId}?userId=${userId}`, {
              method: 'DELETE'
          });
          const data = await response.json();
          
          if (!response.ok) {
              throw new Error(data.message || 'Lỗi server');
          }
          
          setNotes(notes.filter(note => note.id !== noteId));
          handleCloseModal(); 

      } catch (err) {
          console.error("Lỗi xóa note:", err);
          alert(`Lỗi: ${err.message}`);
      }
  };


  // --- (ĐÃ SỬA) HÀM GHIM NOTE (GỌI API - CẬP NHẬT 1 PHẦN) ---
  const handleTogglePin = async (note) => {
      const userId = getUserId();
      if (!userId) {
          alert("Lỗi: Không tìm thấy User ID.");
          return;
      }
      
      const newPinnedState = !note.pinned;
      
      const originalNotes = [...notes];
      const updatedNote = { ...note, pinned: newPinnedState };
      setNotes(notes.map(n => n.id === note.id ? updatedNote : n));
      
      if (selectedNote && selectedNote.id === note.id) {
          setSelectedNote(updatedNote);
      }

      try {
          // ⚠️ ĐÃ SỬA: Dùng API_BASE
          const response = await fetch(`${API_BASE}/api/notes/${note.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  user_id: userId,
                  pinned: newPinnedState 
              })
          });
          
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || 'Lỗi server');
          
          fetchNotes(); 
          
      } catch (err) {
          console.error("Lỗi ghim note:", err);
          alert(`Lỗi: ${err.message}`);
          setNotes(originalNotes);
          if (selectedNote && selectedNote.id === note.id) {
            setSelectedNote(originalNotes.find(n => n.id === note.id));
          }
      }
  };


  // Hàm xử lý tag (Giữ nguyên)
  const handleAddTag = () => {
    if (tagInput.trim() && !modalFormData.tags.includes(tagInput.trim())) {
      setModalFormData({ ...modalFormData, tags: [...modalFormData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };
  const handleRemoveTag = (tagToRemove) => {
    setModalFormData({ ...modalFormData, tags: modalFormData.tags.filter(tag => tag !== tagToRemove) });
  };


  // --- RENDER ---
  if (isLoading) {
      return <div>Đang tải ghi chú...</div>; 
  }
  
  if (error) {
       return <div style={{ color: 'red', padding: '20px' }}>Lỗi: {error}</div>;
  }

  return (
    <div className="notes-container">
      {/* Header */}
      <div className="notes-header">
        <div className="notes-header-top">
          <h1 className="notes-title">📝 Ghi chú của tôi</h1>
          {/* Nút tạo mới */}
          <button className="create-note-btn" onClick={handleOpenCreateModal}>
            <BsPlus /> Tạo ghi chú mới
          </button>
        </div>
        <div className="notes-search"> 
          <BsSearch className="search-icon" />
          <input type="text" placeholder="Tìm kiếm ghi chú, tags..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
        </div>
      </div>

      {/* Notes Grid */}
      <div className="notes-content">
        {/* Pinned Notes */}
        {pinnedNotes.length > 0 && (
          <div className="notes-section">
            <h3 className="section-title"> <BsPinFill className="section-icon" /> Đã ghim </h3>
            <div className="notes-grid">
              {pinnedNotes.map(note => (
                <div
                  key={note.id}
                  className="note-card"
                  style={{ backgroundColor: note.color, borderLeftColor: '#f59e0b' }} 
                  onClick={() => setSelectedNote(note)} 
                >
                  <div className="note-card-header">
                    <h3 className="note-card-title">{note.title || '(Không có tiêu đề)'}</h3>
                    <button
                      className="pin-btn pinned"
                      onClick={(e) => { e.stopPropagation(); handleTogglePin(note); }}
                    >
                      <BsPinFill />
                    </button>
                  </div>
                  <p className="note-card-content">{note.content}</p>
                  <div className="note-card-footer">
                    <div className="note-tags">
                      {note.tags.map((tag, index) => ( <span key={index} className="note-tag"> <BsTag /> {tag} </span> ))}
                    </div>
                    <span className="note-date">{note.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other Notes */}
        {unpinnedNotes.length > 0 && (
          <div className="notes-section">
            <h3 className="section-title">Ghi chú khác</h3>
            <div className="notes-grid">
              {unpinnedNotes.map(note => (
                <div
                  key={note.id}
                  className="note-card"
                  style={{ backgroundColor: note.color }}
                  onClick={() => setSelectedNote(note)} 
                >
                  <div className="note-card-header">
                    <h3 className="note-card-title">{note.title || '(Không có tiêu đề)'}</h3>
                    <button
                      className="pin-btn"
                      onClick={(e) => { e.stopPropagation(); handleTogglePin(note); }}
                    >
                      <BsPin />
                    </button>
                  </div>
                  <p className="note-card-content">{note.content}</p>
                  <div className="note-card-footer">
                    <div className="note-tags">
                      {note.tags.map((tag, index) => ( <span key={index} className="note-tag"> <BsTag /> {tag} </span> ))}
                    </div>
                    <span className="note-date">{note.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredNotes.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3>Không có ghi chú nào</h3>
            <p>Hãy tạo ghi chú đầu tiên của bạn!</p>
          </div>
        )}
      </div>

      {/* Modal Tạo Mới / Chỉnh Sửa */}
      {isCreating && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="note-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              {/* Tiêu đề động */}
              <h2>{modalFormData.id ? 'Chỉnh sửa ghi chú' : 'Tạo ghi chú mới'}</h2>
              <button className="close-btn" onClick={handleCloseModal}>
                <IoClose />
              </button>
            </div>

            <div className="modal-body">
              <input
                type="text"
                placeholder="Tiêu đề..."
                value={modalFormData.title}
                onChange={(e) => setModalFormData({ ...modalFormData, title: e.target.value })}
                className="note-title-input"
              />
              <textarea
                placeholder="Nội dung ghi chú..."
                value={modalFormData.content}
                onChange={(e) => setModalFormData({ ...modalFormData, content: e.target.value })}
                className="note-content-input"
                rows={10}
              />
              {/* Tags Input */}
              <div className="tags-section">
                <div className="tags-input-wrapper">
                  <BsTag className="tag-icon" />
                  <input type="text" placeholder="Thêm tag..." value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddTag()} className="tag-input" />
                  <button onClick={handleAddTag} className="add-tag-btn">Thêm</button>
                </div>
                <div className="tags-list">
                  {modalFormData.tags.map((tag, index) => (
                    <span key={index} className="tag-item">
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="remove-tag-btn"> <IoClose /> </button>
                    </span>
                  ))}
                </div>
              </div>
              {/* Color Picker */}
              <div className="color-picker">
                <label>Màu nền:</label>
                <div className="color-options">
                  {colors.map(color => (
                    <button
                      key={color.value}
                      className={`color-option ${modalFormData.color === color.value ? 'active' : ''}`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setModalFormData({ ...modalFormData, color: color.value })}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={handleCloseModal}>
                Hủy
              </button>
              {/* Nút lưu */}
              <button className="save-btn" onClick={handleSaveNote} disabled={isSaving}>
                {isSaving 
                ? 'Đang lưu...' 
                : (modalFormData.id ? 'Lưu thay đổi' : 'Lưu ghi chú')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal XEM (Thêm nút Sửa) */}
      {selectedNote && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="note-modal" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: selectedNote.color }}>
            <div className="modal-header">
              <h2>{selectedNote.title || '(Không có tiêu đề)'}</h2>
              <div className="modal-actions">
                <button 
                  className="icon-btn" 
                  title="Sửa"
                  onClick={() => handleOpenEditModal(selectedNote)}
                >
                  <BsPencil />
                </button>
                <button className="icon-btn" title="Ghim" onClick={() => handleTogglePin(selectedNote)}>
                  {selectedNote.pinned ? <BsPinFill /> : <BsPin />}
                </button>
                <button className="icon-btn" title="Xóa" onClick={() => handleDeleteNote(selectedNote.id)}>
                  <BsTrash />
                </button>
                <button className="close-btn" onClick={handleCloseModal}>
                  <IoClose />
                </button>
              </div>
            </div>

            <div className="modal-body">
              <div className="note-view-content">
                {selectedNote.content}
              </div>
              <div className="note-view-tags">
                {selectedNote.tags.map((tag, index) => (
                  <span key={index} className="note-tag"> <BsTag /> {tag} </span>
                ))}
              </div>
              <div className="note-view-date">
                Cập nhật lần cuối: {selectedNote.date}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notes;
