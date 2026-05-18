# Account Deletion

This page describes how to delete your AikiNote account and the scope of data that is deleted or retained.

## 1. Delete in the app (recommended)

AikiNote's iOS / Android apps and the web version allow you to fully delete your account in just a few taps. **No email or contact with our support team is required**, and all associated data is permanently removed at the same time.

If you are signed in, open the "Delete account" page from the link below. Follow the on-screen instructions, check the consent checkbox, and press the **"Delete account"** button to complete deletion.

[**Open the account deletion page**](/en/settings/account-deletion)

Once deletion completes, you will be returned to the login screen and the same account can no longer be used to sign in.

## 2. Fallback (if you cannot sign in)

If you are unable to sign in to the app and therefore cannot use the in-app self-service deletion, you may request deletion via our contact form as a fallback.

1. Open the [AikiNote contact form](https://docs.google.com/forms/d/e/1FAIpQLSfr11mzmwzwwXXULuoT4w8D57e9aAtUZa_9i8HDGAtDgjNxYw/viewform?usp=dialog)
2. In the subject (or at the beginning of the message), write **"Account Deletion Request"**
3. Include the email address registered with AikiNote in the body
4. Submit the form

※ Alternatively, you can email the same information directly to our support address **support@aikinote.com**.

After verifying that the request matches the registered account, we will delete the account and associated data **within 7 business days of receipt**.

## 3. Data that will be deleted

The following data will be deleted on account deletion (whether done in-app or via the form):

- Profile information (username, display name, profile image, bio)
- Authentication information (email address, Supabase Auth record, OAuth link information)
- Training pages (all pages and attached images/videos created via the "Personal" feature)
- Posts (all posts, replies, and favorites created via the "Social" feature)
- Tags, category settings, font size preferences, and other personal settings
- Unread notifications and push notification tokens
- All image/video files stored on S3 / CloudFront

## 4. Data that will be retained

The following data will be retained for a certain period after account deletion for legal compliance, fraud prevention, and accounting obligations.

- **Payment and subscription records (via Stripe / RevenueCat)**
  - Retention period: 7 years
  - Reason: Required by the Japanese Electronic Books Preservation Act and Corporate Tax Act
- **Fraud records and access logs**
  - Retention period: 1 year
  - Reason: Investigation and prevention of fraudulent use
- **Record of the deletion request itself (received via contact form)** (only when deletion was requested via the form)
  - Retention period: 2 years
  - Reason: Evidence that deletion was performed legitimately

Retained data is either stored in an anonymized/aggregated form that cannot identify individuals, or encrypted and stored with the minimum necessary scope.

## 5. About subscriptions

If you are a Premium subscriber:

- **Subscribed in-app (via Stripe)**: The subscription is cancelled at the same time as your account deletion.
- **Subscribed via App Store / Google Play**: Billing will continue after the account deletion. Please cancel your subscription separately in the "Subscriptions" settings of the respective store.

## 6. Related policies

The procedures described on this page are based on Article 7 (User Rights) of the [Privacy Policy](/en/privacy). For more detailed information about how personal data is handled, please refer to the Privacy Policy.

## 7. Contact

For questions about account deletion, please use the [contact form](https://docs.google.com/forms/d/e/1FAIpQLSfr11mzmwzwwXXULuoT4w8D57e9aAtUZa_9i8HDGAtDgjNxYw/viewform?usp=dialog) or email **support@aikinote.com**.

Operator: Tomoya Sonokui

---
