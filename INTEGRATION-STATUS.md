# Integration status — 15 September 2026

## Update — 15 September 2026

Added a local demo login/register screen, separate Pooja content records, the supplied Wednesday Vinayaka MP3, speed controls and web-checked drag-to-seek. Daily and Monday–Sunday Poojas now share a 15-item Samagri foundation; Wednesday Vinayaka adds five specific items. Seven supplied deity photos are mapped to their weekday Poojas, with Thursday changed to Lord Vishnu Pooja. Other recordings remain pending. The deity photos are original large PNG files and should be prepared as lighter app assets before a store release.

## Update — 14 September 2026

Calendar now displays a live clock with seconds for the selected IANA timezone. Dubai, Los Angeles and all listed locations switch immediately, including daylight-saving offsets. Device time is used; no remote time service is needed. This does not supply astronomical Panchangam data.

Added expo-notifications and expo-constants plus `src/notifications.ts`, an iOS/Android permission and Expo-token helper for the future authenticated registration flow. It is not yet called by the demo UI. Added EAS build profiles. To enable native push: create/link the EAS project, configure app identifiers, APNs and FCM credentials, connect authenticated token storage, opt-out and the scheduler, then test on native builds. No live push or payment integration is claimed.

## Implemented in this change

- Each Daily, weekday and Special Pooja selection opens a session with its own title and content record. Only Wednesday Vinayaka currently has a supplied MP3; unrecorded sessions show a pending state.
- Session participants can be added, edited, removed and copied from the current family list. Each has a name and optional Gotram. These are session-only; no audio generation or persistent account storage is claimed.
- Calendar has real month lengths (including February), month navigation, expandable dates, city selection and the current date in the selected timezone.
- Eenadu is an external reference link only. No calendar API, content licence or worldwide location coverage has been verified. Unverified sample religious dates were removed from the calendar.
- No compass added.

## Required before production

### Subscription payments

For digital audio consumed inside store-distributed apps, use Apple in-app purchase and Google Play Billing as the default. Any alternative billing or external checkout must be explicitly reviewed for the storefront and eligible program. Do not route native users to Stripe or Razorpay solely based on country.

Website checkout can use Razorpay for India and Stripe for supported international billing, after merchant eligibility and accounts are confirmed. Merchant onboarding country is separate from customer country. Prices, taxes and currency must come from configured products, not an IP or calendar city guess.

Needed: Apple/Google developer accounts, application identifiers, monthly subscription product IDs, server-side purchase validation and renewal/refund notifications; approved web merchant accounts for website checkout. Store secrets only on the backend. Restore purchases and subscription management must be implemented. The existing Payment screen remains a demo and is not release-ready.

References:
- https://developer.apple.com/app-store/review/guidelines/#in-app-purchase
- https://support.google.com/googleplay/android-developer/answer/9858738

### Push notifications

The local demo login UI is not real authentication. A server is not present in this prototype. The existing reminder toggle is a visual demo, not push delivery.

Needed: authenticated user ID, device token registration/removal, explicit opt-in, APNs/FCM credentials and a scheduler. A reviewed event must contain city, timezone, date, Pooja ID and Samagri list. Schedule preparation reminders three days before and one day before at the user's chosen local time. Use stable delivery IDs to prevent duplicates, process invalid tokens and honour opt-out. Tapping a notification should open the referenced Pooja preparation page. Do not broadcast an India festival date to all international users.

Example copy: “Vinayaka Chavithi is tomorrow. Please get your Samagri ready.” Date must come from the reviewed local event, not a hardcoded September 14 assumption.

### Calendar content

Obtain a licensed feed or manually curated, Poojari-reviewed calendar for supported locations. Schema per day: location ID, timezone, ISO local date, Tithi and Nakshatram with local end times, festivals with Pooja IDs, source, reviewer and revision. Missing days must stay unavailable. Eenadu reference: https://www.eenadu.net/calendar

## Release status

This Git repository contains a partial MVP suitable for review and local browser testing. It is not a production-ready mobile release. The Vinayaka demo MP3 is supplied; other recordings, reviewed subtitle timing, verified calendar content, real account authentication, live push delivery and paid subscriptions remain unfinished.
