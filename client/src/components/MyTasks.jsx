// src/components/MyTasks.jsx
import React, { useState, useEffect } from 'react';
import './MyTasks.css'; // File CSS mới
import { BsCheckCircleFill, BsCircle, BsClock, BsTrash, BsExclamationTriangleFill } from 'react-icons/bs';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { workspaceService } from '../services/workspaceService';

// (Component TaskItem được tái sử dụng từ Dashboard)
const TaskItem = ({ task }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Hàm điều hướng
  const handleTaskClick = () => {
    if (task.type === 'personal_task') {
      navigate('/app/tasks');
    } else if (task.type === 'workspace_card' && task.workspace_id) {
      navigate(`/app/workspace/${task.workspace_id}`);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const formatDueDate = (isoDate) => {
    const date = new Date(isoDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return `Hôm nay, ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return `Ngày mai, ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div 
      className="task-item"
      onClick={handleTaskClick}
      style={{cursor: 'pointer'}}
    >
      <div className="task-checkbox">
        <BsCircle className="checkbox-unchecked" />
      </div>
      <div className="task-info">
        <p className="task-title">{task.title}</p>
        <div className="task-meta">
          <span className="task-priority" style={{ backgroundColor: getPriorityColor(task.priority) }}>
            {t(`dashboard.modalPriority${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}`, task.priority)}
          </span>
          <span className="task-deadline"><BsClock /> {formatDueDate(task.due_date)}</span>
          <span 
            className="task-workspace"
            style={{
              backgroundColor: task.type === 'personal_task' ? '#d1fae5' : 'var(--bg-color)',
              color: task.type === 'personal_task' ? '#065f46' : 'var(--text-secondary-color)',
            }}
          >
            {task.workspace_name}
          </span>
        </div>
      </div>
      <button className="delete-task-btn" onClick={(e) => e.stopPropagation()}><BsTrash /></button>
    </div>
  );
};


// Component chính của trang
const MyTasks = () => {
  const { t } = useTranslation();
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [taskGroups, setTaskGroups] = useState({
    overdue: [],
    today: [],
    upcoming: []
  });

  useEffect(() => {
    // Tải tasks (giống hệt Dashboard)
    const fetchMyTasks = async () => {
      try {
        setLoadingTasks(true);
        const data = await workspaceService.getMyTasks();
        setTaskGroups(data);
      } catch (err) {
        console.error("Lỗi tải 'My Tasks':", err);
      } finally {
        setLoadingTasks(false);
      }
    };
    
    fetchMyTasks();
  }, []);

  return (
    <div className="my-tasks-container">
      <div className="my-tasks-header">
        <h1><BsCheckCircleFill /> {t('myTasks.title', 'Công việc của tôi')}</h1>
        <p>{t('myTasks.subtitle', 'Tất cả công việc được gán cho bạn ở một nơi.')}</p>
      </div>

      {loadingTasks ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Đang tải công việc...</p>
        </div>
      ) : (
        <div className="my-tasks-list">
          {/* Nhóm 1: Quá hạn */}
          {taskGroups.overdue.length > 0 && (
            <div className="task-group">
              <h4 className="task-group-title overdue">
                <BsExclamationTriangleFill /> {t('myTasks.overdue', 'Quá hạn')} ({taskGroups.overdue.length})
              </h4>
              {taskGroups.overdue.map(task => <TaskItem key={task.id} task={task} />)}
            </div>
          )}
          
          {/* Nhóm 2: Hôm nay */}
          {taskGroups.today.length > 0 && (
            <div className="task-group">
              <h4 className="task-group-title today">
                {t('myTasks.today', 'Hôm nay')} ({taskGroups.today.length})
              </h4>
              {taskGroups.today.map(task => <TaskItem key={task.id} task={task} />)}
            </div>
          )}
          
          {/* Nhóm 3: Sắp tới */}
          {taskGroups.upcoming.length > 0 && (
            <div className="task-group">
              <h4 className="task-group-title upcoming">
                {t('myTasks.upcoming', 'Sắp tới')} ({taskGroups.upcoming.length})
              </h4>
              {taskGroups.upcoming.map(task => <TaskItem key={task.id} task={task} />)}
            </div>
          )}
          
          {/* Không có task nào */}
          {taskGroups.overdue.length === 0 && taskGroups.today.length === 0 && taskGroups.upcoming.length === 0 && (
            <div className="empty-tasks">
              <p>{t('dashboard.noTasks')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyTasks;