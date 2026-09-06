import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

for root, dirs, files in os.walk(current_dir):
    if 'database.py' in files:
        sys.path.insert(0, root)
        parent = os.path.dirname(root)
        if parent not in sys.path:
            sys.path.insert(0, parent)

try:
    from database import init_db, SessionLocal
    from models import Role, User
    from auth import hash_password
except ImportError:
    try:
        from Backend.backend.database import init_db, SessionLocal
        from Backend.backend.models import Role, User
        from Backend.backend.auth import hash_password
    except ImportError:
        from backend.backend.database import init_db, SessionLocal
        from backend.backend.models import Role, User
        from backend.backend.auth import hash_password

init_db()
db = SessionLocal()
try:
    role = db.query(Role).filter(Role.name == "Admin").first()
    if role is None:
        role = Role(name="Admin")
        db.add(role)
        db.flush()

    user = db.query(User).filter(User.email == "admin@meayon.local").first()
    if user is None:
        user = User(
            username="admin",
            email="admin@meayon.local",
            full_name="System Administrator",
            password_hash=hash_password("admin123"),
            role_id=role.id,
            is_active=True,
            status="ACTIVE",
        )
        db.add(user)
    else:
        user.username = "admin"
        user.password_hash = hash_password("admin123")
        user.is_active = True
        user.status = "ACTIVE"
    db.commit()
    print("تم إنشاء حساب المشرف محلياً بنجاح!")
finally:
    db.close()
