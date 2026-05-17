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
