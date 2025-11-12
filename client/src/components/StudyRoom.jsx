// src/components/StudyRoom.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import {
  BsPlayFill, BsPauseFill, BsStopFill, BsMicFill, BsMicMuteFill,
  BsPersonBadge, BsXCircle, BsCheckCircleFill, BsCircle, BsGearFill,
  BsHandThumbsUpFill, BsClockHistory
} from 'react-icons/bs';
import { IoClose } from 'react-icons/io5';
import './StudyRoom.css';
import { workspaceService } from '../services/workspaceService';
import avt from "../assets/Trangchu/avt.png";

// ---------- CONFIG & SOCKET ----------
const SOCKET_SERVER_URL = import.meta.env.VITE_API_URL_BASE || 'http://localhost:5000';
const peerConnectionConfig = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]
};
const socket = io(SOCKET_SERVER_URL, { transports: ['websocket', 'polling'], autoConnect: true });

// ---------- HELPER FUNCTIONS ----------
const getUserId = () => { try { const u = localStorage.getItem("user"); return u ? JSON.parse(u)?.user_id : null; } catch (e) { return null; } };
const formatTime = (secondsValue) => { const mins = String(Math.floor(secondsValue / 60)).padStart(2, '0'); const secs = String(secondsValue % 60).padStart(2, '0'); return `${mins}:${secs}`; };
const playAlarm = () => { try { new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg").play().catch(() => { }); } catch { } };
const getCurrentTimeString = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// ---------- TIMER DISPLAY COMPONENT ----------
const TimerDisplay = ({ mode, duration, timeLeft, isRunning, cycle, onStartPause, onReset, isConnected, isHost, onOpenSettings }) => {
  const modeDisplay = (mode, cycle) => {
    switch (mode) {
      case 'focus': return `Tập trung (Vòng ${cycle})`;
      case 'shortBreak': return 'Nghỉ ngắn';
      case 'longBreak': return 'Nghỉ dài';
      default: return 'Focus';
    }
  };

  return (
    <div className="pomodoro-display-wrapper">
      <div className="pomodoro-tomato-bg">
        <div className="pomodoro-digital-time">
          <h2>{formatTime(timeLeft)}</h2>
        </div>
      </div>
      <p className="pomodoro-mode-display">{modeDisplay(mode, cycle)}</p>

      <div className="pomodoro-controls">
        <button
          onClick={onStartPause}
          className="main-btn"
          title={isRunning ? 'Tạm dừng' : 'Bắt đầu'}
          disabled={!isConnected || timeLeft <= 0 || !isHost}
        >
          {isRunning ? <BsPauseFill /> : <BsPlayFill />}
        </button>
        <button
          onClick={onReset}
          title="Dừng & Reset"
          disabled={!isConnected || !isHost}
          className="side-btn"
        >
          <BsStopFill />
        </button>
        {isHost && (
          <button onClick={onOpenSettings} className="side-btn" title="Cài đặt Timer">
            <BsGearFill />
          </button>
        )}
      </div>
    </div>
  );
};

// ---------- MAIN COMPONENT ----------
const StudyRoom = () => {
  // State cơ bản
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isInRoom, setIsInRoom] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [userInfo, setUserInfo] = useState({ user_id: null, username: 'Guest', avatar_url: null });
  const [usersInRoom, setUsersInRoom] = useState({});
  const [isPrivateRoom, setIsPrivateRoom] = useState(false);
  const [serverError, setServerError] = useState('');

  // State Timer & Nâng cấp
  const [timerState, setTimerState] = useState({ mode: 'focus', duration: 25 * 60, timeLeft: 25 * 60, isRunning: false, cycle: 1 });
  const [roomSettings, setRoomSettings] = useState({ focus: 25, shortBreak: 5, longBreak: 15 });
  const [roomStats, setRoomStats] = useState({ total_cycles: 0 });
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showReadyCheck, setShowReadyCheck] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [readyCount, setReadyCount] = useState({ ready: 0, total: 0 });
  const [showRewardPopup, setShowRewardPopup] = useState(false); // <-- MỚI: Popup thưởng

  // Chat & History
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const chatMessagesEndRef = useRef(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [studyRoomHistory, setStudyRoomHistory] = useState([]);
  const [studyRoomHistoryLoading, setStudyRoomHistoryLoading] = useState(true);

  // Task & Modals
  const [roomTask, setRoomTask] = useState({ task_id: null, task_title: null, subtasks: [] });
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalTaskGroups, setModalTaskGroups] = useState({ personal_tasks: [], workspace_tasks: [] });

  // Refs & Audio
  const [hostUserId, setHostUserId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const audioRefs = useRef({});
  const roomIdInputRef = useRef(null);
  const usernameInputRef = useRef(null);
  const secretInputRef = useRef(null);

  // --- EFFECTS ---
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUserInfo({
          user_id: parsed.user_id,
          username: parsed.username,
          avatar_url: parsed.avatar_url
        });
        if (parsed.user_id) fetchStudyRoomHistory();
      } catch { }
    } else {
      setStudyRoomHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsHost(userInfo.user_id != null && userInfo.user_id === hostUserId);
  }, [userInfo, hostUserId]);

  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const addSystemMessage = useCallback((text) => {
    setChatMessages(prev => [...prev, { type: 'system', text, time: getCurrentTimeString(), id: `${Date.now()}-${Math.random()}` }]);
  }, []);

  // --- API CALLS ---
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await workspaceService.getPomodoroHistory();
      setHistory(data);
    } catch (err) { console.error(err); } finally { setHistoryLoading(false); }
  };

  const fetchStudyRoomHistory = async () => {
    setStudyRoomHistoryLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) { setStudyRoomHistoryLoading(false); return; }
      const response = await fetch(`${SOCKET_SERVER_URL}/api/me/study-room-history`, {
        method: 'GET', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) setStudyRoomHistory(await response.json());
    } catch (err) { console.error(err); } finally { setStudyRoomHistoryLoading(false); }
  };

  // --- SOCKET HANDLERS ---
  useEffect(() => {
    const handleConnect = () => { setIsConnected(true); setServerError(''); };
    const handleDisconnect = () => { setIsConnected(false); setIsInRoom(false); };

    const handleRoomJoined = (data) => {
      setIsInRoom(true); setRoomId(data.room_id); setIsPrivateRoom(data.is_private);
      setUsersInRoom(data.users);
      setHostUserId(data.host_user_id);
      setTimerState(data.timer_state);
      setRoomSettings(data.room_settings || { focus: 25, shortBreak: 5, longBreak: 15 });
      setRoomStats(data.room_stats || { total_cycles: 0 });
      setRoomTask(data.current_task || { task_id: null, task_title: null, subtasks: [] });
      addSystemMessage(`Đã vào phòng ${data.room_id}.`);
      socket.emit('ready', { room_id: data.room_id, username: userInfo.username });
    };

    const handleUserJoined = (data) => {
      if (data.sid !== socket.id) {
        setUsersInRoom(prev => ({ ...prev, [data.sid]: data.user_info }));
        addSystemMessage(`${data.user_info.username} đã vào phòng.`);
      }
    };

    const handleUserLeft = (data) => {
      setUsersInRoom(prev => { const next = { ...prev }; delete next[data.sid]; return next; });
      addSystemMessage(`${data.username || 'Ai đó'} đã rời phòng.`);
    };

    const handleTimerUpdate = (data) => {
      setTimerState(data);
      if (data.timeLeft === 0 && !data.isRunning) playAlarm();
      if (data.isRunning) { setShowReadyCheck(false); setIsReady(false); }
    };

    const handleErrorEvent = (err) => {
      console.error('Socket error:', err);
      setServerError(err?.message || 'Lỗi server.');
      if (isInRoom) addSystemMessage(`⚠️ Lỗi: ${err?.message || 'Không rõ'}`);
    };

    // Logic Nâng cấp
    const handleShowReadyCheck = () => {
      setShowReadyCheck(true);
      setIsReady(false);
      setReadyCount({ ready: 0, total: 0 });
      addSystemMessage("Đã hết giờ nghỉ! Vui lòng xác nhận sẵn sàng.");
    };

    const handleReadyUpdate = (data) => {
      setReadyCount({ ready: data.ready_count, total: data.total_users });
    };

    const handleSettingsUpdated = (newSettings) => {
      setRoomSettings(newSettings);
      addSystemMessage(`Cài đặt phòng đã cập nhật: Focus ${newSettings.focus}p, Nghỉ ngắn ${newSettings.shortBreak}p.`);
    };

    const handleStatsUpdated = (stats) => {
      setRoomStats(prev => ({ ...prev, ...stats }));
    };

    const handleRoomTaskUpdated = (data) => {
      setRoomTask(data);
      addSystemMessage(`Task chung: ${data.task_title}`);
    };

    const handleNewMessage = (data) => {
      setChatMessages(prev => [...prev, { type: 'chat', ...data, time: getCurrentTimeString(), id: `${Date.now()}-${Math.random()}` }]);
    };

    const handleUserKicked = (data) => {
      addSystemMessage(`${data.username} đã bị mời ra khỏi phòng.`);
      if (data.sid === socket.id) {
        alert("Bạn đã bị chủ phòng mời ra khỏi phòng.");
        handleLeaveRoom();
      } else {
        handleUserLeft(data);
      }
    };

    const handleNewHost = (data) => {
      setHostUserId(data.new_host_user_id);
      addSystemMessage("Quyền chủ phòng đã được chuyển.");
    };

    // <-- MỚI: Handle Tomato Reward
    const handleTomatoRewarded = () => {
      setShowRewardPopup(true);
      playAlarm();
      setTimeout(() => setShowRewardPopup(false), 5000);
    };

    // Đăng ký events
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('error', handleErrorEvent);
    socket.on('room_joined', handleRoomJoined);
    socket.on('user_joined', handleUserJoined);
    socket.on('user_left', handleUserLeft);
    socket.on('timer_update', handleTimerUpdate);
    socket.on('show_ready_check', handleShowReadyCheck);
    socket.on('ready_status_update', handleReadyUpdate);
    socket.on('room_settings_updated', handleSettingsUpdated);
    socket.on('room_stats_updated', handleStatsUpdated);
    socket.on('room_task_updated', handleRoomTaskUpdated);
    socket.on('new_message', handleNewMessage);
    socket.on('user_kicked', handleUserKicked);
    socket.on('new_host_assigned', handleNewHost);
    socket.on('tomato_rewarded', handleTomatoRewarded); // <-- Đăng ký

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('error', handleErrorEvent);
      socket.off('room_joined', handleRoomJoined);
      socket.off('user_joined', handleUserJoined);
      socket.off('user_left', handleUserLeft);
      socket.off('timer_update', handleTimerUpdate);
      socket.off('show_ready_check', handleShowReadyCheck);
      socket.off('ready_status_update', handleReadyUpdate);
      socket.off('room_settings_updated', handleSettingsUpdated);
      socket.off('room_stats_updated', handleStatsUpdated);
      socket.off('room_task_updated', handleRoomTaskUpdated);
      socket.off('new_message', handleNewMessage);
      socket.off('user_kicked', handleUserKicked);
      socket.off('new_host_assigned', handleNewHost);
      socket.off('tomato_rewarded', handleTomatoRewarded); // <-- Cleanup
    };
  }, [userInfo, isInRoom]);

  // --- ACTIONS ---
  const handleJoinRoom = () => {
    const rId = roomIdInputRef.current?.value?.trim();
    setServerError('');
    if (rId && userInfo.user_id) {
      socket.emit('join_room', {
        room_id: rId, username: userInfo.username,
        user_id: userInfo.user_id, avatar_url: userInfo.avatar_url,
        secret: secretInputRef.current?.value
      });
    } else {
      setServerError('Vui lòng nhập ID phòng.');
    }
  };

  const handleCreateRoom = () => {
    const rId = roomIdInputRef.current?.value?.trim();
    setServerError('');
    if (rId && userInfo.user_id) {
      socket.emit('create_room', {
        room_id: rId, username: userInfo.username,
        user_id: userInfo.user_id, avatar_url: userInfo.avatar_url,
        secret: secretInputRef.current?.value
      });
    } else {
      setServerError('Vui lòng nhập ID phòng.');
    }
  };

  const handleLeaveRoom = () => {
    if (roomId) socket.emit('leave_room', { room_id: roomId });
    setIsInRoom(false); setUsersInRoom({}); setChatMessages([]);
  };

  // Timer Controls
  const handleStart = () => socket.emit('start_timer', { room_id: roomId });
  const handlePause = () => socket.emit('pause_timer', { room_id: roomId });
  const handleReset = () => socket.emit('reset_timer', { room_id: roomId });

  // Settings & Ready
  const handleSaveSettings = () => {
    socket.emit('host_update_settings', { room_id: roomId, settings: roomSettings });
    setShowSettingsModal(false);
  };

  const handleReadyClick = () => {
    socket.emit('member_ready', { room_id: roomId });
    setIsReady(true);
  };

  // Task Management
  const handleOpenTaskModal = async () => {
    if (!isHost) return;
    setModalLoading(true); setShowTaskModal(true);
    try {
      const data = await workspaceService.getHostSelectableTasks();
      setModalTaskGroups(data);
    } catch (err) { console.error(err); } finally { setModalLoading(false); }
  };

  const handleSelectTask = (task) => {
    socket.emit('host_set_task', { room_id: roomId, task_id: task.id });
    setShowTaskModal(false);
  };

  const handleToggleSubtask = (subtaskId, currentChecked) => {
    socket.emit('member_check_subtask', { room_id: roomId, subtask_id: subtaskId, is_checked: !currentChecked });
  };

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      socket.emit('send_message', { room_id: roomId, message: chatInput.trim() });
      setChatInput('');
    }
  };

  const handleKickUser = (targetSid) => {
    if (!isHost) return;
    if (window.confirm(`Bạn có chắc muốn kick thành viên này?`)) {
      socket.emit('host_kick_user', { room_id: roomId, target_sid: targetSid });
    }
  };

  const handleTransferHost = (targetUserId) => {
    if (!isHost) return;
    if (window.confirm(`Bạn có chắc muốn chuyển quyền Host?`)) {
      socket.emit('host_transfer_host', { room_id: roomId, new_host_user_id: targetUserId });
    }
  };

  const handleHistoryRoomClick = (roomId) => {
    if (roomIdInputRef.current) {
      roomIdInputRef.current.value = roomId;
      roomIdInputRef.current.focus();
    }
  };

  // --- RENDER ---
  return (
    <div className="study-room-container">
      {!isInRoom ? (
        <div className="study-room-entry">
          <div className="entry-card">
            <h1>Study Room</h1>
            <p>Kết nối & Tập trung</p>
            {serverError && <p className="server-message entry-message">{serverError}</p>}

            <div className="entry-form-group"> <label>Tên hiển thị:</label> <input ref={usernameInputRef} type="text" defaultValue={userInfo.username} className="entry-input" /> </div>
            <div className="entry-form-group"> <label>ID Phòng:</label> <input ref={roomIdInputRef} type="text" placeholder="Nhập ID phòng..." className="entry-input" /> </div>
            <div className="entry-form-group"> <label>Mật khẩu (tùy chọn):</label> <input ref={secretInputRef} type="password" placeholder="Để trống nếu công khai" className="entry-input" /> </div>

            <div className="entry-button-group">
              <button onClick={handleJoinRoom} className="entry-btn join-btn">Tham gia</button>
              <button onClick={handleCreateRoom} className="entry-btn create-btn">Tạo phòng</button>
            </div>
          </div>

          {/* Lịch sử phòng */}
          <div className="recent-rooms-card">
            <h3>Phòng đã vào gần đây</h3>
            {studyRoomHistoryLoading ? <p>Đang tải...</p> : (
              <ul className="recent-rooms-list">
                {studyRoomHistory.map(r => (
                  <li key={r.room_id} onClick={() => handleHistoryRoomClick(r.room_id)}>
                    <span className="room-name">{r.room_name}</span>
                    <span className="room-id">{r.room_id}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="study-room-main-interface">
          {/* --- LEFT PANEL --- */}
          <div className="left-panel">
            <div className="room-info">
              <h2>Phòng: {roomId} {isPrivateRoom && '🔒'}</h2>
              <p>🔥 Đã hoàn thành: <strong>{roomStats.total_cycles}</strong> chu kỳ</p>
            </div>

            <TimerDisplay
              {...timerState}
              isConnected={isConnected}
              isHost={isHost}
              onStartPause={() => timerState.isRunning ? handlePause() : handleStart()}
              onReset={handleReset}
              onOpenSettings={() => setShowSettingsModal(true)}
            />

            {/* --- READY CHECK UI --- */}
            {showReadyCheck && (
              <div className="ready-check-ui">
                <h4>⏰ Đã hết giờ nghỉ!</h4>
                {isHost ? (
                  <div style={{ fontSize: '0.9rem', color: '#059669' }}>
                    Thành viên sẵn sàng: <strong>{readyCount.ready} / {readyCount.total}</strong>
                    <br /><span style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>Hãy bấm Start khi mọi người đã đủ</span>
                  </div>
                ) : !isReady ? (
                  <button onClick={handleReadyClick}>
                    <BsHandThumbsUpFill /> Tôi đã sẵn sàng
                  </button>
                ) : (
                  <p style={{ color: '#059669', fontWeight: '500', margin: 0 }}>✅ Đã sẵn sàng! Đợi chủ phòng...</p>
                )}
              </div>
            )}

            {/* Task Panel */}
            <div className="task-panel panel">
              <div className="task-panel-header">
                <h3>Công việc chung</h3>
                {isHost && <button className="btn-secondary" onClick={handleOpenTaskModal}>Chọn Task</button>}
              </div>
              <div className="task-panel-body">
                {roomTask.task_id ? (
                  <>
                    <p className="current-task-title">{roomTask.task_title}</p>
                    <div className="subtask-list">
                      {roomTask.subtasks.map(st => (
                        <div key={st.id} className={`subtask-item ${st.is_checked ? 'checked' : ''}`} onClick={() => handleToggleSubtask(st.id, st.is_checked)}>
                          <span className="subtask-checkbox">{st.is_checked ? <BsCheckCircleFill /> : <BsCircle />}</span>
                          <span className="subtask-title">{st.title}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <p className="no-task-selected">Chủ phòng chưa chọn công việc.</p>}
              </div>
            </div>

            {/* Member List */}
            <div className="member-list-section panel">
              <h3>Thành viên ({Object.keys(usersInRoom).length + 1})</h3>
              <ul className="member-list">
                <li className="member-item self">
                  <span className="member-avatar"><img src={userInfo.avatar_url || avt} alt="Me" /></span>
                  <span className="member-name">{userInfo.username} (Bạn)</span>
                  {isHost && <span className="host-badge">Host</span>}
                </li>
                {Object.entries(usersInRoom).map(([sid, u]) => (
                  <li key={sid} className="member-item">
                    <span className="member-avatar"><img src={u.avatar_url || avt} alt={u.username} /></span>
                    <span className="member-name">{u.username}</span>
                    {u.user_id === hostUserId && <span className="host-badge">Host</span>}
                    {isHost && (
                      <div className="member-actions">
                        <button className="member-action-btn kick" title="Kick" onClick={() => handleKickUser(sid)}><BsXCircle /></button>
                        <button className="member-action-btn transfer" title="Chuyển Host" onClick={() => handleTransferHost(u.user_id)}><BsPersonBadge /></button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* History Toggle */}
            <div className="history-panel-container panel">
              <button className="history-toggle-btn-room" onClick={() => { setShowHistory(!showHistory); if (!showHistory) fetchHistory(); }}>
                <BsClockHistory style={{ marginRight: '5px' }} /> {showHistory ? 'Ẩn Lịch sử' : 'Lịch sử Focus'}
              </button>
              {showHistory && (
                <div className="pomodoro-history-room">
                  {historyLoading && <p>Đang tải...</p>}
                  <ul>
                    {history.map(s => <li key={s.id}>{new Date(s.endTime).toLocaleString()} - {s.duration}p</li>)}
                  </ul>
                </div>
              )}
            </div>

            <button onClick={handleLeaveRoom} className="leave-btn danger">Rời phòng</button>
          </div>

          {/* --- RIGHT PANEL (CHAT) --- */}
          <div className="right-panel chat-panel">
            <h3>Trò chuyện</h3>
            <div className="chat-messages">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`message-item type-${msg.type} ${msg.sid === socket.id ? 'my-message' : ''}`}>
                  {msg.type === 'chat' && (
                    <>
                      <span className="message-avatar"><img src={msg.avatar_url || avt} alt="avatar" /></span>
                      <div className="message-content">
                        <span
                          className="message-sender"
                          style={{
                            color: msg.cosmetics?.name_color || 'var(--text-color)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          {msg.username}
                          {/* Hiển thị Danh hiệu nếu có */}
                          {msg.cosmetics?.title && (
                            <span style={{
                              fontSize: '0.7em',
                              background: 'linear-gradient(90deg, #FFD700, #FFA500)',
                              color: 'white',
                              padding: '1px 6px',
                              borderRadius: '10px',
                              verticalAlign: 'middle'
                            }}>
                              {msg.cosmetics.title}
                            </span>
                          )}
                        </span>
                        <p className="message-text">{msg.message}</p>
                        <span className="message-time">{msg.time}</span>
                      </div>
                    </>
                  )}
                  {msg.type === 'system' && <p className="system-text">{msg.text}</p>}
                </div>
              ))}
              <div ref={chatMessagesEndRef} />
            </div>
            <div className="chat-input-area">
              <input type="text" placeholder="Nhập tin nhắn..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} className="entry-input" />
              <button onClick={handleSendMessage} className="entry-btn join-btn" style={{ width: '80px', padding: '10px' }}>Gửi</button>
            </div>
          </div>
        </div>
      )}

      {/* --- SETTINGS MODAL --- */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="task-modal-content" onClick={e => e.stopPropagation()}>
            <div className="task-modal-header">
              <h3>Cài đặt Pomodoro</h3>
              <button className="close-modal-btn" onClick={() => setShowSettingsModal(false)}><IoClose /></button>
            </div>
            <div className="task-modal-list" style={{ padding: '24px' }}>
              <div className="entry-form-group">
                <label>⏱️ Thời gian tập trung (phút):</label>
                <input
                  type="number"
                  className="entry-input"
                  value={roomSettings.focus || ''}
                  onChange={e => setRoomSettings({ ...roomSettings, focus: e.target.value === '' ? '' : parseInt(e.target.value) })}
                />
              </div>
              <div className="entry-form-group">
                <label>☕ Nghỉ ngắn (phút):</label>
                <input
                  type="number"
                  className="entry-input"
                  value={roomSettings.shortBreak || ''}
                  onChange={e => setRoomSettings({ ...roomSettings, shortBreak: e.target.value === '' ? '' : parseInt(e.target.value) })}
                />
              </div>
              <div className="entry-form-group">
                <label>💤 Nghỉ dài (phút):</label>
                <input
                  type="number"
                  className="entry-input"
                  value={roomSettings.longBreak || ''}
                  onChange={e => setRoomSettings({ ...roomSettings, longBreak: e.target.value === '' ? '' : parseInt(e.target.value) })}
                />
              </div>
              <div className="modal-footer">
                <button className="btn-save" onClick={handleSaveSettings} style={{ width: '100%' }}>Lưu thay đổi</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TASK MODAL --- */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="task-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="task-modal-header">
              <h3>Chọn công việc cho phòng</h3>
              <button className="close-modal-btn" onClick={() => setShowTaskModal(false)}><IoClose /></button>
            </div>
            <div className="task-modal-list">
              {modalLoading ? <div className="loading-state">Loading...</div> : (
                <>
                  {modalTaskGroups.personal_tasks.length > 0 && (
                    <div className="task-group">
                      <h4>Việc cá nhân</h4>
                      {modalTaskGroups.personal_tasks.map(task => (
                        <div key={task.id} className="task-modal-item" onClick={() => handleSelectTask(task)}>
                          <span className="task-title">{task.title}</span>
                          <span className="task-origin">{task.workspace_name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {modalTaskGroups.workspace_tasks.map(workspace => (
                    workspace.cards.length > 0 && (
                      <div key={workspace.workspace_id} className="task-group">
                        <h4>{workspace.workspace_name}</h4>
                        {workspace.cards.map(card => (
                          <div key={card.id} className="task-modal-item" onClick={() => handleSelectTask(card)}>
                            <span className="task-title">{card.title}</span>
                          </div>
                        ))}
                      </div>
                    )
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- TOMATO REWARD POPUP (MỚI) --- */}
      {showRewardPopup && (
        <div className="reward-popup-overlay">
          <div className="reward-popup-content">
            <div className="reward-icon">🍅</div>
            <h3>Tuyệt vời!</h3>
            <p>Bạn đã hoàn thành phiên tập trung.</p>
            <div className="reward-badge">+1 Cà chua</div>
            <button onClick={() => setShowRewardPopup(false)}>Tuyệt!</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyRoom;