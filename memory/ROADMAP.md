# Nevika Health Portal - Improvement Roadmap

## Updated: Mar 8, 2026

### Completed This Session
- [x] P0: server.py modularization (10,919 -> 8,881 lines, 5 route files extracted)
- [x] P0: Root directory cleanup, backup removal, test report archiving
- [x] P1: Dead code audit and archival (14 unused page components)
- [x] P1: Suspense fallback light theme fix
- [x] P2: Component deduplication (NotificationBanner)
- [x] P3: Health streak leaderboard API
- [x] P3: Personalized wellness tips API

### Remaining - P1
- Continue server.py modularization (8,881 lines remaining)
  - Extract notification functions (~700 lines) to services/notification_service.py
  - Extract auth endpoints (~1200 lines) to routes/auth_extended.py
  - Extract cron job endpoints (~400 lines) to routes/cron_jobs.py
  - Target: get server.py to ~5000 lines

### Remaining - P2
- WhatsApp chatbot for appointment booking
- Multi-language support expansion (Hindi, Marathi)

### Remaining - P3
- Offline-first PWA capabilities
- Advanced analytics dashboard for admin
