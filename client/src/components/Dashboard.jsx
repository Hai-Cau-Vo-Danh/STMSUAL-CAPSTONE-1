import React, { useState, useEffect, useCallback } from 'react'; 
import './Dashboard.css';
import { 
  BsCheckCircleFill, BsCircle, BsClock, BsCalendar3, BsPlus, BsTrash, 
  BsExclamationTriangleFill, BsCalendarCheck, BsCheck, BsLightningFill, BsCalendarEvent 
} from 'react-icons/bs';
import { IoTrendingUp, IoFlash, IoClose, IoStorefront, IoTrophy, IoNotifications, IoTimeOutline } from 'react-icons/io5'; 
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom'; 
import axios from 'axios';

import { workspaceService } from '../services/workspaceService';
import ShopModal from './ShopModal'; 
import LeaderboardModal from './LeaderboardModal';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ================= HELPER COMPONENTS =================

// 1. Toast Notification
const ToastNotification = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`custom-toast ${type}`}>
      <div className="toast-icon">
        {type === 'success' ? <BsCheckCircleFill /> : <BsExclamationTriangleFill />}
      </div>
      <div className="toast-message">{message}</div>
      <button className="toast-close" onClick={onClose}><IoClose /></button>
    </div>
  );
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
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return `Hôm nay, ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  if (date.toDateString() === tomorrow.toDateString()) return `Ngày mai, ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

// ================= SUB-COMPONENTS =================

const TaskItem = ({ task, navigate, onToggle, setShowMyTasksModal }) => {
  const handleTaskClick = (e) => {
    e.stopPropagation();
    if (onToggle) onToggle(task.id, !task.is_completed);
  };

  const handleNavigate = () => {
    if (task.type === 'personal_task') navigate('/app/tasks');
    else if (task.type === 'workspace_card' && task.workspace_id) navigate(`/app/workspace/${task.workspace_id}`);
    if (setShowMyTasksModal) setShowMyTasksModal(false);
  };

  return (
    <div className={`task-item ${task.is_completed ? 'completed' : ''}`} onClick={handleNavigate}>
      <div 
        className={`task-checkbox ${task.is_completed ? 'checked' : ''}`} 
        onClick={handleTaskClick}
      >
        {task.is_completed ? <BsCheckCircleFill /> : <BsCircle />}
      </div>
      <div className="task-info">
        <p className="task-title">{task.title}</p>
        <div className="task-meta">
          <span className="task-badge priority" style={{ '--badge-color': getPriorityColor(task.priority) }}>
            {task.priority}
          </span>
          <span className="task-deadline"><BsClock /> {formatDueDate(task.due_date)}</span>
        </div>
      </div>
    </div>
  );
};

// Modal hiển thị tất cả công việc
const MyTasksModal = ({ setShowMyTasksModal, loadingTasks, taskGroups, totalIncompleteTasks, t, navigate, onToggle }) => (
  <div className="my-tasks-modal-overlay" onClick={() => setShowMyTasksModal(false)}>
    <div className="my-tasks-modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="my-tasks-header">
        <h1><BsCheckCircleFill /> Danh sách công việc</h1>
        <button className="close-modal-btn" onClick={() => setShowMyTasksModal(false)}>
          <IoClose />
        </button>
      </div>
      {loadingTasks ? (
        <div className="loading-state">
          <div className="spinner-small"></div><p style={{textAlign:'center', marginTop:'10px'}}>Đang tải công việc...</p>
        </div>
      ) : (
        <div className="my-tasks-list">
          {/* Quá hạn */}
          {taskGroups.overdue.length > 0 && (
            <div className="task-group">
              <h4 className="task-group-title overdue">
                <BsExclamationTriangleFill /> Quá hạn ({taskGroups.overdue.length})
              </h4>
              {taskGroups.overdue.map(task => <TaskItem key={task.id} task={task} navigate={navigate} onToggle={onToggle} setShowMyTasksModal={setShowMyTasksModal} />)}
            </div>
          )}
          {/* Hôm nay */}
          {taskGroups.today.length > 0 && (
            <div className="task-group">
              <h4 className="task-group-title today">
                <BsCheckCircleFill /> Hôm nay ({taskGroups.today.length})
              </h4>
              {taskGroups.today.map(task => <TaskItem key={task.id} task={task} navigate={navigate} onToggle={onToggle} setShowMyTasksModal={setShowMyTasksModal} />)}
            </div>
          )}
          {/* Ngày mai */}
          {taskGroups.tomorrow.length > 0 && (
            <div className="task-group">
              <h4 className="task-group-title upcoming">
                <BsCalendarEvent /> Ngày mai ({taskGroups.tomorrow.length})
              </h4>
              {taskGroups.tomorrow.map(task => <TaskItem key={task.id} task={task} navigate={navigate} onToggle={onToggle} setShowMyTasksModal={setShowMyTasksModal} />)}
            </div>
          )}
          {/* Sắp tới */}
          {taskGroups.upcoming.length > 0 && (
            <div className="task-group">
              <h4 className="task-group-title upcoming">
                <BsCalendar3 /> Sắp tới ({taskGroups.upcoming.length})
              </h4>
              {taskGroups.upcoming.map(task => <TaskItem key={task.id} task={task} navigate={navigate} onToggle={onToggle} setShowMyTasksModal={setShowMyTasksModal} />)}
            </div>
          )}
          {totalIncompleteTasks === 0 && (
            <div className="empty-tasks">
              <p>{t('dashboard.noTasks', 'Không có công việc nào!')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);

const WeeklyCheckIn = ({ onTomatoesUpdate, showToast }) => {
  const [loading, setLoading] = useState(true);
  const [checkInData, setCheckInData] = useState({ checked_in_dates: [], today_checked_in: false, total_tomatoes: 0 });
  
  const today = new Date();
  const getMonday = (d) => {
    d = new Date(d);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    return new Date(d.setDate(diff));
  };
  const monday = getMonday(today);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d;
  });

  useEffect(() => {
    const fetchCheckInStatus = async () => {
      try {
        setLoading(true);
        const data = await workspaceService.getCheckInStatus();
        setCheckInData(data);
        if (onTomatoesUpdate) onTomatoesUpdate(data.total_tomatoes); 
      } catch (err) { console.error("Lỗi tải điểm danh:", err); } 
      finally { setLoading(false); }
    };
    fetchCheckInStatus();
  }, [onTomatoesUpdate]); 

  const handleCheckIn = async () => {
    if (checkInData.today_checked_in) return; 
    try {
      const todayString = new Date().toISOString().split('T')[0];
      const data = await workspaceService.performCheckIn(todayString);

      showToast(`🎉 ${data.message}`, 'success'); 
      
      setCheckInData({
        checked_in_dates: [...checkInData.checked_in_dates, data.checked_in_date],
        today_checked_in: true,
        total_tomatoes: data.total_tomatoes
      });
      if (onTomatoesUpdate) onTomatoesUpdate(data.total_tomatoes); 
    } catch (err) {
      showToast(err.response?.data?.message || "Lỗi điểm danh", 'error');
    }
  };
  
  return (
    <div className="bento-card check-in-card"> 
      <div className="card-header-simple">
        <div className="icon-wrapper check-in"><BsCalendarCheck /></div>
        <span>Điểm danh tuần này</span>
      </div>
      <div className="check-in-content">
        {loading ? <div className="spinner-small"></div> : (
          <>
            <div className="week-grid">
              {weekDays.map((day, index) => {
                const dayString = day.toISOString().split('T')[0];
                const isChecked = checkInData.checked_in_dates.includes(dayString);
                const isToday = day.toDateString() === new Date().toDateString();
                const dayLabel = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"][index];
                
                return (
                  <div key={index} className={`day-cell ${isChecked ? 'checked' : ''} ${isToday ? 'today' : ''}`}>
                    <span className="day-name">{dayLabel}</span>
                    <div className="day-status">{isChecked ? <BsCheck /> : (isToday ? <div className="pulse-dot"></div> : null)}</div>
                  </div>
                );
              })}
            </div>
            <button className={`btn-glass check-in-btn ${checkInData.today_checked_in ? 'disabled' : ''}`} onClick={handleCheckIn} disabled={checkInData.today_checked_in}>
              {checkInData.today_checked_in ? "Đã điểm danh hôm nay" : "Điểm danh ngay (+2 🍅)"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ================= MAIN DASHBOARD =================

const Dashboard = () => {
  const { t, i18n } = useTranslation(); 
  const navigate = useNavigate(); 
  const [currentTime] = useState(new Date());
  
  const [userInfo, setUserInfo] = useState({ username: "User", tomatoes: 0, rank_title: null });
  
  // State quản lý Task (Thêm 'tomorrow' và 'no_due_date')
  const [taskGroups, setTaskGroups] = useState({ 
    overdue: [], 
    today: [], 
    tomorrow: [], 
    upcoming: [], 
    no_due_date: [] 
  });
  const [loadingTasks, setLoadingTasks] = useState(true);
  
  // Modal States
  const [showMyTasksModal, setShowMyTasksModal] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  
  // Toast State
  const [toast, setToast] = useState(null);

  const recentActivities = [
    { id: 1, text: 'Hoàn thành 4 Pomodoro', time: '10 phút trước', icon: <IoTimeOutline /> },
    { id: 2, text: 'Tham gia Study Room', time: '1 giờ trước', icon: <IoStorefront /> },
    { id: 3, text: 'Đạt mốc 7 ngày học', time: '2 giờ trước', icon: <BsLightningFill /> },
  ];

  useEffect(() => {
    try {
      const userString = localStorage.getItem("user");
      if (userString) setUserInfo(prev => ({ ...prev, ...JSON.parse(userString) }));
    } catch (e) { console.error(e); }
    
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoadingTasks(true);
      const data = await workspaceService.getMyTasks();
      setTaskGroups({ 
        overdue: data.overdue || [], 
        today: data.today || [], 
        tomorrow: data.tomorrow || [], 
        upcoming: data.upcoming || [],
        no_due_date: data.no_due_date || []
      });
    } catch (err) { console.error(err); } 
    finally { setLoadingTasks(false); }
  };
  
  const handleTomatoesUpdate = useCallback((newTotal) => {
      setUserInfo(prev => ({ ...prev, tomatoes: newTotal }));
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...currentUser, tomatoes: newTotal }));
  }, []);

  const handleUpdateUser = (updates) => {
      setUserInfo(prev => {
          const newUserInfo = { ...prev, ...updates };
          localStorage.setItem("user", JSON.stringify(newUserInfo));
          return newUserInfo;
      });
  };

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // Hàm Update Task
  const handleToggleTask = async (taskId, newStatus) => {
    setTaskGroups(prev => {
        const updateList = (list) => list.map(t => t.id === taskId ? { ...t, is_completed: newStatus } : t);
        return {
            overdue: updateList(prev.overdue),
            today: updateList(prev.today),
            tomorrow: updateList(prev.tomorrow),
            upcoming: updateList(prev.upcoming),
            no_due_date: updateList(prev.no_due_date)
        };
    });

    try {
        const token = localStorage.getItem('token');
        
        if (taskId.startsWith('task-')) {
            const realId = taskId.split('-')[1];
            const statusString = newStatus ? 'done' : 'todo';
            
            await axios.put(`${API_URL}/api/tasks/${realId}`, 
                { status: statusString, user_id: userInfo.user_id }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } else if (taskId.startsWith('card-')) {
            showToast("Vui lòng vào Workspace để kéo thả thẻ sang cột Done!", "warning");
            fetchTasks(); // Revert UI
            return;
        }
        
    } catch (error) {
        console.error("Lỗi update task:", error);
        showToast("Không thể cập nhật trạng thái", "error");
        fetchTasks(); 
    }
  };

  // Tính Stats (Chỉ task hôm nay)
  const todayStats = React.useMemo(() => {
      const total = taskGroups.today.length;
      const completed = taskGroups.today.filter(t => t.is_completed).length;
      const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
      return { total, completed, percent };
  }, [taskGroups.today]);

  const totalIncompleteTasks = taskGroups.overdue.length + taskGroups.today.length + taskGroups.tomorrow.length + taskGroups.upcoming.length + taskGroups.no_due_date.length;

  return (
    <div className="dashboard-modern">
      {toast && <ToastNotification message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <header className="modern-header">
        <div className="header-content">
          <div className="greeting-section">
            <h1 className="greeting-text">Xin chào, {userInfo.username} 👋</h1>
            <div className="user-badges">
              {userInfo.rank_title && <span className="rank-tag">🏆 {userInfo.rank_title}</span>}
              <span className="date-tag"><BsCalendar3 /> {currentTime.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })}</span>
            </div>
          </div>
          <div className="header-actions">
            <div className="tomato-wallet"><span className="tomato-icon">🍅</span><span className="tomato-count">{userInfo.tomatoes}</span></div>
            <button className="icon-btn-glass" onClick={() => setShowShop(true)} title="Cửa hàng"><IoStorefront /></button>
            <button className="icon-btn-glass" onClick={() => setShowLeaderboard(true)} title="Bảng xếp hạng"><IoTrophy /></button>
            <button className="icon-btn-glass" title="Thông báo"><IoNotifications /></button>
          </div>
        </div>
      </header>

      <div className="bento-grid">
        
        {/* COL 1: PROGRESS SYNCED */}
        <div className="bento-col col-left">
          <div className="bento-card progress-card">
            <div className="card-header-simple">
              <div className="icon-wrapper tasks"><BsCheckCircleFill /></div>
              <span>Tiến độ hôm nay</span>
            </div>
            <div className="progress-circle-container">
               <div className="big-stat">{todayStats.percent}%</div>
               <div className="stat-desc">Đã xong {todayStats.completed}/{todayStats.total} việc</div>
               <div className="progress-bar-modern">
                 <div className="fill" style={{width: `${todayStats.percent}%`}}></div>
               </div>
            </div>
          </div>

          <div className="bento-card actions-card">
            <h3>Truy cập nhanh</h3>
            <div className="quick-grid">
              <button className="quick-item pomodoro" onClick={() => navigate('/app/pomodoro')}><BsClock className="q-icon"/> <span>Timer</span></button>
              <button className="quick-item task" onClick={() => navigate('/app/tasks')}><BsPlus className="q-icon"/> <span>Thêm Task</span></button>
              <button className="quick-item ai" onClick={() => navigate('/app/ai-assistant')}><IoFlash className="q-icon"/> <span>Trợ lý AI</span></button>
              <button className="quick-item shop" onClick={() => setShowShop(true)}><IoStorefront className="q-icon"/> <span>Cửa hàng</span></button>
            </div>
          </div>
        </div>

        {/* COL 2: TASKS LIST */}
        <div className="bento-col col-center">
          <div className="bento-card tasks-main-card">
            <div className="card-header-flex">
              <h3><IoTrendingUp /> Công việc cần làm</h3>
              <button className="text-btn" onClick={() => setShowMyTasksModal(true)}>Xem tất cả</button>
            </div>
            
            {loadingTasks ? <div className="spinner-small"></div> : (
              <div className="modern-task-list">
                {[...taskGroups.overdue, ...taskGroups.today, ...taskGroups.tomorrow, ...taskGroups.upcoming].length === 0 ? (
                  <div className="empty-state">
                    <img src="https://cdn-icons-png.flaticon.com/512/7486/7486744.png" alt="Empty" className="empty-img"/>
                    <p>Bạn rảnh rỗi quá! Không có việc gì cần làm.</p>
                    <button className="btn-primary-sm" onClick={() => navigate('/app/tasks')}>+ Tạo việc mới</button>
                  </div>
                ) : (
                  <>
                    {/* 1. QUÁ HẠN */}
                    {taskGroups.overdue.length > 0 && <div className="mini-group-label overdue">Quá hạn</div>}
                    {taskGroups.overdue.map(t => <TaskItem key={t.id} task={t} navigate={navigate} onToggle={handleToggleTask} setShowMyTasksModal={setShowMyTasksModal} />)}
                    
                    {/* 2. HÔM NAY */}
                    {taskGroups.today.length > 0 && <div className="mini-group-label today">Hôm nay</div>}
                    {taskGroups.today.map(t => <TaskItem key={t.id} task={t} navigate={navigate} onToggle={handleToggleTask} setShowMyTasksModal={setShowMyTasksModal} />)}
                    
                    {/* 3. NGÀY MAI */}
                    {taskGroups.tomorrow.length > 0 && <div className="mini-group-label tomorrow">Ngày mai</div>}
                    {taskGroups.tomorrow.map(t => <TaskItem key={t.id} task={t} navigate={navigate} onToggle={handleToggleTask} setShowMyTasksModal={setShowMyTasksModal} />)}

                    {/* 4. SẮP TỚI (nếu cột chính còn chỗ thì hiện) */}
                    {taskGroups.upcoming.length > 0 && taskGroups.today.length === 0 && <div className="mini-group-label upcoming">Sắp tới</div>}
                    {taskGroups.today.length === 0 && taskGroups.upcoming.slice(0, 3).map(t => <TaskItem key={t.id} task={t} navigate={navigate} onToggle={handleToggleTask} setShowMyTasksModal={setShowMyTasksModal} />)}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* COL 3: CHECK-IN & ACTIVITY */}
        <div className="bento-col col-right">
          <WeeklyCheckIn onTomatoesUpdate={handleTomatoesUpdate} showToast={showToast} />
          
          <div className="bento-card activity-card">
            <div className="card-header-simple">
              <div className="icon-wrapper activity"><IoFlash /></div>
              <span>Hoạt động gần đây</span>
            </div>
            <div className="activity-list">
              {recentActivities.map((act) => (
                <div key={act.id} className="activity-item-modern">
                  <div className="act-icon">{act.icon}</div>
                  <div className="act-info">
                    <p className="act-text">{act.text}</p>
                    <span className="act-time">{act.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showMyTasksModal && (
        <MyTasksModal 
          setShowMyTasksModal={setShowMyTasksModal}
          loadingTasks={loadingTasks}
          taskGroups={taskGroups}
          totalIncompleteTasks={totalIncompleteTasks}
          t={t}
          navigate={navigate}
          onToggle={handleToggleTask}
        />
      )}
      
      {showShop && <ShopModal onClose={() => setShowShop(false)} userInfo={userInfo} onUpdateUser={handleUpdateUser}/>}
      {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} />}
    </div>
  );
};

export default Dashboard;