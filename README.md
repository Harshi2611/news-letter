# Newsletter Siri Approval Automation

This repo uses GitHub Actions plus an iPhone Siri Shortcut.

1. GitHub Actions runs every day at 9:00 AM IST and prepares the newsletter draft.
2. You say: `Hey Siri, approve newsletter`.
3. The Siri Shortcut calls GitHub's workflow dispatch API.
4. GitHub runs the `Send approved newsletter` workflow.

## GitHub Workflows

- `.github/workflows/newsletter-approval-request.yml`: daily 9:00 AM IST draft workflow.
- `.github/workflows/newsletter-send-approved.yml`: Siri-triggered approval workflow.

## GitHub Token For Siri

Create a fine-grained GitHub personal access token:

1. GitHub -> `Settings` -> `Developer settings` -> `Personal access tokens` -> `Fine-grained tokens`.
2. Create a token for this repository.
3. Give it repository permission: `Actions: Read and write`.
4. Copy the token.

Keep this token private. It will be stored inside your iPhone Shortcut.

## Siri Shortcut Setup

Create a Shortcut named:

```text
Approve Newsletter
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
Hey Siri, approve newsletter
```

## Manual GitHub Test

1. Open the `Actions` tab.
2. Select `Send approved newsletter`.
3. Click `Run workflow`.

## Schedule

The daily draft workflow uses:

```yaml
cron: "30 3 * * *"
```

GitHub schedules use UTC, so this runs at 9:00 AM in India Standard Time.
