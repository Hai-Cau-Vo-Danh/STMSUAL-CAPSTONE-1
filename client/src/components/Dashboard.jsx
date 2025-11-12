import React, { useState, useEffect, useCallback } from 'react'; // Thêm useCallback
import './Dashboard.css';
import { 
  BsCheckCircleFill, BsCircle, BsFire, BsTrophy, BsClock, BsCalendar3, BsPlus, BsTrash, 
  BsExclamationTriangleFill, BsCalendarCheck, BsCheck 
} from 'react-icons/bs';
import { IoTrendingUp, IoFlash, IoClose, IoStorefront } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom'; 

import { workspaceService } from '../services/workspaceService';
import ShopModal from './ShopModal'; 

// ================= HELPER FUNCTIONS (Đưa ra ngoài để dùng chung) =================

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

  if (date.toDateString() === today.toDateString()) {
    return `Hôm nay, ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return `Ngày mai, ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// ================= SUB-COMPONENTS (Đưa ra ngoài để tránh Re-mount) =================

// 1. Component Task Item
const TaskItem = ({ task, navigate, setShowMyTasksModal, t }) => {
  const handleTaskClick = () => {
    if (task.type === 'personal_task') {
      navigate('/app/tasks');
    } else if (task.type === 'workspace_card' && task.workspace_id) {
      navigate(`/app/workspace/${task.workspace_id}`);
    }
    setShowMyTasksModal(false);
  };

  return (
    <div className="task-item" onClick={handleTaskClick} style={{cursor: 'pointer'}}>
      <div className="task-checkbox" onClick={(e) => e.stopPropagation()}>
        <BsCircle className="checkbox-unchecked" />
      </div>
      <div className="task-info">
        <p className="task-title">{task.title}</p>
        <div className="task-meta">
          <span className="task-priority" style={{ backgroundColor: getPriorityColor(task.priority) }}>
            {task.priority}
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
      <button className="delete-task-btn"><BsTrash /></button>
    </div>
  );
};

// 2. Component My Tasks Modal
const MyTasksModal = ({ setShowMyTasksModal, loadingTasks, taskGroups, totalIncompleteTasks, t, navigate }) => (
  <div className="my-tasks-modal-overlay" onClick={() => setShowMyTasksModal(false)}>
    <div className="my-tasks-modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="my-tasks-header">
        <h1><BsCheckCircleFill /> {t('myTasks.title', 'Công việc của tôi')}</h1>
        <button className="close-modal-btn" onClick={() => setShowMyTasksModal(false)}>
          <IoClose />
        </button>
      </div>
      {loadingTasks ? (
        <div className="loading-state">
          <div className="spinner-small"></div><p>Đang tải công việc...</p>
        </div>
      ) : (
        <div className="my-tasks-list">
          {taskGroups.overdue.length > 0 && (
            <div className="task-group">
              <h4 className="task-group-title overdue">
                <BsExclamationTriangleFill /> {t('myTasks.overdue', 'Quá hạn')} ({taskGroups.overdue.length})
              </h4>
              {taskGroups.overdue.map(task => <TaskItem key={task.id} task={task} navigate={navigate} setShowMyTasksModal={setShowMyTasksModal} t={t} />)}
            </div>
          )}
          {taskGroups.today.length > 0 && (
            <div className="task-group">
              <h4 className="task-group-title today">
                {t('myTasks.today', 'Hôm nay')} ({taskGroups.today.length})
              </h4>
              {taskGroups.today.map(task => <TaskItem key={task.id} task={task} navigate={navigate} setShowMyTasksModal={setShowMyTasksModal} t={t} />)}
            </div>
          )}
          {taskGroups.upcoming.length > 0 && (
            <div className="task-group">
              <h4 className="task-group-title upcoming">
                {t('myTasks.upcoming', 'Sắp tới')} ({taskGroups.upcoming.length})
              </h4>
              {taskGroups.upcoming.map(task => <TaskItem key={task.id} task={task} navigate={navigate} setShowMyTasksModal={setShowMyTasksModal} t={t} />)}
            </div>
          )}
          {totalIncompleteTasks === 0 && (
            <div className="empty-tasks">
              <p>{t('dashboard.noTasks')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);

// 3. Component Weekly Check In
const WeeklyCheckIn = ({ onTomatoesUpdate }) => {
  const [loading, setLoading] = useState(true);
  const [checkInData, setCheckInData] = useState({
    checked_in_dates: [],
    today_checked_in: false,
    total_tomatoes: 0
  });
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getMonday = (d) => {
    d = new Date(d);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    return new Date(d.setDate(diff));
  };
  
  const monday = getMonday(today);
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    weekDays.push(day);
  }

  useEffect(() => {
    const fetchCheckInStatus = async () => {
      try {
        setLoading(true);
        const data = await workspaceService.getCheckInStatus();
        setCheckInData(data);
        // Gọi callback để cập nhật cà chua lên dashboard cha
        if (onTomatoesUpdate) onTomatoesUpdate(data.total_tomatoes); 
      } catch (err) {
        console.error("Lỗi tải trạng thái điểm danh:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCheckInStatus();
  }, [onTomatoesUpdate]); 

  const handleCheckIn = async () => {
    if (checkInData.today_checked_in) return; 
    
    try {
      const todayString = today.toISOString().split('T')[0];
      const data = await workspaceService.performCheckIn(todayString);

      alert(data.message); 
      setCheckInData({
        checked_in_dates: [...checkInData.checked_in_dates, data.checked_in_date],
        today_checked_in: true,
        total_tomatoes: data.total_tomatoes
      });
      if (onTomatoesUpdate) onTomatoesUpdate(data.total_tomatoes); 
    } catch (err) {
      console.error("Lỗi khi điểm danh:", err);
      alert(err.response?.data?.message || "Lỗi. Không thể điểm danh.");
    }
  };
  
  return (
    <div className="stat-card check-in-card"> 
      <div className="stat-header">
        <div className="stat-icon check-in-icon"><BsCalendarCheck /></div>
        <span className="stat-label">ĐIỂM DANH TUẦN</span>
      </div>
      <div className="stat-content">
        {loading ? (
          <div className="spinner-small" style={{margin: '20px auto'}}></div>
        ) : (
          <>
            <div className="week-days-grid">
              {weekDays.map((day, index) => {
                const dayString = day.toISOString().split('T')[0];
                const isChecked = checkInData.checked_in_dates.includes(dayString);
                const isToday = day.getTime() === today.getTime();
                
                let dayLabel = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"][index] || "";
                
                return (
                  <div key={index} className={`day-circle ${isChecked ? 'checked' : ''} ${isToday ? 'today' : ''}`}>
                    <span>{dayLabel}</span>
                    <div className="day-dot">{isChecked ? <BsCheck /> : null}</div>
                  </div>
                );
              })}
            </div>
            <button className="check-in-btn" onClick={handleCheckIn} disabled={checkInData.today_checked_in}>
              {checkInData.today_checked_in ? "Đã điểm danh hôm nay" : "Điểm danh (+2 🍅)"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};


// ================= MAIN COMPONENT =================

const Dashboard = () => {
  const { t, i18n } = useTranslation(); 
  const navigate = useNavigate(); 
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [userInfo, setUserInfo] = useState({
    username: "User",
    tomatoes: 0,
    equipped_frame_url: null,
    equipped_title: null,
    equipped_name_color: null
  });

  const [loadingTasks, setLoadingTasks] = useState(true);
  const [taskGroups, setTaskGroups] = useState({ overdue: [], today: [], upcoming: [] });
  const [taskStats, setTaskStats] = useState({ today_total: 0, today_completed: 0 });
  
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMyTasksModal, setShowMyTasksModal] = useState(false);
  const [showShop, setShowShop] = useState(false); 

  useEffect(() => {
    try {
      const userString = localStorage.getItem("user");
      if (userString) {
        const userData = JSON.parse(userString);
        setUserInfo(prev => ({ ...prev, ...userData }));
      }
    } catch (e) { console.error(e); }
    
    const fetchMyTasks = async () => {
      try {
        setLoadingTasks(true);
        const data = await workspaceService.getMyTasks();
        setTaskGroups({
            overdue: data.overdue || [],
            today: data.today || [],
            upcoming: data.upcoming || []
        });
        setTaskStats(data.stats || { today_total: 0, today_completed: 0 });
      } catch (err) { console.error(err); } finally { setLoadingTasks(false); }
    };
    fetchMyTasks();
  }, []);
  
  // --- FIX CHÍNH 1: Sử dụng useCallback để tránh Loop ---
  const handleTomatoesUpdate = useCallback((newTotal) => {
      setUserInfo(prev => ({ ...prev, tomatoes: newTotal }));
  }, []);

  const handleUpdateUser = (updates) => {
      setUserInfo(prev => {
          const newUserInfo = { ...prev, ...updates };
          localStorage.setItem("user", JSON.stringify(newUserInfo));
          return newUserInfo;
      });
  };
  
  const totalIncompleteTasks = taskGroups.overdue.length + taskGroups.today.length + taskGroups.upcoming.length;
  const recentActivities = [
    { id: 1, text: 'Hoàn thành 4 Pomodoro sessions', time: '10 phút trước', icon: '✅' },
    { id: 2, text: 'Tham gia Study Room "Web Dev"', time: '1 giờ trước', icon: '📚' },
    { id: 3, text: 'Đạt mốc 7 ngày học liên tục', time: '2 giờ trước', icon: '🔥' },
  ];
  const todayCompletionRate = taskStats.today_total > 0 ? Math.round((taskStats.today_completed / taskStats.today_total) * 100) : 0;
  const weeklyProgress = Math.round((28 / 40) * 100); 

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1 className="welcome-title">
            {t('dashboard.welcome', { username: userInfo.username })} 
            {userInfo.equipped_title && <span className="user-title-badge">{userInfo.equipped_title}</span>}
          </h1>
          <p className="welcome-subtitle">{t('dashboard.quote')}</p>
        </div>
        
        <button 
            className="action-btn" 
            onClick={() => setShowShop(true)}
            style={{marginRight: '15px', padding: '10px 15px', background: 'linear-gradient(135deg, #FF6347, #FF4500)', color: 'white', border: 'none'}}
        >
            <IoStorefront style={{marginRight:'5px'}}/> Cửa hàng
        </button>

        <div className="tomato-counter">
          <span className="tomato-icon">🍅</span>
          <span className="tomato-value">{userInfo.tomatoes}</span>
        </div>
        
        <div className="date-info">
          <BsCalendar3 className="calendar-icon" />
          <span>{currentTime.toLocaleDateString(i18n.language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card tasks-card">
          <div className="stat-header">
            <div className="stat-icon tasks-icon"><BsCheckCircleFill /></div>
            <span className="stat-label">{t('dashboard.statToday')}</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{taskStats.today_total} Tasks</div> 
            <div className="progress-bar" style={{ height: '8px', width: '100%', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden', margin: '8px 0' }}>
              <div className="progress-fill tasks-progress" style={{ width: `${todayCompletionRate}%`, height: '100%', backgroundColor: 'var(--primary-color)', borderRadius: '4px', transition: 'width 0.5s ease-out' }}></div>
            </div>
            <span className="stat-subtitle">{todayCompletionRate}% Hoàn thành</span>
          </div>
        </div>

        {/* Truyền handleTomatoesUpdate đã được useCallback */}
        <WeeklyCheckIn onTomatoesUpdate={handleTomatoesUpdate} />
        
        <div className="stat-card pomodoro-card">
          <div className="stat-header">
            <div className="stat-icon pomodoro-icon"><BsClock /></div>
            <span className="stat-label">{t('dashboard.statPomodoro')}</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{t('dashboard.pomoSessions', { count: 8 })}</div>
            <div className="pomodoro-time">
              <IoFlash className="flash-icon" />
              <span>{t('dashboard.pomoMinutes', { minutes: 8 * 25 })}</span>
            </div>
            <span className="stat-subtitle">{t('dashboard.pomoTomatoes', { count: 8 * 2 })}</span>
          </div>
        </div>
        <div className="stat-card goal-card">
          <div className="stat-header">
            <div className="stat-icon goal-icon"><BsTrophy /></div>
            <span className="stat-label">{t('dashboard.statGoal')}</span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{t('dashboard.goalHours', { current: 28, goal: 40 })}</div>
            <div className="progress-bar" style={{ height: '8px', width: '100%', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden', margin: '8px 0' }}>
              <div className="progress-fill goal-progress" style={{ width: `${weeklyProgress}%`, height: '100%', background: 'linear-gradient(90deg, #34d399, #10b981)', borderRadius: '4px', transition: 'width 0.5s ease-out' }}></div>
            </div>
            <span className="stat-subtitle">{t('dashboard.goalPercent', { rate: weeklyProgress })}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="content-grid">
        <div className="content-card tasks-list-card">
          <div className="card-header">
            <h3 className="card-title"><IoTrendingUp className="title-icon" /> Công việc của tôi</h3>
            <button className="view-all-btn" onClick={() => setShowMyTasksModal(true)}>{t('dashboard.viewAll')}</button>
          </div>
          
          {loadingTasks ? <div className="empty-tasks"><div className="spinner-small"></div></div> : (
            <div className="tasks-list">
              {taskGroups.overdue.length > 0 && (
                <div className="task-group">
                  <h4 className="task-group-title overdue"><BsExclamationTriangleFill /> {t('myTasks.overdue', 'Quá hạn')} ({taskGroups.overdue.length})</h4>
                  {taskGroups.overdue.slice(0, 3).map(task => <TaskItem key={task.id} task={task} navigate={navigate} setShowMyTasksModal={setShowMyTasksModal} t={t} />)}
                </div>
              )}
              {taskGroups.today.length > 0 && (
                <div className="task-group">
                  <h4 className="task-group-title today">{t('myTasks.today', 'Hôm nay')} ({taskGroups.today.length})</h4>
                  {taskGroups.today.slice(0, 3).map(task => <TaskItem key={task.id} task={task} navigate={navigate} setShowMyTasksModal={setShowMyTasksModal} t={t} />)}
                </div>
              )}
              {totalIncompleteTasks === 0 && <div className="empty-tasks"><p>{t('dashboard.noTasks')}</p></div>}
            </div>
          )}
          <button className="add-task-btn" onClick={() => navigate('/app/tasks')}><BsPlus className="plus-icon" /> {t('dashboard.addTask')}</button>
        </div>

        <div className="content-card activities-card">
          <div className="card-header"><h3 className="card-title"><IoFlash className="title-icon" /> {t('dashboard.recentActivity')}</h3></div>
          <div className="activities-list">
            {recentActivities.map(activity => (
              <div key={activity.id} className="activity-item">
                <div className="activity-icon">{activity.icon}</div>
                <div className="activity-info"><p className="activity-text">{activity.text}</p><span className="activity-time">{activity.time}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      Quick Actions
      {/* <div className="quick-actions">
         <h3 className="section-title">Truy cập nhanh</h3>
         <div className="actions-grid">
            <div className="action-btn pomodoro-action" onClick={() => navigate('/app/pomodoro')}>
                <BsClock className="action-icon" /> <span>Pomodoro Timer</span>
            </div>
            <div className="action-btn task-action" onClick={() => navigate('/app/tasks')}>
                <BsCheckCircleFill className="action-icon" /> <span>Tạo công việc mới</span>
            </div>
            <div className="action-btn study-action" onClick={() => navigate('/app/study-room')}>
                <IoStorefront className="action-icon" /> <span>Phòng học nhóm</span>
            </div>
            <div className="action-btn ai-action" onClick={() => navigate('/app/ai-chat')}>
                <IoFlash className="action-icon" /> <span>Hỏi MiMi AI</span>
            </div>
         </div>
      </div> */}

      {showTaskModal && <div className="modal-overlay" onClick={() => setShowTaskModal(false)}></div>}
      
      {/* --- FIX CHÍNH 2: Render Modal bên ngoài --- */}
      {showMyTasksModal && (
        <MyTasksModal 
            setShowMyTasksModal={setShowMyTasksModal}
            loadingTasks={loadingTasks}
            taskGroups={taskGroups}
            totalIncompleteTasks={totalIncompleteTasks}
            t={t}
            navigate={navigate}
        />
      )}
      
      {showShop && (
        <ShopModal onClose={() => setShowShop(false)} userInfo={userInfo} onUpdateUser={handleUpdateUser}/>
      )}
    </div>
  );
};

export default Dashboard;