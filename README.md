# Divya Pooja MVP

An English-interface Expo MVP for guided home Pooja on Android, iPhone, and web. Telugu audio content is being collected.

## Included flows

- Local demo login/register with name and Gotram (no real authentication yet)
- Home, Daily, Monday–Sunday, and Special/Festival Pooja screens
- Seven supplied deity photos mapped to the weekday Poojas; Thursday is Lord Vishnu Pooja
- Shared Daily/weekday Samagri in four groups, plus Vinayaka-specific items and picture slots
- Wednesday Vinayaka Pooja demo MP3 with Play/Pause, 0.75×–1.5× speed, and drag-to-seek
- Vinayaka subtitle preview, participant editing, and editable family profile
- Location-aware calendar UI and demo ₹49/₹79 plan selection

The Vinayaka MP3 is a real supplied demo recording. Other Poojas show that recordings are pending; their audio is not borrowed from Vinayaka. Subtitles are not yet synchronized with reviewed timestamps. Payment, personalized Poojari voice, real authentication, push delivery, and verified Panchangam data are not connected. The Home festival/date content is still sample content.

Pooja content records live in `src/poojas.ts`. Each record owns its deity image, Samagri, audio source and subtitles, so further recordings can be added individually.

## Run locally

```bash
npm install
npm start
```

Scan the QR code using Expo Go, or press `a`, `i`, or `w` for Android, iOS, or web. For browser testing, run `npm run web -- --port 8081` and open `http://localhost:8081/`.

## Checks

```bash
npx tsc --noEmit
CI=1 npx expo export --platform web
```
