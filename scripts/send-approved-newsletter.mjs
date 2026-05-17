const today = new Date().toISOString().slice(0, 10);
const approvedBy = process.env.APPROVED_BY || "Siri Shortcut";
const approvalNote = process.env.APPROVAL_NOTE || "Approved from iPhone";

const required = ["RESEND_API_KEY", "NEWSLETTER_FROM_EMAIL", "NEWSLETTER_TO_EMAIL"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(`Missing required GitHub secrets: ${missing.join(", ")}`);
}

const sources = [
  { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
  { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/technology-lab" },
  { name: "Wired", url: "https://www.wired.com/feed/category/business/latest/rss" },
  { name: "MIT Technology Review", url: "https://www.technologyreview.com/feed/" },
  { name: "BleepingComputer", url: "https://www.bleepingcomputer.com/feed/" },
  { name: "Hacker News", url: "https://hnrss.org/frontpage" },
];

const stories = await fetchStories(sources);
const topStories = selectTopStories(stories, 10);

if (topStories.length === 0) {
  throw new Error("No newsletter stories could be fetched from the configured sources.");
}

const readableDate = new Intl.DateTimeFormat("en", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "Asia/Kolkata",
}).format(new Date());

const subject = `Top 10 Tech News - ${readableDate}`;
const text = buildTextNewsletter(topStories, readableDate, approvedBy, approvalNote);

const html = `<!doctype html>
<html>
  <body style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5; max-width: 720px; margin: 0 auto; padding: 24px;">
    <h1 style="font-size: 24px; margin-bottom: 8px;">Top 10 Tech News - ${escapeHtml(readableDate)}</h1>
    <p style="margin-top: 0;">A concise technology digest fetched from current RSS sources and sent after Siri approval.</p>
    ${topStories.map((story, index) => renderStoryHtml(story, index + 1)).join("\n")}
    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
    <p><strong>Approved by:</strong> ${escapeHtml(approvedBy)}</p>
    <p><strong>Approval note:</strong> ${escapeHtml(approvalNote)}</p>
  </body>
</html>`;

const response = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    "Content-Type": "application/json",
    "User-Agent": "newsletter-siri-approval/1.0",
  },
  body: JSON.stringify({
    from: process.env.NEWSLETTER_FROM_EMAIL,
    to: [process.env.NEWSLETTER_TO_EMAIL],
    subject,
    html,
    text,
  }),
});

const resultText = await response.text();

if (!response.ok) {
  throw new Error(`Email send failed: ${response.status} ${resultText}`);
}

console.log(`Newsletter email sent for ${today}.`);
console.log(resultText);

async function fetchStories(feedSources) {
  const settled = await Promise.allSettled(
    feedSources.map(async (source) => {
      const response = await fetch(source.url, {
        headers: {
          "User-Agent": "newsletter-siri-approval/1.0",
          Accept: "application/rss+xml, application/xml, text/xml",
        },
      });

      if (!response.ok) {
        throw new Error(`${source.name} feed failed: ${response.status}`);
      }

      const xml = await response.text();
      return parseRssItems(xml, source.name);
    }),
  );

  const errors = settled
    .filter((result) => result.status === "rejected")
    .map((result) => result.reason.message);

  if (errors.length > 0) {
    console.warn(`Some feeds failed: ${errors.join("; ")}`);
  }

  return settled
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value);
}

function parseRssItems(xml, sourceName) {
  return [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)]
    .map((match) => {
      const item = match[0];
      const title = cleanText(readTag(item, "title"));
      const link = cleanText(readTag(item, "link"));
      const pubDateValue = cleanText(readTag(item, "pubDate") || readTag(item, "dc:date"));
      const description = cleanText(readTag(item, "description") || readTag(item, "content:encoded"));
      const pubDate = pubDateValue ? new Date(pubDateValue) : new Date();

      return {
        title,
        link,
        pubDate: Number.isNaN(pubDate.getTime()) ? new Date() : pubDate,
        summary: summarize(description),
        source: sourceName,
      };
    })
    .filter((story) => story.title && story.link);
}

function selectTopStories(stories, limit) {
  const seen = new Set();

  return stories
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
    .filter((story) => {
      const key = story.title
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, "")
        .split(" ")
        .filter((word) => word.length > 3)
        .slice(0, 8)
        .join(" ");

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function buildTextNewsletter(stories, date, approver, note) {
  const lines = [
    `Top 10 Tech News - ${date}`,
    "",
    "A concise technology digest fetched from current RSS sources and sent after Siri approval.",
    "",
  ];

  for (const [index, story] of stories.entries()) {
    lines.push(`${index + 1}. ${story.title}`);
    lines.push(`   - ${story.summary}`);
    lines.push(`   - Source: ${story.source}`);
    lines.push(`   - Link: ${story.link}`);
    lines.push(`   - Why it matters: This story may affect technology users, builders, investors, or security teams.`);
    lines.push("");
  }

  lines.push(`Approved by: ${approver}`);
  lines.push(`Approval note: ${note}`);

  return lines.join("\n");
}

function renderStoryHtml(story, index) {
  return `<section style="margin: 22px 0;">
    <h2 style="font-size: 18px; margin: 0 0 8px;">${index}. ${escapeHtml(story.title)}</h2>
    <ul style="margin: 0 0 8px; padding-left: 20px;">
      <li>${escapeHtml(story.summary)}</li>
      <li>Source: ${escapeHtml(story.source)}</li>
      <li>Why it matters: This story may affect technology users, builders, investors, or security teams.</li>
    </ul>
    <p style="margin: 0;"><a href="${escapeHtml(story.link)}">Read the full story</a></p>
  </section>`;
}

function readTag(xml, tagName) {
  const escapedTagName = tagName.replace(":", "\\:");
  const match = xml.match(new RegExp(`<${escapedTagName}\\b[^>]*>([\\s\\S]*?)<\\/${escapedTagName}>`, "i"));
  return match ? match[1] : "";
}

function cleanText(value) {
  return decodeHtml(stripTags(stripCdata(value))).replace(/\s+/g, " ").trim();
}

function stripCdata(value) {
  return value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

function stripTags(value) {
  return value.replace(/<[^>]*>/g, " ");
}

function decodeHtml(value) {
  const entities = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };

  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, entity) => entities[entity.toLowerCase()] || match);
}

function summarize(value) {
  const fallback = "Open the source link for the complete report and context.";
  const sentences = value
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const summary = sentences.slice(0, 2).join(" ") || value || fallback;
  return summary.length > 260 ? `${summary.slice(0, 257).trim()}...` : summary;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
