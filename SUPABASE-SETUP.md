# Supabase setup

The app contains the real authentication and profile integration, but it stays in setup mode until a Supabase project is connected.

## 1. Create the project

1. Create a project at `https://supabase.com/dashboard`.
2. Open **SQL Editor**, paste the contents of `supabase/migrations/202609160001_initial_auth.sql`, and run it once.
3. Open **Authentication → Providers → Email** and keep Email enabled for international users.
4. Open **Authentication → Providers → Phone**, enable phone authentication, and connect a supported SMS provider for Indian `+91` numbers.
5. Open the email authentication template used for passwordless sign-in and include `{{ .Token }}` in the email body. This makes Supabase send a numeric email OTP instead of only a magic link.
6. Configure suitable OTP expiry and rate limits before production. SMS delivery has a per-message cost and should be protected from repeated requests.
7. Before production in India, complete the SMS provider's TRAI DLT sender/template registration and enable CAPTCHA or equivalent abuse protection.

## 2. Connect the app

Copy `.env.example` to `.env` and replace the placeholders with the Project URL and publishable key from **Project Settings → API**.

```text
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Only the publishable key belongs in the app. Never place the service-role key, database password, Razorpay secret, or Stripe secret in an `EXPO_PUBLIC_` variable.

Restart Expo after changing `.env`:

```bash
npx expo start --clear
```

## 3. Verify

1. Select **India**, register with a test `+91` mobile number, receive the SMS OTP, and verify it.
2. Sign out, select **International**, register with an email address, receive the email OTP, and verify it.
3. Edit the name, Gotram, location, and family members in Profile, then tap **Save profile**.
4. Sign out and back in. The saved profile must return.
5. In Supabase Table Editor, verify rows exist in `profiles` and `family_members`.

The SQL enables Row Level Security. Authenticated users can read and modify only their own profile and family members.

## Admin content setup

1. In **SQL Editor**, run `supabase/migrations/202609170001_admin_content.sql` once.
2. In **Authentication → Users**, copy the user ID for the owner account.
3. In **SQL Editor**, make that account an administrator:

```sql
insert into public.app_admins (user_id)
values ('PASTE-OWNER-USER-ID-HERE')
on conflict (user_id) do nothing;
```

The Profile screen then shows **Pooja Content Studio** for that approved account. Pooja drafts, Samagri and private media uploads are protected by Row Level Security and Storage policies.
