# Newsletter Approval Automation

This repo starts with the first milestone:

1. GitHub Actions runs every day at 9:00 AM IST.
2. The workflow calls Pushcut.
3. Pushcut sends an approval notification to your iPhone.

## iPhone Pushcut Setup

1. Install Pushcut on your iPhone.
2. Create a notification named `Newsletter Approval`.
3. In Pushcut, copy your account webhook secret from the account/webhook area.
4. Keep the notification name exactly the same as the GitHub secret value below.

## GitHub Secrets

In your GitHub repository, go to:

`Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`

Create these secrets:

- `PUSHCUT_SECRET`: your Pushcut webhook secret.
- `PUSHCUT_NOTIFICATION`: `Newsletter Approval`

Optional for the next step:

- `APPROVAL_WEBHOOK_URL`: webhook that should run when you approve.
- `REJECT_WEBHOOK_URL`: webhook that should run when you reject.

## Manual Test

After pushing this repo to GitHub:

1. Open the `Actions` tab.
2. Select `Newsletter approval request`.
3. Click `Run workflow`.
4. Confirm the Pushcut notification arrives on your iPhone.

## Schedule

The workflow uses:

```yaml
cron: "30 3 * * *"
```

GitHub schedules use UTC, so this runs at 9:00 AM in India Standard Time.
