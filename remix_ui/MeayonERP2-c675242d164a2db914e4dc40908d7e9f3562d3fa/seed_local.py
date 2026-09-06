import sys
from pathlib import Path

project_root = Path(__file__).resolve().parent.parent
if str(project_root) not in sys.path:
	sys.path.insert(0, str(project_root))

from backend.backend.auth import hash_password
from backend.backend.database import SessionLocal, init_db
from backend.backend.models import Role, User

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

