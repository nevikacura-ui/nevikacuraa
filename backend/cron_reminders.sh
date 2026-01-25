#!/bin/bash
# Daily reminder cron job for Nevika Cura
API_URL="https://healthapp-nevika.preview.emergentagent.com"
CRON_SECRET="nevikacura_cron_2026"
MEDICINE_CRON_SECRET="nevika_cron_2026"

# Send follow-up reminders
curl -s -X POST "$API_URL/api/cron/send-follow-up-reminders?secret=$CRON_SECRET" >> /var/log/nevika_cron.log 2>&1

# Send Medicine reminders (runs every 15 minutes ideally)
curl -s -X POST "$API_URL/api/medicine-reminders/cron/send-reminders?secret=$MEDICINE_CRON_SECRET" >> /var/log/nevika_cron.log 2>&1

# Send Glydex test/medicine reminders (admin endpoint)
curl -s -X POST "$API_URL/api/glydex/send-due-reminders" \
  -H "Authorization: Bearer ADMIN_TOKEN" >> /var/log/nevika_cron.log 2>&1

echo "$(date): Cron job completed" >> /var/log/nevika_cron.log
