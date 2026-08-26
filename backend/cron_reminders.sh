#!/bin/bash
# Daily reminder cron job for Nevika Cura
# Requires: API_URL, CRON_SECRET, MEDICINE_CRON_SECRET, ADMIN_TOKEN set as environment variables
API_URL="${API_URL:?API_URL env var required}"
CRON_SECRET="${CRON_SECRET:?CRON_SECRET env var required}"
MEDICINE_CRON_SECRET="${MEDICINE_CRON_SECRET:?MEDICINE_CRON_SECRET env var required}"
ADMIN_TOKEN="${ADMIN_TOKEN:?ADMIN_TOKEN env var required}"

# Send follow-up reminders
curl -s -X POST "$API_URL/api/cron/send-follow-up-reminders?secret=$CRON_SECRET" >> /var/log/nevika_cron.log 2>&1

# Send Medicine reminders (runs every 15 minutes ideally)
curl -s -X POST "$API_URL/api/medicine-reminders/cron/send-reminders?secret=$MEDICINE_CRON_SECRET" >> /var/log/nevika_cron.log 2>&1

# Send Glydex test/medicine reminders (admin endpoint)
curl -s -X POST "$API_URL/api/glydex/send-due-reminders" \
  -H "Authorization: Bearer $ADMIN_TOKEN" >> /var/log/nevika_cron.log 2>&1

echo "$(date): Cron job completed" >> /var/log/nevika_cron.log
