# Blocked Slots Still Bookable — Root-Cause Investigation

A focused, read-only investigation into why doctor/staff-blocked dates and shifts keep appearing bookable to patients on nevikacura.com, despite several earlier rounds of fixes. The deliverable is a proven diagnosis with evidence — not a code change.

## Who it's for

The practice owner and staff who rely on blocking being respected everywhere a patient can book, and the doctors who block their own leave/shift time and expect it to actually hold.

## Core features and experience

The investigation traces every point where a block could be written, stored, read, or silently skipped, and reports findings against each with file/function-level evidence — not guesses.

What gets checked, grounded in what is already known to exist in this codebase from earlier sessions:

- **Multiple booking surfaces**: this app has several places a patient (or staff on a patient's behalf) can create an appointment — the main doctor-booking screen, walk-in booking, follow-up booking, reschedule, a chatbot/voice booking flow, and teleconsultation. Each was reportedly wired to the same block-checking logic in earlier fixes. The investigation re-verifies that claim against the current code for every one of these surfaces — not just the main one previously tested — since a duplicated or diverging slot-generation path in any single surface would fully explain a "fixed once, still broken" pattern.
- **Where the check could be skipped**: whether every booking surface's backend save step actually calls the shared block-rejection check, or whether one or more surfaces accept a slot without re-validating it server-side.
- **Caching**: whether the availability data a patient's browser receives can be served from a cache that is still "warm" for a few minutes after a block was just created — which would explain "blocked it, refreshed, still shows open" even when the underlying data is correct.
- **Date and time matching**: whether the stored block's date/time format always matches the format the booking/availability code compares it against (a classic source of "looks blocked in the database, never matches in code").
- **Clinic/doctor identity matching**: whether a block created against one clinic or one spelling/record of a doctor is actually the same key the patient-facing availability lookup queries — a mismatch here would make a correctly-saved block invisible to the exact code that should be reading it.
- **Doctor Portal vs Staff Portal parity**: whether both portals write blocks into the same shape/place, or whether one writes a form the other's read path doesn't recognize.
- **Evidence over assumption**: every claim in the final report is backed by a specific file, function, or reproducible check — not a list of "could be X or Y."

## User flow

The workflows traced, end to end:
1. Doctor blocks a full day (Doctor Portal) → is it visible to a patient's booking screen on a fresh load?
2. Doctor blocks a half-day/shift (Doctor Portal) → same check.
3. Staff blocks a full day (Staff Portal) → same check.
4. Staff blocks a half-day/shift (Staff Portal) → same check.
5. A patient has a booking screen open before the block is made, then refreshes.
6. A patient attempts to directly submit a booking for a slot that should be blocked (bypassing the calendar UI), to check whether the backend independently rejects it regardless of what the frontend shows.

For each, the report states what actually happens today and why — confirmed by evidence, not inferred.

## UI/UX feel

Not applicable — this phase produces a written findings report, not a user-facing change.

## Implementation phases

**Phase 1 (now): Read-only investigation and root-cause report.** No code, database, or configuration is touched. Deliverable: a report naming the confirmed root cause (or causes, if more than one booking surface is independently broken), the exact file/function/data point where the block is lost or ignored, which booking surfaces are affected and which are clean, what earlier fixes actually addressed versus missed, the smallest fix that would close the confirmed gap, and what existing behavior that fix must not disturb. If evidence is inconclusive for any part, the report says so explicitly and states the smallest next diagnostic step (e.g., a specific reproduction to run) rather than guessing.

**Phase 2 (after approval of the Phase 1 findings): Implement the smallest fix** that closes the confirmed gap(s), scoped only to what Phase 1 proves is broken.

**Phase 3 (after Phase 2 is verified): Regression-proofing.** Add the checks needed to catch this specific failure mode (a new booking surface skipping the shared block check, or a cache/format mismatch) before it reaches production again, so this does not need a sixth round.

## Assumptions

- "Production" means the live nevikacura.com domain, confirmed by the user to have been redeployed recently and tested on a fresh page load — so a stale-deploy explanation is treated as ruled out, not re-litigated in Phase 1.
- No specific doctor/date/clinic reproduction example was available from the user for this round; Phase 1 will therefore test representative cases across all known booking surfaces rather than chasing one unconfirmed instance, and will ask for a live reproduction only if that turns out to be the one piece of evidence needed to close out an inconclusive finding.
- "Shift"/"half-day" is treated as the same concept as the existing partial-day time-window blocking already present in the system, not a new scheduling concept to design.
- The investigation covers patient-facing booking and the direct backend booking submission path; it does not extend to unrelated areas (payments, notifications, unrelated staff features) unless evidence points there.
