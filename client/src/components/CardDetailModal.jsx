// src/components/CardDetailModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import './CardDetailModal.css';
import { IoMdClose } from 'react-icons/io';
import { 
  BsPencil, BsCheck, BsTextLeft, BsPerson, BsCalendar, 
  BsListCheck, BsTags, BsPersonFill, BsTagFill, BsPlus, BsTrash,
  BsChatDotsFill // <-- (CODE MỚI) Thêm icon
} from 'react-icons/bs';
import { workspaceService } from '../services/workspaceService';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { usePopper } from 'react-popper';
import avt from "../assets/Trangchu/avt.png"; 

// === (CODE MỚI) COMPONENT COMMENTS ĐẦY ĐỦ ===
const Comments = ({ cardId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);

  // Lấy thông tin user hiện tại từ localStorage
  const currentUser = JSON.parse(localStorage.getItem('user')) || {};

  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoading(true);
        const data = await workspaceService.getCardComments(cardId);
        setComments(data);
      } catch (err) {
        console.error("Lỗi tải comments:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchComments();
  }, [cardId]);

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    try {
      const postedComment = await workspaceService.postCardComment(cardId, newComment);
      setComments([...comments, postedComment]); // Thêm comment mới vào danh sách
      setNewComment(""); // Xóa nội dung ô nhập
    } catch (err) {
      console.error("Lỗi đăng bình luận:", err);
      alert("Không thể đăng bình luận. Vui lòng thử lại.");
    }
  };

  return (
    <div className="modal-section">
      <div className="modal-section-header">
        <BsChatDotsFill />
        <h3>Bình luận</h3>
      </div>
      
      {/* Danh sách bình luận */}
      <div className="comments-list">
        {loading && <p>Đang tải bình luận...</p>}
        {!loading && comments.length === 0 && (
          <p className="no-comments">Chưa có bình luận nào.</p>
        )}
        {comments.map(comment => (
          <div key={comment.id} className="comment-item">
            <img 
              src={comment.author.avatar_url || avt} 
              alt={comment.author.username} 
              className="comment-avatar"
            />
            <div className="comment-body">
              <span className="comment-author">{comment.author.username}</span>
              <div className="comment-content">
                <p>{comment.content}</p>
              </div>
              <span className="comment-time">
                {new Date(comment.created_at).toLocaleString('vi-VN')}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Form đăng bình luận mới */}
      <div className="comment-form">
        <img 
          src={currentUser.avatar_url || avt} 
          alt={currentUser.username} 
          className="comment-avatar"
        />
        <div className="comment-input-wrapper">
          <textarea
            placeholder="Viết bình luận..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={2}
          />
          {newComment && (
             <button className="btn-primary" onClick={handlePostComment}>
              Lưu
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


// (Component Checklists giữ nguyên từ lần trước)
const Checklists = ({ cardId }) => {
  const [checklists, setChecklists] = useState([]);
  const [showAddChecklist, setShowAddChecklist] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [addingItemTo, setAddingItemTo] = useState(null); // checklistId
  const [newItemTitle, setNewItemTitle] = useState("");

  useEffect(() => {
    const fetchChecklists = async () => {
      try {
        const data = await workspaceService.getChecklists(cardId);
        setChecklists(data);
      } catch (err) {
        console.error("Lỗi tải checklists:", err);
      }
    };
    fetchChecklists();
  }, [cardId]);

  const handleCreateChecklist = async () => {
    if (!newChecklistTitle.trim()) return;
    try {
      const newChecklist = await workspaceService.createChecklist(cardId, newChecklistTitle);
      setChecklists([...checklists, newChecklist]);
      setNewChecklistTitle("");
      setShowAddChecklist(false);
    } catch (err) {
      console.error("Lỗi tạo checklist:", err);
    }
  };
  
  const handleDeleteChecklist = async (checklistId) => {
    if (window.confirm("Bạn có chắc muốn xóa checklist này?")) {
      try {
        await workspaceService.deleteChecklist(checklistId);
        setChecklists(checklists.filter(cl => cl.id !== checklistId));
      } catch (err) {
        console.error("Lỗi xóa checklist:", err);
      }
    }
  };

  const handleCreateItem = async (checklistId) => {
    if (!newItemTitle.trim()) return;
    try {
      const newItem = await workspaceService.createChecklistItem(checklistId, newItemTitle);
      setChecklists(checklists.map(cl => 
        cl.id === checklistId 
          ? { ...cl, items: [...cl.items, newItem] } 
          : cl
      ));
      setNewItemTitle("");
      setAddingItemTo(null);
    } catch (err) {
      console.error("Lỗi tạo checklist item:", err);
    }
  };

  const handleToggleItem = async (itemId, currentChecked) => {
    try {
      const updatedItem = await workspaceService.updateChecklistItem(itemId, {
        is_checked: !currentChecked
      });
      setChecklists(checklists.map(cl => ({
        ...cl,
        items: cl.items.map(item => 
          item.id === itemId ? updatedItem : item
        )
      })));
    } catch (err) {
      console.error("Lỗi cập nhật item:", err);
    }
  };
  
  const handleDeleteItem = async (checklistId, itemId) => {
    try {
      await workspaceService.deleteChecklistItem(itemId);
      setChecklists(checklists.map(cl =>
        cl.id === checklistId
          ? { ...cl, items: cl.items.filter(item => item.id !== itemId) }
          : cl
      ));
    } catch (err) {
      console.error("Lỗi xóa item:", err);
    }
  };

  const calculateProgress = (items) => {
    if (!items || items.length === 0) return 0;
    const checkedCount = items.filter(item => item.is_checked).length;
    return Math.round((checkedCount / items.length) * 100);
  };

  return (
    <div className="modal-section">
      <div className="modal-section-header">
        <BsListCheck />
        <h3>Checklist</h3>
        {!showAddChecklist && (
          <button className="btn-secondary" onClick={() => setShowAddChecklist(true)}>Thêm</button>
        )}
      </div>
      
      {showAddChecklist && (
        <div className="add-checklist-form">
          <input
            type="text"
            placeholder="Tiêu đề Checklist..."
            value={newChecklistTitle}
            onChange={(e) => setNewChecklistTitle(e.target.value)}
            autoFocus
          />
          <div className="form-actions">
            <button className="btn-primary" onClick={handleCreateChecklist}>Lưu</button>
            <button className="btn-cancel" onClick={() => setShowAddChecklist(false)}>Hủy</button>
          </div>
        </div>
      )}

      <div className="checklists-container">
        {checklists.map(cl => {
          const progress = calculateProgress(cl.items);
          return (
            <div key={cl.id} className="checklist">
              <div className="checklist-header">
                <h5>{cl.title}</h5>
                <button className="btn-delete" onClick={() => handleDeleteChecklist(cl.id)}>
                  <BsTrash />
                </button>
              </div>
              
              <div className="checklist-progress">
                <span>{progress}%</span>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                </div>
              </div>

              <div className="checklist-items">
                {cl.items.map(item => (
                  <div key={item.id} className="checklist-item">
                    <input 
                      type="checkbox" 
                      checked={item.is_checked}
                      onChange={() => handleToggleItem(item.id, item.is_checked)}
                    />
                    <span className={`item-title ${item.is_checked ? 'checked' : ''}`}>
                      {item.title}
                    </span>
                    <button className="btn-delete-item" onClick={() => handleDeleteItem(cl.id, item.id)}>
                      <IoMdClose />
                    </button>
                  </div>
                ))}
              </div>
              
              {addingItemTo === cl.id ? (
                <div className="add-item-form">
                  <input
                    type="text"
                    placeholder="Thêm một mục..."
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    autoFocus
                  />
                  <div className="form-actions">
                    <button className="btn-primary" onClick={() => handleCreateItem(cl.id)}>Lưu</button>
                    <button className="btn-cancel" onClick={() => setAddingItemTo(null)}>Hủy</button>
                  </div>
                </div>
              ) : (
                <button className="btn-secondary" onClick={() => setAddingItemTo(cl.id)}>
                  Thêm mục
                </button>
              )}
            </div>
          );
        })}
      </div>

      {checklists.length === 0 && !showAddChecklist && (
         <div className="checklist-placeholder" onClick={() => setShowAddChecklist(true)}>
          <p>Thêm danh sách công việc con...</p>
        </div>
      )}
    </div>
  );
};


// (Component LabelsPopover giữ nguyên)
const LabelsPopover = ({ card, workspaceId, allLabels, setAllLabels, onUpdateCard, onClose }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("blue"); 
  const labelColors = ["blue", "green", "yellow", "red", "purple", "orange", "gray"];

  const handleToggleLabel = async (labelId) => {
    try {
      const res = await workspaceService.toggleCardLabel(card.id, labelId);
      let newLabelIds;
      if (res.action === 'added') {
        newLabelIds = [...card.labelIds, labelId];
      } else {
        newLabelIds = card.labelIds.filter(id => id !== labelId);
      }
      onUpdateCard({ ...card, labelIds: newLabelIds });
    } catch (err) {
      console.error("Lỗi gán/gỡ label:", err);
      alert("Đã xảy ra lỗi. Vui lòng thử lại.");
    }
  };

  const handleCreateLabel = async (e) => {
    e.preventDefault(); 
    if (!newLabelName.trim()) return;
    try {
      const newLabel = await workspaceService.createLabel(workspaceId, {
        name: newLabelName,
        color: newLabelColor
      });
      setAllLabels([...allLabels, newLabel]); 
      setNewLabelName("");
      setShowCreate(false); 
    } catch (err) {
      console.error("Lỗi tạo label:", err);
      alert("Không thể tạo label.");
    }
  };

  const cardLabelIds = card.labelIds || [];

  return (
    <div 
      className="popover-content labels-popover"
      onClick={(e) => e.stopPropagation()} 
    >
      <div className="popover-header">
        <h4>Nhãn dán</h4>
        <button onClick={onClose}><IoMdClose /></button>
      </div>
      <div className="popover-body">
        <div className="labels-list">
          {allLabels.map(label => (
            <div 
              key={label.id} 
              className="label-item"
              onClick={() => handleToggleLabel(label.id)}
            >
              <div className={`label-color-box ${label.color}`}>
                {label.name}
              </div>
              <div className="label-check-box">
                {cardLabelIds.includes(label.id) && <BsCheck />}
              </div>
            </div>
          ))}
        </div>
        
        {showCreate ? (
          <form className="create-label-form">
            <label>Tên nhãn</label>
            <input
              type="text"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              placeholder="Tên nhãn mới..."
              autoFocus
            />
            <label>Chọn màu</label>
            <div className="color-picker-grid">
              {labelColors.map(color => (
                <div 
                  key={color} 
                  className={`color-pick ${color} ${newLabelColor === color ? 'selected' : ''}`}
                  onClick={() => setNewLabelColor(color)}
                />
              ))}
            </div>
            <div className="form-actions">
              <button 
                type="button" 
                className="btn-primary" 
                onClick={handleCreateLabel}
              >
                Tạo
              </button>
              <button type="button" className="btn-cancel" onClick={() => setShowCreate(false)}>Hủy</button>
            </div>
          </form>
        ) : (
          <button className="btn-secondary" onClick={() => setShowCreate(true)}>
            Tạo nhãn mới
          </button>
        )}
      </div>
    </div>
  );
};

// (Component MembersPopover giữ nguyên)
const MembersPopover = ({ card, members, workspaceId, onUpdateCard, onClose }) => {
  const handleAssign = async (memberId) => {
    try {
      const newAssigneeId = card.assignee === memberId ? null : memberId;
      const updatedCard = await workspaceService.updateCard(workspaceId, card.id, { 
        assignee_id: newAssigneeId
      });
      onUpdateCard(updatedCard.card);
      onClose(); 
    } catch (err) {
      console.error("Lỗi gán thành viên:", err);
    }
  };

  return (
    <div 
      className="popover-content members-popover"
      onClick={(e) => e.stopPropagation()} 
    >
      <div className="popover-header">
        <h4>Gán thành viên</h4>
        <button onClick={onClose}><IoMdClose /></button>
      </div>
      <div className="popover-body">
        {members.map(member => (
          <div 
            key={member.id} 
            className={`member-item ${card.assignee === member.id ? 'assigned' : ''}`}
            onClick={() => handleAssign(member.id)}
          >
            <img src={member.avatar || avt} alt={member.name} />
            <span>{member.name}</span>
            {card.assignee === member.id && <BsCheck />}
          </div>
        ))}
      </div>
    </div>
  );
};

// (Component DatePopover giữ nguyên)
const DatePopover = ({ card, workspaceId, onUpdateCard, onClose }) => {
  const [date, setDate] = useState(card.dueDate ? new Date(card.dueDate) : null);

  const handleDateChange = async (newDate) => {
    setDate(newDate);
    try {
      const updatedCard = await workspaceService.updateCard(workspaceId, card.id, { 
        due_date: newDate ? newDate.toISOString() : null
      });
      onUpdateCard(updatedCard.card);
      onClose();
    } catch (err) {
      console.error("Lỗi cập nhật ngày:", err);
    }
  };

  return (
    <div 
      className="popover-content date-popover"
      onClick={(e) => e.stopPropagation()} 
    >
      <div className="popover-header">
        <h4>Ngày hết hạn</h4>
        <button onClick={onClose}><IoMdClose /></button>
      </div>
      <div className="popover-body">
        <DatePicker
          selected={date}
          onChange={handleDateChange}
          inline 
        />
        <button 
          className="btn-remove-date" 
          onClick={() => handleDateChange(null)}
        >
          Gỡ bỏ ngày
        </button>
      </div>
    </div>
  );
};


// === COMPONENT CHÍNH ===
const CardDetailModal = ({ card, listTitle, workspaceId, members, onClose, onUpdateCard }) => {
  if (!card) return null;

  const [currentCard, setCurrentCard] = useState(card);

  useEffect(() => {
    setCurrentCard(card);
  }, [card]);

  // State để chỉnh sửa tiêu đề
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(currentCard.title);

  // State để chỉnh sửa mô tả
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editDesc, setEditDesc] = useState(currentCard.description || "");

  // State cho Labels
  const [allLabels, setAllLabels] = useState([]);

  // Tải labels khi modal mở
  useEffect(() => {
    const fetchLabels = async () => {
      try {
        const labelsData = await workspaceService.getWorkspaceLabels(workspaceId);
        setAllLabels(labelsData);
      } catch (err) {
        console.error("Lỗi tải labels:", err);
      }
    };
    fetchLabels();
  }, [workspaceId]);


  // Logic quản lý Popover
  const [popover, setPopover] = useState(null); 
  const [referenceElement, setReferenceElement] = useState(null);
  const [popperElement, setPopperElement] = useState(null);
  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: 'bottom-start',
    modifiers: [{ name: 'offset', options: { offset: [0, 8] } }],
  });
  const openPopover = (type, target) => {
    setReferenceElement(target);
    setPopover(type);
  };
  const closePopover = () => setPopover(null);


  // Hàm lưu tiêu đề
  const handleSaveTitle = async () => {
    if (editTitle.trim() === currentCard.title) {
      setIsEditingTitle(false);
      return;
    }
    try {
      const updatedCard = await workspaceService.updateCard(workspaceId, currentCard.id, { title: editTitle });
      const newCardData = updatedCard.card;
      onUpdateCard(newCardData); 
      setCurrentCard(newCardData); 
      setIsEditingTitle(false);
    } catch (err) {
      console.error("Lỗi cập nhật tiêu đề:", err);
      alert("Không thể lưu tiêu đề.");
    }
  };

  // Hàm lưu mô tả
  const handleSaveDescription = async () => {
    try {
      const updatedCard = await workspaceService.updateCard(workspaceId, currentCard.id, { description: editDesc });
      const newCardData = updatedCard.card;
      onUpdateCard(newCardData); 
      setCurrentCard(newCardData); 
      setIsEditingDesc(false);
    } catch (err) {
      console.error("Lỗi cập nhật mô tả:", err);
      alert("Không thể lưu mô tả.");
    }
  };

  // Hàm được gọi bởi các Popover
  const handleCardUpdate = (updatedCardData) => {
    setCurrentCard(updatedCardData); 
    onUpdateCard(updatedCardData); 
  };


  // Logic lấy Assignee & Due Date
  const getAssignee = () => {
    if (!currentCard.assignee) return null;
    return members.find(m => m.id === currentCard.assignee);
  };
  const assignee = getAssignee();

  const getDueDate = () => {
    if (!currentCard.dueDate) return null;
    return new Date(currentCard.dueDate).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  const dueDate = getDueDate();
  
  // Logic lấy Labels đã gán
  const getAssignedLabels = () => {
    const cardLabelIds = currentCard.labelIds || [];
    return allLabels.filter(label => cardLabelIds.includes(label.id));
  };
  const assignedLabels = getAssignedLabels();


  return (
    // Lớp overlay này có onClick={onClose}
    <div className="modal-overlay" onClick={onClose}>
      
      {/* Lớp modal chính này ngăn click đóng modal */}
      <div className="card-detail-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* === Header: Tiêu đề Thẻ === */}
        <div className="modal-header">
          {isEditingTitle ? (
            <div className="edit-title-form">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
              />
              <button className="btn-save" onClick={handleSaveTitle}><BsCheck /></button>
            </div>
          ) : (
            <h2 onClick={() => setIsEditingTitle(true)}>
              <BsPencil className="edit-icon" /> {currentCard.title}
            </h2>
          )}
          <p>trong danh sách <b>{listTitle}</b></p>
          <button className="close-btn" onClick={onClose}>
            <IoMdClose />
          </button>
        </div>

        {/* === Content: Nội dung chính === */}
        <div className="modal-content-area">
          <div className="modal-main-col">
            
            <div className="modal-quick-info">
              {assignedLabels.length > 0 && (
                <div className="info-block">
                  <span className="info-label"><BsTags /> Nhãn dán</span>
                  <div className="labels-display-area">
                    {assignedLabels.map(label => (
                      <span key={label.id} className={`label-badge ${label.color}`}>
                        {label.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {assignee && (
                <div className="info-block">
                  <span className="info-label"><BsPerson /> Người thực hiện</span>
                  <div className="assignee-badge">
                    <img src={assignee.avatar || avt} alt={assignee.name} />
                    <span>{assignee.name}</span>
                  </div>
                </div>
              )}
              {dueDate && (
                 <div className="info-block">
                  <span className="info-label"><BsCalendar /> Ngày hết hạn</span>
                  <div
                    className={`date-badge ${new Date(currentCard.dueDate) < new Date() ? 'overdue' : ''}`}
                  >
                    {dueDate}
                  </div>
                </div>
              )}
            </div>

            {/* --- Mô tả --- */}
            <div className="modal-section">
              <div className="modal-section-header">
                <BsTextLeft />
                <h3>Mô tả</h3>
                {!isEditingDesc && (
                  <button className="btn-secondary" onClick={() => setIsEditingDesc(true)}>
                    Chỉnh sửa
                  </button>
                )}
              </div>
              {isEditingDesc ? (
                <div className="edit-desc-form">
                  <textarea
                    placeholder="Thêm mô tả chi tiết..."
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={4}
                    autoFocus
                  />
                  <div className="form-actions">
                    <button className="btn-primary" onClick={handleSaveDescription}>Lưu</button>
                    <button className="btn-cancel" onClick={() => setIsEditingDesc(false)}>Hủy</button>
                  </div>
                </div>
              ) : (
                <div 
                  className={`description-display ${!currentCard.description ? 'empty' : ''}`}
                  onClick={() => setIsEditingDesc(true)}
                >
                  {currentCard.description || "Thêm mô tả chi tiết..."}
                </div>
              )}
            </div>
            
            {/* --- Component Checklist thật --- */}
            <Checklists cardId={currentCard.id} />
            
            {/* --- (CODE MỚI) Component Comments thật --- */}
            <Comments cardId={currentCard.id} />

          </div>

          {/* === Sidebar: Các nút hành động === */}
          <div className="modal-sidebar">
            <h4>Thêm vào thẻ</h4>
            
            <button 
              className="sidebar-btn"
              onClick={(e) => openPopover('members', e.currentTarget)}
            >
              <BsPersonFill /> Thành viên
            </button>
            
            <button 
              className="sidebar-btn"
              onClick={(e) => openPopover('date', e.currentTarget)}
            >
              <BsCalendar /> Ngày
            </button>

            <button 
              className="sidebar-btn"
              onClick={(e) => openPopover('labels', e.currentTarget)}
            >
              <BsTags /> Nhãn dán
            </button>
            
          </div>
        </div>
      </div>

      {/* --- Khu vực hiển thị Popover --- */}
      {popover && (
        <div 
          ref={setPopperElement} 
          style={styles.popper} 
          {...attributes.popper}
          className="popover-container"
        >
          {popover === 'members' && (
            <MembersPopover
              card={currentCard}
              members={members}
              workspaceId={workspaceId}
              onUpdateCard={handleCardUpdate}
              onClose={closePopover}
            />
          )}
          {popover === 'date' && (
            <DatePopover
              card={currentCard}
              workspaceId={workspaceId}
              onUpdateCard={handleCardUpdate}
              onClose={closePopover}
            />
          )}
          {popover === 'labels' && (
            <LabelsPopover
              card={currentCard}
              workspaceId={workspaceId}
              allLabels={allLabels}
              setAllLabels={setAllLabels}
              onUpdateCard={handleCardUpdate}
              onClose={closePopover}
            />
          )}
        </div>
      )}

    </div>
  );
};

export default CardDetailModal;