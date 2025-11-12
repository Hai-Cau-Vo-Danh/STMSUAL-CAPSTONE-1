from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os

# Load biến môi trường từ file .env
load_dotenv()

# Lấy URL kết nối từ .env
DATABASE_URL = os.getenv("DATABASE_URL")

# --- SỬA LẠI TẠI ĐÂY ---
engine = create_engine(
    DATABASE_URL,
    echo=False, # Tắt 'echo=True' sau khi debug xong, nó gây spam log
    pool_pre_ping=True,  # <-- BẮT BUỘC: Kiểm tra kết nối trước khi dùng
    pool_recycle=3600,   # <-- Nên có: Làm mới kết nối sau 1 giờ
    connect_args={
        "sslmode": "require",
        "connect_timeout": 10
    }
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Hàm tiện ích để dùng trong Flask routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Kiểm tra kết nối database khi chạy trực tiếp file
if __name__ == "__main__":
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("✅ Database connected successfully:", result.fetchone())
    except Exception as e:
        print("❌ Database connection error:", e)
