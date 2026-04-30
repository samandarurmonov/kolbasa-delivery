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
OrderStatus = Literal["new", "preparing", "delivered", "cancelled"]


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
    phone: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def _phone_ok(cls, v):
        if v is None:
            return v
        if not PHONE_REGEX.match(v):
            raise ValueError("Telefon raqam +998XXXXXXXXX formatida bo'lishi kerak")
        return v


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    pin: Optional[str] = None

    @field_validator("pin")
    @classmethod
    def _pin_ok(cls, v):
        if v is None:
            return v
        if not PIN_REGEX.match(v):
            raise ValueError("PIN 4-6 raqamdan iborat bo'lishi kerak")
        return v


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


class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    image: Optional[str] = None
    price: Optional[float] = None
    weight_options: List[float] = Field(default_factory=list)  # gram variants e.g., [300, 500, 800]
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProductCreate(BaseModel):
    name: str
    category_id: Optional[str] = None
    image: Optional[str] = None
    price: Optional[float] = None
    weight_options: List[float] = Field(default_factory=list)


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[str] = None
    image: Optional[str] = None
    price: Optional[float] = None
    weight_options: Optional[List[float]] = None
    is_active: Optional[bool] = None


class OrderCreate(BaseModel):
    product_id: Optional[str] = None
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
    def _max_two_photos(cls, v):
        if len(v) > 2:
            raise ValueError("Maksimum 2 ta foto yuklash mumkin")
        return v


class OrderUpdate(BaseModel):
    product_id: Optional[str] = None
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    custom_category: Optional[str] = None
    product_name: Optional[str] = None
    quantity: Optional[str] = None
    note: Optional[str] = None
    client_phone: Optional[str] = None
    client_name: Optional[str] = None
    store_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    photos: Optional[List[str]] = None

    @field_validator("photos")
    @classmethod
    def _max_two_photos(cls, v):
        if v is not None and len(v) > 2:
            raise ValueError("Maksimum 2 ta foto yuklash mumkin")
        return v


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
    comment: Optional[str] = None


class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    agent_id: str
    agent_name: str
    agent_phone: str
    product_id: Optional[str] = None
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    custom_category: Optional[str] = None
    product_name: str
    product_image: Optional[str] = None
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


def parse_iso(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None


# ============================================================
# App / Router
# ============================================================
app = FastAPI(title="Agentlar Boshqaruv API")
api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"ok": True, "service": "agentlar-api"}


# ---------- Auth ----------
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


@api.patch("/auth/me")
async def update_profile(payload: ProfileUpdate, user: dict = Depends(get_current_user)):
    # Only admins can self-edit profile (name/PIN). Agents and warehouse staff
    # must ask an admin to change their phone/PIN/name.
    if user["role"] != "admin":
        raise HTTPException(
            status_code=403,
            detail="Faqat administrator profilingizni o'zgartira oladi. Iltimos, admin bilan bog'laning.",
        )
    update: dict = {}
    if payload.name is not None and payload.name.strip():
        update["name"] = payload.name.strip()
    if payload.pin is not None:
        update["pin_hash"] = hash_pin(payload.pin)
    if not update:
        raise HTTPException(status_code=400, detail="Yangilash uchun maydon yo'q")
    await db.users.update_one({"id": user["id"]}, {"$set": update})
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return serialize_doc(fresh)


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
    if "phone" in update:
        # ensure no duplicate
        clash = await db.users.find_one(
            {"phone": update["phone"], "id": {"$ne": user_id}}, {"_id": 0}
        )
        if clash:
            raise HTTPException(status_code=400, detail="Bu telefon raqam allaqachon ishlatilgan")
    res = await db.users.update_one({"id": user_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    fresh = await db.users.find_one({"id": user_id}, {"_id": 0, "pin_hash": 0})
    return serialize_doc(fresh)


@api.post("/users/{user_id}/reset-pin")
async def reset_pin(user_id: str, payload: ResetPinIn, user: dict = Depends(require_roles("admin"))):
    res = await db.users.update_one({"id": user_id}, {"$set": {"pin_hash": hash_pin(payload.pin)}})
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


# ---------- Products ----------
@api.get("/products")
async def list_products(user: dict = Depends(get_current_user)):
    cursor = db.products.find({"is_active": True}, {"_id": 0}).sort("name", 1)
    items = await cursor.to_list(2000)
    return [serialize_doc(p) for p in items]


@api.post("/products")
async def create_product(payload: ProductCreate, user: dict = Depends(require_roles("admin"))):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Nom bo'sh bo'lmasin")
    cat_name = None
    if payload.category_id:
        cat = await db.categories.find_one({"id": payload.category_id}, {"_id": 0})
        if cat:
            cat_name = cat["name"]
    p = Product(
        name=name,
        category_id=payload.category_id,
        category_name=cat_name,
        image=payload.image,
        price=payload.price,
        weight_options=sorted(set(payload.weight_options or [])),
    )
    await db.products.insert_one(p.model_dump())
    return serialize_doc(p.model_dump())


@api.patch("/products/{pid}")
async def update_product(pid: str, payload: ProductUpdate, user: dict = Depends(require_roles("admin"))):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "category_id" in update:
        cat = await db.categories.find_one({"id": update["category_id"]}, {"_id": 0})
        update["category_name"] = cat["name"] if cat else None
    if not update:
        raise HTTPException(status_code=400, detail="Yangilash uchun maydon yo'q")
    res = await db.products.update_one({"id": pid}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Mahsulot topilmadi")
    fresh = await db.products.find_one({"id": pid}, {"_id": 0})
    return serialize_doc(fresh)


@api.delete("/products/{pid}")
async def delete_product(pid: str, user: dict = Depends(require_roles("admin"))):
    res = await db.products.delete_one({"id": pid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Mahsulot topilmadi")
    return {"ok": True}


# ---------- Client lookup (autofill) ----------
@api.get("/clients/lookup")
async def client_lookup(phone: str, user: dict = Depends(get_current_user)):
    if not phone:
        raise HTTPException(status_code=400, detail="Telefon kerak")
    o = await db.orders.find_one(
        {"client_phone": phone},
        {"_id": 0, "client_name": 1, "store_address": 1, "latitude": 1, "longitude": 1},
        sort=[("created_at", -1)],
    )
    if not o:
        return None
    return serialize_doc(o)


# ---------- Orders ----------
@api.post("/orders")
async def create_order(payload: OrderCreate, user: dict = Depends(require_roles("agent", "admin"))):
    cat_name = payload.category_name
    if payload.category_id and not cat_name:
        cat = await db.categories.find_one({"id": payload.category_id}, {"_id": 0})
        if cat:
            cat_name = cat["name"]

    product_image = None
    if payload.product_id:
        prod = await db.products.find_one({"id": payload.product_id}, {"_id": 0})
        if prod:
            product_image = prod.get("image")
            if not cat_name and prod.get("category_name"):
                cat_name = prod["category_name"]

    order = Order(
        agent_id=user["id"],
        agent_name=user["name"],
        agent_phone=user["phone"],
        product_id=payload.product_id,
        category_id=payload.category_id,
        category_name=cat_name,
        custom_category=payload.custom_category,
        product_name=payload.product_name,
        product_image=product_image,
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
                "comment": None,
            }
        ],
    )
    await db.orders.insert_one(order.model_dump())
    return serialize_doc(order.model_dump())


@api.get("/orders")
async def list_orders(
    status: Optional[str] = None,
    agent_id: Optional[str] = None,
    q: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    query: dict = {}
    if user["role"] == "agent":
        query["agent_id"] = user["id"]
    elif user["role"] == "admin" and agent_id:
        query["agent_id"] = agent_id
    if status:
        query["status"] = status
    fd = parse_iso(from_date)
    td = parse_iso(to_date)
    if fd or td:
        query["created_at"] = {}
        if fd:
            query["created_at"]["$gte"] = fd
        if td:
            query["created_at"]["$lte"] = td
    if q and q.strip():
        rx = re.escape(q.strip())
        query["$or"] = [
            {"product_name": {"$regex": rx, "$options": "i"}},
            {"client_name": {"$regex": rx, "$options": "i"}},
            {"client_phone": {"$regex": rx, "$options": "i"}},
            {"store_address": {"$regex": rx, "$options": "i"}},
            {"agent_name": {"$regex": rx, "$options": "i"}},
            {"category_name": {"$regex": rx, "$options": "i"}},
        ]
    cursor = db.orders.find(query, {"_id": 0}).sort("created_at", -1)
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


@api.patch("/orders/{order_id}")
async def update_order(
    order_id: str,
    payload: OrderUpdate,
    user: dict = Depends(get_current_user),
):
    if user["role"] == "warehouse":
        raise HTTPException(status_code=403, detail="Ruxsat berilmagan")
    o = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not o:
        raise HTTPException(status_code=404, detail="Zakaz topilmadi")
    if user["role"] == "agent" and o["agent_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Faqat o'z zakazingizni tahrirlay olasiz")
    if o["status"] != "new":
        raise HTTPException(status_code=400, detail="Faqat 'Yangi' statusdagi zakazni tahrirlash mumkin")

    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "category_id" in update and "category_name" not in update:
        cat = await db.categories.find_one({"id": update["category_id"]}, {"_id": 0})
        if cat:
            update["category_name"] = cat["name"]
    if "product_id" in update:
        prod = await db.products.find_one({"id": update["product_id"]}, {"_id": 0})
        if prod:
            update["product_image"] = prod.get("image")

    update["updated_at"] = _now()
    if update:
        await db.orders.update_one({"id": order_id}, {"$set": update})
    fresh = await db.orders.find_one({"id": order_id}, {"_id": 0})
    return serialize_doc(fresh)


@api.delete("/orders/{order_id}")
async def delete_order(order_id: str, user: dict = Depends(get_current_user)):
    if user["role"] not in ("admin", "agent"):
        raise HTTPException(status_code=403, detail="Ruxsat berilmagan")
    o = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not o:
        raise HTTPException(status_code=404, detail="Zakaz topilmadi")
    if user["role"] == "agent":
        if o["agent_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Faqat o'z zakazingizni o'chira olasiz")
        if o["status"] != "new":
            raise HTTPException(status_code=400, detail="Faqat 'Yangi' statusdagi zakazni o'chirish mumkin")
    await db.orders.delete_one({"id": order_id})
    return {"ok": True}


@api.patch("/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    user: dict = Depends(get_current_user),
):
    if user["role"] == "agent":
        # agents can only cancel their own "new" orders
        if payload.status != "cancelled":
            raise HTTPException(status_code=403, detail="Ruxsat berilmagan")
    o = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not o:
        raise HTTPException(status_code=404, detail="Zakaz topilmadi")
    if user["role"] == "agent":
        if o["agent_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Ruxsat berilmagan")
        if o["status"] != "new":
            raise HTTPException(status_code=400, detail="Faqat 'Yangi' statusdagi zakazni bekor qilish mumkin")

    history = o.get("status_history", [])
    history.append(
        {
            "status": payload.status,
            "at": _now().isoformat(),
            "by_id": user["id"],
            "by_name": user["name"],
            "comment": (payload.comment or "").strip() or None,
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


# ---------- Stats ----------
@api.get("/stats/admin")
async def admin_stats(user: dict = Depends(require_roles("admin"))):
    total = await db.orders.count_documents({})
    new_count = await db.orders.count_documents({"status": "new"})
    preparing = await db.orders.count_documents({"status": "preparing"})
    delivered = await db.orders.count_documents({"status": "delivered"})
    cancelled = await db.orders.count_documents({"status": "cancelled"})
    agents = await db.users.count_documents({"role": "agent", "is_active": True})
    warehouses = await db.users.count_documents({"role": "warehouse", "is_active": True})

    today = _now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_count = await db.orders.count_documents({"created_at": {"$gte": today}})

    # Top agents (by order count)
    top_agents_cursor = db.orders.aggregate(
        [
            {"$group": {"_id": "$agent_id", "name": {"$first": "$agent_name"}, "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5},
        ]
    )
    top_agents = [
        {"agent_id": d["_id"], "name": d["name"], "count": d["count"]}
        async for d in top_agents_cursor
    ]

    # Top products (by order count)
    top_products_cursor = db.orders.aggregate(
        [
            {
                "$group": {
                    "_id": "$product_name",
                    "image": {"$first": "$product_image"},
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"count": -1}},
            {"$limit": 5},
        ]
    )
    top_products = [
        {"name": d["_id"], "image": d.get("image"), "count": d["count"]}
        async for d in top_products_cursor
    ]

    return {
        "total_orders": total,
        "today_orders": today_count,
        "new_orders": new_count,
        "preparing_orders": preparing,
        "delivered_orders": delivered,
        "cancelled_orders": cancelled,
        "active_agents": agents,
        "active_warehouses": warehouses,
        "top_agents": top_agents,
        "top_products": top_products,
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
    await db.orders.create_index("client_phone")
    await db.categories.create_index("name", unique=True)
    await db.products.create_index("name")

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
        update = {"role": "admin", "is_active": True}
        if not existing.get("pin_hash"):
            update["pin_hash"] = hash_pin(admin_pin)
        await db.users.update_one({"phone": admin_phone}, {"$set": update})

    if await db.categories.count_documents({}) == 0:
        defaults = [
            "Kopchenaya",
            "Varennaya",
            "Indeyka",
            "Sir mahsulotlari",
            "Boshqa mahsulotlar",
        ]
        for name in defaults:
            cat = Category(name=name)
            await db.categories.insert_one(cat.model_dump())
        logger.info("Standart kategoriyalar yuklandi")
    else:
        # Ensure the 5 fixed sections exist
        fixed = [
            "Kopchenaya",
            "Varennaya",
            "Indeyka",
            "Sir mahsulotlari",
            "Boshqa mahsulotlar",
        ]
        for name in fixed:
            existing_cat = await db.categories.find_one({"name": name})
            if not existing_cat:
                cat = Category(name=name)
                await db.categories.insert_one(cat.model_dump())


@app.on_event("shutdown")
async def shutdown():
    client.close()
