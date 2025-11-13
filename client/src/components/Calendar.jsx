import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar as BigCalendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './Calendar.css'; 
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs';

// Cấu hình moment
import 'moment/locale/vi';
moment.locale('vi');
const localizer = momentLocalizer(moment);

// ⚠️ ĐÃ SỬA: Định nghĩa API_BASE từ biến môi trường
const API_BASE = import.meta.env.VITE_BACKEND_URL || '';

// Lấy user ID
const getUserId = () => {
    try {
        const u = localStorage.getItem("user");
        return u ? JSON.parse(u)?.user_id : null;
    } catch (e) {
        console.error("Lỗi lấy user ID:", e); return null;
    }
};

// --- COMPONENT TÙY CHỈNH CHO TASK CARD ---
const CustomEvent = ({ event }) => {
  const formatTime = (time) => moment(time).format('HH:mm');
  const eventTypeClass = event.className || 'event-default';

  return (
    <div className={`custom-event-wrapper ${eventTypeClass}`}>
      <div className="custom-event-time">
        {`${formatTime(event.start)} - ${formatTime(event.end)}`}
      </div>
      <div className="custom-event-title">
        {event.title}
      </div>
      <div className="custom-event-avatars">
        <span>👤</span>
      </div>
    </div>
  );
};

// --- COMPONENT CHO MODAL SỰ KIỆN ---
const EventModal = ({ event, onClose, onSave, onDelete }) => {
  const [title, setTitle] = useState(event?.title || '');
  const [startTime, setStartTime] = useState(event?.start ? moment(event.start).format('YYYY-MM-DDTHH:mm') : moment().format('YYYY-MM-DDTHH:mm'));
  const [endTime, setEndTime] = useState(event?.end ? moment(event.end).format('YYYY-MM-DDTHH:mm') : moment().add(1, 'hour').format('YYYY-MM-DDTHH:mm'));
  const [description, setDescription] = useState(event?.description || '');
  const [color, setColor] = useState(event?.color || 'default'); 
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isNewEvent = !event?.id && !event?.event_id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (moment(endTime).isBefore(moment(startTime))) {
        alert("Thời gian kết thúc không thể trước thời gian bắt đầu!");
        return;
    }
    setIsSaving(true);
    const eventData = {
      ...event,
      title,
      start: new Date(startTime),
      end: new Date(endTime),
      description,
      color: color, 
      user_id: getUserId()
    };
    try {
      await onSave(eventData);
    } catch (error) {
       alert(`Lỗi lưu sự kiện: ${error.message}`);
       setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isNewEvent || !window.confirm(`Bạn có chắc muốn xóa sự kiện "${event.title}"?`)) {
      return;
    }
    setIsDeleting(true);
     try {
        await onDelete(event.event_id || event.id);
     } catch (error) {
        alert(`Lỗi xóa sự kiện: ${error.message}`);
        setIsDeleting(false);
     }
  };

  return (
    <div className="event-modal-overlay" onClick={onClose}>
      <div className="event-modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{isNewEvent ? 'Tạo sự kiện mới' : 'Chi tiết sự kiện'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="event-title">Tiêu đề:</label>
            <input id="event-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Thêm tiêu đề..." />
          </div>
          <div className="form-group time-group">
             <div>
                <label htmlFor="event-start">Bắt đầu:</label>
                <input id="event-start" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
             </div>
             <div>
                <label htmlFor="event-end">Kết thúc:</label>
                <input id="event-end" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
             </div>
          </div>
          <div className="form-group">
            <label htmlFor="event-description">Nội dung:</label>
            <textarea id="event-description" value={description} onChange={(e) => setDescription(e.target.value)} rows="3" placeholder="Thêm mô tả..." ></textarea>
          </div>
          <div className="form-group">
              <label htmlFor="event-color">Màu sắc:</label>
              <select id="event-color" value={color} onChange={(e) => setColor(e.target.value)}>
                  <option value="default">Mặc định (Xanh dương)</option>
                  <option value="green">Xanh lá</option>
                  <option value="orange">Cam</option>
                  <option value="yellow">Vàng</option>
                  <option value="purple">Tím</option>
                  <option value="pink">Hồng</option>
                  <option value="blue">Xanh dương nhạt</option>
              </select>
          </div>
          <div className="modal-actions">
            {!isNewEvent && ( <button type="button" className="delete-btn" onClick={handleDelete} disabled={isDeleting || isSaving}> {isDeleting ? 'Đang xóa...' : 'Xóa'} </button> )}
            <button type="button" onClick={onClose} disabled={isSaving || isDeleting}>Hủy</button>
            <button type="submit" className="save-btn" disabled={isSaving || isDeleting}> {isSaving ? 'Đang lưu...' : (isNewEvent ? 'Tạo' : 'Lưu thay đổi')} </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// --- COMPONENT LỊCH CHÍNH ---
const MyCalendar = () => {
  const [events, setEvents] = useState([]);
  const [currentView, setCurrentView] = useState(Views.WEEK);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // --- Hàm gọi API ---
  const fetchEvents = useCallback(async (start, end) => {
    const userId = getUserId();
    if (!userId) {
      setError("Chưa đăng nhập");
      setEvents([]);
      return;
    }
    setLoading(true);
    setError(null); 
    try {
      const startISO = start.toISOString();
      const endISO = end.toISOString();

      console.log(`[API Call] Fetching events for user ${userId} from ${startISO} to ${endISO}`);
      
      // ⚠️ ĐÃ SỬA: Sử dụng API_BASE
      const response = await fetch(`${API_BASE}/api/calendar/events?userId=${userId}&start=${startISO}&end=${endISO}`);

      if (!response.ok) {
        let errorMsg = `Lỗi HTTP: ${response.status}`;
        try {
            const errData = await response.json();
            errorMsg = errData.message || errorMsg;
        } catch (parseError) {
             console.error("Response was not JSON:", parseError);
             try {
                const textError = await response.text();
                if (textError.toLowerCase().includes('<!doctype html')) {
                    errorMsg += " (Server returned HTML error page)";
                } else {
                    errorMsg += `: ${textError.substring(0, 100)}...`; 
                }
             } catch {}
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      console.log("[API Response] Events received:", data);

      const formattedEvents = data.map(ev => ({
        ...ev,
        id: ev.event_id || ev.id,
        title: ev.title,
        start: new Date(ev.start), 
        end: new Date(ev.end),     
        description: ev.description,
        type: ev.color || ev.type || 'default', 
        color: ev.color || 'default', 
      }));
      setEvents(formattedEvents);

    } catch (err) {
      console.error("Lỗi fetch sự kiện:", err);
      setError(`Không thể tải sự kiện: ${err.message}.`); 
      setEvents([]); 
    } finally {
      setLoading(false);
    }
  }, []); 

  useEffect(() => {
    const { start, end } = getRange(currentDate, currentView);
    fetchEvents(start, end);
  }, [currentDate, currentView, fetchEvents]);

  const handleSelectSlot = useCallback(({ start, end }) => {
    setSelectedEvent({ start, end });
    setIsModalOpen(true);
  }, []);

  const handleSelectEvent = useCallback((event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  }, []);

  const handleNavigate = useCallback((action) => {
      let newDate = currentDate;
      let unit = 'day';
      if(currentView === Views.WEEK) unit = 'week';
      if(currentView === Views.MONTH) unit = 'month';
      if (action === 'PREV') newDate = moment(currentDate).subtract(1, unit).toDate();
      else if (action === 'NEXT') newDate = moment(currentDate).add(1, unit).toDate();
      else if (action === 'TODAY') newDate = new Date();
      setCurrentDate(newDate);
  }, [currentDate, currentView]);

  const handleViewChange = useCallback((newView) => { setCurrentView(newView); }, []);

  const eventPropGetter = useCallback((event) => {
      const eventType = event.type || event.color || 'default'; 
      return { className: `event-${eventType}` };
  }, []);

  // --- HÀM XỬ LÝ LƯU SỰ KIỆN (GỌI API) ---
  const handleSaveEvent = useCallback(async (eventData) => {
    const isNew = !eventData.id && !eventData.event_id;
    
    // ⚠️ ĐÃ SỬA: Sử dụng API_BASE
    const url = isNew 
        ? `${API_BASE}/api/calendar/events` 
        : `${API_BASE}/api/calendar/events/${eventData.event_id || eventData.id}`;
    
    const method = isNew ? 'POST' : 'PUT';

    console.log(`[API Call] ${method} ${url}`, eventData);
    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                user_id: eventData.user_id,
                title: eventData.title,
                description: eventData.description,
                start_time: eventData.start.toISOString(), 
                end_time: eventData.end.toISOString(),     
                color: eventData.color 
            }),
        });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || `HTTP error ${response.status}`);
        }
        console.log("[API Response] Save successful");
        setIsModalOpen(false);
        setSelectedEvent(null);
        const { start, end } = getRange(currentDate, currentView);
        fetchEvents(start, end); 

    } catch (error) {
        console.error("Lỗi lưu sự kiện:", error);
        throw error; 
    }
  }, [currentDate, currentView, fetchEvents]);

  // --- HÀM XỬ LÝ XÓA SỰ KIỆN (GỌI API) ---
  const handleDeleteEvent = useCallback(async (eventId) => {
    const userId = getUserId();
    if (!eventId || !userId) {
        console.error("Missing eventId or userId for deletion");
        throw new Error("Không thể xác định sự kiện hoặc người dùng để xóa.");
    };

    // ⚠️ ĐÃ SỬA: Sử dụng API_BASE
    const url = `${API_BASE}/api/calendar/events/${eventId}?userId=${userId}`;

    console.log(`[API Call] DELETE ${url}`);
    try {
        const response = await fetch(url, { method: 'DELETE' });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || `HTTP error ${response.status}`);
        }
        console.log("[API Response] Delete successful");
        setIsModalOpen(false);
        setSelectedEvent(null);
        const { start, end } = getRange(currentDate, currentView);
        fetchEvents(start, end); 

    } catch (error) {
        console.error("Lỗi xóa sự kiện:", error);
        throw error; 
    }
  }, [currentDate, currentView, fetchEvents]);

  const DateDisplayLabel = useMemo(() => {
    if (currentView === Views.MONTH) return moment(currentDate).format('MMMM, YYYY');
    if (currentView === Views.WEEK) {
        const start = moment(currentDate).startOf('week').format('D');
        const end = moment(currentDate).endOf('week').format('D MMMM, YYYY');
        return `${start} - ${end}`;
    }
    if (currentView === Views.DAY) return moment(currentDate).format('dddd, D MMMM, YYYY');
    return moment(currentDate).format('MMMM, YYYY');
  }, [currentDate, currentView]);

  return (
    <div className="calendar-container">
      <div className="calendar-header">
          <div className="header-left">
              <button className="nav-today-btn" onClick={() => handleNavigate('TODAY')}>Hôm nay</button>
              <div className="nav-buttons">
                  <button title="Trước" onClick={() => handleNavigate('PREV')}><BsChevronLeft /></button>
                  <button title="Sau" onClick={() => handleNavigate('NEXT')}><BsChevronRight /></button>
              </div>
              <span className="date-display-label">{DateDisplayLabel}</span>
          </div>
          <div className="header-right">
              <div className="view-tabs">
                  <button className={currentView === Views.DAY ? 'active' : ''} onClick={() => handleViewChange(Views.DAY)}>Ngày</button>
                  <button className={currentView === Views.WEEK ? 'active' : ''} onClick={() => handleViewChange(Views.WEEK)}>Tuần</button>
                  <button className={currentView === Views.MONTH ? 'active' : ''} onClick={() => handleViewChange(Views.MONTH)}>Tháng</button>
              </div>
              <button
                  className="create-btn"
                  onClick={() => {
                      const defaultStart = moment().add(1, 'hour').startOf('hour');
                      setSelectedEvent({ start: defaultStart.toDate(), end: defaultStart.add(1, 'hour').toDate() });
                      setIsModalOpen(true);
                  }}
              >
                  Tạo sự kiện
              </button>
          </div>
      </div>

      <div className="calendar-content">
        {loading && <p className="loading-text">Đang tải...</p>}
        {!loading && error && <p className="error-text">{error}</p>}

        <BigCalendar
          localizer={localizer}
          events={events} 
          startAccessor="start"
          endAccessor="end"
          style={{ flex: 1 }}

          toolbar={false}
          view={currentView}
          date={currentDate}

          onNavigate={() => {}} 
          onView={() => {}}   

          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable

          components={{
            event: CustomEvent,
            week: { header: CustomWeekHeader },
            day: { header: CustomWeekHeader }
          }}
          eventPropGetter={eventPropGetter}

          timeslots={1}
          step={60}
          min={moment().hour(4).minute(0).toDate()}
          max={moment().hour(22).minute(0).toDate()}

          messages={{
                next: "Sau", previous: "Trước", today: "Hôm nay",
                month: "Tháng", week: "Tuần", day: "Ngày", agenda: "Lịch trình",
                date: "Ngày", time: "Giờ", event: "Sự kiện",
                noEventsInRange: "Không có sự kiện nào trong khoảng này.",
                showMore: total => `+ ${total} thêm`
          }}
        />
      </div>

      {isModalOpen && (
        <EventModal
          event={selectedEvent}
          onClose={() => { setIsModalOpen(false); setSelectedEvent(null); }}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
        />
      )}

    </div>
  );
}; 

const CustomWeekHeader = ({ label, date }) => (
    <div className="custom-week-header">
        <span className="day-name">{moment(date).format('ddd').toUpperCase()}</span>
        <span className="day-number">{moment(date).format('DD')}</span>
    </div>
);

const getRange = (date, view) => {
    if (view === Views.MONTH) {
        const startOfMonth = moment(date).startOf('month');
        const endOfMonth = moment(date).endOf('month');
        return { start: startOfMonth.startOf('week').toDate(), end: endOfMonth.endOf('week').toDate() };
    }
    if (view === Views.WEEK) {
        return { start: moment(date).startOf('week').toDate(), end: moment(date).endOf('week').toDate() };
    }
    return { start: moment(date).startOf('day').toDate(), end: moment(date).endOf('day').toDate() };
};

export default MyCalendar;
