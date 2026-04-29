from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import logging
import uuid
import re
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, field_validator


# ============================================================
# Setup
# ============================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("agentlar")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"

PHONE_REGEX = re.compile(r"^\+998\d{9}$")
PIN_REGEX = re.compile(r"^\d{4,6}$")


# ============================================================
# Models
# ============================================================
Role = Literal["admin", "agent", "warehouse"]
OrderStatus = Literal["new", "preparing", "delivered"]


class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone: str
    name: str
    role: Role
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserCreate(BaseModel):
    phone: str
    name: str
    role: Role
    pin: str

    @field_validator("phone")
    @classmethod
    def _phone_ok(cls, v: str) -> str:
        if not PHONE_REGEX.match(v):
            raise ValueError("Telefon raqam +998XXXXXXXXX formatida bo'lishi kerak")
        return v

    @field_validator("pin")
    @classmethod
    def _pin_ok(cls, v: str) -> str:
        if not PIN_REGEX.match(v):
            raise ValueError("PIN 4-6 raqamdan iborat bo'lishi kerak")
        return v


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[Role] = None
    is_active: Optional[bool] = None


class ResetPinIn(BaseModel):
    pin: str

    @field_validator("pin")
    @classmethod
    def _pin_ok(cls, v: str) -> str:
        if not PIN_REGEX.match(v):
            raise ValueError("PIN 4-6 raqamdan iborat bo'lishi kerak")
        return v


class LoginIn(BaseModel):
    phone: str
    pin: str

    @field_validator("phone")
    @classmethod
    def _phone_ok(cls, v: str) -> str:
        if not PHONE_REGEX.match(v):
            raise ValueError("Telefon raqam +998XXXXXXXXX formatida bo'lishi kerak")
        return v


class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CategoryCreate(BaseModel):
    name: str


class OrderCreate(BaseModel):
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    custom_category: Optional[str] = None
    product_name: str
    quantity: Optional[str] = None
    note: Optional[str] = None
    client_phone: str
    client_name: Optional[str] = None
    store_address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    photos: List[str] = Field(default_factory=list)

    @field_validator("photos")
    @classmethod
    def _max_two_photos(cls, v: List[str]) -> List[str]:
        if len(v) > 2:
            raise ValueError("Maksimum 2 ta foto yuklash mumkin")
        return v


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    agent_id: str
    agent_name: str
    agent_phone: str
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    custom_category: Optional[str] = None
    product_name: str
    quantity: Optional[str] = None
    note: Optional[str] = None
    client_phone: str
    client_name: Optional[str] = None
    store_address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    photos: List[str] = Field(default_factory=list)
    status: OrderStatus = "new"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status_history: List[dict] = Field(default_factory=list)


# ============================================================
# Helpers
# ============================================================
def _now() -> datetime:
    return datetime.now(timezone.utc)


def hash_pin(pin: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pin.encode("utf-8"), salt).decode("utf-8")


def verify_pin(pin: str, pin_hash: str) -> bool:
    try:
        return bcrypt.checkpw(pin.encode("utf-8"), pin_hash.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, phone: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "phone": phone,
        "role": role,
        "exp": _now() + timedelta(days=30),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Avtorizatsiya talab qilinadi")
    token = auth[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token muddati tugagan")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Yaroqsiz token")

    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user or not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Foydalanuvchi topilmadi yoki bloklangan")
    return user


def require_roles(*roles: str):
    async def checker(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Ruxsat berilmagan")
        return user

    return checker


def serialize_doc(doc: dict) -> dict:
    if doc is None:
        return doc
    out = {k: v for k, v in doc.items() if k not in ("_id", "pin_hash")}
    for k, v in out.items():
        if isinstance(v, datetime):
            out[k] = v.isoformat()
    return out


# ============================================================
# App / Router
# ============================================================
app = FastAPI(title="Agentlar Boshqaruv API")
api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"ok": True, "service": "agentlar-api"}


# ---------- Auth (Phone + PIN) ----------
@api.post("/auth/login")
async def login(payload: LoginIn):
    user = await db.users.find_one({"phone": payload.phone})
    if not user:
        raise HTTPException(status_code=404, detail="Telefon raqam topilmadi")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Akkaunt bloklangan")
    pin_hash = user.get("pin_hash")
    if not pin_hash or not verify_pin(payload.pin, pin_hash):
        raise HTTPException(status_code=401, detail="PIN noto'g'ri")

    token = create_access_token(user["id"], user["phone"], user["role"])
    return {"ok": True, "token": token, "user": serialize_doc(user)}


@api.get("/auth/me")
async def auth_me(user: dict = Depends(get_current_user)):
    return serialize_doc(user)


# ---------- Users (admin) ----------
@api.get("/users")
async def list_users(user: dict = Depends(require_roles("admin"))):
    cursor = db.users.find({}, {"_id": 0, "pin_hash": 0}).sort("created_at", -1)
    items = await cursor.to_list(1000)
    return [serialize_doc(u) for u in items]


@api.post("/users")
async def create_user(payload: UserCreate, user: dict = Depends(require_roles("admin"))):
    existing = await db.users.find_one({"phone": payload.phone})
    if existing:
        raise HTTPException(status_code=400, detail="Bu raqam allaqachon ro'yxatdan o'tgan")
    new_user = User(phone=payload.phone, name=payload.name, role=payload.role)
    doc = new_user.model_dump()
    doc["pin_hash"] = hash_pin(payload.pin)
    await db.users.insert_one(doc)
    return serialize_doc(doc)


@api.patch("/users/{user_id}")
async def update_user(user_id: str, payload: UserUpdate, user: dict = Depends(require_roles("admin"))):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="Yangilash uchun maydon yo'q")
    res = await db.users.update_one({"id": user_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    fresh = await db.users.find_one({"id": user_id}, {"_id": 0, "pin_hash": 0})
    return serialize_doc(fresh)


@api.post("/users/{user_id}/reset-pin")
async def reset_pin(
    user_id: str, payload: ResetPinIn, user: dict = Depends(require_roles("admin"))
):
    res = await db.users.update_one(
        {"id": user_id}, {"$set": {"pin_hash": hash_pin(payload.pin)}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    return {"ok": True}


@api.delete("/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(require_roles("admin"))):
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="O'zingizni o'chira olmaysiz")
    res = await db.users.delete_one({"id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    return {"ok": True}


# ---------- Categories ----------
@api.get("/categories")
async def list_categories(user: dict = Depends(get_current_user)):
    cursor = db.categories.find({}, {"_id": 0}).sort("name", 1)
    items = await cursor.to_list(1000)
    return [serialize_doc(c) for c in items]


@api.post("/categories")
async def create_category(payload: CategoryCreate, user: dict = Depends(require_roles("admin"))):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Nom bo'sh bo'lmasin")
    existing = await db.categories.find_one({"name": name})
    if existing:
        raise HTTPException(status_code=400, detail="Bu kategoriya allaqachon mavjud")
    cat = Category(name=name)
    await db.categories.insert_one(cat.model_dump())
    return serialize_doc(cat.model_dump())


@api.delete("/categories/{cat_id}")
async def delete_category(cat_id: str, user: dict = Depends(require_roles("admin"))):
    res = await db.categories.delete_one({"id": cat_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kategoriya topilmadi")
    return {"ok": True}


# ---------- Orders ----------
@api.post("/orders")
async def create_order(payload: OrderCreate, user: dict = Depends(require_roles("agent", "admin"))):
    cat_name = payload.category_name
    if payload.category_id and not cat_name:
        cat = await db.categories.find_one({"id": payload.category_id}, {"_id": 0})
        if cat:
            cat_name = cat["name"]

    order = Order(
        agent_id=user["id"],
        agent_name=user["name"],
        agent_phone=user["phone"],
        category_id=payload.category_id,
        category_name=cat_name,
        custom_category=payload.custom_category,
        product_name=payload.product_name,
        quantity=payload.quantity,
        note=payload.note,
        client_phone=payload.client_phone,
        client_name=payload.client_name,
        store_address=payload.store_address,
        latitude=payload.latitude,
        longitude=payload.longitude,
        photos=payload.photos,
        status="new",
        status_history=[
            {
                "status": "new",
                "at": _now().isoformat(),
                "by_id": user["id"],
                "by_name": user["name"],
            }
        ],
    )
    await db.orders.insert_one(order.model_dump())
    return serialize_doc(order.model_dump())


@api.get("/orders")
async def list_orders(
    status: Optional[str] = None,
    agent_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    q: dict = {}
    if user["role"] == "agent":
        q["agent_id"] = user["id"]
    elif user["role"] == "warehouse":
        pass
    elif user["role"] == "admin":
        if agent_id:
            q["agent_id"] = agent_id
    if status:
        q["status"] = status
    cursor = db.orders.find(q, {"_id": 0}).sort("created_at", -1)
    items = await cursor.to_list(2000)
    return [serialize_doc(o) for o in items]


@api.get("/orders/{order_id}")
async def get_order(order_id: str, user: dict = Depends(get_current_user)):
    o = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not o:
        raise HTTPException(status_code=404, detail="Zakaz topilmadi")
    if user["role"] == "agent" and o["agent_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Ruxsat berilmagan")
    return serialize_doc(o)


@api.patch("/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    user: dict = Depends(require_roles("warehouse", "admin")),
):
    o = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not o:
        raise HTTPException(status_code=404, detail="Zakaz topilmadi")
    history = o.get("status_history", [])
    history.append(
        {
            "status": payload.status,
            "at": _now().isoformat(),
            "by_id": user["id"],
            "by_name": user["name"],
        }
    )
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "status": payload.status,
                "updated_at": _now(),
                "status_history": history,
            }
        },
    )
    fresh = await db.orders.find_one({"id": order_id}, {"_id": 0})
    return serialize_doc(fresh)


@api.get("/stats/admin")
async def admin_stats(user: dict = Depends(require_roles("admin"))):
    total = await db.orders.count_documents({})
    new_count = await db.orders.count_documents({"status": "new"})
    preparing = await db.orders.count_documents({"status": "preparing"})
    delivered = await db.orders.count_documents({"status": "delivered"})
    agents = await db.users.count_documents({"role": "agent", "is_active": True})
    warehouses = await db.users.count_documents({"role": "warehouse", "is_active": True})

    today = _now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_count = await db.orders.count_documents({"created_at": {"$gte": today}})

    return {
        "total_orders": total,
        "today_orders": today_count,
        "new_orders": new_count,
        "preparing_orders": preparing,
        "delivered_orders": delivered,
        "active_agents": agents,
        "active_warehouses": warehouses,
    }


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Startup
# ============================================================
@app.on_event("startup")
async def startup():
    await db.users.create_index("phone", unique=True)
    await db.users.create_index("role")
    await db.orders.create_index("agent_id")
    await db.orders.create_index("status")
    await db.orders.create_index("created_at")
    await db.categories.create_index("name", unique=True)

    # Seed admin
    admin_phone = os.environ.get("ADMIN_PHONE", "+998940634110")
    admin_name = os.environ.get("ADMIN_NAME", "Admin")
    admin_pin = os.environ.get("ADMIN_PIN", "1234")
    existing = await db.users.find_one({"phone": admin_phone})
    if not existing:
        admin = User(phone=admin_phone, name=admin_name, role="admin")
        doc = admin.model_dump()
        doc["pin_hash"] = hash_pin(admin_pin)
        await db.users.insert_one(doc)
        logger.info(f"Default admin yaratildi: {admin_phone} (PIN: {admin_pin})")
    else:
        # ensure admin role + active + pin set
        update = {"role": "admin", "is_active": True}
        if not existing.get("pin_hash"):
            update["pin_hash"] = hash_pin(admin_pin)
            logger.info(f"Admin PIN o'rnatildi: {admin_phone} (PIN: {admin_pin})")
        await db.users.update_one({"phone": admin_phone}, {"$set": update})

    # Seed default categories if empty
    if await db.categories.count_documents({}) == 0:
        defaults = [
            "Pishirilgan kolbasa",
            "Yarim pishirilgan kolbasa",
            "Quritilgan kolbasa",
            "Sosiska",
            "Dudlangan go'sht",
            "Konserva",
        ]
        for name in defaults:
            cat = Category(name=name)
            await db.categories.insert_one(cat.model_dump())
        logger.info("Standart kategoriyalar yuklandi")


@app.on_event("shutdown")
async def shutdown():
    client.close()
