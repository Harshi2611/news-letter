const required = ["PUSHCUT_SECRET", "PUSHCUT_NOTIFICATION"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

const today = new Date().toISOString().slice(0, 10);
const notificationName = encodeURIComponent(process.env.PUSHCUT_NOTIFICATION);
const url = `https://api.pushcut.io/${process.env.PUSHCUT_SECRET}/notifications/${notificationName}`;

const actions = [];

if (process.env.APPROVAL_WEBHOOK_URL) {
  actions.push({
    name: "Approve",
    url: process.env.APPROVAL_WEBHOOK_URL,
    urlBackgroundOptions: {
      httpMethod: "POST",
      httpContentType: "application/json",
      httpBody: JSON.stringify({ status: "approved", date: today }),
    },
  });
}

if (process.env.REJECT_WEBHOOK_URL) {
  actions.push({
    name: "Reject",
    url: process.env.REJECT_WEBHOOK_URL,
    urlBackgroundOptions: {
      httpMethod: "POST",
      httpContentType: "application/json",
      httpBody: JSON.stringify({ status: "rejected", date: today }),
    },
  });
}

const body = {
  title: "Newsletter approval",
  text: `Your ${today} newsletter draft is ready. Approve it before sending.`,
  input: today,
  isTimeSensitive: true,
};

if (actions.length > 0) {
  body.actions = actions;
}

const response = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

if (!response.ok) {
  const responseText = await response.text();
  throw new Error(`Pushcut request failed: ${response.status} ${responseText}`);
}

console.log(`Pushcut approval notification sent for ${today}.`);
