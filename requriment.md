# Divya Pooja — Requirements and Backlog

Last updated: 15 September 2026
Owner: Prashanth
Platforms: iOS, Android and web browsers
Repository: https://github.com/Emmadiprashanth/pooja

## How to use this document

Add every agreed feature here before implementation. Work screen by screen.
An existing demo screen does not mean the production feature is complete.

Statuses: Planned | Partial | Blocked | Verified | Excluded.
Only mark Verified after its acceptance criteria have been tested on the relevant platforms.
Priority: P0 = needed for the pilot; P1 = needed for public launch; P2 = proposed improvement.

## Product scope

An audio-guided Pooja app for Telugu families in India and overseas.
Users prepare Samagri, choose participants, and follow a trusted Poojari recording with subtitles.
Initial content focus is Telugu. The current interface/demo is English.
Telugu interface and subtitle language choices remain to be finalized.
Subscription is the intended business model; launch prices are not finalized.

## 1. Home

- [ ] HOME-01 — P0 — Show the current day and recommend the corresponding weekday Pooja. Status: Partial; Home still contains fixed sample content.
- [ ] HOME-02 — P0 — Highlight a festival when it occurs in the selected location; keep weekday and Daily Pooja accessible on the same day. Status: Planned.
- [ ] HOME-03 — P0 — Offer optional Om ambience with Play/Pause. Status: Partial; playback exists, but the asset is a generated tone rather than a recorded Om chant.
- [ ] HOME-04 — P0 — Pause ambience when Pooja audio starts to avoid overlapping sound. Status: Planned.
- [ ] HOME-05 — P1 — Show upcoming festivals and preparation reminders linked to Samagri. Status: Partial; sample UI only.

Acceptance: changing location/day changes recommendations from reviewed event data. Audio never autoplays without user action.

## 2. Pooja services and catalog

- [ ] CAT-01 — P0 — Separate Daily, weekday, festival and important Special Poojas. Status: Partial.
- [ ] CAT-02 — P0 — Every selection opens the respective title, Samagri, recording and subtitles. Status: Partial; each Pooja now has a content record. Daily/weekday Samagri exists and only Wednesday Vinayaka has a recording; unrecorded Poojas show a pending state.
- [ ] CAT-03 — P0 — Display real duration, preparation requirements and access level. Status: Partial; duration/access labels are sample values.
- [ ] CAT-04 — P0 — Poojari reviews each script and Samagri list before publication. Status: Planned.
- [ ] CAT-05 — P1 — Add a real photo for each Samagri item in each Pooja. Status: Partial; picture slots and illustrations exist, and the Ganesh deity photo is used for Vinayaka's deity item. Other item photos are pending.
- [ ] CAT-06 — P1 — Show the matching deity photo for each weekday Pooja. Status: Partial; seven supplied photos are mapped in the local app, with native/device testing pending.

### Initial weekday list

| Day | Pooja |
| --- | --- |
| Monday | Lord Shiva |
| Tuesday | Lord Hanuman |
| Wednesday | Vinayaka Pooja |
| Thursday | Lord Vishnu |
| Friday | Lakshmi Devi |
| Saturday | Sri Venkateswara Swamy |
| Sunday | Surya Narayana |

These are the initial app categories; the Poojari should review the final content.

### Initial important Special/Festival list

- Satyanarayana Swamy Vratham
- Varalakshmi Vratham
- Vinayaka Chavithi Pooja
- Lakshmi Kubera Pooja
- Gruha Pravesham Pooja

The Poojari must identify which rituals are suitable for self-guided use and which require in-person guidance.

## 3. Pooja session and participants

- [ ] SESSION-01 — P0 — Samagri on the left and audio player on the right, with readable subtitles below. Status: Partial; implemented UI needs native/device validation.
- [ ] SESSION-02 — P0 — One continuous recording with Play/Pause; no mandatory numbered-step flow, Next, Previous or Repeat buttons. Status: Partial; current layout follows this.
- [ ] SESSION-03 — P0 — Add, edit and remove participant names and optional Gotram on every Pooja audio page. Status: Partial; session-only UI exists.
- [ ] SESSION-04 — P0 — Select participants from saved family members without duplicate entries. Status: Partial.
- [ ] SESSION-05 — P0 — Keep participant selection attached to the respective Pooja session and retain it when navigating away and returning. Status: Planned.
- [ ] SESSION-06 — P0 — Match subtitles to spoken words using reviewed timestamps. Status: Planned; Vinayaka demo text currently changes at equal intervals over the supplied MP3.
- [ ] SESSION-07 — P0 — Handle loading, pause, completion, replay, interruption and audio errors clearly. Status: Partial.
- [ ] SESSION-08 — P1 — Provide accessible controls and readable content on small phones and with enlarged text. Status: Planned.
- [ ] SESSION-09 — P1 — Allow Play/Pause, speed changes and dragging to seek within the recording. Status: Partial; 0.75×–1.5× speed and drag-to-seek were checked in the web preview, with native/device testing pending.

Acceptance: opening any catalog item preserves its identity. Editing a participant changes only that participant. Audio and subtitles remain aligned after pausing/resuming.

## 4. Recording and personalized Sankalpam

- [ ] AUDIO-01 — P0 — Obtain one complete Daily Pooja and one festival recording, scripts and Samagri lists. Status: Partial; Prashanth supplied one Wednesday Vinayaka demo MP3. Daily and festival recordings are still needed.
- [ ] AUDIO-02 — P0 — Record clear Telugu instructions with pauses for performing actions. Status: Planned.
- [ ] AUDIO-03 — P0 — Obtain permission for commercial recording use and explicit permission for any synthetic voice use. Status: Planned.
- [ ] AUDIO-04 — P0 — Record Sankalpam separately and define participant/name/Gotram insertion points. Status: Planned.
- [ ] AUDIO-05 — P0 — Generate and preview personalized speech, with pronunciation confirmation before use. Status: Planned; no voice generation integration exists.
- [ ] AUDIO-06 — P0 — Remove unsupported “pronunciation confirmed” claims until the user has heard and confirmed the result. Status: Planned.
- [ ] AUDIO-07 — P1 — Store versioned recordings, scripts and subtitle files with review status. Status: Planned.

Acceptance: participants heard in the recording match the confirmed session list. The app must not present a tone or text substitution as personalized speech.

## 5. Profile and registration

- [ ] PROFILE-01 — P0 — Primary devotee name, Gotram and selected location. Status: Partial.
- [ ] PROFILE-02 — P0 — Add, edit and remove all family member names. Status: Partial.
- [ ] PROFILE-03 — P0 — Persist profile and family details across restarts. Status: Planned.
- [ ] PROFILE-04 — P0 — Implement registration/login and associate subscriptions and notification preferences with the correct account. Status: Partial; local demo login/register UI exists, but no authentication or account persistence is connected.
- [ ] PROFILE-05 — P1 — Provide account deletion and appropriate privacy controls. Status: Planned.

Existing primary demo values: Prashanth Kumar / Amarushi. Do not invent family member names.
Login method and whether each saved family member needs a separate Gotram remain open decisions.

## 6. Location-specific Telugu calendar

- [ ] CAL-01 — P0 — Full monthly grid with correct 28/29/30/31 day lengths and working month navigation. Status: Partial; code/build checked, native testing pending.
- [ ] CAL-02 — P0 — Tap a date to expand its Panchangam and relevant Poojas. Status: Partial; expansion works, verified religious data absent.
- [ ] CAL-03 — P0 — Select a city and show its live local date/time, including daylight saving and date boundaries. Status: Partial; implemented with IANA timezones, native testing pending.
- [ ] CAL-04 — P0 — Show reviewed local Tithi, Nakshatram, Telugu month, sunrise and relevant festival/timing data. Status: Blocked on a verified data source.
- [ ] CAL-05 — P0 — Allow annual backend updates with source, reviewer and revision tracking. Status: Planned.
- [ ] CAL-06 — P0 — Use the selected calendar location for Home and festival reminders. Status: Planned; calendar selection is currently isolated.
- [ ] CAL-07 — P1 — Persist location preference; offer manual selection. Automatic phone location remains an open decision. Status: Planned.

Current cities: Hyderabad, Chennai, New York, Los Angeles, London, Dubai, Sydney and Singapore.
Eenadu reference: https://www.eenadu.net/calendar
This is currently an external link, not an integrated or licensed API. Overseas Panchangam coverage has not been verified.
Timezone conversion alone does not calculate local religious observances.

Acceptance: Dubai and LA show correct local clock/date for the same instant. Missing Panchangam stays unavailable rather than displaying fabricated values. Calendar month navigation handles February and year transitions.

## 7. Festival push notifications

- [ ] PUSH-01 — P0 — Ask registered users to opt in; handle permission denial. Status: Partial; native token helper exists but is not wired into registration.
- [ ] PUSH-02 — P0 — Register device tokens with an authenticated backend. Status: Planned.
- [ ] PUSH-03 — P0 — Configure EAS, APNs and FCM for iOS/Android delivery. Status: Blocked on project credentials/configuration.
- [ ] PUSH-04 — P0 — Send Samagri preparation and one-day-before reminders based on the reviewed local festival date. Status: Planned.
- [ ] PUSH-05 — P0 — Open the respective Pooja/Samagri page when a notification is tapped. Status: Planned.
- [ ] PUSH-06 — P1 — Support opt-out, local delivery time, deduplication, location changes and invalid-token cleanup. Status: Planned.

Example: “Vinayaka Chavithi is tomorrow. Please get your Samagri ready.”
Suggested preparation reminder: three days before; final timing is to be confirmed.
Registration alone is not notification permission. Do not hardcode September 14 for every location/year.
The current Home reminder switch is a demo and does not schedule or deliver messages.

## 8. Subscriptions and payments

- [ ] PAY-01 — P0 — Finalize monthly subscription benefits and prices by market. Status: Planned.
- [ ] PAY-02 — P0 — Configure Apple in-app subscriptions and Google Play Billing as the default native digital-content billing flow. Status: Planned.
- [ ] PAY-03 — P1 — Razorpay India checkout and Stripe international checkout for web, subject to merchant eligibility and approved account setup. Status: Planned.
- [ ] PAY-04 — P0 — Any alternative native billing must follow applicable storefront/program requirements; do not choose gateways only from customer country. Status: Planned.
- [ ] PAY-05 — P0 — Validate purchases server-side and maintain account entitlements. Status: Planned.
- [ ] PAY-06 — P0 — Handle renewals, cancellations, failed payments, refunds and restore purchases. Status: Planned.
- [ ] PAY-07 — P1 — Show localized prices, renewal terms, subscription management, Terms and Privacy links. Status: Planned.

Discussed price candidates: ₹79 or ₹99 per month; not approved launch prices.
A single-festival purchase is an earlier proposal and remains optional.
The ₹49 single-Pooja / ₹79 monthly UI is a demo, not a connected payment flow.
Merchant secrets must stay on the backend. Native store purchases and web purchases should resolve to the same authenticated user's access.

## 9. Backend and content administration

- [ ] ADMIN-01 — P0 — Choose hosting, database, authentication and media storage. Status: Planned.
- [ ] ADMIN-02 — P0 — Manage Poojas, recordings, subtitles, Samagri and publication/review status. Status: Planned.
- [ ] ADMIN-03 — P0 — Import yearly location-specific calendar data with validation and revisions. Status: Planned.
- [ ] ADMIN-04 — P0 — Manage authenticated profile, participant, subscription and notification records. Status: Planned.
- [ ] ADMIN-05 — P1 — Restrict administrative access and support backups and operational error monitoring. Status: Planned.

No production backend currently exists.

## 10. Testing and release

- [ ] RELEASE-01 — P0 — Build and test on physical iPhone and Android devices. Status: Planned; TypeScript and web exports have passed.
- [ ] RELEASE-02 — P0 — Test complete Pooja playback, subtitles and participant editing. Status: Planned.
- [ ] RELEASE-03 — P0 — Test location changes, timezone boundaries and daylight saving. Status: Partial; timezone formatting checked.
- [ ] RELEASE-04 — P0 — Test push permission, delivery and notification-tap navigation on native builds. Status: Planned.
- [ ] RELEASE-05 — P0 — Test sandbox subscriptions, restore and entitlement changes on both stores. Status: Planned.
- [ ] RELEASE-06 — P1 — Prepare store listings, privacy disclosures, support contact and release builds. Status: Planned.
- [ ] RELEASE-07 — P0 — Pilot with 30–50 Telugu families using one Daily and one festival Pooja; measure completion, return use and willingness to pay. Status: Proposed pilot plan.

## 11. Later ideas — not yet approved for implementation

- [ ] IDEA-01 — P2 — Free Daily Pooja trial without login.
- [ ] IDEA-02 — P2 — WhatsApp sharing of a Pooja link and Samagri checklist.
- [ ] IDEA-03 — P2 — Telugu-script or English-script subtitles for Telugu audio.
- [ ] IDEA-04 — P2 — Offline downloads and saved playback position.
- [ ] IDEA-05 — P2 — Additional languages after validating Telugu demand.

## 12. Explicit exclusions and replacements

- Compass on Home: Excluded at Prashanth's request.
- Mandatory 3–6 step audio flow with Next/Previous/Repeat: replaced by continuous audio.
- Treating all countries as following the same India festival calendar: excluded.
- Claiming live push, personalized voice or real payments based on demo screens: excluded.

## 13. Decisions and inputs needed

| Item | Owner/input |
| --- | --- |
| Poojari recordings, scripts, Samagri and voice permissions | Prashanth + Poojari |
| Reviewed calendar source and supported launch cities | Prashanth + content reviewer |
| Login method and backend provider | Product/development decision |
| Apple, Google and EAS projects and identifiers | App owner |
| Approved payment accounts, product IDs and market prices | App owner |
| Interface/subtitle languages for pilot | Prashanth |
| Reminder timing and delivery preferences | Product decision |

## 14. Add a new requirement

Copy this template for each new item:

### NEW-ID — Short feature name

- Requested by/date:
- Screen or service:
- User need:
- Expected behavior:
- Acceptance criteria:
- Priority: P0 / P1 / P2
- Status: Planned
- Dependencies or decisions:
- Owner:
- Test evidence:
- Release/commit:

## Change log

- 2026-09-15: Created consolidated requirements from the agreed app scope and current implementation status.
