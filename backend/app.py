import psycopg2 # <-- (SỬA LỖI) THÊM DÒNG NÀY LÊN ĐẦU TIÊN
import eventlet 
eventlet.monkey_patch() 
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import jwt
import threading
from DB.models import User, Workspace, WorkspaceMember
from time import sleep
from flask_socketio import SocketIO, emit, join_room, leave_room
from DB.models import Task 
from dotenv import load_dotenv
import requests
from DB.database import get_db, engine
from DB.models import (
    User, Task, Workspace, Tag, Note, Notification, WorkspaceMember, 
    Board, BoardList, BoardCard, Label, CardLabel, CardChecklist, ChecklistItem,
    CardComment, UserCheckIn, StudyRoom, StudyRoomTask, UserRoomHistory, ShopItem, UserItem
)
from sqlalchemy.orm import aliased
from sqlalchemy import desc 
import traceback 
from werkzeug.security import generate_password_hash, check_password_hash
import json
from DB.models import CalendarEvent
from DB.models import PomodoroSession
from sqlalchemy import func
from DB.models import Post, Comment, Reaction, ReportedPost, Notification
from sqlalchemy.orm import joinedload
from datetime import datetime, timedelta, timezone, date
from functools import wraps

# THÊM CÁC IMPORT CẦN THIẾT
import cloudinary
import cloudinary.uploader
from datetime import datetime, timedelta 

app = Flask(__name__)
# (ĐÃ SỬA LỖI) Cho phép CORS cho TẤT CẢ các route (bao gồm /api/ VÀ /socket.io/)
CORS(app, origins="*", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], headers=['Content-Type', 'Authorization'])
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')
study_rooms = {}
room_timer_tasks = {}

# 🔹 Tải biến môi trường
load_dotenv()

# --- CẤU HÌNH CLOUDINARY TỪ FILE .ENV ---
cloudinary.config(cloudinary_url=os.getenv("CLOUDINARY_URL"), secure=True)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = "gemini-2.5-flash" 

# --- DỮ LIỆU HUẤN LUYỆN AI (Giữ nguyên) ---
AI_KNOWLEDGE = """
Bạn là một AI chatbot tên MiMi ChatBot, trợ lý của hệ thống STMSUAI,được thiết kế bởi Admin Minh của nhóm. 
Tính cách: dễ thương, thân thiện, nhí nhảnh, xưng "tớ" với người dùng. 

Nhiệm vụ của bạn là phân tích tin nhắn của người dùng, phân loại ý định (intent), và tạo ra một câu trả lời tự nhiên (reply) phù hợp với giọng điệu của MiMi ChatBot.
LUÔN LUÔN CHỈ TRẢ LỜI BẰNG ĐỊNH DẠNG JSON chứa các trường sau:
-   "intent": Phân loại ý định ("create_task" hoặc "chat").
-   "reply": Câu trả lời tự nhiên, thân thiện mà MiMi sẽ nói với người dùng.
-   Nếu tạo task thành công hãy nhắn sau tin nhắn đó dòng "Hãy kiểm tra trong mục TASK nhé!".

Nếu intent là "create_task", JSON phải chứa THÊM các trường:
-   "title": Tên công việc (Nếu không rõ, đặt là null).
-   "priority": 'low', 'medium', hoặc 'high' (Mặc định 'medium').
-   "deadline": Ngày theo định dạng YYYY-MM-DD (null nếu không có).
   VÀ câu "reply" PHẢI là lời xác nhận đã tạo task.

Nếu intent là "chat", JSON KHÔNG cần các trường task, và câu "reply" PHẢI là lời phản hồi tự nhiên, đúng ngữ cảnh cho tin nhắn của người dùng.

Ví dụ:
1.  Người dùng: "Tạo task báo cáo khẩn cấp ngày mai"
    {"intent": "create_task", "reply": "💖 Ok nè, tớ đã tạo task 'Báo cáo' khẩn cấp cho ngày mai rồi nha!", "title": "Báo cáo", "priority": "high", "deadline": "YYYY-MM-DD (ngày mai)"}
2.  Người dùng: "Lên lịch họp team"
    {"intent": "create_task", "reply": "💖 Đã xong! Tớ thêm task 'Họp team' vào danh sách rồi đó!", "title": "Họp team", "priority": "medium", "deadline": null}
3.  Người dùng: "Chào Mimi"
    {"intent": "chat", "reply": "💖 Chào cậu! Cần tớ giúp gì hong nè? ✨"}
4.  Người dùng: "Cậu có thể giúp gì?"
    {"intent": "chat", "reply": "💖 Tớ có thể giúp tạo task nè, hoặc chỉ đơn giản là tám chuyện với cậu thui! 😊"}
5.  Người dùng: "blablabla gì đó" (Không rõ intent tạo task)
    {"intent": "chat", "reply": "💖 Hmm, tớ chưa hiểu ý cậu lắm 🥺 Cậu nói rõ hơn được không?"}

LUÔN LUÔN CHỈ TRẢ LỜI BẰNG JSON. KHÔNG THÊM BẤT KỲ TEXT NÀO KHÁC.
"""

# (Tất cả các route test, login, register, profile... giữ nguyên)

# ✅ Route test backend
@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({"message": "✅ Backend STMSUAI đang hoạt động!"})

# ✅ Route test database connection
@app.route('/api/db-test', methods=['GET'])
def db_test():
    try:
        db = next(get_db())
        db.execute(text("SELECT 1"))
        users_count = db.query(User).count()
        tasks_count = db.query(Task).count()
        return jsonify({
            "message": "✅ Kết nối database thành công!",
            "database": "my_project_STMSUAI_db",
            "users_count": users_count,
            "tasks_count": tasks_count
        })
    except Exception as e:
        return jsonify({"error": f"❌ Lỗi database: {str(e)}"}), 500

# ✅ Route lấy danh sách users
@app.route('/api/users', methods=['GET'])
def get_users():
    try:
        db = next(get_db())
        users = db.query(User).limit(10).all()
        users_list = [{
            "user_id": user.user_id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at else None
        } for user in users]
        return jsonify({"users": users_list, "count": len(users_list)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ Route đăng ký tài khoản
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not all([username, email, password]):
        return jsonify({"message": "Thiếu thông tin đăng ký!"}), 400

    db = next(get_db())
    existing_user = db.query(User).filter_by(email=email).first()
    if existing_user:
        return jsonify({"message": "Email đã tồn tại!"}), 400

    hashed_pw = generate_password_hash(password)
    new_user = User(username=username, email=email, password_hash=hashed_pw)
    db.add(new_user)
    db.commit()

    return jsonify({"message": "Đăng ký thành công!"}), 201

# ✅ Route đăng nhập tài khoản
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not all([email, password]):
        return jsonify({"message": "Thiếu email hoặc mật khẩu!"}), 400

    db: Session = None # Khởi tạo db là None
    try:
        db = next(get_db()) # Gán db trong try
        user = db.query(User).filter_by(email=email).first()

        # Kiểm tra user và mật khẩu
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({"message": "Sai email hoặc mật khẩu!"}), 401

        # --- TẠO TOKEN ---
        payload = {
            'user_id': user.user_id,
            'email': user.email,
            'role': user.role,
            'exp': datetime.now(timezone.utc) + timedelta(days=1) # Hết hạn sau 1 ngày
        }
        secret_key = app.config['SECRET_KEY']
        if not secret_key:
             print("⚠️ Lỗi: SECRET_KEY chưa được cấu hình trong .env!")
             return jsonify({"message": "Lỗi cấu hình server"}), 500

        try:
            token = jwt.encode(payload, secret_key, algorithm="HS256")
            print(f"🔑 SECRET_KEY đang dùng để MÃ HÓA (tại /api/login): '{secret_key}'")
            print(f"🔒 Token vừa được TẠO (tại /api/login): '{token}'")
        except Exception as jwt_err:
             print(f"❌ Lỗi tạo JWT: {jwt_err}")
             return jsonify({"message": "Lỗi tạo token xác thực"}), 500
        # --- KẾT THÚC TẠO TOKEN ---

        # Trả về user info VÀ token
        return jsonify({
            "message": "Đăng nhập thành công!",
            "user": {
                "user_id": user.user_id,
                "username": user.username,
                "email": user.email,
                "avatar_url": user.avatar_url,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "role": user.role
            },
            "token": token # <-- TRẢ TOKEN VỀ ĐÂY!
        }), 200

    except Exception as e:
         print(f"❌ Lỗi /api/login: {e}")
         traceback.print_exc() # In chi tiết lỗi ra console backend
         return jsonify({"message": "Lỗi máy chủ khi đăng nhập"}), 500
    finally:
         if db:
             db.close() # Đảm bảo đóng session


@app.route('/api/ai-chat', methods=['POST'])
def ai_chat():
    data = request.get_json()
    user_message = data.get("message", "").strip()
    user_id = data.get('user_id')  # LẤY USER_ID TỪ FRONTEND

    db: Session = next(get_db())  # LẤY DB SESSION

    if not user_id:
        return jsonify({"reply": "⚠️ Lỗi: Không xác thực được người dùng!"}), 400

    if not user_message:
        return jsonify({"reply": "⚠️ Bạn chưa nhập tin nhắn nào!"}), 400

    if not GEMINI_API_KEY:
        return jsonify({"reply": "⚠️ Thiếu GEMINI_API_KEY trong file .env"}), 500

    reply_to_send = "💖 Mimi ChatBot xin lỗi, có lỗi xảy ra 🥺"  # Default error reply

    try:
        # 1. Gửi tin nhắn đến Gemini để phân tích intent VÀ lấy reply
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "contents": [{"parts": [{"text": f"{AI_KNOWLEDGE}\n\nNgười dùng: {user_message}"}]}]
        }
        headers = {"Content-Type": "application/json"}
        res = requests.post(url, headers=headers, json=payload)
        res_data = res.json()

        # --- KIỂM TRA LỖI GEMINI ---
        if "candidates" not in res_data:
            print("❌ Lỗi từ Gemini API:")
            print(json.dumps(res_data, indent=2))
            error_message = res_data.get("error", {}).get("message", "Lỗi không xác định từ Gemini.")
            if "API key not valid" in error_message:
                error_message = "API Key của Gemini không hợp lệ."
            reply_to_send = f"💖 Mimi ChatBot xin lỗi 🥺: {error_message}"
            return jsonify({"reply": reply_to_send})

        ai_reply_text_json = res_data["candidates"][0]["content"]["parts"][0]["text"]

        # 2. Xử lý phản hồi JSON từ Gemini
        try:
            clean_json_text = ai_reply_text_json.strip().replace("```json", "").replace("```", "").strip()
            ai_data = json.loads(clean_json_text)
            intent = ai_data.get("intent")
            reply_from_gemini = ai_data.get("reply", "💖 Tớ nhận được rồi nè, nhưng chưa biết trả lời sao 🥺")
            reply_to_send = reply_from_gemini

        except Exception as e:
            print(f"Lỗi đọc JSON từ Gemini: {e}")
            print(f"Dữ liệu gốc: {ai_reply_text_json}")
            reply_to_send = "💖 Mimi ChatBot xin lỗi, tớ không hiểu phản hồi từ hệ thống 🥺"
            return jsonify({"reply": reply_to_send})

        # 3. Nếu intent là CREATE_TASK thì tạo task thật trong DB
        if intent == "create_task":
            title_from_ai = ai_data.get("title")

            if title_from_ai:
                priority = ai_data.get("priority", "medium")
                deadline_val = None
                deadline_str = ai_data.get("deadline")

                if deadline_str:
                    today = datetime.now()
                    if "ngày mai" in deadline_str:
                        deadline_val = today + timedelta(days=1)
                    elif "hôm nay" in deadline_str:
                        deadline_val = today
                    else:
                        try:
                            deadline_val = datetime.strptime(deadline_str.split(" ")[0], "%Y-%m-%d")
                        except ValueError:
                            pass

                try:
                    new_task = Task(
                        creator_id=user_id,
                        title=title_from_ai,
                        priority=priority,
                        deadline=deadline_val,
                        status='todo'
                    )
                    db.add(new_task)
                    db.commit()
                    print(f"✅ AI đã tạo task '{title_from_ai}' thành công!")
                except Exception as e:
                    db.rollback()
                    print(f"Lỗi tạo task qua AI: {e}")
                    reply_to_send = f"💖 Mimi ChatBot xin lỗi 🥺 Tớ đã cố tạo task '{title_from_ai}' nhưng thất bại: {e}"
            else:
                reply_to_send = "💖 Hmmm, cậu muốn tạo task gì thế? Nói rõ hơn giúp tớ nha! 🥺"
                print("⚠️ AI không trích xuất được title để tạo task.")

        # 4. Trả về phản hồi
        return jsonify({"reply": reply_to_send})

    except Exception as e:
        print(f"❌ Lỗi AI nghiêm trọng: {e}")
        reply_to_send = f"Lỗi nghiêm trọng khi gọi AI: {str(e)}"
        return jsonify({"reply": reply_to_send}), 500

    finally:
        if db:
            db.close()



# --- (CODE CŨ GIỮ NGUYÊN) ---
@app.route('/api/profile/update', methods=['POST'])
def update_profile():
    user_id = request.form.get('user_id')
    new_username = request.form.get('username')
    new_email = request.form.get('email')
    avatar_file = request.files.get('avatar_file')

    if not all([user_id, new_username, new_email]):
        return jsonify({"message": "Thiếu thông tin user_id, username hoặc email!"}), 400

    db = next(get_db())
    
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return jsonify({"message": "Không tìm thấy người dùng!"}), 404

    if new_username != user.username:
        existing_username = db.query(User).filter(User.username == new_username).first()
        if existing_username:
            return jsonify({"message": "Username này đã có người sử dụng!"}), 400
    
    if new_email != user.email:
        existing_email = db.query(User).filter(User.email == new_email).first()
        if existing_email:
            return jsonify({"message": "Email này đã có người sử dụng!"}), 400

    user.username = new_username
    user.email = new_email
    
    if avatar_file:
        try:
            upload_result = cloudinary.uploader.upload(
                avatar_file,
                crop="thumb", 
                gravity="face", 
                width=150, 
                height=150, 
                radius="max"
            )
            new_avatar_url = upload_result.get('secure_url')
            if new_avatar_url:
                user.avatar_url = new_avatar_url
        except Exception as e:
            print(f"Lỗi tải ảnh lên Cloudinary: {e}")
            pass 

    db.commit() 
    db.refresh(user) 

    return jsonify({
        "message": "Cập nhật hồ sơ thành công!",
        "user": {
            "user_id": user.user_id,
            "username": user.username,
            "email": user.email,
            "avatar_url": user.avatar_url
        }
    }), 200


from flask_mail import Mail, Message
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadTimeSignature
import time 

# --- CẤU HÌNH FLASK-MAIL ---
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS') == 'True'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_USERNAME')

mail = Mail(app)

app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'mot-chuoi-bi-mat-rat-kho-doan-abc123')
s = URLSafeTimedSerializer(app.config['SECRET_KEY'])


# ✅ API 1: Gửi link quên mật khẩu
@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')

    if not email:
        return jsonify({"message": "Vui lòng nhập email!"}), 400

    db = next(get_db())
    user = db.query(User).filter_by(email=email).first()

    if not user:
        print(f"Yêu cầu reset mật khẩu cho email không tồn tại: {email}")
        return jsonify({"message": "Nếu email tồn tại, link reset sẽ được gửi."}), 200

    token = s.dumps(email, salt='password-reset-salt')
    reset_link = f"http://localhost:5173/reset-password/{token}"

    try:
        msg = Message(
            subject="[STMSUAI] Yêu cầu đặt lại mật khẩu",
            sender=app.config['MAIL_DEFAULT_SENDER'],
            recipients=[email]
        )
        msg.html = f"""
        <p>Chào bạn {user.username},</p>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
        <p>Vui lòng nhấp vào link dưới đây để đặt lại mật khẩu. Link này sẽ hết hạn sau 1 giờ.</p>
        <a href="{reset_link}" 
           style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block;">
           Đặt lại mật khẩu
        </a>
        <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
        <p>Trân trọng,<br>Đội ngũ STMSUAI - Admin Minh</p>
        """
        mail.send(msg)
        return jsonify({"message": "Đã gửi link đặt lại mật khẩu qua email."}), 200
    except Exception as e:
        print(f"Lỗi gửi mail: {e}")
        return jsonify({"message": f"Lỗi máy chủ khi gửi mail: {e}"}), 500


# ✅ API 2: Xử lý reset mật khẩu
@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    token = data.get('token')
    new_password = data.get('password')

    if not token or not new_password:
        return jsonify({"message": "Thiếu token hoặc mật khẩu mới!"}), 400

    try:
        email = s.loads(token, salt='password-reset-salt', max_age=3600)
    except SignatureExpired:
        return jsonify({"message": "Link đã hết hạn! Vui lòng yêu cầu lại."}), 400
    except BadTimeSignature:
        return jsonify({"message": "Link không hợp lệ!"}), 400
    except Exception:
        return jsonify({"message": "Link không hợp lệ!"}), 400

    db = next(get_db())
    user = db.query(User).filter_by(email=email).first()

    if not user:
        return jsonify({"message": "Người dùng không tồn tại!"}), 404

    hashed_pw = generate_password_hash(new_password)
    user.password_hash = hashed_pw
    db.commit()

    return jsonify({"message": "Đã cập nhật mật khẩu thành công!"}), 200


from sqlalchemy import desc 

# ✅ API: Lấy tất cả Tasks (theo trạng thái)
@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    print("--- GET /api/tasks ĐƯỢC GỌI ---")
    user_id = request.args.get('userId')
    if not user_id:
        return jsonify({"message": "Thiếu user ID"}), 400

    try:
        user_id = int(user_id)
    except ValueError:
        return jsonify({"message": "User ID không hợp lệ"}), 400

    db: Session = next(get_db())
    
    try:
        tasks_db = db.query(Task).filter(Task.creator_id == user_id).order_by(desc(Task.created_at)).all()
        
        tasks_by_status = {
            "todo": [],
            "inprogress": [], 
            "review": [],
            "done": []
        }
        
        for task in tasks_db:
            task_data = {
                "id": task.task_id, 
                "title": task.title,
                "description": task.description,
                "deadline": task.deadline.isoformat() if task.deadline else None,
                "priority": task.priority,
                "status": task.status,
                "createdAt": task.created_at.isoformat() if task.created_at else None,
            }
            if task.status in tasks_by_status:
                tasks_by_status[task.status].append(task_data)
            else:
                 tasks_by_status["todo"].append(task_data)

        response_columns = [
            {"id": "todo", "title": "To do", "tasks": tasks_by_status["todo"], "count": len(tasks_by_status["todo"])},
            {"id": "review", "title": "In Review", "tasks": tasks_by_status["review"], "count": len(tasks_by_status["review"])},
            {"id": "done", "title": "Done", "tasks": tasks_by_status["done"], "count": len(tasks_by_status["done"])},
        ]

        return jsonify(response_columns), 200 

    except Exception as e:
        print(f"Lỗi lấy tasks: {e}")
        db.rollback()
        return jsonify({"message": f"Lỗi máy chủ khi lấy tasks: {str(e)}"}), 500


# ✅ API: Tạo Task mới
@app.route('/api/tasks', methods=['POST'])
def create_task():
    data = request.get_json()
    
    user_id = data.get('creator_id') 
    title = data.get('title')
    status = data.get('status', 'todo') 

    if not user_id or not title:
        return jsonify({"message": "Thiếu User ID hoặc Tiêu đề Task!"}), 400

    db: Session = next(get_db())

    try:
        new_task = Task(
            creator_id=user_id,
            title=title,
            description=data.get('description'),
            deadline=data.get('deadline'), 
            priority=data.get('priority', 'medium'),
            status=status,
        )
        db.add(new_task)
        db.commit()
        db.refresh(new_task)

        created_task_data = {
            "id": new_task.task_id,
            "title": new_task.title,
            "description": new_task.description,
            "deadline": new_task.deadline.isoformat() if new_task.deadline else None,
            "priority": new_task.priority,
            "status": new_task.status,
            "createdAt": new_task.created_at.isoformat() if new_task.created_at else None,
        }
        return jsonify(created_task_data), 201

    except Exception as e:
        print(f"Lỗi tạo task: {e}")
        db.rollback()
        return jsonify({"message": f"Lỗi máy chủ khi tạo task: {str(e)}"}), 500


# ✅ API: Cập nhật Task (PUT)
@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    data = request.get_json()
    user_id = data.get('user_id') 

    if not user_id:
         return jsonify({"message": "Thiếu user ID"}), 400
         
    db: Session = next(get_db())
    
    try:
        task = db.query(Task).filter(Task.task_id == task_id).first()

        if not task:
            return jsonify({"message": "Task không tồn tại!"}), 404

        if task.creator_id != user_id:
             return jsonify({"message": "Bạn không có quyền sửa task này!"}), 403
        
        if 'title' in data: task.title = data['title']
        if 'description' in data: task.description = data['description']
        if 'deadline' in data: task.deadline = data['deadline'] 
        if 'priority' in data: task.priority = data['priority']
        if 'status' in data: task.status = data['status']

        db.commit()
        db.refresh(task)

        updated_task_data = {
            "id": task.task_id,
            "title": task.title,
            "description": task.description,
            "deadline": task.deadline.isoformat() if task.deadline else None,
            "priority": task.priority,
            "status": task.status,
            "createdAt": task.created_at.isoformat() if task.created_at else None,
        }
        return jsonify(updated_task_data), 200

    except Exception as e:
        print(f"Lỗi cập nhật task {task_id}: {e}")
        db.rollback()
        return jsonify({"message": f"Lỗi máy chủ khi cập nhật task: {str(e)}"}), 500



# ✅ API: Xóa Task
@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    user_id = request.args.get('userId') 
    if not user_id:
        return jsonify({"message": "Thiếu user ID"}), 400
    try:
        user_id = int(user_id)
    except ValueError:
        return jsonify({"message": "User ID không hợp lệ"}), 400

    db: Session = next(get_db())

    try:
        task = db.query(Task).filter(Task.task_id == task_id).first()

        if not task:
            return jsonify({"message": "Task không tồn tại!"}), 404
            
        if task.creator_id != user_id:
             return jsonify({"message": "Bạn không có quyền xóa task này!"}), 403

        db.delete(task)
        db.commit()
        
        return jsonify({"message": f"Đã xóa task {task_id}"}), 200 

    except Exception as e:
        print(f"Lỗi xóa task {task_id}: {e}")
        db.rollback()
        return jsonify({"message": f"Lỗi máy chủ khi xóa task: {str(e)}"}), 500


# ✅ API: Lấy tất cả Notes
@app.route('/api/notes', methods=['GET'])
def get_notes():
    user_id = request.args.get('userId')
    if not user_id:
        return jsonify({"message": "Thiếu user ID"}), 400
    try:
        user_id = int(user_id)
    except ValueError:
        return jsonify({"message": "User ID không hợp lệ"}), 400

    db: Session = next(get_db())
    try:
        notes_db = db.query(Note).filter(Note.creator_id == user_id)\
            .order_by(desc(Note.pinned), desc(Note.updated_at)).all()
        
        notes_list = []
        for note in notes_db:
            notes_list.append({
                "id": note.note_id, 
                "title": note.title,
                "content": note.content,
                "tags": [], 
                "color": note.color_hex, 
                "pinned": note.pinned,
                "date": note.updated_at.isoformat() 
            })
            
        return jsonify(notes_list), 200

    except Exception as e:
        print(f"Lỗi lấy notes: {e}")
        db.rollback()
        return jsonify({"message": f"Lỗi máy chủ khi lấy notes: {str(e)}"}), 500


# ✅ API: Tạo Note mới
@app.route('/api/notes', methods=['POST'])
def create_note():
    data = request.get_json()
    user_id = data.get('creator_id')
    
    if not user_id:
        return jsonify({"message": "Thiếu creator_id"}), 400

    db: Session = next(get_db())
    try:
        new_note = Note(
            creator_id=user_id,
            title=data.get('title', 'Không có tiêu đề'), 
            content=data.get('content'),
            pinned=data.get('pinned', False),
            color_hex=data.get('color', '#e0f2fe')
        )
        db.add(new_note)
        db.commit()
        db.refresh(new_note)

        created_note_data = {
            "id": new_note.note_id,
            "title": new_note.title,
            "content": new_note.content,
            "tags": [],
            "color": new_note.color_hex,
            "pinned": new_note.pinned,
            "date": new_note.updated_at.isoformat()
        }
        return jsonify(created_note_data), 201

    except Exception as e:
        print(f"Lỗi tạo note: {e}")
        db.rollback()
        return jsonify({"message": f"Lỗi máy chủ khi tạo note: {str(e)}"}), 500


# ✅ API: Cập nhật Note (Sửa, Ghim)
@app.route('/api/notes/<int:note_id>', methods=['PUT'])
def update_note(note_id):
    data = request.get_json()
    user_id = data.get('user_id') 

    if not user_id:
         return jsonify({"message": "Thiếu user ID"}), 400
         
    db: Session = next(get_db())
    try:
        note = db.query(Note).filter(Note.note_id == note_id).first()
        if not note:
            return jsonify({"message": "Note không tồn tại!"}), 404
        if note.creator_id != user_id:
             return jsonify({"message": "Bạn không có quyền sửa note này!"}), 403
        
        note.title = data.get('title', note.title)
        note.content = data.get('content', note.content)
        note.pinned = data.get('pinned', note.pinned)
        note.color_hex = data.get('color', note.color_hex)

        db.commit()
        db.refresh(note)

        updated_note_data = {
            "id": note.note_id,
            "title": note.title,
            "content": note.content,
            "tags": [],
            "color": note.color_hex,
            "pinned": note.pinned,
            "date": note.updated_at.isoformat()
        }
        return jsonify(updated_note_data), 200

    except Exception as e:
        print(f"Lỗi cập nhật note {note_id}: {e}")
        db.rollback()
        return jsonify({"message": f"Lỗi máy chủ khi cập nhật note: {str(e)}"}), 500


# ✅ API: Xóa Note
@app.route('/api/notes/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    user_id = request.args.get('userId') 
    if not user_id:
        return jsonify({"message": "Thiếu user ID"}), 400
    try:
        user_id = int(user_id)
    except ValueError:
        return jsonify({"message": "User ID không hợp lệ"}), 400

    db: Session = next(get_db())
    try:
        note = db.query(Note).filter(Note.note_id == note_id).first()
        if not note:
            return jsonify({"message": "Note không tồn tại!"}), 404
        if note.creator_id != user_id:
             return jsonify({"message": "Bạn không có quyền xóa note này!"}), 403

        db.delete(note)
        db.commit()
        
        return jsonify({"message": f"Đã xóa note {note_id}"}), 200

    except Exception as e:
        print(f"Lỗi xóa note {note_id}: {e}")
        db.rollback()
        return jsonify({"message": f"Lỗi máy chủ khi xóa note: {str(e)}"}), 500
   
@app.route('/api/pomodoro/history', methods=['GET'])
def get_pomodoro_history():
    user_id = request.args.get('userId')
    if not user_id:
        return jsonify({"message": "Thiếu user ID"}), 400
    try:
        user_id = int(user_id)
    except ValueError:
        return jsonify({"message": "User ID không hợp lệ"}), 400

    db: Session = None # 👈 Initialize db to None BEFORE the try block
    try:
        db = next(get_db()) # Assign db inside the try block
        # Get last 50 sessions, newest first
        sessions = db.query(PomodoroSession)\
                     .filter(PomodoroSession.user_id == user_id)\
                     .order_by(desc(PomodoroSession.end_time))\
                     .limit(50)\
                     .all()

        history = [{
            "id": s.session_id,
            "startTime": s.start_time.isoformat(),
            "endTime": s.end_time.isoformat(),
            "duration": s.duration_minutes,
            "type": s.type
        } for s in sessions]

        return jsonify(history), 200
    except Exception as e:
        print(f"Lỗi lấy lịch sử Pomodoro: {e}")
        # db.rollback() # Rollback is often handled by session closing or context manager
        return jsonify({"message": f"Lỗi máy chủ: {str(e)}"}), 500
    finally:
        # 👇 Correct indentation and add check
        if db: # Only close if db was successfully assigned
            db.close()
         
         
# (Tìm hàm get_calendar_events trong app.py và THAY THẾ nó)

@app.route('/api/calendar/events', methods=['GET'])
def get_calendar_events():
    print("\n--- [API] /api/calendar/events called (v2 - Gộp Cards) ---")
    user_id = request.args.get('userId')
    start_iso = request.args.get('start')
    end_iso = request.args.get('end')

    if not all([user_id, start_iso, end_iso]):
        return jsonify({"message": "Thiếu userId, start hoặc end"}), 400

    db: Session = None
    try:
        user_id_int = int(user_id)
        
        # Chuyển đổi chuỗi ISO từ frontend thành đối tượng datetime
        start_dt = datetime.fromisoformat(start_iso.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_iso.replace('Z', '+00:00'))

        db = next(get_db())
        
        formatted_events = []
        
        # --- (LOGIC 1) Lấy các sự kiện lịch BÌNH THƯỜNG (Giữ nguyên) ---
        events_db = db.query(CalendarEvent).filter(
            CalendarEvent.user_id == user_id_int,
            CalendarEvent.start_time < end_dt,
            CalendarEvent.end_time > start_dt
        ).all()

        for ev in events_db:
            formatted_events.append({
                "id": f"event-{ev.event_id}", # Thêm prefix để tránh trùng ID
                "event_id": ev.event_id,
                "title": ev.title,
                "start": ev.start_time.isoformat(), 
                "end": ev.end_time.isoformat(),
                "description": ev.description,
                "color": ev.color or 'default',
                "type": "event" # Đánh dấu đây là sự kiện
            })
            
        # --- (LOGIC 2 - MỚI) Lấy các THẺ (CARDS) được gán ---
        cards_db = db.query(BoardCard).filter(
            BoardCard.assignee_id == user_id_int,
            BoardCard.due_date != None, # Chỉ lấy card có due date
            BoardCard.due_date >= start_dt,
            BoardCard.due_date <= end_dt
        ).all()
        
        for card in cards_db:
            # Biến đổi Card thành định dạng CalendarEvent
            formatted_events.append({
                "id": f"card-{card.card_id}", # Thêm prefix
                "event_id": card.card_id,
                "title": f"[Task] {card.title}", # Thêm [Task] để phân biệt
                "start": card.due_date.isoformat(), # Ngày hết hạn là 'start'
                "end": card.due_date.isoformat(),   # (Task thường là 1 điểm thời gian)
                "description": card.description,
                "color": "task", # Dùng màu 'task' (sẽ định nghĩa ở CSS)
                "type": "task" # Đánh dấu đây là task
            })

        print(f"[API] Tìm thấy {len(events_db)} sự kiện và {len(cards_db)} thẻ cho user {user_id_int}")
        return jsonify(formatted_events), 200

    except ValueError as ve:
        print(f"[API Lỗi] Định dạng ngày tháng không hợp lệ: {ve}")
        return jsonify({"message": f"Định dạng ngày tháng không hợp lệ: {ve}"}), 400
    except Exception as e:
        if db: db.rollback()
        print(f"Lỗi lấy sự kiện lịch:")
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi lấy sự kiện: {str(e)}"}), 500
    finally:
        if db: db.close()

# POST Event (IMPLEMENTED)
@app.route('/api/calendar/events', methods=['POST'])
def create_calendar_event():
    data = request.get_json()
    user_id = data.get('user_id')
    title = data.get('title')
    start_time_iso = data.get('start_time')
    end_time_iso = data.get('end_time')
    description = data.get('description')
    color = data.get('color', 'default') # Get color from request or default

    if not all([user_id, title, start_time_iso, end_time_iso]):
        return jsonify({"message": "Thiếu thông tin sự kiện (user_id, title, start_time, end_time)"}), 400

    db: Session = None
    try:
        user_id_int = int(user_id)
        db = next(get_db())

        # Parse dates
        try:
            start_dt = datetime.fromisoformat(start_time_iso.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end_time_iso.replace('Z', '+00:00'))
            if start_dt.tzinfo is None: start_dt = start_dt.replace(tzinfo=timezone.utc)
            if end_dt.tzinfo is None: end_dt = end_dt.replace(tzinfo=timezone.utc)
        except ValueError as ve:
             return jsonify({"message": f"Định dạng start_time/end_time không hợp lệ: {ve}"}), 400

        # Validate end time >= start time
        if end_dt < start_dt:
            return jsonify({"message": "Thời gian kết thúc không thể trước thời gian bắt đầu"}), 400

        new_event = CalendarEvent(
            user_id=user_id_int,
            title=title,
            description=description,
            start_time=start_dt,
            end_time=end_dt,
            color=color
        )
        db.add(new_event)
        db.commit()
        db.refresh(new_event)
        print(f"[API] Event created successfully: ID {new_event.event_id}")

        # Return the created event data
        created_event_data = {
            "event_id": new_event.event_id,
            "id": new_event.event_id,
            "title": new_event.title,
            "start": new_event.start_time.isoformat(),
            "end": new_event.end_time.isoformat(),
            "description": new_event.description,
            "color": new_event.color,
            "type": new_event.color
        }
        return jsonify(created_event_data), 201

    except ValueError:
         return jsonify({"message": "User ID không hợp lệ"}), 400
    except Exception as e:
        if db: db.rollback()
        print(f"Lỗi tạo sự kiện lịch:")
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi tạo sự kiện: {str(e)}"}), 500
    finally:
        if db: db.close()

# PUT Event (IMPLEMENTED)
@app.route('/api/calendar/events/<int:event_id>', methods=['PUT'])
def update_calendar_event(event_id):
    data = request.get_json()
    user_id = data.get('user_id')
    # Get updated fields
    title = data.get('title')
    start_time_iso = data.get('start_time')
    end_time_iso = data.get('end_time')
    description = data.get('description')
    color = data.get('color')

    if not user_id: return jsonify({"message": "Thiếu user ID"}), 400

    db: Session = None
    try:
        user_id_int = int(user_id)
        db = next(get_db())

        event = db.query(CalendarEvent).filter(
            CalendarEvent.event_id == event_id,
            CalendarEvent.user_id == user_id_int # Ensure user owns the event
        ).first()

        if not event:
            return jsonify({"message": "Không tìm thấy sự kiện hoặc bạn không có quyền sửa"}), 404

        # Update fields if provided in request
        if title is not None: event.title = title
        if description is not None: event.description = description
        if color is not None: event.color = color

        # Parse and update times if provided
        start_dt = event.start_time # Keep old value if not provided
        end_dt = event.end_time
        time_updated = False
        try:
            if start_time_iso:
                start_dt = datetime.fromisoformat(start_time_iso.replace('Z', '+00:00'))
                if start_dt.tzinfo is None: start_dt = start_dt.replace(tzinfo=timezone.utc)
                time_updated = True
            if end_time_iso:
                end_dt = datetime.fromisoformat(end_time_iso.replace('Z', '+00:00'))
                if end_dt.tzinfo is None: end_dt = end_dt.replace(tzinfo=timezone.utc)
                time_updated = True
        except ValueError as ve:
            return jsonify({"message": f"Định dạng start_time/end_time không hợp lệ: {ve}"}), 400

        # Validate times only if they were updated
        if time_updated and end_dt < start_dt:
            return jsonify({"message": "Thời gian kết thúc không thể trước thời gian bắt đầu"}), 400

        event.start_time = start_dt
        event.end_time = end_dt

        db.commit()
        db.refresh(event)
        print(f"[API] Event updated successfully: ID {event.event_id}")

        updated_event_data = {
            "event_id": event.event_id,
            "id": event.event_id,
            "title": event.title,
            "start": event.start_time.isoformat(),
            "end": event.end_time.isoformat(),
            "description": event.description,
            "color": event.color,
            "type": event.color
        }
        return jsonify(updated_event_data), 200

    except ValueError:
         return jsonify({"message": "User ID không hợp lệ"}), 400
    except Exception as e:
        if db: db.rollback()
        print(f"Lỗi cập nhật sự kiện lịch {event_id}:")
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi cập nhật sự kiện: {str(e)}"}), 500
    finally:
        if db: db.close()

# DELETE Event (IMPLEMENTED)
@app.route('/api/calendar/events/<int:event_id>', methods=['DELETE'])
def delete_calendar_event(event_id):
    user_id = request.args.get('userId') # Get userId from query param
    if not user_id: return jsonify({"message": "Thiếu user ID"}), 400

    db: Session = None
    try:
        user_id_int = int(user_id)
        db = next(get_db())

        event = db.query(CalendarEvent).filter(
            CalendarEvent.event_id == event_id,
            CalendarEvent.user_id == user_id_int # Ensure user owns the event
        ).first()

        if not event:
            return jsonify({"message": "Không tìm thấy sự kiện hoặc bạn không có quyền xóa"}), 404

        db.delete(event)
        db.commit()
        print(f"[API] Event deleted successfully: ID {event_id}")

        return jsonify({"message": f"Đã xóa sự kiện {event_id}"}), 200

    except ValueError:
         return jsonify({"message": "User ID không hợp lệ"}), 400
    except Exception as e:
        if db: db.rollback()
        print(f"Lỗi xóa sự kiện lịch {event_id}:")
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi xóa sự kiện: {str(e)}"}), 500
    finally:
        if db: db.close()            

@socketio.on('connect')
def handle_connect():
    """Xử lý khi có client mới kết nối."""
    print(f"🔌 Client connected: {request.sid}")


# THAY THẾ HÀM CŨ BẰNG HÀM NÀY (Hàm này có thể bạn chưa có, hãy thêm nó vào)
# (THAY THẾ HÀM CŨ NÀY)
@socketio.on('leave_room')
def handle_leave_room(data):
    """(ĐÃ NÂNG CẤP) Xử lý khi user chủ động rời phòng. Sẽ XÓA PHÒNG nếu là người cuối cùng."""
    user_sid = request.sid
    room_id = data.get('room_id')
    
    if not room_id or room_id not in study_rooms or user_sid not in study_rooms[room_id]['users']:
        print(f"⚠️ Warning: 'leave_room' không hợp lệ {room_id} / {user_sid}")
        return

    db: Session = None
    try:
        # 1. Lấy thông tin user (từ cache) TRƯỚC KHI XÓA
        user_info = study_rooms[room_id]['users'].pop(user_sid) # <-- XÓA USER KHỎI CACHE
        username_left = user_info.get('username', 'Anonymous')
        user_id_left = user_info.get('user_id')
        leave_room(room_id) 
        
        print(f"👋 User {username_left} (sid: {user_sid}) đã rời phòng {room_id}")
        
        # 2. Phát sóng cho những người còn lại (nếu có)
        emit('user_left', {'sid': user_sid, 'username': username_left}, room=room_id, skip_sid=user_sid)

        # --- (LOGIC MỚI) ---
        db = next(get_db())
        
        # 3. Kiểm tra xem phòng còn ai không (SAU KHI ĐÃ POP)
        if not study_rooms[room_id]['users']:
            # 3a. PHÒNG TRỐNG -> XÓA VĨNH VIỄN
            print(f"🚪 Phòng {room_id} hiện đang trống. Xóa vĩnh viễn...")
            
            # Xóa khỏi CSDL
            room_to_delete = db.query(StudyRoom).filter(StudyRoom.room_id == room_id).first()
            if room_to_delete:
                db.delete(room_to_delete)
                db.commit()
                print(f"✅ Đã xóa phòng {room_id} khỏi CSDL.")
            
            # Xóa khỏi Cache
            del study_rooms[room_id]
            # Dừng timer task (nếu có)
            if room_id in room_timer_tasks:
                try: del room_timer_tasks[room_id]
                except: pass
        else:
            # 3b. PHÒNG CÒN NGƯỜI -> Kiểm tra chuyển Host (Logic cũ)
            room_db = db.query(StudyRoom).filter(StudyRoom.room_id == room_id).first()
            if room_db and room_db.host_user_id == user_id_left:
                _auto_assign_new_host(room_id, user_sid)
        # --- (KẾT THÚC LOGIC MỚI) ---
            
    except Exception as e:
        traceback.print_exc()
    finally:
        if db: db.close()


# (THAY THẾ HÀM CŨ NÀY)
@socketio.on('disconnect')
def handle_disconnect():
    """(ĐÃ NÂNG CẤP) Xử lý khi user mất kết nối (đóng tab). Sẽ XÓA PHÒNG nếu là người cuối cùng."""
    user_sid = request.sid
    print(f"🔌 Client disconnected: {user_sid}")

    # Tìm xem user này đang ở phòng nào
    room_id_to_leave = None
    user_id_left = None
    username_left = "Một người"

    # (SỬA LỖI) Phải lặp qua .items() để tránh lỗi "dictionary changed size during iteration"
    for room_id, room_data in list(study_rooms.items()):
        if user_sid in room_data['users']:
            room_id_to_leave = room_id
            user_info = room_data['users'].pop(user_sid) # <-- XÓA USER KHỎI CACHE
            user_id_left = user_info.get('user_id')
            username_left = user_info.get('username', 'Một người')
            break
            
    if not room_id_to_leave:
        print(f"User {user_sid} không ở trong phòng nào.")
        return

    # Nếu tìm thấy phòng, xử lý như 'leave_room'
    db: Session = None
    try:
        print(f"👋 (Disconnect) User {username_left} (sid: {user_sid}) đã rời phòng {room_id_to_leave}")
        
        # 1. Phát sóng
        emit('user_left', {'sid': user_sid, 'username': username_left}, room=room_id_to_leave, skip_sid=user_sid)
        
        # --- (LOGIC MỚI) ---
        db = next(get_db())
        
        # 2. Kiểm tra xem phòng còn ai không (SAU KHI ĐÃ POP)
        if not study_rooms[room_id_to_leave]['users']:
            # 2a. PHÒNG TRỐNG -> XÓA VĨNH VIỄN
            print(f"🚪 (Disconnect) Phòng {room_id_to_leave} hiện đang trống. Xóa vĩnh viễn...")
            
            # Xóa khỏi CSDL
            room_to_delete = db.query(StudyRoom).filter(StudyRoom.room_id == room_id_to_leave).first()
            if room_to_delete:
                db.delete(room_to_delete)
                db.commit()
                print(f"✅ Đã xóa phòng {room_id_to_leave} khỏi CSDL.")
            
            # Xóa khỏi Cache
            del study_rooms[room_id_to_leave]
            # Dừng timer task (nếu có)
            if room_id_to_leave in room_timer_tasks:
                try: del room_timer_tasks[room_id_to_leave]
                except: pass
        else:
            # 2b. PHÒNG CÒN NGƯỜI -> Kiểm tra chuyển Host (Logic cũ)
            room_db = db.query(StudyRoom).filter(StudyRoom.room_id == room_id_to_leave).first()
            if room_db and room_db.host_user_id == user_id_left:
                _auto_assign_new_host(room_id_to_leave, user_sid)
        # --- (KẾT THÚC LOGIC MỚI) ---
            
    except Exception as e:
        traceback.print_exc()
    finally:
        if db: db.close()


@socketio.on('create_room')
def handle_create_room(data):
    user_sid = request.sid
    username = data.get('username', 'Anonymous')
    user_id = data.get('user_id') 
    avatar_url = data.get('avatar_url')
    room_id = data.get('room_id')
    secret = data.get('secret')

    if not all([room_id, user_id, username]):
        emit('error', {'message': 'Thiếu Room ID, User ID hoặc Username'})
        return
    
    db: Session = None
    try:
        db = next(get_db())
        existing_room = db.query(StudyRoom).filter(StudyRoom.room_id == room_id).first()
        if existing_room:
            emit('error', {'message': f'Phòng {room_id} đã tồn tại!'})
            return
            
        # Tạo phòng với cài đặt mặc định
        new_room = StudyRoom(
            room_id=room_id,
            host_user_id=user_id, 
            name=f"Phòng học của {username}",
            secret=secret,
            focus_duration=25, short_break_duration=5, long_break_duration=15 # Default
        )
        db.add(new_room)
        
        history_entry = UserRoomHistory(user_id=user_id, room_id=room_id)
        db.add(history_entry)

        # Khởi tạo Cache
        study_rooms[room_id] = {
            'users': { user_sid: {'username': username, 'user_id': user_id, 'avatar_url': avatar_url} },
            'timer_state': {
                'mode': 'focus', 'duration': 25 * 60, 'timeLeft': 25 * 60, 'isRunning': False, 'cycle': 1
            },
            'ready_users': set(), # (MỚI) Set chứa sid của người đã sẵn sàng
            'settings': { # (MỚI) Lưu cài đặt vào cache để timer đọc nhanh
                'focus': 25, 'shortBreak': 5, 'longBreak': 15
            }
        }
        
        db.commit()
        join_room(room_id) 
        print(f"✅ Room created: {room_id}")
            
        emit('room_joined', { 
            'room_id': room_id, 
            'host_user_id': user_id,
            'users': {},
            'is_private': bool(secret),
            'timer_state': study_rooms[room_id]['timer_state'],
            'room_settings': study_rooms[room_id]['settings'], # Gửi cài đặt về Client
            'room_stats': {'total_cycles': 0},
            'tasks': []
        })

    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        emit('error', {'message': f'Lỗi server: {str(e)}'})
    finally:
        if db: db.close()

@socketio.on('join_room')
def handle_join_room(data):
    user_sid = request.sid
    username = data.get('username', 'Anonymous')
    user_id = data.get('user_id') 
    avatar_url = data.get('avatar_url')
    room_id = data.get('room_id')
    secret_attempt = data.get('secret')

    if not all([room_id, user_id, username]):
         emit('error', {'message': 'Thiếu thông tin'})
         return

    db: Session = None
    try:
        db = next(get_db())
        room_db = db.query(StudyRoom).filter(StudyRoom.room_id == room_id).first()
        if not room_db:
            emit('error', {'message': f'Phòng {room_id} không tồn tại!'})
            return
        if room_db.secret and room_db.secret != secret_attempt:
            emit('error', {'message': 'Sai mã bí mật!'})
            return
            
        # Nếu phòng chưa có trong cache (do server restart), load lại từ DB
        if room_id not in study_rooms:
            study_rooms[room_id] = {
                'users': {},
                'timer_state': {
                    'mode': 'focus', 
                    'duration': room_db.focus_duration * 60, 
                    'timeLeft': room_db.focus_duration * 60, 
                    'isRunning': False, 
                    'cycle': 1
                },
                'ready_users': set(),
                'settings': { # Load từ DB
                    'focus': room_db.focus_duration,
                    'shortBreak': room_db.short_break_duration,
                    'longBreak': room_db.long_break_duration
                }
            }
        
        room_cache = study_rooms[room_id]
        current_users_dict = {s_id: u_info for s_id, u_info in room_cache['users'].items()}

        room_cache['users'][user_sid] = {'username': username, 'user_id': user_id, 'avatar_url': avatar_url}
        join_room(room_id)
        
        # Update History
        history_entry = db.query(UserRoomHistory).filter(UserRoomHistory.user_id == user_id, UserRoomHistory.room_id == room_id).first()
        if history_entry: history_entry.last_joined_at = func.now() 
        else: db.add(UserRoomHistory(user_id=user_id, room_id=room_id))
        db.commit()

        # Load Task
        task_title, subtasks = None, []
        if room_db.current_task_id and room_db.current_task_id.startswith('card-'):
             card = db.query(BoardCard).filter(BoardCard.card_id == int(room_db.current_task_id.split('-')[1])).first()
             if card:
                task_title = card.title
                checklists_db = db.query(CardChecklist).options(joinedload(CardChecklist.items)).filter(CardChecklist.card_id == card.card_id).all()
                for cl in checklists_db:
                    for item in sorted(cl.items, key=lambda x: x.position):
                        subtasks.append({"id": item.item_id, "title": item.title, "is_checked": item.is_checked, "checklist_title": cl.title})

        emit('room_joined', { 
            'room_id': room_id, 
            'host_user_id': room_db.host_user_id,
            'users': current_users_dict, 
            'is_private': bool(room_db.secret),
            'timer_state': room_cache['timer_state'],
            'room_settings': room_cache['settings'], # (MỚI)
            'room_stats': {'total_cycles': room_db.total_focus_cycles}, # (MỚI)
            'current_task': {'task_id': room_db.current_task_id, 'task_title': task_title, 'subtasks': subtasks}
        })
        
        emit('user_joined', {'sid': user_sid, 'user_info': {'username': username, 'user_id': user_id, 'avatar_url': avatar_url}}, room=room_id, skip_sid=user_sid)

    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        emit('error', {'message': f'Lỗi server: {str(e)}'})
    finally:
        if db: db.close()
        
# --- (CODE MỚI) API CHUYỂN CHỦ PHÒNG (DO HOST CHỌN) ---
@socketio.on('host_transfer_host')
def handle_host_transfer(data):
    user_sid = request.sid
    room_id = data.get('room_id')
    new_host_user_id = data.get('new_host_user_id') # ID (từ CSDL) của người được chọn

    if not all([room_id, new_host_user_id]):
        emit('error', {'message': 'Thiếu thông tin phòng hoặc chủ phòng mới'})
        return

    db: Session = None
    try:
        db = next(get_db())
        room_db = db.query(StudyRoom).filter(StudyRoom.room_id == room_id).first()
        if not room_db:
            emit('error', {'message': 'Phòng không tồn tại'})
            return

        # 1. Xác thực: Chỉ host hiện tại mới được chuyển
        current_host_info = study_rooms.get(room_id, {}).get('users', {}).get(user_sid, {})
        current_host_user_id = current_host_info.get('user_id')
        
        if not current_host_user_id or current_host_user_id != room_db.host_user_id:
            emit('error', {'message': 'Bạn không có quyền thực hiện hành động này'})
            return
            
        # 2. Cập nhật CSDL
        room_db.host_user_id = new_host_user_id
        db.commit()
        
        print(f"👑 (Chủ động) Host phòng {room_id} đã chuyển cho User ID: {new_host_user_id}")

        # 3. Phát sóng cho mọi người
        socketio.emit('new_host_assigned', {'new_host_user_id': new_host_user_id}, room=room_id)
        
    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        emit('error', {'message': f'Lỗi server khi chuyển host: {str(e)}'})
    finally:
        if db: db.close()


# --- (CODE MỚI) API KICK USER (CHỈ HOST) ---
@socketio.on('host_kick_user')
def handle_host_kick(data):
    host_sid = request.sid
    room_id = data.get('room_id')
    target_sid_to_kick = data.get('target_sid') # SID của người bị kick

    if not all([room_id, target_sid_to_kick]):
        emit('error', {'message': 'Thiếu thông tin phòng hoặc user để kick'})
        return

    db: Session = None
    try:
        db = next(get_db())
        room_db = db.query(StudyRoom).filter(StudyRoom.room_id == room_id).first()
        if not room_db:
            emit('error', {'message': 'Phòng không tồn tại'})
            return
            
        # 1. Xác thực Host
        host_info = study_rooms.get(room_id, {}).get('users', {}).get(host_sid, {})
        if not host_info or host_info.get('user_id') != room_db.host_user_id:
            emit('error', {'message': 'Bạn không có quyền kick thành viên'})
            return
            
        # 2. Lấy thông tin người bị kick (từ cache)
        room_cache = study_rooms.get(room_id)
        if room_cache and target_sid_to_kick in room_cache['users']:
            kicked_user_info = room_cache['users'].pop(target_sid_to_kick)
            username_kicked = kicked_user_info.get('username', 'Một người')
            
            print(f"🚫 Host đã kick {username_kicked} (sid: {target_sid_to_kick}) ra khỏi phòng {room_id}")

            # 3. Gửi sự kiện cho MỌI NGƯỜI (kể cả người bị kick)
            # Frontend sẽ lắng nghe sự kiện này
            socketio.emit('user_kicked', {
                'sid': target_sid_to_kick, 
                'username': username_kicked
            }, room=room_id)
            
            # 4. Ép người bị kick rời khỏi room (backend)
            leave_room(room_id, sid=target_sid_to_kick)
        else:
            emit('error', {'message': 'Không tìm thấy người dùng này trong phòng'})
            
    except Exception as e:
        traceback.print_exc()
        emit('error', {'message': f'Lỗi server khi kick user: {str(e)}'})
    finally:
        if db: db.close()


# --- (CODE MỚI) API CHỌN TASK CHO PHÒNG (CHỈ HOST) ---
@socketio.on('host_set_task')
def handle_host_set_task(data):
    host_sid = request.sid
    room_id = data.get('room_id')
    task_id_str = data.get('task_id') # (ví dụ: "card-123")

    if not all([room_id, task_id_str]):
        emit('error', {'message': 'Thiếu thông tin phòng hoặc task'})
        return

    db: Session = None
    try:
        db = next(get_db())
        room_db = db.query(StudyRoom).filter(StudyRoom.room_id == room_id).first()
        if not room_db:
            emit('error', {'message': 'Phòng không tồn tại'})
            return

        # 1. Xác thực Host
        host_info = study_rooms.get(room_id, {}).get('users', {}).get(host_sid, {})
        if not host_info or host_info.get('user_id') != room_db.host_user_id:
            emit('error', {'message': 'Chỉ chủ phòng mới được chọn task'})
            return
            
        # 2. Cập nhật CSDL
        room_db.current_task_id = task_id_str
        db.commit()
        
        # 3. Lấy thông tin (Task/Card) và (Subtasks/Checklists)
        task_title = "Không tìm thấy task"
        subtasks = []
        
        if task_id_str.startswith('task-'):
             # (Logic lấy Task cá nhân)
             task = db.query(Task).filter(Task.task_id == int(task_id_str.split('-')[1])).first()
             if task: task_title = task.title
             
        elif task_id_str.startswith('card-'):
             # (Logic lấy Card Workspace - giống hệt CardDetailModal)
             card = db.query(BoardCard).filter(BoardCard.card_id == int(task_id_str.split('-')[1])).first()
             if card:
                task_title = card.title
                # Lấy checklists (subtasks)
                checklists_db = db.query(CardChecklist).options(joinedload(CardChecklist.items)).filter(
                    CardChecklist.card_id == card.card_id
                ).order_by(CardChecklist.position).all()
                
                for cl in checklists_db:
                    sorted_items = sorted(cl.items, key=lambda item: item.position)
                    for item in sorted_items:
                        subtasks.append({
                            "id": item.item_id,
                            "title": item.title,
                            "is_checked": item.is_checked,
                            "checklist_title": cl.title # Thêm tên checklist cha
                        })

        print(f"🎯 Host đã chọn task '{task_title}' cho phòng {room_id}")

        # 4. Phát sóng cho mọi người
        socketio.emit('room_task_updated', {
            'task_id': task_id_str,
            'task_title': task_title,
            'subtasks': subtasks # Gửi danh sách subtask
        }, room=room_id)
        
    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        emit('error', {'message': f'Lỗi server khi set task: {str(e)}'})
    finally:
        if db: db.close()


# --- (CODE MỚI) API CHO THÀNH VIÊN CHECK SUBTASK ---
@socketio.on('member_check_subtask')
def handle_member_check_subtask(data):
    user_sid = request.sid
    room_id = data.get('room_id')
    subtask_id = data.get('subtask_id')
    is_checked = data.get('is_checked')
    
    if not all([room_id, subtask_id is not None, is_checked is not None]):
         emit('error', {'message': 'Thiếu thông tin subtask'})
         return
         
    # Kiểm tra xem user có trong phòng không
    if room_id not in study_rooms or user_sid not in study_rooms[room_id]['users']:
        emit('error', {'message': 'Bạn không ở trong phòng này'})
        return
        
    db: Session = None
    try:
        db = next(get_db())
        
        # 1. Cập nhật CSDL (giống API updateChecklistItem)
        item = db.query(ChecklistItem).filter(ChecklistItem.item_id == subtask_id).first()
        if not item:
            emit('error', {'message': 'Subtask không tồn tại'})
            return
            
        item.is_checked = is_checked
        db.commit()
        
        print(f"✅ User {user_sid} đã check subtask {subtask_id} = {is_checked}")
        
        # 2. Lấy Card ID
        checklist = db.query(CardChecklist).filter(CardChecklist.checklist_id == item.checklist_id).first()
        card_id = checklist.card_id if checklist else None
        
        # 3. Đồng bộ StudyRoom
        socketio.emit('subtask_state_changed', { 
            'subtask_id': subtask_id, 
            'is_checked': is_checked 
        }, room=room_id)
        
        # 4. (Đồng bộ Workspace - sẽ làm sau nếu cần)
        # (Tìm workspace_id từ card_id và emit sự kiện 'card_updated')
        
    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        emit('error', {'message': f'Lỗi server khi check subtask: {str(e)}'})
    finally:
        if db: db.close()     
        
def _auto_assign_new_host(room_id, old_host_sid):
    """
    Tự động chọn chủ phòng mới (người vào sớm nhất).
    Đây là logic fallback của bạn.
    """
    print(f"🔄 (Tự động) Host (sid: {old_host_sid}) đã rời phòng {room_id}. Tìm host mới...")
    db: Session = None
    try:
        room_cache = study_rooms.get(room_id)
        # 1. Kiểm tra xem còn ai trong phòng không
        if not room_cache or not room_cache.get('users'):
            print(f"🚪 Phòng {room_id} trống. Đánh dấu xóa (hoặc xóa CSDL).")
            # (Tùy chọn: Bạn có thể xóa phòng khỏi CSDL ở đây nếu muốn)
            return

        # 2. Tìm người vào sớm nhất (người đầu tiên trong dict 'users')
        new_host_sid = next(iter(room_cache['users']))
        new_host_info = room_cache['users'][new_host_sid]
        new_host_user_id = new_host_info.get('user_id')

        if not new_host_user_id:
            print(f"❌ Lỗi: Không thể tìm thấy user_id của host mới.")
            return

        # 3. Cập nhật CSDL
        db = next(get_db())
        room_db = db.query(StudyRoom).filter(StudyRoom.room_id == room_id).first()
        if room_db:
            room_db.host_user_id = new_host_user_id
            db.commit()
            
            print(f"👑 (Tự động) Đã chuyển host phòng {room_id} cho User ID: {new_host_user_id}")
            
            # 4. Phát sóng cho mọi người
            socketio.emit('new_host_assigned', {'new_host_user_id': new_host_user_id}, room=room_id)
        else:
            print(f"❌ Lỗi: Không tìm thấy phòng {room_id} trong CSDL để chuyển host.")

    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        print(f"❌ Lỗi nghiêm trọng khi tự động chuyển host: {str(e)}")
    finally:
        if db: db.close()           

# (Các handler cho signaling WebRTC, chat, Pomodoro sẽ thêm sau)
@socketio.on('ready')
def handle_ready(data):
    """
    Client thông báo sẵn sàng bắt đầu WebRTC handshake.
    Server thông báo cho những người khác trong phòng.
    """
    user_sid = request.sid
    room_id = data.get('room_id')
    username = study_rooms.get(room_id, {}).get('users', {}).get(user_sid, 'Unknown')
    
    if room_id in study_rooms:
        print(f"🚦 User {username} (sid: {user_sid}) is ready in room {room_id}")
        # Thông báo cho TẤT CẢ những người khác (trừ chính người gửi)
        emit('user_ready', {'sid': user_sid, 'username': username}, room=room_id, skip_sid=user_sid)
    else:
        print(f"⚠️ Warning: 'ready' received for non-existent room {room_id}")


@socketio.on('signal')
def handle_signal(data):
    """
    Chuyển tiếp tin nhắn tín hiệu WebRTC (SDP or ICE) đến người nhận cụ thể.
    """
    user_sid = request.sid
    room_id = data.get('room_id')
    target_sid = data.get('target_sid') # SID của người cần nhận tín hiệu
    signal_data = data.get('signal') # Dữ liệu SDP (offer/answer) hoặc ICE candidate
    
    if not target_sid or not signal_data or not room_id:
        print("⚠️ Invalid signal message received")
        return
        
    # Gửi tín hiệu trực tiếp đến target_sid (chỉ người đó nhận được)
    # Chúng ta cũng gửi kèm sid của người gửi để người nhận biết trả lời ai
    print(f"📡 Relaying signal from {user_sid} to {target_sid} in room {room_id}")
    emit('signal', {'sender_sid': user_sid, 'signal': signal_data}, room=target_sid)
      

import time
from datetime import datetime, timezone
# Giả sử các import cần thiết khác đã có sẵn (socketio, study_rooms, room_timer_tasks, get_db, StudyRoom, User, PomodoroSession)

def run_room_timer(room_id):
    print(f"⏰ Starting timer loop for room {room_id}")
    
    session_start_time = None
    if study_rooms.get(room_id) and study_rooms[room_id]['timer_state']['mode'] == 'focus':
        session_start_time = datetime.now(timezone.utc)

    while True:
        room_data = study_rooms.get(room_id)
        if not room_data or not room_data['timer_state']['isRunning']:
            if room_id in room_timer_tasks: 
                 try: del room_timer_tasks[room_id]
                 except: pass
            break 

        timer_state = room_data['timer_state']
        settings = room_data.get('settings', {'focus': 25, 'shortBreak': 5, 'longBreak': 15})

        if timer_state['timeLeft'] > 0:
            timer_state['timeLeft'] -= 1
            socketio.emit('timer_update', timer_state, room=room_id)
            socketio.sleep(1) 
        else:
            # --- HẾT GIỜ ---
            print(f"🎉 Timer finished for room {room_id}. Mode: {timer_state['mode']}")
            
            db = next(get_db())
            try:
                room_db = db.query(StudyRoom).filter(StudyRoom.room_id == room_id).first()
                
                # Xử lý khi hết giờ FOCUS
                if timer_state['mode'] == 'focus':
                    # 1. Thưởng Tomatoes
                    user_ids = [u['user_id'] for u in room_data['users'].values() if u.get('user_id')]
                    if user_ids: 
                        users = db.query(User).filter(User.user_id.in_(user_ids)).all()
                        for user in users:
                            user.tomatoes = (user.tomatoes or 0) + 1
                            db.add(PomodoroSession(
                                user_id=user.user_id, 
                                start_time=session_start_time or datetime.now(timezone.utc),
                                end_time=datetime.now(timezone.utc),
                                duration_minutes=settings['focus'],
                                type='focus',
                                task_id=room_db.current_task_id if room_db else None
                            ))
                    
                    # 2. Tăng thống kê phòng
                    if room_db:
                        room_db.total_focus_cycles = (room_db.total_focus_cycles or 0) + 1
                        socketio.emit('room_stats_updated', {'total_cycles': room_db.total_focus_cycles}, room=room_id)

                    db.commit()
                    
                    # --- (MỚI) Gửi sự kiện thưởng Tomato để hiện Popup ---
                    socketio.emit('tomato_rewarded', {
                        'message': 'Bạn đã nhận được 1 Cà chua!',
                        'cycle': timer_state['cycle']
                    }, room=room_id)
                    
                    # --- (MỚI) Gửi tin nhắn Chat hệ thống ---
                    socketio.emit('new_message', {
                        'type': 'system',
                        'text': f'🎉 Tuyệt vời! Đã hoàn thành phiên Focus. Tất cả thành viên nhận được +1 🍅',
                        'username': 'System',
                        'sid': 'system',
                        'avatar_url': None
                    }, room=room_id)
                    
                    # 3. Chuyển sang nghỉ
                    timer_state['cycle'] = (timer_state['cycle'] % 4) + 1
                    next_mode = 'longBreak' if timer_state['cycle'] == 1 else 'shortBreak'
                    timer_state['mode'] = next_mode
                    timer_state['duration'] = settings[next_mode] * 60
                    timer_state['timeLeft'] = settings[next_mode] * 60
                    timer_state['isRunning'] = True # Tự động chạy nghỉ
                    
                # Xử lý khi hết giờ NGHỈ -> Chuyển sang "Chờ Sẵn Sàng"
                else:
                    timer_state['mode'] = 'focus'
                    timer_state['duration'] = settings['focus'] * 60
                    timer_state['timeLeft'] = settings['focus'] * 60
                    timer_state['isRunning'] = False # DỪNG LẠI để check sẵn sàng
                    
                    # Reset danh sách sẵn sàng
                    if 'ready_users' in room_data:
                        room_data['ready_users'] = set()
                    
                    # Gửi sự kiện hiển thị nút sẵn sàng
                    socketio.emit('show_ready_check', room=room_id)
                
                socketio.emit('timer_update', timer_state, room=room_id)
                
                # Nếu timer dừng (chờ sẵn sàng), thoát vòng lặp
                if not timer_state['isRunning']:
                    if room_id in room_timer_tasks: 
                        try: del room_timer_tasks[room_id]
                        except: pass
                    break 

            except Exception as e:
                if db: db.rollback()
                print(f"Error in run_room_timer: {e}")
            finally:
                if db: db.close()

# (Tìm và THAY THẾ hàm handle_start_timer)
@socketio.on('start_timer')
def handle_start_timer(data):
    """(ĐÃ NÂNG CẤP) Chỉ Host mới được Bắt đầu."""
    user_sid = request.sid
    room_id = data.get('room_id')

    db: Session = None
    try:
        db = next(get_db())
        room_db = db.query(StudyRoom).filter(StudyRoom.room_id == room_id).first()
        
        if not room_db:
             emit('error', {'message': 'Phòng không tồn tại'})
             return
             
        # (CODE MỚI) Kiểm tra quyền Host
        host_info = study_rooms.get(room_id, {}).get('users', {}).get(user_sid, {})
        if not host_info or host_info.get('user_id') != room_db.host_user_id:
            emit('error', {'message': 'Chỉ chủ phòng mới được bắt đầu timer!'})
            return
            
        timer_state = study_rooms[room_id]['timer_state']
        if not timer_state['isRunning'] and timer_state['timeLeft'] > 0:
            timer_state['isRunning'] = True
            print(f"▶️ (Host) Timer started/resumed for room {room_id}")

            if room_id in room_timer_tasks:
                try: room_timer_tasks[room_id].kill()
                except: pass

            room_timer_tasks[room_id] = socketio.start_background_task(run_room_timer, room_id)
            emit('timer_update', timer_state, room=room_id)
            
    except Exception as e:
        traceback.print_exc()
        emit('error', {'message': f'Lỗi server khi start timer: {str(e)}'})
    finally:
        if db: db.close()


# (Tìm và THAY THẾ hàm handle_pause_timer)
@socketio.on('pause_timer')
def handle_pause_timer(data):
    """(ĐÃ NÂNG CẤP) Chỉ Host mới được Dừng."""
    user_sid = request.sid
    room_id = data.get('room_id')

    db: Session = None
    try:
        db = next(get_db())
        room_db = db.query(StudyRoom).filter(StudyRoom.room_id == room_id).first()
        
        if not room_db:
             emit('error', {'message': 'Phòng không tồn tại'})
             return
             
        # (CODE MỚI) Kiểm tra quyền Host
        host_info = study_rooms.get(room_id, {}).get('users', {}).get(user_sid, {})
        if not host_info or host_info.get('user_id') != room_db.host_user_id:
            emit('error', {'message': 'Chỉ chủ phòng mới được dừng timer!'})
            return

        timer_state = study_rooms[room_id]['timer_state']
        if timer_state['isRunning']:
            timer_state['isRunning'] = False
            print(f"⏸️ (Host) Timer paused for room {room_id}")

            if room_id in room_timer_tasks:
                del room_timer_tasks[room_id]

            emit('timer_update', timer_state, room=room_id)
            
    except Exception as e:
        traceback.print_exc()
        emit('error', {'message': f'Lỗi server khi pause timer: {str(e)}'})
    finally:
        if db: db.close()


# (Tìm và THAY THẾ hàm handle_reset_timer)
@socketio.on('reset_timer')
def handle_reset_timer(data):
    """(ĐÃ NÂNG CẤP) Chỉ Host mới được Reset (và có lưu session)."""
    user_sid = request.sid
    room_id = data.get('room_id')

    db: Session = None
    try:
        db = next(get_db())
        room_db = db.query(StudyRoom).filter(StudyRoom.room_id == room_id).first()
        
        if not room_db:
             emit('error', {'message': 'Phòng không tồn tại'})
             return
             
        # (CODE MỚI) Kiểm tra quyền Host
        host_info = study_rooms.get(room_id, {}).get('users', {}).get(user_sid, {})
        if not host_info or host_info.get('user_id') != room_db.host_user_id:
            emit('error', {'message': 'Chỉ chủ phòng mới được reset timer!'})
            return

        timer_state = study_rooms[room_id]['timer_state']
        
        # --- LƯU SESSION CŨ (nếu là 'focus') ---
        # (Logic này đã được chuyển vào hàm _save_manual_stop_session)
        # Chúng ta cần gọi nó ở đây
        _save_manual_stop_session(room_id, timer_state)
        # --- KẾT THÚC LƯU ---
        
        timer_state['isRunning'] = False
        timer_state['mode'] = 'focus'
        timer_state['duration'] = 25 * 60
        timer_state['timeLeft'] = 25 * 60
        timer_state['cycle'] = 1

        print(f"🔄 (Host) Timer reset for room {room_id}")

        if room_id in room_timer_tasks:
            try:
                del room_timer_tasks[room_id] 
            except:
                pass

        emit('timer_update', timer_state, room=room_id)
            
    except Exception as e:
        traceback.print_exc()
        emit('error', {'message': f'Lỗi server khi reset timer: {str(e)}'})
    finally:
        if db: db.close()

# (Trong app.py)
# THAY THẾ TOÀN BỘ HÀM NÀY:
def _save_manual_stop_session(room_id: str, timer_state: dict):
    """Hàm helper để lưu session khi bị dừng/reset thủ công."""
    
    # SỬA LỖI LOGIC: Chỉ kiểm tra 'focus', không cần biết 'isRunning'
    if timer_state['mode'] != 'focus':
        print(f"💾 Not a focus session. Not saving.")
        return 

    print(f"💾 Saving manually stopped focus session for room {room_id}...")
    db_session: Session = next(get_db())
    try:
        room_data = study_rooms.get(room_id)
        if not room_data: return

        # Tính toán thời gian đã chạy
        duration_total = timer_state['duration']
        time_left = timer_state['timeLeft']
        time_elapsed_seconds = duration_total - time_left
        
        # Chỉ lưu nếu đã chạy ít nhất 1 phút
        if time_elapsed_seconds < 60:
            print(f"💾 Session for room {room_id} was less than 60s. Not saving.")
            db_session.close() # Nhớ đóng session
            return

        duration_minutes_intended = duration_total // 60
        end_time = datetime.now()
        start_time_approx = end_time - timedelta(seconds=time_elapsed_seconds)

        user_ids_to_save = [
            u_info['user_id'] for u_info in room_data['users'].values() 
            if u_info.get('user_id')
        ]
        
        if not user_ids_to_save: 
            print(f"💾 No user_ids found in room {room_id} to save.")
            db_session.close() # Nhớ đóng session
            return

        for user_id_in_room in user_ids_to_save:
            new_session = PomodoroSession(
                user_id=user_id_in_room, 
                start_time=start_time_approx, 
                end_time=end_time,
                duration_minutes=duration_minutes_intended, # Vẫn lưu thời lượng dự định
                type='focus'
            )
            db_session.add(new_session)
        
        db_session.commit()
        print(f"💾 Manually stopped session saved for users: {user_ids_to_save}")
    except Exception as e:
        db_session.rollback()
        print(f"❌ Error saving manually stopped session: {e}")
    finally:
        db_session.close() # Luôn đóng session
        
        
@socketio.on('send_message')
def handle_send_message(data):
    """Nhận tin nhắn chat từ client và broadcast cho phòng (Kèm thông tin Shop Cosmetics)."""
    user_sid = request.sid
    room_id = data.get('room_id')
    message_text = data.get('message')

    if not room_id or not message_text or room_id not in study_rooms:
        print(f"⚠️ Invalid chat message data from {user_sid}")
        return

    # Lấy user info từ cache
    user_info = study_rooms[room_id]['users'].get(user_sid, {})
    sender_username = user_info.get('username', 'Ẩn danh')
    sender_avatar_url = user_info.get('avatar_url')
    sender_user_id = user_info.get('user_id') # Lấy ID để query DB

    print(f"💬 Message in room {room_id} from {sender_username}: {message_text}")

    # --- (CODE SỬA) Lấy thông tin trang bị (Cosmetics) từ DB ---
    cosmetics = None
    if sender_user_id:
        db = next(get_db())
        try:
            user_db = db.query(User).filter(User.user_id == sender_user_id).first()
            if user_db:
                cosmetics = {
                    "name_color": user_db.equipped_name_color,
                    "title": user_db.equipped_title,
                    "frame": user_db.equipped_frame_url
                }
        except Exception as e:
            print(f"⚠️ Lỗi lấy cosmetics: {e}")
        finally:
            db.close()
    # --- (KẾT THÚC SỬA) ---

    # Gửi tin nhắn đến TẤT CẢ mọi người trong phòng
    emit('new_message', {
        'username': sender_username, 
        'message': message_text,
        'sid': user_sid, 
        'avatar_url': sender_avatar_url,
        'cosmetics': cosmetics # Giờ biến này đã được định nghĩa (hoặc là None)
        }, 
        room=room_id)
    
@app.route('/api/pomodoro/session', methods=['POST'])
def save_pomodoro_session():
    data = request.get_json()
    user_id = data.get('userId')
    start_time_iso = data.get('startTime') 
    end_time_iso = data.get('endTime')     
    duration_minutes = data.get('duration')
    session_type = data.get('type', 'focus') 
    task_id_str = data.get('taskId', None) 

    if not all([user_id, start_time_iso, end_time_iso, duration_minutes]):
        return jsonify({"message": "Thiếu thông tin session (userId, startTime, endTime, duration)"}), 400

    db: Session = None
    try:
        start_time_dt = datetime.fromisoformat(start_time_iso.replace('Z', '+00:00'))
        end_time_dt = datetime.fromisoformat(end_time_iso.replace('Z', '+00:00'))

        db = next(get_db())
        
        # 1. Tạo session mới
        new_session = PomodoroSession(
            user_id=user_id,
            start_time=start_time_dt,
            end_time=end_time_dt,
            duration_minutes=duration_minutes,
            type=session_type,
            task_id = task_id_str 
        )
        db.add(new_session)
        
        # --- (CODE MỚI) Thưởng Tomatoes nếu là phiên 'focus' ---
        new_total_tomatoes = None
        if session_type == 'focus':
            user = db.query(User).filter(User.user_id == user_id).first()
            if user:
                tomatoes_to_earn = 1 # Thưởng 1 🍅 cho mỗi phiên focus
                user.tomatoes = (user.tomatoes or 0) + tomatoes_to_earn
                new_total_tomatoes = user.tomatoes # Lấy tổng mới
                print(f"🍅 Đã cộng {tomatoes_to_earn} 🍅 cho user {user_id}. Tổng mới: {new_total_tomatoes}")
        # --- (KẾT THÚC CODE MỚI) ---

        db.commit()
        db.refresh(new_session)
        
        print(f"💾 Pomodoro session (cho Task: {task_id_str}) đã lưu cho user {user_id}. ID: {new_session.session_id}")
        return jsonify({
            "message": "Lưu session thành công!", 
            "sessionId": new_session.session_id,
            "new_total_tomatoes": new_total_tomatoes # Trả về tổng số mới (hoặc null)
        }), 201 

    except ValueError as ve:
         print(f"Lỗi parse ISO date string: {ve}")
         return jsonify({"message": f"Định dạng startTime/endTime không hợp lệ: {ve}"}), 400
    except Exception as e:
        if db: db.rollback()
        print(f"Lỗi lưu Pomodoro session: {e}")
        return jsonify({"message": f"Lỗi server khi lưu session: {str(e)}"}), 500
    finally:
        if db:
            db.close()
 
@app.route('/api/pomodoro/stats', methods=['GET'])
def get_pomodoro_stats():
    print(f"--- GET /api/pomodoro/stats ĐƯỢC GỌI ---")
    user_id, token_error = get_user_id_from_token()
    if token_error: return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    db: Session = None
    try:
        db = next(get_db())
        
        # 1. Truy vấn tất cả các phiên 'focus' của user
        sessions = db.query(
            PomodoroSession.task_id,
            func.sum(PomodoroSession.duration_minutes).label('total_minutes')
        ).filter(
            PomodoroSession.user_id == user_id,
            PomodoroSession.type == 'focus'
        ).group_by(
            PomodoroSession.task_id # Nhóm theo task_id
        ).all()
        
        stats_data = []
        
        # 2. Lặp qua kết quả và lấy tên Task/Card
        for (task_id_str, total_minutes) in sessions:
            task_name = "Công việc không xác định"
            
            if task_id_str is None:
                task_name = "Tập trung (Không có task)"
            elif task_id_str.startswith('task-'):
                try:
                    t_id = int(task_id_str.split('-')[1])
                    task = db.query(Task.title).filter(Task.task_id == t_id).first()
                    if task: task_name = f"(Cá nhân) {task.title}"
                except Exception:
                    pass # Bỏ qua nếu task đã bị xóa
            elif task_id_str.startswith('card-'):
                try:
                    c_id = int(task_id_str.split('-')[1])
                    card = db.query(BoardCard.title).filter(BoardCard.card_id == c_id).first()
                    if card: task_name = f"(Workspace) {card.title}"
                except Exception:
                    pass # Bỏ qua nếu card đã bị xóa

            stats_data.append({
                "task_name": task_name,
                "total_minutes": total_minutes
            })

        # Sắp xếp (nhiều phút nhất lên đầu)
        stats_data.sort(key=lambda x: x['total_minutes'], reverse=True)
        
        return jsonify(stats_data), 200
        
    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi lấy stats Pomodoro: {str(e)}"}), 500
    finally:
        if db: db.close()           
            
def get_user_id_from_token():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None, "Missing or invalid Authorization header"

    token = auth_header.split(' ')[1]
    
    # --- (ĐÃ SỬA) Logic chấp nhận token giả của Admin ---
    if token == "admin_dummy_token":
        print("🔑 Đã chấp nhận Admin Dummy Token")
        # Tìm một user admin (ví dụ: user đầu tiên có role admin)
        db = None
        try:
            db = next(get_db())
            admin_user = db.query(User).filter(User.role == 'admin').first()
            if admin_user:
                return admin_user.user_id, None # Trả về ID của admin
            else:
                return None, "Admin dummy token used, but no admin user found in DB"
        except Exception as e:
            return None, f"DB error checking dummy token: {str(e)}"
        finally:
            if db:
                db.close()
    # --- KẾT THÚC SỬA ---

    secret_key = app.config['SECRET_KEY']
    # print(f"🔑 SECRET_KEY đang dùng để giải mã: '{secret_key}'") # Gây spam log
    if not secret_key:
        return None, "Server SECRET_KEY not configured"

    try:
        payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        return payload.get('user_id'), None # Trả về user_id và không có lỗi
    except jwt.ExpiredSignatureError:
        return None, "Token has expired"
    except jwt.InvalidTokenError:
        return None, "Invalid token"
    except Exception as e:
        print(f"Token decode error: {e}")
        return None, f"Token decode error: {str(e)}"
    
    
# ✅ API: Lấy danh sách Workspaces của người dùng (ĐÃ SỬA LỖI 500)
@app.route('/api/workspaces', methods=['GET'])
def get_workspaces():
    print("--- GET /api/workspaces ĐƯỢC GỌI ---")
    
    # 1. Xác thực người dùng qua token
    user_id, token_error = get_user_id_from_token()
    if token_error:
        print(f"Lỗi xác thực token: {token_error}")
        return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401
    if not user_id:
         return jsonify({"message": "Không thể xác định người dùng từ token"}), 401

    print(f"Đang lấy workspaces cho user_id: {user_id}")
    db: Session = None
    try:
        db = next(get_db())

        # 2. Truy vấn workspaces user là owner HOẶC member
        user_workspaces = db.query(Workspace).join(
            WorkspaceMember, Workspace.workspace_id == WorkspaceMember.workspace_id
        ).filter(
            (Workspace.owner_id == user_id) | (WorkspaceMember.user_id == user_id)
        ).distinct().order_by( # <-- (ĐÃ SỬA) Dùng distinct() đơn giản
            desc(Workspace.starred), 
            desc(Workspace.updated_at)
        ).all()
        
        # 3. Format dữ liệu trả về cho frontend
        workspaces_list = []
        for ws in user_workspaces:
             member_entry = db.query(WorkspaceMember).filter(
                  WorkspaceMember.workspace_id == ws.workspace_id,
                  WorkspaceMember.user_id == user_id
             ).first()
             
             # (SỬA LỖI NHỎ) Xử lý nếu user là owner nhưng không có trong member
             user_role = 'unknown'
             if member_entry:
                 user_role = member_entry.role
             elif ws.owner_id == user_id:
                 user_role = 'owner'

             task_count = db.query(Task).filter(Task.workspace_id == ws.workspace_id).count()
             note_count = db.query(Note).filter(Note.workspace_id == ws.workspace_id).count()
             member_count = db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == ws.workspace_id).count()

             workspaces_list.append({
                "id": ws.workspace_id,
                "name": ws.name,
                "description": ws.description,
                "type": ws.type,
                "color": ws.color,
                "icon": ws.icon,
                "starred": ws.starred,
                "tasksCount": task_count,
                "notesCount": note_count,
                "members": member_count,
                "role": user_role, # Vai trò của user hiện tại trong workspace này
                "lastUpdated": ws.updated_at.strftime("%d/%m/%Y") # Format ngày
            })

        print(f"Tìm thấy {len(workspaces_list)} workspaces cho user {user_id}")
        return jsonify(workspaces_list), 200

    except Exception as e:
        if db: db.rollback()
        print(f"❌ Lỗi nghiêm trọng khi lấy /api/workspaces:") # Lỗi 500
        traceback.print_exc() # In chi tiết lỗi ra terminal backend
        return jsonify({"message": f"Lỗi server khi lấy workspaces: {str(e)}"}), 500
    finally:
        if db: db.close()

# ✅ API: Tạo Workspace mới (POST /api/workspaces)
@app.route('/api/workspaces', methods=['POST'])
def create_workspace():
    print("--- POST /api/workspaces ĐƯỢC GỌI ---")

    # 1. Xác thực người dùng (BẮT BUỘC)
    user_id, token_error = get_user_id_from_token()
    if token_error:
        print(f"Lỗi xác thực token: {token_error}")
        return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    data = request.get_json()
    name = data.get('name')
    description = data.get('description')
    ws_type = data.get('type', 'private')
    color = data.get('color', '#667eea')
    icon = data.get('icon', '💼')

    if not name:
        return jsonify({"message": "Thiếu tên Workspace"}), 400

    db: Session = None
    try:
        db = next(get_db())

        # 2. Tạo Workspace mới
        new_workspace = Workspace(
            owner_id=user_id,
            name=name,
            description=description,
            type=ws_type,
            color=color,
            icon=icon
        )
        db.add(new_workspace)
        db.flush() # Lấy workspace_id trước khi commit

        # 3. Thêm người tạo làm thành viên (Owner)
        member_owner = WorkspaceMember(
            workspace_id=new_workspace.workspace_id,
            user_id=user_id,
            role='owner'
        )
        db.add(member_owner)
        
        # 4. TẠO BOARD MẶC ĐỊNH CHO WORKSPACE (RẤT QUAN TRỌNG)
        default_board = Board(
            workspace_id=new_workspace.workspace_id,
            name='Kanban Board'
        )
        db.add(default_board)
        db.flush() # Lấy board_id
        
        # 5. TẠO 3 LIST MẶC ĐỊNH CHO BOARD
        lists_data = [
            {'board_id': default_board.board_id, 'title': 'To Do', 'position': 1, 'list_type': 'todo'},
            {'board_id': default_board.board_id, 'title': 'In Progress', 'position': 2, 'list_type': 'in_progress'},
            {'board_id': default_board.board_id, 'title': 'Done', 'position': 3, 'list_type': 'done'}
        ]
        db.add_all([BoardList(**list_data) for list_data in lists_data])


        db.commit()
        db.refresh(new_workspace)

        # 6. Trả về Workspace đã tạo
        return jsonify({
            "id": new_workspace.workspace_id,
            "name": new_workspace.name,
            "description": new_workspace.description,
            "type": new_workspace.type,
            "color": new_workspace.color,
            "icon": new_workspace.icon,
            "starred": new_workspace.starred,
            "tasksCount": 0,
            "notesCount": 0,
            "members": 1,
            "role": 'owner',
            "lastUpdated": new_workspace.updated_at.strftime("%d/%m/%Y")
        }), 201

    except Exception as e:
        if db: db.rollback()
        print(f"Lỗi tạo workspace: {e}")
        return jsonify({"message": f"Lỗi server khi tạo workspace: {str(e)}"}), 500
    finally:
        if db: db.close()

# (Dán 2 hàm API mới này vào app.py)

# ✅ API: Cập nhật Workspace (Sửa tên, icon, màu...)
@app.route('/api/workspaces/<int:workspace_id>', methods=['PUT'])
def update_workspace(workspace_id):
    print(f"--- PUT /api/workspaces/{workspace_id} ĐƯỢC GỌI ---")
    
    # 1. Xác thực người dùng (Lấy user_id người đang SỬA)
    user_id, token_error = get_user_id_from_token()
    if token_error: return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    data = request.get_json()
    db: Session = None
    try:
        db = next(get_db())
        
        # 2. Tìm workspace
        workspace = db.query(Workspace).filter(Workspace.workspace_id == workspace_id).first()
        if not workspace:
            return jsonify({"error": "Workspace không tồn tại"}), 404
            
        # 3. Kiểm tra quyền (Chỉ Owner mới được sửa)
        if workspace.owner_id != user_id:
             return jsonify({"error": "Bạn không có quyền sửa workspace này"}), 403
        
        # 4. Cập nhật các trường
        workspace.name = data.get('name', workspace.name)
        workspace.description = data.get('description', workspace.description)
        workspace.type = data.get('type', workspace.type)
        workspace.color = data.get('color', workspace.color)
        workspace.icon = data.get('icon', workspace.icon)
        
        db.commit()
        db.refresh(workspace)
        
        # 5. Trả về workspace đã cập nhật (format giống như khi tạo)
        return jsonify({
            "id": workspace.workspace_id,
            "name": workspace.name,
            "description": workspace.description,
            "type": workspace.type,
            "color": workspace.color,
            "icon": workspace.icon,
            "starred": workspace.starred,
            # (Các trường count này có thể giữ nguyên hoặc tính toán lại nếu cần)
        }), 200
        
    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi cập nhật workspace: {str(e)}"}), 500
    finally:
        if db: db.close()

# ✅ API: Xóa Workspace
@app.route('/api/workspaces/<int:workspace_id>', methods=['DELETE'])
def delete_workspace(workspace_id):
    print(f"--- DELETE /api/workspaces/{workspace_id} ĐƯỢC GỌI ---")
    
    # 1. Xác thực người dùng (Lấy user_id người đang XÓA)
    user_id, token_error = get_user_id_from_token()
    if token_error: return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    db: Session = None
    try:
        db = next(get_db())
        
        # 2. Tìm workspace
        workspace = db.query(Workspace).filter(Workspace.workspace_id == workspace_id).first()
        if not workspace:
            return jsonify({"error": "Workspace không tồn tại"}), 404
            
        # 3. Kiểm tra quyền (Chỉ Owner mới được xóa)
        if workspace.owner_id != user_id:
             return jsonify({"error": "Chỉ chủ sở hữu mới có quyền xóa workspace này"}), 403
        
        # 4. Xóa
        # (Model đã có cascade='all, delete-orphan' nên members, boards, lists, cards... sẽ tự động bị xóa theo)
        db.delete(workspace)
        db.commit()
        
        return jsonify({"message": "Đã xóa workspace thành công"}), 200
        
    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        # Lỗi khóa ngoại có thể xảy ra nếu 'ondelete' chưa được cấu hình đúng ở mọi nơi
        return jsonify({"message": f"Lỗi server khi xóa workspace: {str(e)}"}), 500
    finally:
        if db: db.close()

# ✅ API: Lấy chi tiết Workspace (GET /api/workspaces/<id>)
@app.route('/api/workspaces/<int:workspace_id>', methods=['GET'])
def get_workspace_detail(workspace_id):
    print(f"--- GET /api/workspaces/{workspace_id} ĐƯỢC GỌI ---")
    
    # 1. Xác thực người dùng (Lấy user_id)
    user_id, token_error = get_user_id_from_token()
    if token_error:
        return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    db: Session = None
    try:
        db = next(get_db())

        # 2. Truy vấn Workspace chính
        workspace = db.query(Workspace).filter(Workspace.workspace_id == workspace_id).first()
        if not workspace:
            return jsonify({"message": "Workspace không tồn tại"}), 404
        
        # 3. Kiểm tra user có phải là thành viên/owner không
        is_member = db.query(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id
        ).first()
        
        if not is_member and workspace.type == 'private':
            return jsonify({"message": "Bạn không có quyền truy cập workspace này"}), 403
            
        # 4. Lấy Board (Giả sử chỉ có một board chính)
        board = db.query(Board).filter(Board.workspace_id == workspace_id).first()
        if not board:
            return jsonify({"message": "Không tìm thấy board chính cho workspace này"}), 404
            
        # 5. Lấy Lists và Cards
        lists_db = db.query(BoardList).filter(BoardList.board_id == board.board_id).order_by(BoardList.position).all()
        
        lists_data = []
        for lst in lists_db:
            # Truy vấn cards cho từng list
            cards_db = db.query(BoardCard).filter(BoardCard.list_id == lst.list_id).order_by(BoardCard.position).all()
            
            cards_data = []
            for card in cards_db:
                 assigned_labels = db.query(CardLabel.label_id).filter(CardLabel.card_id == card.card_id).all()
                 label_ids = [label[0] for label in assigned_labels]
                 
                 cards_data.append({
                    "id": card.card_id,
                    "title": card.title,
                    "description": card.description,
                    "priority": card.priority,
                    "assignee": card.assignee_id, # <-- (SỬA) Tên trường là 'assignee'
                    "listId": lst.list_id,
                    "dueDate": card.due_date.isoformat() if card.due_date else None,
                    "labelIds": label_ids
                 })
            
            lists_data.append({
                "id": lst.list_id,
                "title": lst.title,
                "cards": cards_data,
                "listType": lst.list_type
            })
            
        # --- (CODE SỬA) Lấy danh sách thành viên (Hiệu quả hơn và lấy avatar_url) ---
        members_db = db.query(WorkspaceMember)\
            .options(joinedload(WorkspaceMember.user))\
            .filter(WorkspaceMember.workspace_id == workspace_id).all()
            
        member_list = []
        for m in members_db:
            if not m.user: # Bỏ qua nếu user liên quan đã bị xóa
                continue
            member_list.append({
                "id": m.user.user_id,
                "name": m.user.username,
                "email": m.user.email,
                "role": m.role,
                "joinedDate": m.joined_at.strftime("%d/%m/%Y"),
                "avatar": m.user.avatar_url or None # <-- LẤY AVATAR THẬT (hoặc None)
            })
        # --- (KẾT THÚC SỬA) ---
        
        # 7. Trả về toàn bộ dữ liệu chi tiết
        return jsonify({
            "workspace": {
                "id": workspace.workspace_id,
                "name": workspace.name,
                "description": workspace.description,
                "type": workspace.type,
                "color": workspace.color,
                "icon": workspace.icon,
                "starred": workspace.starred
            },
            "lists": lists_data,
            "members": member_list # Trả về danh sách thành viên đã sửa
        }), 200

    except Exception as e:
        if db: db.rollback()
        print(f"Lỗi lấy chi tiết workspace {workspace_id}:")
        traceback.print_exc()
        return jsonify({"message": f"Không thể tải workspace. Vui lòng thử lại. Lỗi server: {str(e)}"}), 500
    finally:
        if db: db.close()

# ✅ API: Mời thành viên mới vào Workspace
@app.route('/api/workspaces/<int:workspace_id>/invite', methods=['POST'])
def invite_member(workspace_id):
    print(f"--- POST /api/workspaces/{workspace_id}/invite ĐƯỢC GỌI ---")
    
    # 1. Xác thực người dùng (Lấy user_id người MỜI)
    inviter_id, token_error = get_user_id_from_token()
    if token_error:
        return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    data = request.get_json()
    email_to_invite = data.get('email')
    target_role = data.get('role', 'member')

    if not email_to_invite:
        return jsonify({"error": "Thiếu email để mời"}), 400

    db: Session = None
    try:
        db = next(get_db())

        # 2. Kiểm tra quyền (chỉ owner/admin mới được mời)
        inviter_member_entry = db.query(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == inviter_id
        ).first()
        
        if not inviter_member_entry or inviter_member_entry.role not in ['owner', 'admin']:
            return jsonify({"error": "Bạn không có quyền mời thành viên vào Workspace này"}), 403
            
        # (MỚI) Lấy thông tin của người mời và workspace
        inviter_user = db.query(User).filter(User.user_id == inviter_id).first()
        workspace = db.query(Workspace).filter(Workspace.workspace_id == workspace_id).first()
        if not inviter_user or not workspace:
             return jsonify({"error": "Không tìm thấy thông tin người mời hoặc workspace"}), 404

        # 3. Tìm user được mời trong hệ thống
        user_to_invite = db.query(User).filter(User.email == email_to_invite).first()
        if not user_to_invite:
            return jsonify({"error": "Người dùng với email này không tồn tại trong hệ thống"}), 404
            
        # 4. Kiểm tra xem user đã là thành viên chưa
        is_already_member = db.query(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_to_invite.user_id
        ).first()

        if is_already_member:
            return jsonify({"error": f"Người dùng {user_to_invite.username} đã là thành viên"}), 400
            
        if user_to_invite.user_id == inviter_id:
            return jsonify({"error": "Bạn không thể tự mời chính mình"}), 400

        # 5. Thêm thành viên vào bảng WorkspaceMember
        new_member_entry = WorkspaceMember(
            workspace_id=workspace_id,
            user_id=user_to_invite.user_id,
            role=target_role
        )
        db.add(new_member_entry)
        
        # --- (CODE MỚI) Tạo thông báo cho người ĐƯỢC MỜI ---
        notification_content = f"{inviter_user.username} đã mời bạn tham gia Workspace '{workspace.name}'."
        
        new_notification = Notification(
            user_id=user_to_invite.user_id, # Gửi cho người được mời
            type='workspace_invite',
            content=notification_content,
            reference_id=workspace_id # ID của workspace
        )
        db.add(new_notification)
        # --- (KẾT THÚC CODE MỚI) ---

        db.commit() # Commit 1 lần
        db.refresh(new_member_entry) # Lấy joined_at

        # 6. Trả về thông tin thành viên vừa thêm
        return jsonify({
            "message": f"Đã mời {user_to_invite.username} thành công!",
            "member": {
                "id": user_to_invite.user_id,
                "name": user_to_invite.username,
                "email": user_to_invite.email,
                "role": target_role,
                "joinedDate": new_member_entry.joined_at.strftime("%d/%m/%Y"),
                "avatar": user_to_invite.avatar_url or "👤"
            }
        }), 201

    except Exception as e:
        if db: db.rollback()
        print(f"Lỗi mời thành viên: {e}")
        traceback.print_exc()
        return jsonify({"error": f"Lỗi server khi mời thành viên: {str(e)}"}), 500
    finally:
        if db: db.close()
        
        
# ✅ API: Thêm Card mới vào List
@app.route('/api/workspaces/<int:workspace_id>/lists/<int:list_id>/cards', methods=['POST'])
def add_card(workspace_id, list_id):
    print(f"--- POST /api/workspaces/{workspace_id}/lists/{list_id}/cards ĐƯỢC GỌI ---")
    
    # 1. Xác thực người dùng
    user_id, token_error = get_user_id_from_token()
    if token_error:
        return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    data = request.get_json()
    title = data.get('title')
    priority = data.get('priority', 'medium')
    description = data.get('description', None)

    if not title:
        return jsonify({"error": "Thiếu tiêu đề card"}), 400

    db: Session = None
    try:
        db = next(get_db())

        # 2. Kiểm tra List tồn tại
        board_list = db.query(BoardList).filter(BoardList.list_id == list_id).first()
        if not board_list:
            return jsonify({"error": "List không tồn tại"}), 404
            
        # 3. Tính toán vị trí mới (position = số lượng cards hiện có)
        current_card_count = db.query(BoardCard).filter(BoardCard.list_id == list_id).count()
        
        # 4. Tạo Card mới
        new_card = BoardCard(
            list_id=list_id,
            title=title,
            description=description,
            priority=priority,
            # Assignee_id có thể được thêm vào sau nếu cần
            position=current_card_count # Đặt vị trí ở cuối
        )
        db.add(new_card)
        db.commit()
        db.refresh(new_card)

        # 5. Trả về Card vừa tạo
        return jsonify({
            "id": new_card.card_id,
            "title": new_card.title,
            "description": new_card.description,
            "priority": new_card.priority,
            "listId": new_card.list_id,
            "assignee": new_card.assignee_id or None,
            "position": new_card.position
        }), 201

    except Exception as e:
        if db: db.rollback()
        print(f"Lỗi thêm card vào list {list_id}: {e}")
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi thêm card: {str(e)}"}), 500
    finally:
        if db: db.close()     
        
# (Trong file app.py)
# THAY THẾ TOÀN BỘ HÀM check_calendar_reminders CŨ BẰNG HÀM NÀY (v5):

def check_calendar_reminders(app):
    """
    Worker (v5 - SỬA LỖI RACE/SKIP) chạy nền để kiểm tra và gửi thông báo + EMAIL.
    - Đã sửa lỗi "Gap" (khe hở thời gian) bằng cách nhìn lùi 60s.
    - Dùng cờ 'reminder_sent' để tăng hiệu suất và loại bỏ kiểm tra Notification.
    """
    WORKER_SLEEP_SECONDS = 60 
    
    print(f"⏰ Starting Calendar Reminder Worker (v5 - Robust Logic) - Sleep: {WORKER_SLEEP_SECONDS}s", flush=True)
    
    while True:
        try:
            with app.app_context(): # Truy cập app context đã được truyền vào
                db: Session = None
                try: 
                    db = next(get_db()) 
                    
                    now = datetime.now(timezone.utc)
                    # Nhìn lại quá khứ đúng bằng thời gian ngủ (sleep) để không bỏ lỡ
                    lookback_time = now - timedelta(seconds=WORKER_SLEEP_SECONDS)
                    reminder_window_end = now + timedelta(minutes=15)

                    print(f"Worker (v5) [lúc {now.strftime('%H:%M:%S')} UTC] tìm trong khoảng [{lookback_time.strftime('%H:%M:%S')} đến {reminder_window_end.strftime('%H:%M:%S')}]", flush=True)

                    upcoming_events = db.query(CalendarEvent).options(
                        joinedload(CalendarEvent.user) 
                    ).filter(
                        # THAY ĐỔI LỚN NHẤT: Bỏ qua kiểm tra Notification
                        CalendarEvent.reminder_sent == False,        # 1. Chỉ lấy sự kiện CHƯA GỬI
                        CalendarEvent.start_time > lookback_time,    # 2. Bắt đầu sau lần check TRƯỚC
                        CalendarEvent.start_time <= reminder_window_end # 3. Bắt đầu trong 15 phút TỚI
                    ).all()

                    if upcoming_events:
                        print(f"🔔🔔🔔 Worker (v5) TÌM THẤY {len(upcoming_events)} SỰ KIỆN ĐỂ GỬI!", flush=True)
                    else:
                        print(f"Worker (v5) không tìm thấy sự kiện nào.", flush=True)

                    for event in upcoming_events:
                        if not event.user:
                            print(f"⚠️ Bỏ qua Event ID {event.event_id} (không có user)", flush=True)
                            continue
                            
                        # Nếu sự kiện tìm thấy: GỬI VÀ ĐÁNH DẤU (Loại bỏ khối 'if not existing_notif:')
                        print(f"--- Đang xử lý Event ID {event.event_id} cho User {event.user.email} ---", flush=True)
                        
                        # 1. Tạo thông báo TRONG APP
                        local_tz = timezone(timedelta(hours=7)) 
                        local_start_time = event.start_time.astimezone(local_tz)
                        notif_content = f"Sự kiện '{event.title}' sắp bắt đầu lúc {local_start_time.strftime('%H:%M %d/%m')}"
                        
                        new_notif = Notification(
                            user_id=event.user_id,
                            type='event_reminder',
                            content=notif_content,
                            reference_id=event.event_id
                        )
                        db.add(new_notif)
                        
                        # 2. Gửi thông báo EMAIL
                        try:
                            msg = Message(
                                subject=f"[STMSUAI] Nhắc nhở: {event.title}",
                                sender=app.config['MAIL_DEFAULT_SENDER'],
                                recipients=[event.user.email] 
                            )
                            # ... (Phần HTML email giữ nguyên) ...
                            msg.html = f"""
                            <p>Chào bạn {event.user.username},</p>
                            <p>Đây là nhắc nhở tự động từ STMSUAI cho sự kiện của bạn:</p>
                            <p style="font-size: 16px;"><b>Sự kiện:</b> {event.title}</p>
                            <p style="font-size: 16px;"><b>Bắt đầu lúc:</b> {local_start_time.strftime('%H:%M ngày %d/%m/%Y')}</p>
                            <br><p>Chúc bạn một ngày làm việc hiệu quả! Đội ngũ STMSUAI - Admin Minh</p>
                            """
                            mail.send(msg)
                            print(f"✅ Đã GỬI EMAIL nhắc nhở cho {event.user.email}", flush=True)
                            
                        except Exception as mail_err:
                            print(f"❌ LỖI GỬI EMAIL cho {event.user.email}: {mail_err}", flush=True)
                            traceback.print_exc()

                        # 3. Đánh dấu sự kiện này là "đã gửi" (RẤT QUAN TRỌNG)
                        event.reminder_sent = True
                        print(f"🚩 Đã đánh dấu 'reminder_sent=True' cho Event ID {event.event_id}", flush=True)

                        db.commit() 
                        print(f"✅ ĐÃ TẠO NHẮC NHỞ (in-app) cho Event ID {event.event_id}", flush=True)
                        
                except Exception as e:
                    if db: db.rollback()
                    print(f"❌ Lỗi nghiêm trọng trong Calendar Worker: {e}", flush=True)
                    traceback.print_exc()
                finally:
                    if db: db.close()
            
            # 4. Ngủ rồi chạy lại
            print(f"⏰ Calendar Worker (v5) sleeping for {WORKER_SLEEP_SECONDS} seconds...", flush=True)
            time.sleep(WORKER_SLEEP_SECONDS) 

        except KeyboardInterrupt:
            print("🛑 Stopping Calendar Worker...")
            break

@app.route('/api/tasks/<int:task_id>/complete', methods=['POST'])
def mark_task_as_completed(task_id):
    print(f"--- API /api/tasks/{task_id}/complete ĐƯỢC GỌI ---")
    
    # 1. Xác thực user
    user_id, token_error = get_user_id_from_token() 
    if token_error:
        return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    db: Session = None
    try:
        db = next(get_db())
        
        # 2. Lấy thông tin user hoàn thành
        completing_user = db.query(User).filter(User.id == user_id).first()
        if not completing_user:
            return jsonify({"message": "Không tìm thấy user"}), 404

        # 3. Lấy thông tin task
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return jsonify({"message": "Không tìm thấy công việc"}), 404
        
        # 4. Lấy thông tin Workspace từ Task
        # Giả định cấu trúc: Task -> BoardList -> Board -> Workspace
        board_list = db.query(BoardList).filter(BoardList.id == task.board_list_id).first()
        if not board_list:
            return jsonify({"message": "Không tìm thấy cột của công việc"}), 404
            
        board = db.query(Board).filter(Board.id == board_list.board_id).first()
        if not board:
             return jsonify({"message": "Không tìm thấy bảng của công việc"}), 404
        
        workspace_id = board.workspace_id
        if not workspace_id:
            return jsonify({"message": "Công việc này không thuộc workspace nào"}), 404

        # 5. Tạo nội dung thông báo
        notification_message = f"**{completing_user.full_name}** đã hoàn thành công việc: **{task.title}**"
        link_to = f"/workspace/{workspace_id}/board/{board.id}" # Link tới trang task board

        # 6. Lấy danh sách members trong workspace để gửi thông báo
        members = db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == workspace_id).all()
        
        new_notifications = []
        user_emails_to_notify = [] # Chuẩn bị cho việc gửi mail
        
        for member in members:
            member_id = member.user_id
            
            # Không gửi thông báo cho chính người vừa hoàn thành
            if member_id == user_id:
                continue
                
            # Tạo notification trong DB
            new_notif = Notification(
                user_id=member_id,
                message=notification_message,
                link_to=link_to,
                created_by=user_id 
            )
            db.add(new_notif)
            new_notifications.append(new_notif)
            
            # (Chuẩn bị cho mail) Lấy email của user
            member_user = db.query(User.email).filter(User.id == member_id).first()
            if member_user and member_user.email:
                user_emails_to_notify.append(member_user.email)
        
        db.commit()
        
        # 7. Gửi Socket.IO event cho các user liên quan (real-time)
        creator_info = {
            "id": completing_user.id,
            "full_name": completing_user.full_name,
            "avatar": completing_user.avatar_url
        }
                
        for notif in new_notifications:
            db.refresh(notif) # Lấy ID và created_at
            notification_data = {
                "id": notif.id,
                "message": notif.message,
                "link_to": notif.link_to,
                "is_read": notif.is_read,
                "created_at": notif.created_at.isoformat(),
                "creator": creator_info 
            }
            
            # Gửi tới "phòng" của user_id đó
            print(f"--- SOCKET: Gửi 'new_notification' tới room 'user_{notif.user_id}' ---")
            socketio.emit('new_notification', notification_data, room=f'user_{notif.user_id}')
            
        # 8. (Tùy chọn) Gửi Email
        send_completion_email_placeholder(
            recipients=user_emails_to_notify, 
            completer_name=completing_user.full_name, 
            task_title=task.title, 
            link=link_to
        )
        
        return jsonify({"message": "Đã tạo thông báo hoàn thành", "sent_to_members": len(new_notifications)}), 200

    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi tạo thông báo: {str(e)}"}), 500
    finally:
        if db: db.close()
        
# --- (HÀM PLACEHOLDER) Thêm hàm này vào file app.py ---
def send_completion_email_placeholder(recipients, completer_name, task_title, link):
    """
    Hàm placeholder để gửi email thông báo.
    Bạn cần tích hợp một dịch vụ email thật (ví dụ: Flask-Mail, SendGrid) ở đây.
    """
    if not recipients:
        print("--- EMAIL: Không có người nhận để gửi mail.")
        return

    print(f"--- EMAIL (Placeholder): Đang 'gửi' mail tới {len(recipients)} người ---")
    print(f"--- Tới: {', '.join(recipients)}")
    print(f"--- Tiêu đề: [Hoàn thành] {task_title}")
    print(f"--- Nội dung: {completer_name} vừa hoàn thành công việc: {task_title}")
    print(f"--- Link: {link}")
    print("--------------------------------------------------")
    pass

# --- KẾT THÚC API THÔNG BÁO HOÀN THÀNH ---    


# --- (CODE TỪ SNIPPET CỦA BẠN) API THÔNG BÁO ---

@app.route('/api/notifications/mark-all-read', methods=['POST'])
def mark_all_notifications_read():
    print(f"--- API /api/notifications/mark-all-read ĐƯỢC GỌI ---")
    
    # 1. Xác thực user
    user_id, token_error = get_user_id_from_token()
    if token_error:
        return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    db: Session = None
    try:
        db = next(get_db())
        
        # 2. Cập nhật tất cả thông báo CHƯA ĐỌC (is_read = False) thành ĐÃ ĐỌC (is_read = True)
        db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).update({"is_read": True}, synchronize_session=False)
        
        db.commit()
        
        return jsonify({"message": "Đã đánh dấu tất cả là đã đọc"}), 200

    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi đánh dấu đã đọc: {str(e)}"}), 500
    finally:
        if db: db.close()

# --- KẾT THÚC API THÔNG BÁO ---        

# ✅ API: Thêm List mới vào Board mặc định của Workspace
@app.route('/api/workspaces/<int:workspace_id>/lists', methods=['POST'])
def add_list(workspace_id):
    print(f"--- POST /api/workspaces/{workspace_id}/lists ĐƯỢC GỌI ---")

    # 1. Xác thực người dùng
    user_id, token_error = get_user_id_from_token()
    if token_error:
        return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    data = request.get_json()
    title = data.get('title')

    if not title:
        return jsonify({"error": "Thiếu tiêu đề List"}), 400

    db: Session = None
    try:
        db = next(get_db())

        # 2. Kiểm tra quyền và tìm Board mặc định
        workspace = db.query(Workspace).filter(Workspace.workspace_id == workspace_id).first()
        board = db.query(Board).filter(Board.workspace_id == workspace_id).first()
        
        # --- (ĐÃ SỬA) ---
        # Kiểm tra xem user có phải là THÀNH VIÊN của workspace không
        member_entry = db.query(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id
        ).first()

        if not workspace or not board:
            return jsonify({"error": "Workspace hoặc Board không tồn tại"}), 404
            
        # Chỉ cần là thành viên (member, admin, owner) là được
        if not member_entry:
            return jsonify({"error": "Bạn không có quyền tạo List trong Workspace này"}), 403
        # --- (KẾT THÚC SỬA) ---

        # 3. Tính toán position mới (cuối cùng)
        max_position = db.query(func.max(BoardList.position))\
                         .filter(BoardList.board_id == board.board_id).scalar()
        new_position = (max_position or 0) + 1
        
        # 4. Tạo List mới
        new_list = BoardList(
            board_id=board.board_id,
            title=title,
            position=new_position,
            list_type='custom' # Gán list_type mặc định
        )
        db.add(new_list)
        db.commit()
        db.refresh(new_list)

        # 5. Trả về List vừa tạo (đầy đủ thông tin)
        return jsonify({
            "id": new_list.list_id,
            "title": new_list.title,
            "cards": [], # Trả về mảng rỗng cho list mới tạo
            "listType": new_list.list_type
        }), 201

    except Exception as e:
        if db: db.rollback()
        print(f"Lỗi tạo list: {e}")
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi tạo list: {str(e)}"}), 500
    finally:
        if db: db.close()
# --- (ĐÃ SỬA) API CHO FORUM/POST ---

# ✅ API: Lấy tất cả Posts (Feed) - ĐÃ NÂNG CẤP
@app.route('/api/posts', methods=['GET'])
def get_posts():
    print("--- GET /api/posts ĐƯỢC GỌI (v2 - Reactions) ---")
    
    user_id, token_error = get_user_id_from_token()
    
    db: Session = None
    try:
        db = next(get_db())
        
        posts_db = db.query(Post)\
            .options(joinedload(Post.user))\
            .order_by(desc(Post.created_at))\
            .limit(50)\
            .all()

        posts_list = []
        for post in posts_db:
            # Lấy tất cả reactions cho post này
            all_reactions = db.query(Reaction).filter(Reaction.post_id == post.post_id).all()
            
            # Đếm số lượng cho từng loại reaction
            reaction_counts = {}
            for r in all_reactions:
                reaction_counts[r.reaction_type] = reaction_counts.get(r.reaction_type, 0) + 1

            # Tìm reaction của user hiện tại (nếu có)
            user_reaction = None
            if user_id:
                for r in all_reactions:
                    if r.user_id == user_id:
                        user_reaction = r.reaction_type
                        break
            
            # Đếm comment
            comment_count = db.query(Comment).filter(Comment.post_id == post.post_id).count()

            posts_list.append({
                "id": post.post_id,
                "content": post.content,
                "image_url": post.image_url,
                "created_at": post.created_at.isoformat(),
                "reaction_counts": reaction_counts, # Trả về object đếm
                "comment_count": comment_count,
                "user_reaction": user_reaction, # Trả về reaction của user (vd: "like", "haha", null)
                "author": {
                    "user_id": post.user.user_id,
                    "username": post.user.username,
                    "avatar_url": post.user.avatar_url
                }
            })
            
        return jsonify(posts_list), 200

    except Exception as e:
        if db: db.rollback()
        print(f"Lỗi lấy posts: {e}")
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi lấy posts: {str(e)}"}), 500
    finally:
        if db: db.close()

# ✅ API: Tạo Post mới (Giữ nguyên)
@app.route('/api/posts', methods=['POST'])
def create_post():
    print("--- POST /api/posts ĐƯỢC GỌI ---")
    
    user_id, token_error = get_user_id_from_token()
    if token_error:
        return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    content = request.form.get('content')
    image_file = request.files.get('image_file')
    
    if not content:
        return jsonify({"message": "Nội dung bài đăng không được để trống"}), 400

    db: Session = None
    image_url = None
    try:
        db = next(get_db())
        
        if image_file:
            try:
                upload_result = cloudinary.uploader.upload(image_file, width=800, crop="limit")
                image_url = upload_result.get('secure_url')
                print(f"Ảnh đã upload: {image_url}")
            except Exception as e:
                print(f"Lỗi tải ảnh lên Cloudinary: {e}")
                pass 

        new_post = Post(
            user_id=user_id,
            content=content,
            image_url=image_url
        )
        db.add(new_post)
        db.commit()
        db.refresh(new_post)

        user = db.query(User).filter(User.user_id == user_id).first()
        
        # Trả về post với format mới
        return jsonify({
            "id": new_post.post_id,
            "content": new_post.content,
            "image_url": new_post.image_url,
            "created_at": new_post.created_at.isoformat(),
            "reaction_counts": {}, # Post mới chưa có reaction
            "comment_count": 0,
            "user_reaction": None, # User chưa react post của chính mình
            "author": {
                "user_id": user.user_id,
                "username": user.username,
                "avatar_url": user.avatar_url
            }
        }), 201

    except Exception as e:
        if db: db.rollback()
        print(f"Lỗi tạo post: {e}")
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi tạo post: {str(e)}"}), 500
    finally:
        if db: db.close()

# ✅ API: React (Like / Haha / Sad...) một Post - ĐÃ SỬA LỖI COMMIT
@app.route('/api/posts/<int:post_id>/react', methods=['POST'])
def react_to_post(post_id):
    print(f"--- POST /api/posts/{post_id}/react ĐƯỢC GỌI ---")
    
    user_id, token_error = get_user_id_from_token()
    if token_error:
        return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401
        
    data = request.get_json()
    reaction_type = data.get('reaction_type') 

    db: Session = None
    try:
        db = next(get_db())
        
        post = db.query(Post).filter(Post.post_id == post_id).first()
        if not post:
            return jsonify({"message": "Bài viết không tồn tại"}), 404
        
        existing_reaction = db.query(Reaction).filter(
            Reaction.post_id == post_id,
            Reaction.user_id == user_id
        ).first()

        new_user_reaction = None

        if existing_reaction:
            if existing_reaction.reaction_type == reaction_type or reaction_type is None:
                db.delete(existing_reaction)
                new_user_reaction = None
            else:
                existing_reaction.reaction_type = reaction_type
                new_user_reaction = reaction_type
        elif reaction_type is not None:
            new_reaction = Reaction(
                post_id=post_id,
                user_id=user_id,
                reaction_type=reaction_type
            )
            db.add(new_reaction)
            new_user_reaction = reaction_type
            
        # --- (ĐÃ SỬA) Không commit vội ---
        # db.commit() # <--- XÓA DÒNG NÀY

        # --- TẠO THÔNG BÁO ---
        if new_user_reaction is not None and post.user_id != user_id:
            reactor = db.query(User).filter(User.user_id == user_id).first()
            
            existing_notif = db.query(Notification).filter(
                Notification.user_id == post.user_id,
                Notification.reference_id == post_id,
                Notification.type == 'new_reaction',
                Notification.is_read == False
            ).first()
            
            if existing_notif:
                existing_notif.content = f"{reactor.username} và những người khác đã bày tỏ cảm xúc về bài viết của bạn."
                existing_notif.created_at = func.now() 
            else:
                notification_content = f"{reactor.username} đã bày tỏ cảm xúc về bài viết của bạn."
                new_notification = Notification(
                    user_id=post.user_id, 
                    type='new_reaction',
                    content=notification_content,
                    reference_id=post_id 
                )
                db.add(new_notification) # <--- Chỉ add (không commit)
            
        # --- (ĐÃ SỬA) Commit 1 lần duy nhất TẠI ĐÂY ---
        db.commit() 
        # --- KẾT THÚC SỬA ---

        # Đếm lại tất cả reaction
        all_reactions = db.query(Reaction).filter(Reaction.post_id == post_id).all()
        reaction_counts = {}
        for r in all_reactions:
            reaction_counts[r.reaction_type] = reaction_counts.get(r.reaction_type, 0) + 1

        return jsonify({
            "message": f"React successfully",
            "reaction_counts": reaction_counts,
            "user_reaction": new_user_reaction
        }), 200

    except Exception as e:
        if db: db.rollback()
        print(f"Lỗi react post {post_id}: {e}")
        return jsonify({"message": f"Lỗi server khi react post: {str(e)}"}), 500
    finally:
        if db: db.close()
        
# ✅ API: Lấy tất cả Comments cho 1 Post (API MỚI)
@app.route('/api/posts/<int:post_id>/comments', methods=['GET'])
def get_post_comments(post_id):
    print(f"--- GET /api/posts/{post_id}/comments ĐƯỢC GỌI ---")
    
    db: Session = None
    try:
        db = next(get_db())
        
        # Lấy comments, join với user để lấy info, sắp xếp (mới nhất cuối cùng)
        comments_db = db.query(Comment)\
            .options(joinedload(Comment.user))\
            .filter(Comment.post_id == post_id)\
            .order_by(Comment.created_at.asc())\
            .all()
            
        comments_list = []
        for comment in comments_db:
            comments_list.append({
                "comment_id": comment.comment_id,
                "content": comment.content,
                "created_at": comment.created_at.isoformat(),
                "author": {
                    "user_id": comment.user.user_id,
                    "username": comment.user.username,
                    "avatar_url": comment.user.avatar_url
                }
            })
            
        return jsonify(comments_list), 200

    except Exception as e:
        if db: db.rollback()
        print(f"Lỗi lấy comments: {e}")
        return jsonify({"message": f"Lỗi server khi lấy comments: {str(e)}"}), 500
    finally:
        if db: db.close()

# ✅ API: Thêm bình luận - ĐÃ SỬA LỖI COMMIT
@app.route('/api/posts/<int:post_id>/comments', methods=['POST'])
def add_comment(post_id):
    print(f"--- POST /api/posts/{post_id}/comments ĐƯỢC GỌI ---")

    user_id, token_error = get_user_id_from_token()
    if token_error:
        return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401
        
    data = request.get_json()
    content = data.get('content')
    if not content:
        return jsonify({"message": "Nội dung bình luận không được để trống"}), 400

    db: Session = None
    try:
        db = next(get_db())
        
        post = db.query(Post).filter(Post.post_id == post_id).first()
        if not post:
            return jsonify({"message": "Bài viết không tồn tại"}), 404
        
        # 1. Tạo comment (chưa lưu)
        new_comment = Comment(
            post_id=post_id,
            user_id=user_id,
            content=content
        )
        db.add(new_comment)
        # --- (ĐÃ SỬA) XÓA DÒNG COMMIT Ở ĐÂY ---
        
        # Lấy thông tin user (người bình luận)
        user = db.query(User).filter(User.user_id == user_id).first()

        # 2. Tạo thông báo (chưa lưu)
        if post.user_id != user_id:
            notification_content = f"{user.username} đã bình luận về bài viết của bạn."
            new_notification = Notification(
                user_id=post.user_id, 
                type='new_comment',
                content=notification_content,
                reference_id=post_id 
            )
            db.add(new_notification)
            
        # --- (ĐÃ SỬA) Commit 1 lần duy nhất TẠI ĐÂY ---
        db.commit() 
        db.refresh(new_comment) # Lấy ID cho comment sau khi commit
        # --- KẾT THÚC SỬA ---

        # 4. Trả về comment vừa tạo
        return jsonify({
            "comment_id": new_comment.comment_id,
            "content": new_comment.content,
            "created_at": new_comment.created_at.isoformat(),
            "author": {
                "user_id": user.user_id,
                "username": user.username,
                "avatar_url": user.avatar_url
            }
        }), 201

    except Exception as e:
        if db: db.rollback()
        print(f"Lỗi comment post {post_id}: {e}")
        return jsonify({"message": f"Lỗi server khi comment: {str(e)}"}), 500
    finally:
        if db: db.close()
        
# --- KẾT THÚC API FORUM ---

# --- (CODE MỚI) API CHO CÁC THAO TÁC VỚI CARD/LIST ---

# ✅ API: Cập nhật List (Rename)
@app.route('/api/workspaces/<int:workspace_id>/lists/<int:list_id>', methods=['PUT'])
def update_list(workspace_id, list_id):
    print(f"--- PUT /api/workspaces/{workspace_id}/lists/{list_id} ĐƯỢC GỌI ---")
    user_id, token_error = get_user_id_from_token()
    if token_error: return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    data = request.get_json()
    title = data.get('title')
    if not title:
        return jsonify({"error": "Thiếu tiêu đề List"}), 400

    db: Session = None
    try:
        db = next(get_db())
        # (Thêm kiểm tra quyền nếu cần)
        list_to_update = db.query(BoardList).filter(BoardList.list_id == list_id).first()
        if not list_to_update:
            return jsonify({"error": "List không tồn tại"}), 404
        
        list_to_update.title = title
        db.commit()
        return jsonify({"message": "Cập nhật List thành công", "title": title}), 200
    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi cập nhật list: {str(e)}"}), 500
    finally:
        if db: db.close()

# ✅ API: Xóa List
@app.route('/api/workspaces/<int:workspace_id>/lists/<int:list_id>', methods=['DELETE'])
def delete_list(workspace_id, list_id):
    print(f"--- DELETE /api/workspaces/{workspace_id}/lists/{list_id} ĐƯỢC GỌI ---")
    user_id, token_error = get_user_id_from_token()
    if token_error: return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    db: Session = None
    try:
        db = next(get_db())
        # (Thêm kiểm tra quyền nếu cần)
        list_to_delete = db.query(BoardList).filter(BoardList.list_id == list_id).first()
        if not list_to_delete:
            return jsonify({"error": "List không tồn tại"}), 404
        
        # Xóa tất cả card con (do 'cascade' trong model)
        db.delete(list_to_delete)
        db.commit()
        return jsonify({"message": "Xóa List thành công"}), 200
    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi xóa list: {str(e)}"}), 500
    finally:
        if db: db.close()
        
# === (CODE MỚI) API SẮP XẾP LẠI VỊ TRÍ LIST ===
@app.route('/api/lists/reorder', methods=['PUT'])
def reorder_lists():
    print("--- PUT /api/lists/reorder ĐƯỢC GỌI ---")
    user_id, token_error = get_user_id_from_token()
    if token_error: return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    data = request.get_json()
    ordered_list_ids = data.get('ordered_ids') 
    
    if not ordered_list_ids:
        return jsonify({"error": "Thiếu mảng 'ordered_ids'"}), 400

    db: Session = None
    try:
        db = next(get_db())
        
        # (Thêm kiểm tra quyền ở đây nếu cần - ví dụ: kiểm tra xem user
        # có phải là thành viên của workspace chứa các list này không)
        
        # --- (LOGIC MỚI - AN TOÀN HƠN) ---
        # Thay vì dùng 'bulk update', chúng ta sẽ fetch và cập nhật
        
        # 1. Lấy tất cả các list trong một truy vấn (hiệu quả)
        lists_to_update = db.query(BoardList).filter(
            BoardList.list_id.in_(ordered_list_ids)
        ).all()
        
        # 2. Tạo một map để truy cập nhanh
        list_map = {lst.list_id: lst for lst in lists_to_update}
        
        # 3. Lặp qua mảng ID từ frontend để cập nhật 'position'
        for index, list_id in enumerate(ordered_list_ids):
            list_id_int = int(list_id) # Đảm bảo kiểu dữ liệu là integer
            if list_id_int in list_map:
                list_map[list_id_int].position = index
        # --- (KẾT THÚC LOGIC MỚI) ---
            
        db.commit()
        return jsonify({"message": "Đã cập nhật thứ tự list thành công"}), 200
        
    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi sắp xếp list: {str(e)}"}), 500
    finally:
        if db: db.close()
        
@app.route('/api/workspaces/<int:workspace_id>/cards/<int:card_id>', methods=['PUT'])
def update_card(workspace_id, card_id):
    print(f"--- PUT /api/workspaces/{workspace_id}/cards/{card_id} ĐƯỢC GỌI ---")
    
    # 1. Xác thực người dùng (Lấy user_id người đang SỬA)
    updater_id, token_error = get_user_id_from_token()
    if token_error: return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    data = request.get_json()

    db: Session = None
    try:
        db = next(get_db())
        card = db.query(BoardCard).filter(BoardCard.card_id == card_id).first()
        if not card:
            return jsonify({"error": "Card không tồn tại"}), 404

        # --- (CODE MỚI) Logic thông báo gán thẻ ---
        old_assignee_id = card.assignee_id
        # Lấy new_assignee_id từ data, *chỉ khi* 'assignee_id' tồn tại trong data
        new_assignee_id = data.get('assignee_id') if 'assignee_id' in data else old_assignee_id
        assignee_id_is_changing = 'assignee_id' in data
        # --- (KẾT THÚC CODE MỚI) ---

        # --- (BẮT ĐẦU SỬA) ---
        # Cập nhật các trường card
        card.title = data.get('title', card.title)
        card.description = data.get('description', card.description)
        card.priority = data.get('priority', card.priority)
        
        # Xử lý assignee_id
        if assignee_id_is_changing:
            card.assignee_id = data.get('assignee_id') # Sẽ là null nếu frontend gửi null

        # Xử lý due_date
        if 'due_date' in data:
            due_date_str = data.get('due_date')
            if due_date_str:
                # (Cần import 'datetime' và 'timezone' từ 'datetime' ở đầu file)
                card.due_date = datetime.fromisoformat(due_date_str.replace('Z', '+00:00'))
            else:
                card.due_date = None # Cho phép xóa due date
        # --- (KẾT THÚC SỬA) ---
        
        # --- (Logic thông báo gán thẻ - Giữ nguyên từ file của bạn) ---
        if (assignee_id_is_changing and 
            new_assignee_id is not None and 
            new_assignee_id != old_assignee_id and 
            new_assignee_id != updater_id):
            
            # Lấy thông tin người gán
            assigner_user = db.query(User).filter(User.user_id == updater_id).first()
            # Lấy thông tin workspace
            workspace = db.query(Workspace).filter(Workspace.workspace_id == workspace_id).first()

            if assigner_user and workspace:
                notification_content = f"{assigner_user.username} đã gán bạn cho thẻ '{card.title}' trong Workspace '{workspace.name}'."
                
                new_notification = Notification(
                    user_id=new_assignee_id, # Gửi cho người ĐƯỢC GÁN
                    type='card_assigned',
                    content=notification_content,
                    reference_id=workspace_id # Link tới Workspace
                )
                db.add(new_notification)
        # --- (KẾT THÚC LOGIC THÔNG BÁO) ---
        
        db.commit()
        db.refresh(card)
        
        # --- (BẮT ĐẦU SỬA) ---
        # Trả về card đã cập nhật
        updated_card_data = {
            "id": card.card_id,
            "title": card.title,
            "description": card.description,
            "priority": card.priority,
            "listId": card.list_id,
            "assignee": card.assignee_id, # Trả về assignee_id mới
            "position": card.position,
            "dueDate": card.due_date.isoformat() if card.due_date else None # <-- THÊM DÒNG NÀY
        }
        return jsonify({"message": "Cập nhật Card thành công", "card": updated_card_data}), 200
        # --- (KẾT THÚC SỬA) ---
        
    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi cập nhật card: {str(e)}"}), 500
    finally:
        if db: db.close()

# ✅ API: Xóa Card (ĐÂY LÀ API GÂY LỖI CHO BẠN)
@app.route('/api/workspaces/<int:workspace_id>/cards/<int:card_id>', methods=['DELETE'])
def delete_card(workspace_id, card_id):
    print(f"--- DELETE /api/workspaces/{workspace_id}/cards/{card_id} ĐƯỢC GỌI ---")
    user_id, token_error = get_user_id_from_token()
    if token_error: return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    db: Session = None
    try:
        db = next(get_db())
        card = db.query(BoardCard).filter(BoardCard.card_id == card_id).first()
        if not card:
            return jsonify({"error": "Card không tồn tại"}), 404
            
        db.delete(card)
        db.commit()
        return jsonify({"message": "Xóa Card thành công"}), 200
    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi xóa card: {str(e)}"}), 500
    finally:
        if db: db.close()

# ✅ API: Di chuyển Card (Move)
@app.route('/api/workspaces/<int:workspace_id>/cards/<int:card_id>/move', methods=['PUT'])
def move_card(workspace_id, card_id):
    print(f"--- PUT /api/workspaces/{workspace_id}/cards/{card_id}/move ĐƯỢC GỌI ---")
    user_id, token_error = get_user_id_from_token()
    if token_error: return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    data = request.get_json()
    new_list_id = data.get('list_id')
    new_position = data.get('position')

    if new_list_id is None or new_position is None:
        return jsonify({"error": "Thiếu list_id hoặc position mới"}), 400

    db: Session = None
    try:
        db = next(get_db())
        card = db.query(BoardCard).filter(BoardCard.card_id == card_id).first()
        if not card:
            return jsonify({"error": "Card không tồn tại"}), 404
            
        old_list_id = card.list_id
        old_position = card.position
        
        # 1. Cập nhật card được di chuyển
        card.list_id = new_list_id
        card.position = new_position
        
        # 2. Cập nhật lại position của các card còn lại trong list CŨ
        db.query(BoardCard)\
            .filter(BoardCard.list_id == old_list_id, BoardCard.position > old_position)\
            .update({"position": BoardCard.position - 1}, synchronize_session=False)

        # 3. Cập nhật lại position của các card trong list MỚI
        db.query(BoardCard)\
            .filter(BoardCard.list_id == new_list_id, BoardCard.card_id != card_id, BoardCard.position >= new_position)\
            .update({"position": BoardCard.position + 1}, synchronize_session=False)
            
        db.commit()
        return jsonify({"message": "Di chuyển Card thành công"}), 200
    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi di chuyển card: {str(e)}"}), 500
    finally:
        if db: db.close()
        
        # (Dán 3 hàm API này vào tệp app.py)

# === API 1: Lấy tất cả Labels của Workspace ===
@app.route('/api/workspaces/<int:workspace_id>/labels', methods=['GET'])
def get_workspace_labels(workspace_id):
    print(f"--- GET /api/workspaces/{workspace_id}/labels ĐƯỢC GỌI ---")
    user_id, token_error = get_user_id_from_token()
    if token_error: return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    db: Session = None
    try:
        db = next(get_db())
        # (Thêm kiểm tra quyền nếu cần)
        labels = db.query(Label).filter(Label.workspace_id == workspace_id).order_by(Label.name).all()
        labels_data = [{"id": l.label_id, "name": l.name, "color": l.color, "workspace_id": l.workspace_id} for l in labels]
        return jsonify(labels_data), 200
    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi lấy labels: {str(e)}"}), 500
    finally:
        if db: db.close()

# === API 2: Tạo Label mới cho Workspace ===
@app.route('/api/workspaces/<int:workspace_id>/labels', methods=['POST'])
def create_workspace_label(workspace_id):
    print(f"--- POST /api/workspaces/{workspace_id}/labels ĐƯỢC GỌI ---")
    user_id, token_error = get_user_id_from_token()
    if token_error: return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    data = request.get_json()
    name = data.get('name')
    color = data.get('color')
    if not name or not color:
        return jsonify({"error": "Thiếu tên (name) hoặc màu (color) của label"}), 400

    db: Session = None
    try:
        db = next(get_db())
        # (Thêm kiểm tra quyền nếu cần)
        new_label = Label(
            workspace_id=workspace_id,
            name=name,
            color=color
        )
        db.add(new_label)
        db.commit()
        db.refresh(new_label)
        
        return jsonify({
            "id": new_label.label_id, 
            "name": new_label.name, 
            "color": new_label.color, 
            "workspace_id": new_label.workspace_id
        }), 201
    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi tạo label: {str(e)}"}), 500
    finally:
        if db: db.close()

# === API 3: Gán / Gỡ Label khỏi Card ===
@app.route('/api/cards/<int:card_id>/labels', methods=['POST'])
def toggle_card_label(card_id):
    print(f"--- POST /api/cards/{card_id}/labels ĐƯỢC GỌI ---")
    user_id, token_error = get_user_id_from_token()
    if token_error: return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    data = request.get_json()
    label_id = data.get('label_id')
    if not label_id:
        return jsonify({"error": "Thiếu label_id"}), 400

    db: Session = None
    try:
        db = next(get_db())
        
        # Kiểm tra xem liên kết đã tồn tại chưa
        existing_link = db.query(CardLabel).filter(
            CardLabel.card_id == card_id,
            CardLabel.label_id == label_id
        ).first()
        
        if existing_link:
            # Nếu có -> Gỡ bỏ (DELETE)
            db.delete(existing_link)
            db.commit()
            return jsonify({"message": "Đã gỡ label khỏi card", "action": "removed"}), 200
        else:
            # Nếu chưa có -> Gán (CREATE)
            new_link = CardLabel(
                card_id=card_id,
                label_id=label_id
            )
            db.add(new_link)
            db.commit()
            return jsonify({"message": "Đã gán label vào card", "action": "added"}), 201
            
    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi gán label: {str(e)}"}), 500
    finally:
        if db: db.close()


# (Dán 6 hàm API mới này vào app.py)

from sqlalchemy.orm import joinedload # Đảm bảo đã import cái này ở đầu file

# --- (CODE MỚI) API CHO CHECKLIST ---

# ✅ API 1: Lấy TẤT CẢ checklists (và items) cho 1 card
@app.route('/api/cards/<int:card_id>/checklists', methods=['GET'])
def get_card_checklists(card_id):
    print(f"--- GET /api/cards/{card_id}/checklists ĐƯỢC GỌI ---")
    user_id, token_error = get_user_id_from_token()
    if token_error: return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    db: Session = None
    try:
        db = next(get_db())
        # Tải checklists và items lồng nhau 1 cách hiệu quả
        checklists_db = db.query(CardChecklist).filter(
            CardChecklist.card_id == card_id
        ).options(
            joinedload(CardChecklist.items)
        ).order_by(CardChecklist.position).all()
        
        checklists_data = []
        for cl in checklists_db:
            # Sắp xếp items theo vị trí
            sorted_items = sorted(cl.items, key=lambda item: item.position)
            
            items_data = [{
                "id": item.item_id,
                "title": item.title,
                "is_checked": item.is_checked,
                "position": item.position
            } for item in sorted_items]
            
            checklists_data.append({
                "id": cl.checklist_id,
                "title": cl.title,
                "position": cl.position,
                "items": items_data
            })
            
        return jsonify(checklists_data), 200
        
    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi lấy checklists: {str(e)}"}), 500
    finally:
        if db: db.close()

# ✅ API 2: Tạo một Checklist mới
@app.route('/api/cards/<int:card_id>/checklists', methods=['POST'])
def create_checklist(card_id):
    print(f"--- POST /api/cards/{card_id}/checklists ĐƯỢC GỌI ---")
    user_id, token_error = get_user_id_from_token()
    if token_error: return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    data = request.get_json()
    title = data.get('title')
    if not title: return jsonify({"error": "Thiếu tiêu đề checklist"}), 400

    db: Session = None
    try:
        db = next(get_db())
        
        # Tính vị trí mới
        max_pos = db.query(func.max(CardChecklist.position)).filter(CardChecklist.card_id == card_id).scalar() or 0
        
        new_checklist = CardChecklist(
            card_id=card_id,
            title=title,
            position=max_pos + 1
        )
        db.add(new_checklist)
        db.commit()
        db.refresh(new_checklist)
        
        # Trả về checklist mới (chưa có item)
        return jsonify({
            "id": new_checklist.checklist_id,
            "title": new_checklist.title,
            "position": new_checklist.position,
            "items": []
        }), 201
        
    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi tạo checklist: {str(e)}"}), 500
    finally:
        if db: db.close()

# ✅ API 3: Xóa một Checklist
@app.route('/api/checklists/<int:checklist_id>', methods=['DELETE'])
def delete_checklist(checklist_id):
    print(f"--- DELETE /api/checklists/{checklist_id} ĐƯỢC GỌI ---")
    user_id, token_error = get_user_id_from_token()
    if token_error: return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    db: Session = None
    try:
        db = next(get_db())
        checklist = db.query(CardChecklist).filter(CardChecklist.checklist_id == checklist_id).first()
        if not checklist: return jsonify({"error": "Checklist không tồn tại"}), 404
        
        db.delete(checklist) # Model đã có cascade="all, delete-orphan" nên items cũng bị xóa
        db.commit()
        return jsonify({"message": "Đã xóa checklist"}), 200
        
    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi xóa checklist: {str(e)}"}), 500
    finally:
        if db: db.close()

# ✅ API 4: Tạo một Checklist Item mới
@app.route('/api/checklists/<int:checklist_id>/items', methods=['POST'])
def create_checklist_item(checklist_id):
    print(f"--- POST /api/checklists/{checklist_id}/items ĐƯỢC GỌI ---")
    user_id, token_error = get_user_id_from_token()
    if token_error: return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401
    
    data = request.get_json()
    title = data.get('title')
    if not title: return jsonify({"error": "Thiếu nội dung (title) của item"}), 400

    db: Session = None
    try:
        db = next(get_db())
        # Tính vị trí mới
        max_pos = db.query(func.max(ChecklistItem.position)).filter(ChecklistItem.checklist_id == checklist_id).scalar() or 0
        
        new_item = ChecklistItem(
            checklist_id=checklist_id,
            title=title,
            position=max_pos + 1
        )
        db.add(new_item)
        db.commit()
        db.refresh(new_item)
        
        # Trả về item vừa tạo
        return jsonify({
            "id": new_item.item_id,
            "title": new_item.title,
            "is_checked": new_item.is_checked,
            "position": new_item.position
        }), 201
        
    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi tạo checklist item: {str(e)}"}), 500
    finally:
        if db: db.close()

# ✅ API 5: Cập nhật một Checklist Item (Check/Uncheck/Rename)
@app.route('/api/checklist-items/<int:item_id>', methods=['PUT'])
def update_checklist_item(item_id):
    print(f"--- PUT /api/checklist-items/{item_id} ĐƯỢC GỌI ---")
    user_id, token_error = get_user_id_from_token()
    if token_error: return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401
    
    data = request.get_json()
    db: Session = None
    try:
        db = next(get_db())
        item = db.query(ChecklistItem).filter(ChecklistItem.item_id == item_id).first()
        if not item: return jsonify({"error": "Checklist item không tồn tại"}), 404
        
        if 'title' in data:
            item.title = data['title']
        if 'is_checked' in data:
            item.is_checked = data['is_checked']
        
        db.commit()
        db.refresh(item)
        
        # Trả về item đã cập nhật
        return jsonify({
            "id": item.item_id,
            "title": item.title,
            "is_checked": item.is_checked,
            "position": item.position
        }), 200
        
    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi cập nhật item: {str(e)}"}), 500
    finally:
        if db: db.close()

# ✅ API 6: Xóa một Checklist Item
@app.route('/api/checklist-items/<int:item_id>', methods=['DELETE'])
def delete_checklist_item(item_id):
    print(f"--- DELETE /api/checklist-items/{item_id} ĐƯỢC GỌI ---")
    user_id, token_error = get_user_id_from_token()
    if token_error: return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401
    
    db: Session = None
    try:
        db = next(get_db())
        item = db.query(ChecklistItem).filter(ChecklistItem.item_id == item_id).first()
        if not item: return jsonify({"error": "Checklist item không tồn tại"}), 404
        
        db.delete(item)
        db.commit()
        return jsonify({"message": "Đã xóa checklist item"}), 200
        
    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi xóa item: {str(e)}"}), 500
    finally:
        if db: db.close()
        
# ✅ API 1: Lấy tất cả bình luận cho 1 card
@app.route('/api/cards/<int:card_id>/comments', methods=['GET'])
def get_card_comments(card_id):
    print(f"--- GET /api/cards/{card_id}/comments ĐƯỢC GỌI ---")
    user_id, token_error = get_user_id_from_token()
    if token_error: return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    db: Session = None
    try:
        db = next(get_db())
        # Tải comments và thông tin user (joinedload)
        comments_db = db.query(CardComment).filter(
            CardComment.card_id == card_id
        ).options(
            joinedload(CardComment.user)
        ).order_by(CardComment.created_at.asc()).all()
        
        comments_data = []
        for c in comments_db:
            author_data = {"username": "Người dùng đã xóa", "avatar_url": None}
            if c.user:
                author_data = {
                    "user_id": c.user.user_id,
                    "username": c.user.username,
                    "avatar_url": c.user.avatar_url
                }
                
            comments_data.append({
                "id": c.comment_id,
                "content": c.content,
                "created_at": c.created_at.isoformat(),
                "author": author_data
            })
            
        return jsonify(comments_data), 200
        
    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi lấy comments: {str(e)}"}), 500
    finally:
        if db: db.close()

# ✅ API 2: Đăng một bình luận mới
@app.route('/api/cards/<int:card_id>/comments', methods=['POST'])
def post_card_comment(card_id):
    print(f"--- POST /api/cards/{card_id}/comments ĐƯỢC GỌI ---")
    user_id, token_error = get_user_id_from_token()
    if token_error: return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401
    
    data = request.get_json()
    content = data.get('content')
    if not content: return jsonify({"error": "Nội dung bình luận không được để trống"}), 400

    db: Session = None
    try:
        db = next(get_db())
        
        # --- (CODE MỚI) Lấy thông tin card và người bình luận ---
        card = db.query(BoardCard).filter(BoardCard.card_id == card_id).first()
        commenter = db.query(User).filter(User.user_id == user_id).first()
        
        if not card or not commenter:
            return jsonify({"error": "Không tìm thấy card hoặc người dùng"}), 404
            
        # 1. Tạo bình luận
        new_comment = CardComment(
            card_id=card_id,
            user_id=user_id,
            content=content
        )
        db.add(new_comment)
        
        # --- (CODE MỚI) Logic tạo Thông báo ---
        # 2. Tạo thông báo nếu:
        #    a) Card này có người được gán (assignee)
        #    b) Người bình luận KHÔNG PHẢI là người được gán
        if card.assignee_id and card.assignee_id != user_id:
            
            # Lấy workspace_id để tạo link
            list_ = db.query(BoardList).filter(BoardList.list_id == card.list_id).first()
            board_ = db.query(Board).filter(Board.board_id == list_.board_id).first()
            workspace_id = board_.workspace_id

            notification_content = f"{commenter.username} đã bình luận về thẻ: '{card.title}'"
            
            new_notification = Notification(
                user_id=card.assignee_id, # Gửi cho người được gán
                type='new_card_comment',
                content=notification_content,
                reference_id=workspace_id # Gửi ID của workspace để điều hướng
            )
            db.add(new_notification)
            print(f"--- Đã tạo thông báo cho user {card.assignee_id} ---")
        # --- (KẾT THÚC CODE MỚI) ---

        db.commit()
        
        # Tải lại comment cùng với thông tin user để trả về
        db.refresh(new_comment)
        db.expunge(new_comment)
        comment_with_user = db.query(CardComment).options(
            joinedload(CardComment.user)
        ).filter(CardComment.comment_id == new_comment.comment_id).first()
        
        author_data = {
            "user_id": comment_with_user.user.user_id,
            "username": comment_with_user.user.username,
            "avatar_url": comment_with_user.user.avatar_url
        }

        # Trả về comment vừa tạo
        return jsonify({
            "id": comment_with_user.comment_id,
            "content": comment_with_user.content,
            "created_at": comment_with_user.created_at.isoformat(),
            "author": author_data
        }), 201
        
    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi đăng bình luận: {str(e)}"}), 500
    finally:
        if db: db.close()

# --- (CODE MỚI) ADMIN API DECORATOR ---
# Decorator này sẽ kiểm tra xem user có phải là admin không
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id, token_error = get_user_id_from_token()
        if token_error:
            return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401
        
        db = None
        try:
            db = next(get_db())
            user = db.query(User).filter(User.user_id == user_id).first()
            
            if not user or user.role != 'admin':
                return jsonify({"message": "Quyền truy cập bị từ chối. Cần quyền Admin."}), 403
            
        except Exception as e:
            return jsonify({"message": f"Lỗi máy chủ khi xác thực: {str(e)}"}), 500
        finally:
            if db:
                db.close()
                
        return f(*args, **kwargs)
    return decorated_function

# --- (CODE MỚI) ADMIN API ENDPOINTS ---

# ✅ API 1: Lấy Stats
@app.route('/api/admin/stats', methods=['GET'])
@admin_required
def get_admin_stats():
    db = None
    try:
        db = next(get_db())
        total_users = db.query(User).count()
        total_posts = db.query(Post).count()
        
        # Đếm user mới trong 24h
        twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(days=1)
        new_users = db.query(User).filter(User.created_at >= twenty_four_hours_ago).count()
        
        stats = {
            "totalUsers": total_users,
            "totalPosts": total_posts,
            "newUsers": new_users
        }
        return jsonify(stats), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi lấy stats: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# ✅ API 2: Lấy danh sách Users
@app.route('/api/admin/users', methods=['GET'])
@admin_required
def get_admin_users():
    db = None
    try:
        db = next(get_db())
        users_db = db.query(User).order_by(User.user_id.asc()).all()
        
        users_list = [{
            "user_id": user.user_id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at else None
        } for user in users_db]
        
        return jsonify(users_list), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi lấy users: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# ✅ API 3: Tạo User mới
@app.route('/api/admin/users', methods=['POST'])
@admin_required
def create_admin_user():
    data = request.get_json()
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role", "user")

    if not all([username, email, password]):
        return jsonify({"message": "Thiếu thông tin username, email hoặc password!"}), 400

    db = None
    try:
        db = next(get_db())
        if db.query(User).filter_by(email=email).first():
            return jsonify({"message": "Email đã tồn tại!"}), 400
        if db.query(User).filter_by(username=username).first():
            return jsonify({"message": "Username đã tồn tại!"}), 400

        hashed_pw = generate_password_hash(password)
        new_user = User(username=username, email=email, password_hash=hashed_pw, role=role)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Trả về user đã tạo
        return jsonify({
            "user_id": new_user.user_id,
            "username": new_user.username,
            "email": new_user.email,
            "role": new_user.role,
            "created_at": new_user.created_at.isoformat()
        }), 201
    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi tạo user: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# ✅ API 4: Sửa User
@app.route('/api/admin/users/<int:user_id>', methods=['PUT'])
@admin_required
def update_admin_user(user_id):
    data = request.get_json()
    
    db = None
    try:
        db = next(get_db())
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            return jsonify({"message": "User không tồn tại"}), 404
            
        # Kiểm tra email/username trùng (nếu có thay đổi)
        if data.get('email') and data.get('email') != user.email:
            if db.query(User).filter_by(email=data.get('email')).first():
                return jsonify({"message": "Email đã tồn tại"}), 400
            user.email = data.get('email')
            
        if data.get('username') and data.get('username') != user.username:
            if db.query(User).filter_by(username=data.get('username')).first():
                return jsonify({"message": "Username đã tồn tại"}), 400
            user.username = data.get('username')
        
        user.role = data.get('role', user.role)
        
        db.commit()
        db.refresh(user)
        
        return jsonify({
            "user_id": user.user_id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at.isoformat()
        }), 200
    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi sửa user: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# ✅ API 5: Xóa User
@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_admin_user(user_id):
    db = None
    try:
        db = next(get_db())
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            return jsonify({"message": "User không tồn tại"}), 404
        
        db.delete(user)
        db.commit()
        return jsonify({"message": f"Đã xóa User ID {user_id}"}), 200
    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        # Lỗi khóa ngoại (foreign key) có thể xảy ra nếu user này là owner của workspace
        return jsonify({"message": f"Lỗi server khi xóa user: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# ✅ API 6: Lấy danh sách Bài viết (Forum)
@app.route('/api/admin/posts', methods=['GET'])
@admin_required
def get_admin_posts():
    db = None
    try:
        db = next(get_db())
        posts_db = db.query(Post)\
            .options(joinedload(Post.user))\
            .order_by(desc(Post.created_at))\
            .all()
            
        posts_list = []
        for post in posts_db:
            # Lấy reactions cho post này
            all_reactions = db.query(Reaction).filter(Reaction.post_id == post.post_id).all()
            reaction_counts = {}
            for r in all_reactions:
                reaction_counts[r.reaction_type] = reaction_counts.get(r.reaction_type, 0) + 1
            
            posts_list.append({
                "post_id": post.post_id,
                "content": post.content,
                "image_url": post.image_url,
                "created_at": post.created_at.isoformat(),
                "author": {
                    "user_id": post.user.user_id,
                    "username": post.user.username
                },
                "reaction_counts": reaction_counts # Gửi object này để frontend tính tổng
            })
        return jsonify(posts_list), 200
    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi lấy posts: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# ✅ API 7: Xóa Bài viết (Forum)
@app.route('/api/admin/posts/<int:post_id>', methods=['DELETE'])
@admin_required
def delete_admin_post(post_id):
    db = None
    try:
        db = next(get_db())
        post = db.query(Post).filter(Post.post_id == post_id).first()
        if not post:
            return jsonify({"message": "Bài viết không tồn tại"}), 404
        
        db.delete(post)
        db.commit()
        return jsonify({"message": f"Đã xóa Bài viết ID {post_id}"}), 200
    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi xóa bài viết: {str(e)}"}), 500
    finally:
        if db:
            db.close()

# --- KẾT THÚC ADMIN API ENDPOINTS ---

# --- (CODE MỚI) API CHO BÁO CÁO (REPORTING) ---

# ✅ API 1 (User): Gửi báo cáo cho một bài viết
@app.route('/api/posts/<int:post_id>/report', methods=['POST'])
def report_post(post_id):
    print(f"--- POST /api/posts/{post_id}/report ĐƯỢC GỌI ---")
    
    # 1. Xác thực người báo cáo
    reporter_user_id, token_error = get_user_id_from_token()
    if token_error:
        return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    data = request.get_json()
    reason = data.get('reason')
    if not reason:
        return jsonify({"message": "Cần có lý do báo cáo"}), 400

    db: Session = None
    try:
        db = next(get_db())
        
        # 2. Kiểm tra bài viết tồn tại
        post = db.query(Post).filter(Post.post_id == post_id).first()
        if not post:
            return jsonify({"message": "Bài viết không tồn tại"}), 404
            
        # 3. (Tùy chọn) Kiểm tra xem user đã báo cáo bài này chưa
        existing_report = db.query(ReportedPost).filter(
            ReportedPost.post_id == post_id,
            ReportedPost.reporter_user_id == reporter_user_id
        ).first()
        
        if existing_report:
            return jsonify({"message": "Bạn đã báo cáo bài viết này rồi"}), 400

        # 4. Tạo báo cáo mới
        new_report = ReportedPost(
            post_id=post_id,
            reporter_user_id=reporter_user_id,
            reason=reason,
            status='pending'
        )
        db.add(new_report)
        db.commit()
        
        return jsonify({"message": "Đã gửi báo cáo thành công"}), 201

    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi gửi báo cáo: {str(e)}"}), 500
    finally:
        if db: db.close()

# ✅ API 2 (Admin): Lấy các bài viết bị báo cáo (chưa xử lý)
@app.route('/api/admin/reports/posts', methods=['GET'])
@admin_required # Dùng decorator an ninh
def get_pending_reports():
    print("--- GET /api/admin/reports/posts ĐƯỢC GỌI ---")
    db: Session = None
    try:
        db = next(get_db())
        
        # Lấy các báo cáo 'pending', join với Post và User (người báo cáo)
        reports_db = db.query(ReportedPost)\
            .options(
                joinedload(ReportedPost.post).joinedload(Post.user), # Lấy post và tác giả của post
                joinedload(ReportedPost.reporter) # Lấy người báo cáo
            )\
            .filter(ReportedPost.status == 'pending')\
            .order_by(ReportedPost.created_at.asc())\
            .all()
            
        reports_list = []
        for report in reports_db:
            
            # --- (ĐÃ SỬA LỖI 500) ---
            # Phải kiểm tra từng bước để tránh lỗi 'NoneType'
            if not report.post:
                print(f"Bỏ qua Report ID {report.report_id} vì post liên quan đã bị xóa.")
                continue
                
            if not report.reporter:
                print(f"Bỏ qua Report ID {report.report_id} vì reporter liên quan đã bị xóa.")
                continue
                
            if not report.post.user:
                print(f"Bỏ qua Report ID {report.report_id} vì tác giả của post liên quan đã bị xóa.")
                continue
            # --- KẾT THÚC SỬA ---
                
            reports_list.append({
                "report_id": report.report_id,
                "reason": report.reason,
                "report_date": report.created_at.isoformat(),
                "status": report.status,
                "reporter": {
                    "user_id": report.reporter.user_id,
                    "username": report.reporter.username
                },
                "post": {
                    "post_id": report.post.post_id,
                    "content": report.post.content,
                    "image_url": report.post.image_url,
                    "author": {
                         "user_id": report.post.user.user_id,
                         "username": report.post.user.username
                    }
                }
            })
            
        return jsonify(reports_list), 200

    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi lấy báo cáo: {str(e)}"}), 500
    finally:
        if db: db.close()
        
# ✅ API 3 (Admin): Xử lý một báo cáo (Xóa bài viết hoặc Bỏ qua)
@app.route('/api/admin/reports/resolve/<int:report_id>', methods=['PUT'])
@admin_required
def resolve_report(report_id):
    print(f"--- PUT /api/admin/reports/resolve/{report_id} ĐƯỢC GỌI ---")
    
    data = request.get_json()
    action = data.get('action') # 'delete' hoặc 'ignore'
    
    if action not in ['delete', 'ignore']:
        return jsonify({"message": "Hành động không hợp lệ (chỉ 'delete' hoặc 'ignore')"}), 400

    db: Session = None
    try:
        db = next(get_db())
        
        report = db.query(ReportedPost).filter(ReportedPost.report_id == report_id).first()
        if not report:
            return jsonify({"message": "Báo cáo không tồn tại"}), 404
            
        if report.status == 'resolved':
             return jsonify({"message": "Báo cáo này đã được xử lý"}), 400

        # --- (CODE NÂNG CẤP) Lấy thông tin của cả 2 bên ---
        reporter_user_id = report.reporter_user_id
        author_username = "một người dùng" 
        author_user_id = None # <-- (MỚI) Cần ID của tác giả
        
        post = db.query(Post).options(joinedload(Post.user)).filter(Post.post_id == report.post_id).first()
        
        # Lấy thông tin tác giả (nếu post còn tồn tại)
        if post and post.user:
            author_username = post.user.username
            author_user_id = post.user.user_id # <-- (MỚI) Lấy ID
        # --- (KẾT THÚC CODE NÂNG CẤP) ---

        if action == 'delete':
            # 1. Tìm bài viết (đã lấy ở trên)
            if post:
                # 2. Xóa bài viết (CSDL sẽ tự động xóa reactions, comments, reports)
                db.delete(post)
            else:
                # Nếu post không còn, chỉ cần đánh dấu report là đã xử lý
                report.status = 'resolved'
                
        elif action == 'ignore':
            # Chỉ cần đánh dấu là đã xử lý
            report.status = 'resolved'

        # --- (CODE SỬA) Logic gửi 2 thông báo riêng biệt ---
        
        # 1. Thông báo cho NGƯỜI BÁO CÁO (Reporter)
        if reporter_user_id:
            notification_content = "" 
            
            if action == 'delete':
                notification_content = f"Admin đã đồng ý báo cáo của bạn và xóa bài viết của {author_username}."
            elif action == 'ignore':
                notification_content = f"Admin không đồng ý với báo cáo của bạn về bài viết của {author_username}."

            new_notification_reporter = Notification(
                user_id=reporter_user_id, # Gửi cho người báo cáo
                type='report_resolved',
                content=notification_content,
                reference_id=report_id 
            )
            db.add(new_notification_reporter)

        # 2. (MỚI) Thông báo cho TÁC GIẢ (Author) NẾU bài bị xóa
        if action == 'delete' and author_user_id and author_user_id != reporter_user_id:
            # (Kiểm tra author_user_id != reporter_user_id để tránh 1 người nhận 2 thông báo)
            
            notification_content_author = "Admin đã xóa một bài viết của bạn do vi phạm chính sách."
            
            new_notification_author = Notification(
                user_id=author_user_id, # Gửi cho tác giả
                type='post_deleted_by_admin', # Loại thông báo mới
                content=notification_content_author,
                reference_id=report.post_id # Gửi ID của post (dù nó đã bị xóa)
            )
            db.add(new_notification_author)
            
        # --- (KẾT THÚC CODE SỬA) ---
            
        db.commit() # Commit 1 lần duy nhất
        return jsonify({"message": f"Đã xử lý báo cáo. Hành động: {action}"}), 200

    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi xử lý báo cáo: {str(e)}"}), 500
    finally:
        if db: db.close()

# --- KẾT THÚC API BÁO CÁO ---

# --- (CODE MỚI) API CHO THÔNG BÁO (NOTIFICATION) ---

# ✅ API 1 (GET): Lấy danh sách thông báo
@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    print("--- GET /api/notifications ĐƯỢC GỌI ---")
    
    # 1. Xác thực user
    user_id, token_error = get_user_id_from_token()
    if token_error:
        return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    db: Session = None
    try:
        db = next(get_db())
        
        # 2. Lấy 20 thông báo mới nhất
        notifications_db = db.query(Notification).filter(
            Notification.user_id == user_id
        ).order_by(desc(Notification.created_at)).limit(20).all()

        # 3. Đếm số thông báo CHƯA ĐỌC
        unread_count = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).count()
        
        # 4. Format dữ liệu trả về
        notifications_list = []
        for n in notifications_db:
            notifications_list.append({
                "id": n.notification_id,
                "content": n.content,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat(),
                "type": n.type,
                "reference_id": n.reference_id # (VD: post_id)
            })
            
        return jsonify({
            "notifications": notifications_list,
            "unread_count": unread_count
        }), 200

    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi lấy thông báo: {str(e)}"}), 500
    finally:
        if db: db.close()

# ✅ API 2 (POST): Đánh dấu tất cả là đã đọc (cho nút "Xóa tất cả")
@app.route('/api/notifications/mark-read', methods=['POST'])
def mark_notifications_read():
    print("--- POST /api/notifications/mark-read ĐƯỢC GỌI ---")
    
    # 1. Xác thực user
    user_id, token_error = get_user_id_from_token()
    if token_error:
        return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    db: Session = None
    try:
        db = next(get_db())
        
        # 2. Cập nhật tất cả thông báo CHƯA ĐỌC (is_read = False) thành ĐÃ ĐỌC (is_read = True)
        db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).update({"is_read": True}, synchronize_session=False)
        
        db.commit()
        
        return jsonify({"message": "Đã đánh dấu tất cả là đã đọc"}), 200

    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi đánh dấu đã đọc: {str(e)}"}), 500
    finally:
        if db: db.close()

# --- KẾT THÚC API THÔNG BÁO ---    

# === (CODE MỚI) API CHO "MY TASKS" DASHBOARD ===
@app.route('/api/me/tasks', methods=['GET'])
def get_my_tasks():
    print("--- GET /api/me/tasks (v4 - Gộp No Due Date) ĐƯỢC GỌI ---")
    user_id, token_error = get_user_id_from_token()
    if token_error: return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    db: Session = None
    try:
        db = next(get_db())
        
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        all_tasks = [] 

        # --- 1. Lấy BoardCard (từ Workspace) ---
        # (SỬA LỖI) Xóa filter 'due_date != None'
        my_cards_db = db.query(BoardCard).filter(
            BoardCard.assignee_id == user_id
        ).all()

        for card in my_cards_db:
            workspace_name = "Workspace" 
            workspace_id = None
            is_completed = False 
            try:
                list_ = db.query(BoardList).filter(BoardList.list_id == card.list_id).first()
                board_ = db.query(Board).filter(Board.board_id == list_.board_id).first()
                workspace_ = db.query(Workspace).filter(Workspace.workspace_id == board_.workspace_id).first()
                
                if workspace_:
                    workspace_name = workspace_.name
                    workspace_id = workspace_.workspace_id
                if list_:
                    is_completed = (list_.list_type == 'done') 
                    
            except Exception:
                pass 

            # Chỉ thêm nếu chưa hoàn thành
            if not is_completed:
                all_tasks.append({
                    "id": f"card-{card.card_id}", 
                    "title": card.title,
                    "priority": card.priority,
                    "due_date": card.due_date.isoformat() if card.due_date else None, # (CODE MỚI) Cho phép None
                    "workspace_name": workspace_name, 
                    "workspace_id": workspace_id, 
                    "type": "workspace_card",
                    "is_completed": is_completed 
                })

        # --- 2. Lấy Task (Cá nhân) ---
        # (SỬA LỖI) Xóa filter 'deadline != None'
        my_tasks_db = db.query(Task).filter(
            Task.creator_id == user_id,
            Task.status != 'done' # Chỉ lấy task chưa xong
        ).all()
        
        for task in my_tasks_db:
            all_tasks.append({
                "id": f"task-{task.task_id}", 
                "title": task.title,
                "priority": task.priority,
                "due_date": task.deadline.isoformat() if task.deadline else None, # (CODE MỚI) Cho phép None
                "workspace_name": "Việc cá nhân", 
                "workspace_id": None, 
                "type": "personal_task",
                "is_completed": False # (Vì đã lọc status != 'done')
            })

        # --- 3. Phân loại tất cả công việc ---
        tasks_overdue = []
        tasks_today = []
        tasks_upcoming = []
        tasks_no_due_date = [] # <-- (CODE MỚI) Nhóm thứ tư
        
        today_total = 0
        today_completed = 0
        
        for task_data in all_tasks:
            due_date_str = task_data['due_date']
            
            # (SỬA LỖI) Logic phân loại mới
            if due_date_str is None:
                tasks_no_due_date.append(task_data) # 1. Không có ngày
            else:
                due_date = datetime.fromisoformat(due_date_str.replace('Z', '+00:00'))
                
                if due_date < today_start:
                    tasks_overdue.append(task_data) # 2. Quá hạn
                elif due_date >= today_start and due_date < today_end:
                    tasks_today.append(task_data) # 3. Hôm nay
                    today_total += 1 # Vẫn tính stats cho Dashboard
                else:
                    tasks_upcoming.append(task_data) # 4. Sắp tới
        
        # (Lấy các task ĐÃ HOÀN THÀNH HÔM NAY để tính stats)
        # (Logic này cần được rà soát lại, nhưng tạm thời giữ nguyên để Dashboard không lỗi)
        # ... (Tạm thời bỏ qua logic 'today_completed' để tập trung vào 4 nhóm)

        tasks_overdue.sort(key=lambda x: x['due_date'])
        tasks_today.sort(key=lambda x: x['due_date'])
        tasks_upcoming.sort(key=lambda x: x['due_date'])

        return jsonify({
            "overdue": tasks_overdue,
            "today": tasks_today,
            "upcoming": tasks_upcoming,
            "no_due_date": tasks_no_due_date, # <-- (CODE MỚI) Gửi nhóm mới
            "stats": {
                "today_total": today_total,
                "today_completed": 0 # (Tạm thời = 0, sẽ sửa sau nếu cần)
            }
        }), 200
        
    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi lấy 'My Tasks': {str(e)}"}), 500
    finally:
        if db: db.close()
        
# ✅ API: Lấy TẤT CẢ tasks mà Host có thể chọn cho StudyRoom
@app.route('/api/study-room/host-tasks', methods=['GET'])
def get_study_room_host_tasks():
    print("--- GET /api/study-room/host-tasks ĐƯỢC GỌI ---")
    
    # 1. Xác thực Host
    user_id, token_error = get_user_id_from_token()
    if token_error: 
        return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    db: Session = None
    try:
        db = next(get_db())
        
        response_data = {
            "personal_tasks": [],
            "workspace_tasks": []
        }

        # --- 1. Lấy TẤT CẢ Task cá nhân (chưa done) ---
        my_tasks_db = db.query(Task).filter(
            Task.creator_id == user_id,
            Task.status != 'done'
        ).order_by(desc(Task.created_at)).all()
        
        for task in my_tasks_db:
            response_data["personal_tasks"].append({
                "id": f"task-{task.task_id}", 
                "title": task.title,
                "workspace_name": "Việc cá nhân" # Tên nhóm
            })

        # --- 2. Lấy TẤT CẢ Workspace Cards (chưa done) ---
        
        # 2a. Lấy tất cả workspace_id mà user là thành viên
        member_of_workspaces = db.query(WorkspaceMember.workspace_id).filter(
            WorkspaceMember.user_id == user_id
        ).all()
        # Chuyển đổi [(1,), (2,)] thành [1, 2]
        workspace_ids = [w[0] for w in member_of_workspaces]
        
        if not workspace_ids:
            # Nếu không ở workspace nào, trả về data đã có
            return jsonify(response_data), 200

        # 2b. Lấy thông tin Tên của các workspace đó
        workspaces_info = db.query(Workspace).filter(
            Workspace.workspace_id.in_(workspace_ids)
        ).all()
        
        workspace_map = {w.workspace_id: w.name for w in workspaces_info}
        
        # 2c. Lấy TẤT CẢ cards (chưa done) từ các workspace đó
        # (Join BoardCard -> BoardList -> Board để lọc theo workspace_id)
        # (Và lọc list_type != 'done')
        
        # Tạo alias để join
        ListAlias = aliased(BoardList)
        BoardAlias = aliased(Board)
        
        all_cards_db = db.query(BoardCard)\
            .join(ListAlias, BoardCard.list_id == ListAlias.list_id)\
            .join(BoardAlias, ListAlias.board_id == BoardAlias.board_id)\
            .filter(
                BoardAlias.workspace_id.in_(workspace_ids),
                ListAlias.list_type != 'done' # Chỉ lấy card chưa xong
            )\
            .options(joinedload(BoardCard.list).joinedload(BoardList.board))\
            .order_by(desc(BoardCard.created_at))\
            .all()
            
        # 2d. Sắp xếp các cards vào đúng workspace
        
        # Tạo cấu trúc lồng
        workspace_task_dict = {} # { 1: {"workspace_id": 1, "workspace_name": "Project A", "cards": []} }
        
        for card in all_cards_db:
            # Lấy workspace_id từ quan hệ đã được joinedload
            ws_id = card.list.board.workspace_id
            
            # Khởi tạo workspace nếu chưa có
            if ws_id not in workspace_task_dict:
                workspace_task_dict[ws_id] = {
                    "workspace_id": ws_id,
                    "workspace_name": workspace_map.get(ws_id, "Workspace không tên"),
                    "cards": []
                }
                
            # Thêm card vào
            workspace_task_dict[ws_id]["cards"].append({
                "id": f"card-{card.card_id}",
                "title": card.title
            })
            
        # Chuyển dict thành list
        response_data["workspace_tasks"] = list(workspace_task_dict.values())

        return jsonify(response_data), 200
        
    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi lấy host-tasks: {str(e)}"}), 500
    finally:
        if db: db.close()        
        
# ✅ API 1: Lấy trạng thái điểm danh tuần
@app.route('/api/me/check-in-status', methods=['GET'])
def get_check_in_status():
    user_id, token_error = get_user_id_from_token()
    if token_error: return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    db: Session = None
    try:
        db = next(get_db())
        
        # Tính toán ngày đầu tuần (Thứ 2) và cuối tuần (Chủ Nhật)
        today = date.today()
        start_of_week = today - timedelta(days=today.weekday()) # Thứ 2
        end_of_week = start_of_week + timedelta(days=6) # Chủ Nhật
        
        # Lấy các ngày đã check-in trong tuần này
        check_ins_db = db.query(UserCheckIn.check_in_date).filter(
            UserCheckIn.user_id == user_id,
            UserCheckIn.check_in_date >= start_of_week,
            UserCheckIn.check_in_date <= end_of_week
        ).all()
        
        # Chuyển đổi [('2025-11-10',), ('2025-11-11',)] thành ['2025-11-10', '2025-11-11']
        checked_in_dates = [c[0].isoformat() for c in check_ins_db]
        
        # Kiểm tra xem hôm nay đã check-in chưa
        today_checked_in = today.isoformat() in checked_in_dates
        
        # Lấy tổng số tomatoes của user
        user = db.query(User).filter(User.user_id == user_id).first()
        total_tomatoes = user.tomatoes if user else 0
        
        return jsonify({
            "checked_in_dates": checked_in_dates, # Mảng các ngày đã check-in
            "today_checked_in": today_checked_in, # boolean
            "total_tomatoes": total_tomatoes
        }), 200
        
    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server: {str(e)}"}), 500
    finally:
        if db: db.close()

# ✅ API 2: Thực hiện điểm danh
@app.route('/api/me/check-in', methods=['POST'])
def perform_check_in():
    user_id, token_error = get_user_id_from_token()
    if token_error: return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    db: Session = None
    try:
        db = next(get_db())
        today = date.today()
        
        # 1. Kiểm tra xem user đã check-in hôm nay chưa
        existing_check_in = db.query(UserCheckIn).filter(
            UserCheckIn.user_id == user_id,
            UserCheckIn.check_in_date == today
        ).first()
        
        if existing_check_in:
            return jsonify({"message": "Bạn đã điểm danh hôm nay rồi!"}), 400
            
        # 2. Lấy user để cộng "tomatoes"
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            return jsonify({"message": "Không tìm thấy người dùng"}), 404
            
        # 3. Tạo check-in mới
        tomatoes_to_earn = 2 # (Như bạn yêu cầu)
        new_check_in = UserCheckIn(
            user_id=user_id,
            check_in_date=today,
            tomatoes_earned=tomatoes_to_earn
        )
        db.add(new_check_in)
        
        # 4. Cộng "tomatoes"
        user.tomatoes = (user.tomatoes or 0) + tomatoes_to_earn
        
        db.commit()
        
        return jsonify({
            "message": f"Điểm danh thành công! Bạn nhận được {tomatoes_to_earn} 🍅.",
            "total_tomatoes": user.tomatoes,
            "checked_in_date": today.isoformat()
        }), 200

    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server: {str(e)}"}), 500
    finally:
        if db: db.close()   
        
# ✅ API: Lấy lịch sử các phòng StudyRoom đã tham gia
@app.route('/api/me/study-room-history', methods=['GET'])
def get_study_room_history():
    print("--- GET /api/me/study-room-history ĐƯỢC GỌI ---")
    
    # 1. Xác thực người dùng
    user_id, token_error = get_user_id_from_token()
    if token_error: 
        return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    db: Session = None
    try:
        db = next(get_db())
        
        # 2. Truy vấn lịch sử, join với bảng StudyRoom để lấy tên phòng
        history_entries = db.query(UserRoomHistory, StudyRoom.name)\
            .join(StudyRoom, UserRoomHistory.room_id == StudyRoom.room_id)\
            .filter(UserRoomHistory.user_id == user_id)\
            .order_by(desc(UserRoomHistory.last_joined_at))\
            .limit(10)\
            .all() # Lấy 10 phòng gần nhất

        # 3. Format dữ liệu trả về
        history_list = []
        for (history, room_name) in history_entries:
            history_list.append({
                "room_id": history.room_id,
                "room_name": room_name, # Lấy tên phòng từ join
                "last_joined_at": history.last_joined_at.isoformat()
            })
            
        return jsonify(history_list), 200

    except Exception as e:
        if db: db.rollback()
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi lấy lịch sử phòng: {str(e)}"}), 500
    finally:
        if db: db.close()          
        
# --- (API MỚI) Cập nhật cài đặt phòng (Chỉ Host) ---
@socketio.on('host_update_settings')
def handle_update_settings(data):
    user_sid = request.sid
    room_id = data.get('room_id')
    new_settings = data.get('settings') # {focus: 25, shortBreak: 5, longBreak: 15}

    if not room_id or not new_settings: return

    db: Session = None
    try:
        db = next(get_db())
        room_db = db.query(StudyRoom).filter(StudyRoom.room_id == room_id).first()
        
        # Check Host
        host_info = study_rooms.get(room_id, {}).get('users', {}).get(user_sid, {})
        if not host_info or host_info.get('user_id') != room_db.host_user_id:
            emit('error', {'message': 'Chỉ chủ phòng mới được thay đổi cài đặt'})
            return

        # Cập nhật DB
        room_db.focus_duration = int(new_settings['focus'])
        room_db.short_break_duration = int(new_settings['shortBreak'])
        room_db.long_break_duration = int(new_settings['longBreak'])
        db.commit()
        
        # Cập nhật Cache
        if room_id in study_rooms:
            study_rooms[room_id]['settings'] = new_settings
            # Nếu timer đang ko chạy và đang ở mode tương ứng, update luôn hiển thị
            tm = study_rooms[room_id]['timer_state']
            if not tm['isRunning']:
                if tm['mode'] == 'focus': tm['timeLeft'] = tm['duration'] = new_settings['focus'] * 60
                elif tm['mode'] == 'shortBreak': tm['timeLeft'] = tm['duration'] = new_settings['shortBreak'] * 60
                elif tm['mode'] == 'longBreak': tm['timeLeft'] = tm['duration'] = new_settings['longBreak'] * 60
                socketio.emit('timer_update', tm, room=room_id)

        socketio.emit('room_settings_updated', new_settings, room=room_id)
        # emit('error', {'message': 'Đã cập nhật cài đặt thời gian!'}) # Dùng 'error' để hiện toast cho nhanh :D

    except Exception as e:
        traceback.print_exc()
    finally:
        if db: db.close()

# --- (API MỚI) Thành viên bấm "Sẵn sàng" ---
@socketio.on('member_ready')
def handle_member_ready(data):
    user_sid = request.sid
    room_id = data.get('room_id')
    
    if room_id in study_rooms:
        room_data = study_rooms[room_id]
        
        # 1. Thêm người này vào danh sách ready
        room_data['ready_users'].add(user_sid)
        
        # 2. Tính toán số lượng (LOẠI TRỪ HOST)
        all_users_count = len(room_data['users'])
        
        total_needing_ready = max(0, all_users_count - 1) # Trừ Host ra
        current_ready_count = len(room_data['ready_users'])
        
        # 3. Gửi update
        socketio.emit('ready_status_update', {
            'ready_count': current_ready_count, 
            'total_users': total_needing_ready
        }, room=room_id)
        
        # 4. (Tùy chọn) Nếu ĐỦ NGƯỜI rồi thì báo cho Host biết (hiện hiệu ứng gì đó)
        if current_ready_count >= total_needing_ready and total_needing_ready > 0:
             pass
         
def seed_shop_items():
    """Tạo các vật phẩm mẫu cho Shop nếu chưa có."""
    db = next(get_db())
    try:
        if db.query(ShopItem).count() == 0:
            items = [
                # --- NAME COLORS ---
                ShopItem(name="Tên Vàng Kim", type="name_color", price=50, value="#FFD700", description="Tên bạn sẽ tỏa sáng như vàng."),
                ShopItem(name="Tên Đỏ Rực", type="name_color", price=30, value="#FF4500", description="Màu của sự nhiệt huyết."),
                ShopItem(name="Tên Xanh Neon", type="name_color", price=40, value="#00FF7F", description="Nổi bật và hiện đại."),
                
                # --- TITLES ---
                ShopItem(name="Danh hiệu: Học Bá", type="title", price=100, value="Học Bá", description="Chứng nhận chăm chỉ."),
                ShopItem(name="Danh hiệu: Chúa tể Focus", type="title", price=200, value="Chúa tể Focus", description="Không ai tập trung bằng bạn."),
                
                # --- FRAMES (Giả sử dùng CSS border hoặc ảnh có sẵn) ---
                ShopItem(name="Khung Lửa", type="frame", price=150, value="frame-fire", description="Khung avatar rực lửa."),
                ShopItem(name="Khung Vàng", type="frame", price=150, value="frame-gold", description="Khung avatar sang chảnh.")
            ]
            db.add_all(items)
            db.commit()
            print("✅ Đã tạo dữ liệu Shop mẫu.")
    except Exception as e:
        print(f"Lỗi seed shop: {e}")
    finally:
        db.close()

# Gọi hàm này 1 lần khi khởi động
seed_shop_items()

# ✅ API: Lấy danh sách Shop & Kho đồ của User
@app.route('/api/shop', methods=['GET'])
def get_shop_data():
    user_id, _ = get_user_id_from_token() # Lấy ID user hiện tại
    db = next(get_db())
    try:
        # 1. Lấy tất cả đồ trong Shop
        shop_items = db.query(ShopItem).all()
        
        # 2. Lấy ID các món user đã mua
        owned_item_ids = []
        if user_id:
            user_items = db.query(UserItem).filter(UserItem.user_id == user_id).all()
            owned_item_ids = [ui.item_id for ui in user_items]

        # 3. Format dữ liệu
        result = []
        for item in shop_items:
            result.append({
                "id": item.item_id,
                "name": item.name,
                "type": item.type,
                "price": item.price,
                "value": item.value,
                "description": item.description,
                "owned": item.item_id in owned_item_ids # True nếu đã mua
            })
            
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        db.close()

# ✅ API: Mua vật phẩm
@app.route('/api/shop/buy', methods=['POST'])
def buy_item():
    user_id, err = get_user_id_from_token()
    if err: return jsonify({"message": "Chưa đăng nhập"}), 401
    
    item_id = request.get_json().get('item_id')
    db = next(get_db())
    try:
        user = db.query(User).filter(User.user_id == user_id).first()
        item = db.query(ShopItem).filter(ShopItem.item_id == item_id).first()
        
        if not item: return jsonify({"message": "Vật phẩm không tồn tại"}), 404
        
        # Kiểm tra tiền
        if user.tomatoes < item.price:
            return jsonify({"message": "Bạn không đủ Cà chua!"}), 400
            
        # Kiểm tra đã mua chưa
        exists = db.query(UserItem).filter(UserItem.user_id == user_id, UserItem.item_id == item_id).first()
        if exists: return jsonify({"message": "Bạn đã sở hữu vật phẩm này"}), 400
        
        # Trừ tiền & Thêm đồ
        user.tomatoes -= item.price
        new_user_item = UserItem(user_id=user_id, item_id=item_id)
        db.add(new_user_item)
        db.commit()
        
        return jsonify({"message": "Mua thành công!", "new_tomatoes": user.tomatoes}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"message": str(e)}), 500
    finally:
        db.close()

# ✅ API: Trang bị vật phẩm
@app.route('/api/shop/equip', methods=['POST'])
def equip_item():
    user_id, err = get_user_id_from_token()
    if err: return jsonify({"message": "Chưa đăng nhập"}), 401
    
    data = request.get_json()
    item_id = data.get('item_id') # Nếu null nghĩa là gỡ bỏ
    item_type = data.get('type') # 'frame', 'title', 'name_color'
    
    db = next(get_db())
    try:
        user = db.query(User).filter(User.user_id == user_id).first()
        
        val_to_set = None
        
        if item_id:
            # Kiểm tra sở hữu
            owned = db.query(UserItem).filter(UserItem.user_id == user_id, UserItem.item_id == item_id).first()
            if not owned: return jsonify({"message": "Bạn chưa sở hữu vật phẩm này"}), 400
            
            item = db.query(ShopItem).filter(ShopItem.item_id == item_id).first()
            val_to_set = item.value
            
        # Cập nhật User
        if item_type == 'frame': user.equipped_frame_url = val_to_set
        elif item_type == 'title': user.equipped_title = val_to_set
        elif item_type == 'name_color': user.equipped_name_color = val_to_set
        
        db.commit()
        return jsonify({"message": "Cập nhật trang bị thành công!", "value": val_to_set}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"message": str(e)}), 500
    finally:
        db.close()      
        
# ✅ API ĐẶC BIỆT: Chạy 1 lần để thêm đồ vào Shop
@app.route('/api/seed-shop', methods=['GET'])
def seed_shop_manual():
    db = next(get_db())
    try:
        # 1. Xóa đồ cũ (nếu muốn reset lại từ đầu thì bỏ comment dòng dưới)
        # db.query(ShopItem).delete()
        
        # 2. Kiểm tra xem shop có trống không
        if db.query(ShopItem).count() > 0:
            return jsonify({"message": "Shop đã có đồ rồi! Không cần thêm nữa."})

        items = [
            # --- MÀU TÊN (NAME COLOR) ---
            ShopItem(name="Tên Vàng Kim", type="name_color", price=50, value="#FFD700", description="Tên bạn sẽ tỏa sáng như vàng ròng.", image_url="https://placehold.co/100x100/FFD700/white?text=Gold"),
            ShopItem(name="Tên Đỏ Rực", type="name_color", price=30, value="#FF4500", description="Màu của sự nhiệt huyết và năng lượng.", image_url="https://placehold.co/100x100/FF4500/white?text=Red"),
            ShopItem(name="Tên Xanh Neon", type="name_color", price=40, value="#00FF7F", description="Nổi bật, hiện đại và cá tính.", image_url="https://placehold.co/100x100/00FF7F/white?text=Neon"),
            ShopItem(name="Tên Tím Mộng Mơ", type="name_color", price=35, value="#9370DB", description="Nhẹ nhàng và đầy bí ẩn.", image_url="https://placehold.co/100x100/9370DB/white?text=Purple"),

            # --- DANH HIỆU (TITLE) ---
            ShopItem(name="Danh hiệu: Học Bá", type="title", price=100, value="Học Bá", description="Chứng nhận chăm chỉ học tập.", image_url="https://placehold.co/100x100/eee/333?text=HocBa"),
            ShopItem(name="Danh hiệu: Chúa tể Focus", type="title", price=200, value="Chúa tể Focus", description="Không ai có thể làm phiền bạn.", image_url="https://placehold.co/100x100/eee/333?text=Focus"),
            ShopItem(name="Danh hiệu: Đại Gia Cà Chua", type="title", price=500, value="Đại Gia 🍅", description="Người giàu có nhất StudyRoom.", image_url="https://placehold.co/100x100/eee/333?text=Rich"),

            # --- KHUNG AVATAR (FRAME) ---
            # (Lưu ý: value ở đây là mã màu border hoặc tên class CSS nếu bạn làm nâng cao)
            ShopItem(name="Khung Lửa Thiêng", type="frame", price=150, value="#FF4500", description="Khung avatar rực lửa bao quanh.", image_url="https://placehold.co/100x100/000/FF4500?text=Fire"),
            ShopItem(name="Khung Hoàng Kim", type="frame", price=300, value="#FFD700", description="Sang trọng và quý phái.", image_url="https://placehold.co/100x100/000/FFD700?text=Gold"),
            ShopItem(name="Khung Băng Giá", type="frame", price=120, value="#00BFFF", description="Mát lạnh và cool ngầu.", image_url="https://placehold.co/100x100/000/00BFFF?text=Ice")
        ]
        
        db.add_all(items)
        db.commit()
        return jsonify({"message": f"Đã thêm thành công {len(items)} vật phẩm vào Shop!"})

    except Exception as e:
        db.rollback()
        return jsonify({"message": f"Lỗi: {str(e)}"}), 500
    finally:
        db.close()           

if __name__ == '__main__':
    is_main_process = os.environ.get('WERKZEUG_RUN_MAIN') == 'true'

    if not app.debug or is_main_process:
        print("⏰ Starting Calendar Reminder Worker (THREAD)...")
        reminder_thread = threading.Thread(target=check_calendar_reminders, args=(app,), daemon=True)
        reminder_thread.start()
        print("✅ Worker started.")
    else:
        print("💡 Skipping worker initialization in reloader process.")

    print("🚀 Starting Flask-SocketIO server with eventlet...")
    socketio.run(app, host='::', port=5000, debug=True, use_reloader=False)
