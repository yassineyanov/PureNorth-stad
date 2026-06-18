# PureNorth Städ — PRD

## Original Problem Statement
Cleaning company website "PureNorth Städ" in Umeå (phone 0706240403). Swedish only. Services: Hemstädning, Flyttstädning, Kontorsstädning, Storstädning. "Varför välja oss?" with SRY-qualification (SRY-utbildad personal), Svanenmärkta Pur-Eco eco products, 50% RUT-avdrag. Online booking form (name/company, email, phone, kvm, services, önskat datum, "Annat" with conditional description) + phone option. Bookings saved to admin dashboard (no email). "Wow" / luxury design.

## User Choices
- Swedish only. Bookings -> admin dashboard. Use provided logo.
- Luxury palette: black + beige + white. Logo & "PureNorth Städ" text black. CTA buttons black. Replaced the two green backgrounds with beige. New hero image. New hero copy ("Renhet med norrländsk precision i Umeå...").

## Architecture
- Backend: FastAPI + MongoDB. JWT (Bearer/localStorage) admin auth, admin seeded on startup. Endpoints: /api/auth/login, /api/auth/me, /api/bookings (POST public, GET admin), PATCH /status, DELETE.
- Frontend: React + Tailwind + shadcn + framer-motion. Pages: Home (Navbar, Hero, Services, WhyUs, BookingForm, Contact, Footer), Admin (login + dashboard).

## Implemented (2026-06-18)
- Full landing page (Swedish) with luxury black+beige theme, black tinted logo (CSS mask of user's PNG).
- Booking form with conditional "Annat" textarea; saves to MongoDB.
- Admin dashboard: list, status update, delete, stats. Login admin@purenorthstad.se.
- Backend tested 14/14; _id->id serialization bug fixed (response_model_by_alias=False).

## Backlog / Next
- P1: Email notification on new booking (Resend/SendGrid) once user has an email.
- P1: Bilingual (SV/EN) toggle.
- P2: Testimonials/reviews section, gallery of before/after.
- P2: Status validation enum on PATCH endpoint.
