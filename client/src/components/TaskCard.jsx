// src/components/TaskCard.jsx
import React, { forwardRef } from 'react'; 
import './TaskCard.css';
import { BsGearFill } from 'react-icons/bs';
import attachmentIcon from '../assets/TaskManagement-icon/Icon__Paperclip.svg';
import clockIcon from '../assets/TaskManagement-icon/Icon__Clock.svg';
import flagGreen from '../assets/TaskManagement-icon/Icon__Flag__green.svg';
import flagYellow from '../assets/TaskManagement-icon/Icon__Flag__yellow.svg';
import flagRed from '../assets/TaskManagement-icon/Icon__Flag__red.svg';
import defaultAvatar from '../assets/Trangchu/avt.png';

const TaskCard = forwardRef(({ task, members = [], isOverlay = false, onEditClick, ...props }, ref) => {

  const priorityFlags = {
    low: flagGreen,
    medium: flagYellow,
    high: flagRed,
  };
  
  const assignedMember = members.find(m => m.id === task.assignee);
  const priorityKey = task.priority || 'medium';
  const priorityClass = `priority-${priorityKey}`;
  const overlayClass = isOverlay ? 'overlay-style' : '';

  return (
    <div
      ref={ref} 
      className={`task-card ${priorityClass} ${overlayClass}`}
      {...props}
    >
      <div className="task-header">
        <h4 className="task-title">{task.title}</h4>
        
        {!isOverlay && (
          <button 
            className="task-edit-btn" 
            title="Chỉnh sửa task"
            onPointerDown={(e) => e.stopPropagation()} // Ngăn kéo thẻ
            onMouseDown={(e) => e.stopPropagation()} // Backup cho trình duyệt cũ
            onClick={(e) => {
                e.stopPropagation(); 
                if (onEditClick) onEditClick(); 
            }}
          >
            <BsGearFill /> 
          </button>
        )}
      </div>
      
      {task.tags && task.tags.length > 0 && (
        <div className="task-tags-display">
          {task.tags.map((tag, index) => (
            <span key={index} className="task-tag-badge">#{tag}</span>
          ))}
        </div>
      )}
      {task.description && (
        <p className="task-description">{task.description}</p>
      )}

      <div className="task-footer">
        <div className="task-meta">
          {priorityFlags[priorityKey] && (
            <img
              src={priorityFlags[priorityKey]}
              alt={`Priority: ${priorityKey}`}
              className="priority-flag"
            />
          )}
          {task.dueDate && (
            <span className="task-date">
              <img src={clockIcon} alt="Date" className="meta-icon" />
              {new Date(task.dueDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
            </span>
          )}
        </div>
        
        <div className="task-avatars">
          {assignedMember ? (
            <img 
              src={assignedMember.avatar || defaultAvatar} 
              alt={assignedMember.name} 
              title={`Gán cho: ${assignedMember.name}`}
              className="avatar" 
            />
          ) : (
            <div 
              className="avatar-placeholder" 
              title="Chưa gán cho ai"
            >
              ?
            </div>
          )}
        </div>
      </div>
    </div>
  );
}); 

TaskCard.displayName = 'TaskCard';

export default TaskCard;