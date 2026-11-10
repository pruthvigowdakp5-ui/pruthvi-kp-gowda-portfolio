# Simple free email inbox

The portfolio contact form opens the visitor's default email app with a message addressed to `pruthvigowdakp5@gmail.com`. The visitor must send it from their email app. The separate `portal/index.html` page is a shortcut to that Gmail inbox; Google handles sign-in and keeps the inbox private. The portal does not ask for or store your Gmail password or a separate PIN.

## Use the contact form

1. The visitor fills out the form and selects **Send a message**.
2. Their default email app opens with the recipient, subject, and message filled in.
3. They review and send the email from that app.
4. To read messages, select **Inbox** on the portfolio or visit the published `/portal/` page, choose **Open Gmail inbox**, and sign in to Google.

This does not use FormSubmit, so no FormSubmit activation email is required. It uses your existing Gmail inbox and does not require Supabase, a separate portal password, or a new hosting service beyond publishing the portfolio. If the visitor has no default email app configured, they can use the email link shown in the contact section.
