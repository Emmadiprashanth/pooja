# Divya Pooja MVP

An English-first Expo app for guided home Pooja on Android, iPhone, and web.

## Included flows

- Dynamic Home screen with festival and weekday recommendations
- Daily, day based, and festival Pooja services
- Samagri preparation checklist
- ₹49 single-Pooja and ₹79 monthly plan selection
- Personalized Sankalpam using the devotee's name and Gotram
- Step-by-step guided Pooja player
- Editable family profile

Payment and audio playback are simulated in this MVP. Real payment processing, recorded Poojari audio, AI voice personalization, authentication, and backend Panchangam data are the next implementation phase.

## Run locally

```bash
npm install
npm start
```

Scan the QR code using Expo Go, or press `a`, `i`, or `w` for Android, iOS, or web.

## Checks

```bash
npx tsc --noEmit
CI=1 npx expo export --platform web
```
