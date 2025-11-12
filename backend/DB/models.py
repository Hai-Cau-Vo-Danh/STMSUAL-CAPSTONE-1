from sqlalchemy import Column, Integer, BigInteger, String, Text, Boolean, DateTime, ForeignKey, TIMESTAMP, JSON, UniqueConstraint,Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from DB.database import Base
from sqlalchemy.sql.expression import text

class User(Base):
    __tablename__ = 'users'

    user_id = Column(BigInteger, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255))
    username = Column(String(100), unique=True, nullable=False)
    full_name = Column(String(255))
    avatar_url = Column(Text)
    auth_provider = Column(String(50), nullable=False, default='email')
    auth_provider_id = Column(String(255))
    role = Column(String(50), nullable=False, default='user')
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    tomatoes = Column(Integer, nullable=False, default=0)
    
    equipped_frame_url = Column(String(255), nullable=True) # URL khung avatar
    equipped_title = Column(String(100), nullable=True)     # Danh hiệu (VD: "Bá chủ")
    equipped_name_color = Column(String(20), nullable=True) # Mã màu tên (VD: "#FFD700")

    # Relationships
    settings = relationship('UserSetting', back_populates='user', uselist=False, cascade='all, delete-orphan')
    tags = relationship('Tag', back_populates='user', cascade='all, delete-orphan')
    workspaces = relationship('Workspace', back_populates='owner')
    tasks = relationship('Task', back_populates='creator')
    notes = relationship('Note', back_populates='creator')
    notifications = relationship('Notification', back_populates='user', cascade='all, delete-orphan')
    pomodoro_sessions = relationship('PomodoroSession', back_populates='user', cascade='all, delete-orphan')
    calendar_events = relationship('CalendarEvent', back_populates='user', cascade='all, delete-orphan')

    # --- (ĐÃ SỬA) Quan hệ cho Forum ---
    posts = relationship('Post', back_populates='user', cascade='all, delete-orphan')
    comments = relationship('Comment', back_populates='user', cascade='all, delete-orphan')
    reactions = relationship('Reaction', back_populates='user', cascade='all, delete-orphan')
    room_history = relationship('UserRoomHistory', back_populates='user', cascade='all, delete-orphan')
    
    inventory = relationship('UserItem', back_populates='user', cascade='all, delete-orphan')


class UserSetting(Base):
    __tablename__ = 'usersettings'
    user_id = Column(BigInteger, ForeignKey('users.user_id', ondelete='CASCADE'), primary_key=True)
    notification_prefs = Column(JSON)
    audio_prefs = Column(JSON)
    user = relationship('User', back_populates='settings')

class Tag(Base):
    __tablename__ = 'tags'
    tag_id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    name = Column(String(100), nullable=False)
    color_hex = Column(String(7))
    user = relationship('User', back_populates='tags')
    
class Workspace(Base):
    __tablename__ = 'workspaces'
    workspace_id = Column(BigInteger, primary_key=True, autoincrement=True)
    owner_id = Column(BigInteger, ForeignKey('users.user_id'), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    type = Column(String(50), nullable=False, default='private')
    color = Column(String(7), default='#667eea')
    icon = Column(String(10), default='💻')
    starred = Column(Boolean, nullable=False, default=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    owner = relationship('User', back_populates='workspaces')
    members = relationship('WorkspaceMember', back_populates='workspace', cascade='all, delete-orphan')
    boards = relationship('Board', back_populates='workspace', cascade='all, delete-orphan')
    tasks = relationship('Task', back_populates='workspace')
    notes = relationship('Note', back_populates='workspace')

class WorkspaceMember(Base):
    __tablename__ = 'workspace_members'
    member_id = Column(BigInteger, primary_key=True, autoincrement=True)
    workspace_id = Column(BigInteger, ForeignKey('workspaces.workspace_id', ondelete='CASCADE'), nullable=False)
    user_id = Column(BigInteger, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    role = Column(String(50), nullable=False, default='member')
    joined_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    workspace = relationship('Workspace', back_populates='members')
    user = relationship('User')

class Board(Base):
    __tablename__ = 'boards'
    board_id = Column(BigInteger, primary_key=True, autoincrement=True)
    workspace_id = Column(BigInteger, ForeignKey('workspaces.workspace_id', ondelete='CASCADE'), nullable=False)
    name = Column(String(255), nullable=False, default='Main Board')
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    workspace = relationship('Workspace', back_populates='boards')
    lists = relationship('BoardList', back_populates='board', cascade='all, delete-orphan')

class BoardList(Base):
    __tablename__ = 'board_lists'
    list_id = Column(BigInteger, primary_key=True, autoincrement=True)
    board_id = Column(BigInteger, ForeignKey('boards.board_id', ondelete='CASCADE'), nullable=False)
    title = Column(String(255), nullable=False)
    position = Column(Integer, nullable=False, default=0)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    list_type = Column(String(50), nullable=False, default='custom') # (custom, todo, in_progress, done)
    board = relationship('Board', back_populates='lists')
    cards = relationship('BoardCard', back_populates='list', cascade='all, delete-orphan')

class BoardCard(Base):
    __tablename__ = 'board_cards'
    card_id = Column(BigInteger, primary_key=True, autoincrement=True)
    list_id = Column(BigInteger, ForeignKey('board_lists.list_id', ondelete='CASCADE'), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    assignee_id = Column(BigInteger, ForeignKey('users.user_id', ondelete='SET NULL'))
    priority = Column(String(50), default='medium')
    position = Column(Integer, nullable=False, default=0)
    due_date = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    list = relationship('BoardList', back_populates='cards')
    assignee = relationship('User')
    checklists = relationship('CardChecklist', back_populates='card', cascade='all, delete-orphan')
    labels = relationship('CardLabel', cascade='all, delete-orphan') # Sẽ dùng để lấy label_id
    comments = relationship('CardComment', back_populates='card', cascade='all, delete-orphan')

class Task(Base):
    __tablename__ = 'tasks'
    task_id = Column(BigInteger, primary_key=True, autoincrement=True)
    creator_id = Column(BigInteger, ForeignKey('users.user_id'), nullable=False)
    workspace_id = Column(BigInteger, ForeignKey('workspaces.workspace_id', ondelete='CASCADE'))
    title = Column(String(255), nullable=False)
    description = Column(Text)
    deadline = Column(TIMESTAMP(timezone=True))
    priority = Column(String(50), default='medium')
    status = Column(String(50), nullable=False, default='todo')
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    creator = relationship('User', back_populates='tasks')
    workspace = relationship('Workspace', back_populates='tasks')

class Note(Base):
    __tablename__ = 'notes'
    note_id = Column(BigInteger, primary_key=True, autoincrement=True)
    creator_id = Column(BigInteger, ForeignKey('users.user_id'), nullable=False)
    workspace_id = Column(BigInteger, ForeignKey('workspaces.workspace_id', ondelete='CASCADE'))
    title = Column(String(255))
    content = Column(Text)
    type = Column(String(50), nullable=False, default='note')
    reminder_at = Column(TIMESTAMP(timezone=True))
    pinned = Column(Boolean, nullable=False, default=False)
    color_hex = Column(String(10), default='#e0f2fe')
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    creator = relationship('User', back_populates='notes')
    workspace = relationship('Workspace', back_populates='notes')

class Notification(Base):
    __tablename__ = 'notifications'
    notification_id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    type = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)
    reference_id = Column(BigInteger)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    user = relationship('User', back_populates='notifications')

class PomodoroSession(Base):
    __tablename__ = 'pomodorosessions'
    session_id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    start_time = Column(TIMESTAMP(timezone=True), nullable=False)
    end_time = Column(TIMESTAMP(timezone=True), nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    type = Column(String(50), nullable=False)
    task_id = Column(String(100), nullable=True)
    user = relationship('User', back_populates='pomodoro_sessions')

class CalendarEvent(Base):
    __tablename__ = 'calendarevents'
    event_id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    start_time = Column(TIMESTAMP(timezone=True), nullable=False)
    end_time = Column(TIMESTAMP(timezone=True), nullable=False)
    color = Column(String(50), default='default')
    
    # --- (THÊM DÒNG NÀY) ---
    reminder_sent = Column(Boolean, nullable=False, default=False, server_default=text('false'))
    # --- (KẾT THÚC THÊM) ---

    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    user = relationship('User', back_populates='calendar_events')

# --- (ĐÃ SỬA) CÁC MODEL CHO FORUM/BLOG ---

class Post(Base):
    __tablename__ = 'posts'
    post_id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    content = Column(Text, nullable=False)
    image_url = Column(Text, nullable=True) 
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    user = relationship('User', back_populates='posts')
    comments = relationship('Comment', back_populates='post', cascade='all, delete-orphan')
    reactions = relationship('Reaction', back_populates='post', cascade='all, delete-orphan') # Đổi tên Like -> Reaction

class Comment(Base):
    __tablename__ = 'comments'
    comment_id = Column(BigInteger, primary_key=True, autoincrement=True)
    post_id = Column(BigInteger, ForeignKey('posts.post_id', ondelete='CASCADE'), nullable=False)
    user_id = Column(BigInteger, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    post = relationship('Post', back_populates='comments')
    user = relationship('User', back_populates='comments') 

class Reaction(Base): # Đổi tên Like -> Reaction
    __tablename__ = 'reactions' # Đổi tên bảng
    reaction_id = Column(BigInteger, primary_key=True, autoincrement=True) # Đổi tên cột
    post_id = Column(BigInteger, ForeignKey('posts.post_id', ondelete='CASCADE'), nullable=False)
    user_id = Column(BigInteger, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    reaction_type = Column(String(50), nullable=False, default='like') # <-- (CODE MỚI) Thêm loại reaction
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    post = relationship('Post', back_populates='reactions') # Sửa quan hệ
    user = relationship('User', back_populates='reactions') # Sửa quan hệ
    
    # Ràng buộc: Một user chỉ được react 1 post 1 lần
    __table_args__ = (UniqueConstraint('user_id', 'post_id', name='_user_post_reaction_uc'),) # Sửa tên

# (Thêm vào cuối file models.py, TRƯỚC dòng if __name__...)

class ReportedPost(Base):
    __tablename__ = 'reported_posts'

    report_id = Column(BigInteger, primary_key=True, autoincrement=True)
    post_id = Column(BigInteger, ForeignKey('posts.post_id', ondelete='CASCADE'), nullable=False)
    reporter_user_id = Column(BigInteger, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(50), nullable=False, default='pending') # pending, resolved
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # Quan hệ
    post = relationship('Post') # Giúp admin xem nội dung post
    reporter = relationship('User') # Giúp admin xem ai là người báo cáo

class CardChecklist(Base):
    __tablename__ = 'card_checklists'
    checklist_id = Column(BigInteger, primary_key=True, autoincrement=True)
    card_id = Column(BigInteger, ForeignKey('board_cards.card_id', ondelete='CASCADE'), nullable=False)
    title = Column(String(255), nullable=False)
    position = Column(Integer, default=0)
    
    # Quan hệ
    card = relationship('BoardCard', back_populates='checklists')
    items = relationship('ChecklistItem', back_populates='checklist', cascade='all, delete-orphan')

class ChecklistItem(Base):
    __tablename__ = 'checklist_items'
    item_id = Column(BigInteger, primary_key=True, autoincrement=True)
    checklist_id = Column(BigInteger, ForeignKey('card_checklists.checklist_id', ondelete='CASCADE'), nullable=False)
    title = Column(Text, nullable=False)
    is_checked = Column(Boolean, default=False)
    position = Column(Integer, default=0)
    
    # Quan hệ
    checklist = relationship('CardChecklist', back_populates='items')

# --- (CODE MỚI) Model cho Labels (Nhãn dán) ---

class Label(Base):
    __tablename__ = 'labels'
    label_id = Column(BigInteger, primary_key=True, autoincrement=True)
    workspace_id = Column(BigInteger, ForeignKey('workspaces.workspace_id', ondelete='CASCADE'), nullable=False)
    name = Column(String(100), nullable=False)
    color = Column(String(50), nullable=False) # (Ví dụ: 'red', 'blue', 'green')
    
    # Quan hệ
    workspace = relationship('Workspace')

class CardLabel(Base):
    __tablename__ = 'card_labels'
    card_id = Column(BigInteger, ForeignKey('board_cards.card_id', ondelete='CASCADE'), primary_key=True)
    label_id = Column(BigInteger, ForeignKey('labels.label_id', ondelete='CASCADE'), primary_key=True)

class CardComment(Base):
    __tablename__ = 'card_comments'
    comment_id = Column(BigInteger, primary_key=True, autoincrement=True)
    card_id = Column(BigInteger, ForeignKey('board_cards.card_id', ondelete='CASCADE'), nullable=False)
    user_id = Column(BigInteger, ForeignKey('users.user_id', ondelete='SET NULL'), nullable=True) # Dùng SET NULL nếu user bị xóa
    content = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    
    # Quan hệ
    card = relationship('BoardCard', back_populates='comments')
    user = relationship('User') # Để lấy info (avatar, name) của người bình luận

class UserCheckIn(Base):
    __tablename__ = 'user_check_ins'
    
    # Dùng (user_id, check_in_date) làm Khóa chính phức hợp
    user_id = Column(BigInteger, ForeignKey('users.user_id', ondelete='CASCADE'), primary_key=True)
    check_in_date = Column(Date, primary_key=True, default=func.current_date())
    
    tomatoes_earned = Column(Integer, nullable=False, default=2) # (Như bạn yêu cầu)
    
    user = relationship('User')
    
    # Đảm bảo một user chỉ check-in 1 lần/ngày
    __table_args__ = (UniqueConstraint('user_id', 'check_in_date', name='_user_checkin_date_uc'),)
    
class StudyRoom(Base):
    __tablename__ = 'study_rooms'
    
    # Khóa chính
    room_id = Column(String(255), primary_key=True) 
    host_user_id = Column(BigInteger, ForeignKey('users.user_id', ondelete='SET NULL'), nullable=True)
    name = Column(String(255), nullable=False)
    secret = Column(Text, nullable=True)
    current_task_id = Column(String(100), nullable=True) 
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    
    # --- (CODE MỚI) Cài đặt & Thống kê ---
    focus_duration = Column(Integer, nullable=False, default=25)      # Phút tập trung
    short_break_duration = Column(Integer, nullable=False, default=5) # Phút nghỉ ngắn
    long_break_duration = Column(Integer, nullable=False, default=15) # Phút nghỉ dài
    total_focus_cycles = Column(Integer, nullable=False, default=0)   # Tổng số vòng đã hoàn thành
    # --- (HẾT CODE MỚI) ---

    # Quan hệ
    host = relationship('User')
    tasks = relationship('StudyRoomTask', back_populates='room', cascade='all, delete-orphan')
    history_entries = relationship('UserRoomHistory', back_populates='room', cascade='all, delete-orphan')
    
class StudyRoomTask(Base):
    __tablename__ = 'study_room_tasks'
    
    task_entry_id = Column(BigInteger, primary_key=True, autoincrement=True)
    room_id = Column(String(255), ForeignKey('study_rooms.room_id', ondelete='CASCADE'), nullable=False)
    
    # Dùng String để lưu cả "task-123" và "card-456"
    task_id = Column(String(100), nullable=False) 
    
    added_by_user_id = Column(BigInteger, ForeignKey('users.user_id', ondelete='SET NULL'), nullable=True)
    position = Column(Integer, default=0)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # Quan hệ
    room = relationship('StudyRoom', back_populates='tasks')
    added_by_user = relationship('User')

class UserRoomHistory(Base):
    __tablename__ = 'user_room_history'
    
    # Khóa chính phức hợp (Mỗi user chỉ có 1 dòng cho mỗi phòng)
    user_id = Column(BigInteger, ForeignKey('users.user_id', ondelete='CASCADE'), primary_key=True)
    room_id = Column(String(255), ForeignKey('study_rooms.room_id', ondelete='CASCADE'), primary_key=True)
    
    last_joined_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    # Quan hệ
    user = relationship('User', back_populates='room_history')
    room = relationship('StudyRoom', back_populates='history_entries')
    
class ShopItem(Base):
    __tablename__ = 'shop_items'
    item_id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    description = Column(String(255))
    type = Column(String(50), nullable=False) # 'frame', 'title', 'name_color'
    price = Column(Integer, nullable=False)
    value = Column(String(255), nullable=False) # Lưu mã màu (hex), url ảnh khung, hoặc nội dung danh hiệu
    image_url = Column(String(255)) # Ảnh minh họa cho item (hiển thị trong shop)

class UserItem(Base):
    __tablename__ = 'user_items'
    user_item_id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    item_id = Column(BigInteger, ForeignKey('shop_items.item_id', ondelete='CASCADE'), nullable=False)
    purchased_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    
    user = relationship('User', back_populates='inventory')
    item = relationship('ShopItem')    
    
# --- SCRIPT TO CREATE/UPDATE TABLES ---
if __name__ == "__main__":
    from DB.database import engine
    from sqlalchemy import text

    print("--- Database Schema Sync ---")
    with engine.connect() as conn:
        print("Dropping old schema...")
        conn.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))
        conn.commit()

    print("Recreating tables...")
    Base.metadata.create_all(bind=engine)

    print("✅ Database schema synchronized successfully!")
    print("   Run this script again if you modify models.py.")
