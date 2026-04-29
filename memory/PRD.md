# PRD: Agentlar Boshqaruv Tizimi (Agent Management for Sausage Distribution)

## Overview
A 3-role mobile B2B operations app (Expo React Native + FastAPI + MongoDB) for an Uzbek sausage products distribution business. Field agents collect orders from local stores; orders flow into a warehouse queue; admins manage users and the product catalog.

## Roles
1. **Admin** — manages staff (agents/warehouse), product categories, sees all orders & stats
2. **Agent** — creates new orders with product, store GPS, client phone, photos
3. **Warehouse (Omborchi)** — sees the queue, advances order status

## Authentication
- Phone (+998 only) + 6-digit OTP, JWT (30-day access token)
- DEV mode: OTP printed to backend logs and returned in API response & UI banner
- Pluggable SMS provider via `SMS_PROVIDER` env (eskiz/twilio future-ready)
- Default admin auto-seeded: **+998940634110**

## Order Lifecycle
`Yangi (new)` → `Tayyorlanmoqda (preparing)` → `Yetkazildi (delivered)`
Status history is tracked with timestamps and the actor who changed it.

## Order Fields
- Product category (predefined OR free-text custom)
- Product name *
- Quantity, note
- Client phone * (+998), client name (optional)
- Store address * (text) + auto-detected GPS lat/lng
- 1-2 photos (camera + gallery), stored as base64 data URLs

## Tech Stack
- **Backend:** FastAPI, Motor (async Mongo), PyJWT, bcrypt, dotenv
- **Frontend:** Expo SDK 54, expo-router, expo-location, expo-image-picker, expo-secure-store, AsyncStorage (web fallback)
- **Storage:** MongoDB collections: `users`, `orders`, `categories`, `otps`

## Backend Endpoints
- `POST /api/auth/request-otp`
- `POST /api/auth/verify-otp`
- `GET /api/auth/me`
- `GET/POST/PATCH/DELETE /api/users` (admin)
- `GET/POST/DELETE /api/categories`
- `GET/POST /api/orders`, `GET /api/orders/{id}`, `PATCH /api/orders/{id}/status`
- `GET /api/stats/admin`

## Frontend Routes
- `/login`, `/verify` — OTP flow
- `/(agent)` tabs: orders list / new-order / profile
- `/(warehouse)` tabs: queue / profile
- `/(admin)` tabs: dashboard / orders / users / categories / profile
- `/order/[id]` — shared detail screen with status timeline, GPS map link, click-to-call

## Design
- Light theme, Deep Carmine Red primary (#C81E1E), Swiss & High-Contrast archetype
- 48+ px touch targets, mobile-first one-handed UX
- Status badges: blue/amber/green; bottom-sheet pickers; pull-to-refresh

## Non-Goals (V1)
- Real SMS provider integration (architecture ready, env-pluggable)
- Push notifications
- Offline support
- Web/desktop ops dashboard
