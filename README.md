# Newsletter Siri Approval Automation

This repo uses GitHub Actions plus an iPhone Siri Shortcut.

1. You say: `Hey Siri, send newsletter`.
2. The Siri Shortcut calls GitHub's workflow dispatch API.
3. GitHub fetches current technology news from RSS feeds.
4. GitHub sends a top-10 newsletter email with Resend.

## GitHub Workflows

- `.github/workflows/newsletter-send-approved.yml`: Siri-triggered approval workflow.

## GitHub Token For Siri

Create a fine-grained GitHub personal access token:

1. GitHub -> `Settings` -> `Developer settings` -> `Personal access tokens` -> `Fine-grained tokens`.
2. Create a token for this repository.
3. Give it repository permission: `Actions: Read and write`.
4. Copy the token.

Keep this token private. It will be stored inside your iPhone Shortcut.

## Email Sending Setup

This repo uses Resend to send email from GitHub Actions. The newsletter content is fetched from RSS feeds including TechCrunch, The Verge, Ars Technica, Wired, MIT Technology Review, BleepingComputer, and Hacker News.

Create a Resend account, create an API key, then add these GitHub repository secrets:

- `RESEND_API_KEY`: your Resend API key.
- `NEWSLETTER_FROM_EMAIL`: sender address, for example `Newsletter <onboarding@resend.dev>` for testing or your verified domain email.
- `NEWSLETTER_TO_EMAIL`: your email address.

GitHub location:

`Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`

## Siri Shortcut Setup

Create a Shortcut named:

```text
Send Newsletter
```

Add a `Get Contents of URL` action:

- URL:

```text
https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/actions/workflows/newsletter-send-approved.yml/dispatches
```

- Method: `POST`
- Headers:

```text
Accept: application/vnd.github+json
Authorization: Bearer YOUR_FINE_GRAINED_GITHUB_TOKEN
X-GitHub-Api-Version: 2022-11-28
```

- Request body type: JSON
- JSON body:

```json
{
  "ref": "main",
  "inputs": {
    "approved_by": "Siri Shortcut",
    "approval_note": "Approved from iPhone"
  }
}
```

Now say:

```text
Hey Siri, send newsletter
```

## Manual GitHub Test

1. Open the `Actions` tab.
2. Select `Send approved newsletter`.
3. Click `Run workflow`.

## Job Alert Siri Automation

This repo also supports a Node.js/backend job alert email for Harshika's profile.

1. You say: `Hey Siri, send job alert`.
2. The Siri Shortcut calls GitHub's workflow dispatch API.
3. GitHub runs `scripts/send-job-alert.mjs`.
4. The script fetches LinkedIn job-search pages, filters Ahmedabad-priority Node.js/backend matches, and sends an email with 4-10 companies.
5. If fewer than 4 relevant live jobs are found, the workflow fails and no email is sent.

### Job Alert Email Setup

Add these GitHub repository secrets:

- `RESEND_API_KEY`: your Resend API key.
- `JOB_ALERT_FROM_EMAIL`: sender address, for example `Job Alert <onboarding@resend.dev>` for testing or your verified domain email.
- `JOB_ALERT_TO_EMAIL`: your email address.

### Siri Shortcut Setup

Create a Shortcut named:

```text
Send Job Alert
```

Add a `Get Contents of URL` action:

- URL:

```text
https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/actions/workflows/job-alert-send-approved.yml/dispatches
```

- Method: `POST`
- Headers:

```text
Accept: application/vnd.github+json
Authorization: Bearer YOUR_FINE_GRAINED_GITHUB_TOKEN
X-GitHub-Api-Version: 2022-11-28
```

- Request body type: JSON
- JSON body:

```json
{
  "ref": "main",
  "inputs": {
    "approved_by": "Siri Shortcut",
    "approval_note": "Approved from iPhone"
  }
}
```

Now say:

```text
Hey Siri, send job alert
```

### Manual GitHub Test

1. Open the `Actions` tab.
2. Select `Send approved job alert`.
3. Click `Run workflow`.

### Local Dry Run

Run this to preview the email without sending:

```bash
DRY_RUN=1 RESEND_API_KEY=test JOB_ALERT_FROM_EMAIL=test@example.com JOB_ALERT_TO_EMAIL=you@example.com node scripts/send-job-alert.mjs
```
