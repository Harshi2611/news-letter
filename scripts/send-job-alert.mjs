const today = new Date().toISOString().slice(0, 10);
const approvedBy = process.env.APPROVED_BY || "Siri Shortcut";
const approvalNote = process.env.APPROVAL_NOTE || "Approved from iPhone";

const required = ["RESEND_API_KEY", "JOB_ALERT_FROM_EMAIL", "JOB_ALERT_TO_EMAIL"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(`Missing required GitHub secrets: ${missing.join(", ")}`);
}

const candidateProfile = {
  name: "Harshika Rabadiya",
  experience: "3.5+ years",
  preferredLocation: "Ahmedabad first, then Gujarat, then remote India",
  targetRoles: [
    "Node.js Developer",
    "Backend Developer",
    "Senior Node.js Developer",
    "Senior Backend Engineer",
    "Senior Software Developer",
    "Full Stack Developer - Node.js/React",
  ],
  skills: [
    "Node.js",
    "TypeScript",
    "Express.js",
    "NestJS",
    "React",
    "Next.js",
    "PostgreSQL",
    "MongoDB",
    "AWS",
    "Docker",
    "REST APIs",
    "GraphQL",
    "JWT",
    "Microservices",
  ],
};

const searchPages = [
  {
    label: "Ahmedabad Node.js Developer",
    url: "https://in.linkedin.com/jobs/node-js-jobs-ahmedabad",
    priority: 1,
  },
  {
    label: "Ahmedabad Node.js Developer",
    url: "https://in.linkedin.com/jobs/nodejs-developer-jobs-ahmedabad",
    priority: 1,
  },
  {
    label: "Ahmedabad Senior Node.js Developer",
    url: "https://www.linkedin.com/jobs/search/?keywords=Senior%20Node.js%20Developer&location=Ahmedabad%2C%20Gujarat%2C%20India",
    priority: 1,
  },
  {
    label: "Ahmedabad Backend Node.js",
    url: "https://www.linkedin.com/jobs/search/?keywords=Backend%20Developer%20Node.js&location=Ahmedabad%2C%20Gujarat%2C%20India",
    priority: 1,
  },
  {
    label: "Remote India Node.js Backend",
    url: "https://www.linkedin.com/jobs/search/?keywords=Remote%20Node.js%20Backend%20Developer&location=India",
    priority: 3,
  },
];

const fetchedJobs = await fetchLinkedInJobs(searchPages);
const jobs = selectJobs(fetchedJobs, 10);

if (jobs.length < 4) {
  throw new Error(`Only found ${jobs.length} relevant live job alerts. Expected at least 4, so no email was sent.`);
}

const readableDate = new Intl.DateTimeFormat("en-IN", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "Asia/Kolkata",
}).format(new Date());

const subject = `Node.js Job Alert - ${readableDate}`;
const text = buildTextEmail(jobs, readableDate, approvedBy, approvalNote);
const html = buildHtmlEmail(jobs, readableDate, approvedBy, approvalNote);

if (process.env.DRY_RUN === "1") {
  console.log(`Subject: ${subject}`);
  console.log("");
  console.log(text);
  process.exit(0);
}

const response = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    "Content-Type": "application/json",
    "User-Agent": "job-alert-siri/1.0",
  },
  body: JSON.stringify({
    from: process.env.JOB_ALERT_FROM_EMAIL,
    to: [process.env.JOB_ALERT_TO_EMAIL],
    subject,
    html,
    text,
  }),
});

const resultText = await response.text();

if (!response.ok) {
  throw new Error(`Job alert email send failed: ${response.status} ${resultText}`);
}

console.log(`Job alert email sent for ${today}.`);
console.log(resultText);

async function fetchLinkedInJobs(pages) {
  const settled = await Promise.allSettled(
    pages.map(async (page) => {
      const response = await fetch(page.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 job-alert-siri/1.0",
          Accept: "text/html,application/xhtml+xml",
        },
      });

      if (!response.ok) {
        throw new Error(`${page.label} failed: ${response.status}`);
      }

      const html = await response.text();
      return parseLinkedInJobs(html, page);
    }),
  );

  const errors = settled
    .filter((result) => result.status === "rejected")
    .map((result) => result.reason.message);

  if (errors.length > 0) {
    console.warn(`Some job searches failed: ${errors.join("; ")}`);
  }

  return settled
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value);
}

function parseLinkedInJobs(html, page) {
  const text = decodeHtml(stripTags(html));
  const jobs = [];
  const cards = [...html.matchAll(/<li\b[\s\S]{0,7000}?<\/li>/gi)].map((match) => match[0]);

  for (const card of cards) {
    const urlMatch = card.match(/https?:\/\/(?:www\.|in\.)?linkedin\.com\/jobs\/view\/[^"?<\s]+/i);
    if (!urlMatch) continue;

    const cardText = decodeHtml(stripTags(card)).replace(/\s+/g, " ").trim();
    if (!/node|backend|software engineer|full stack|nestjs|express/i.test(cardText)) continue;
    if (/\b(php|symfony|laravel)\b/i.test(cardText) && !/\b(node|node\.js|nestjs|express)\b/i.test(cardText)) continue;
    if (/\b(internship|intern|fresher|trainee)\b/i.test(cardText)) continue;

    const title =
      readMeta(card, "title") ||
      readClassText(card, "base-search-card__title") ||
      firstMeaningfulLine(cardText) ||
      "Node.js / Backend role";

    const company =
      readClassText(card, "base-search-card__subtitle") ||
      readClassText(card, "hidden-nested-link") ||
      inferCompany(cardText) ||
      "Company listed on LinkedIn";

    const location =
      readClassText(card, "job-search-card__location") ||
      inferLocation(cardText) ||
      page.label;

    jobs.push({
      company: clean(company),
      title: clean(title),
      location: clean(location),
      url: normalizeLinkedInUrl(urlMatch[0]),
      fit: buildFit(cardText),
      priority: page.priority,
    });
  }

  if (jobs.length === 0 && /Node|Backend|Developer/i.test(text)) {
    jobs.push({
      company: "LinkedIn search results",
      title: page.label,
      location: page.label.includes("Ahmedabad") ? "Ahmedabad priority search" : "India / Remote search",
      url: page.url,
      fit: "Open this search page for the latest live results. LinkedIn may hide individual job cards from automated fetches.",
      priority: page.priority,
    });
  }

  return jobs;
}

function selectJobs(rawJobs, limit) {
  const seen = new Set();

  return rawJobs
    .filter((job) => job.title && job.company && job.url)
    .filter((job) => isRelevantJob(job))
    .map((job) => ({ ...job, score: scoreJob(job) }))
    .sort((a, b) => b.score - a.score)
    .filter((job) => {
      const key = `${job.company}|${job.title}`.toLowerCase().replace(/[^a-z0-9|]+/g, " ").trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, Math.max(4, Math.min(limit, 10)));
}

function isRelevantJob(job) {
  const haystack = `${job.company} ${job.title} ${job.location} ${job.fit}`.toLowerCase();
  const hasTargetSignal =
    haystack.includes("node") ||
    haystack.includes("nestjs") ||
    haystack.includes("express") ||
    haystack.includes("backend") ||
    haystack.includes("back end") ||
    haystack.includes("full stack") ||
    haystack.includes("software engineer");

  const isWrongStack =
    (haystack.includes("php") || haystack.includes("symfony") || haystack.includes("laravel")) &&
    !haystack.includes("node");

  const isTooJunior =
    haystack.includes("internship") ||
    haystack.includes("intern ") ||
    haystack.includes("fresher") ||
    haystack.includes("trainee");

  return hasTargetSignal && !isWrongStack && !isTooJunior;
}

function scoreJob(job) {
  const haystack = `${job.company} ${job.title} ${job.location} ${job.fit}`.toLowerCase();
  let score = 0;

  if (haystack.includes("ahmedabad")) score += 50;
  if (haystack.includes("gujarat")) score += 20;
  if (haystack.includes("remote")) score += 12;
  if (haystack.includes("node")) score += 30;
  if (haystack.includes("backend")) score += 25;
  if (haystack.includes("nestjs")) score += 16;
  if (haystack.includes("express")) score += 12;
  if (haystack.includes("typescript")) score += 12;
  if (haystack.includes("postgres")) score += 10;
  if (haystack.includes("mongodb")) score += 8;
  if (haystack.includes("aws")) score += 8;
  if (haystack.includes("docker")) score += 8;
  if (haystack.includes("3-6") || haystack.includes("3 to 6") || haystack.includes("3–6")) score += 20;
  if (haystack.includes("5+")) score -= 8;

  return score - Number(job.priority || 3);
}

function buildTextEmail(jobs, date, approver, note) {
  const lines = [
    `Node.js Job Alert - ${date}`,
    "",
    `${candidateProfile.name} | ${candidateProfile.experience}`,
    `Location priority: ${candidateProfile.preferredLocation}`,
    `Target roles: ${candidateProfile.targetRoles.join(", ")}`,
    "",
    "Apply first: Simform, SSS Risk Management, Enlighten Hacks, then ZURU Tech as a stretch if still open.",
    "",
  ];

  for (const [index, job] of jobs.entries()) {
    lines.push(`${index + 1}. ${job.company} - ${job.title}`);
    lines.push(`   - Location: ${job.location}`);
    lines.push(`   - Match: ${job.fit}`);
    lines.push(`   - Link: ${job.url}`);
    lines.push("");
  }

  lines.push(`Approved by: ${approver}`);
  lines.push(`Approval note: ${note}`);

  return lines.join("\n");
}

function buildHtmlEmail(jobs, date, approver, note) {
  return `<!doctype html>
<html>
  <body style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5; max-width: 760px; margin: 0 auto; padding: 24px;">
    <h1 style="font-size: 24px; margin-bottom: 8px;">Node.js Job Alert - ${escapeHtml(date)}</h1>
    <p style="margin-top: 0;">${escapeHtml(candidateProfile.name)} | ${escapeHtml(candidateProfile.experience)}</p>
    <p><strong>Location priority:</strong> ${escapeHtml(candidateProfile.preferredLocation)}</p>
    <p><strong>Apply first:</strong> Simform, SSS Risk Management, Enlighten Hacks, then ZURU Tech as a stretch if still open.</p>
    ${jobs.map((job, index) => renderJobHtml(job, index + 1)).join("\n")}
    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
    <p><strong>Approved by:</strong> ${escapeHtml(approver)}</p>
    <p><strong>Approval note:</strong> ${escapeHtml(note)}</p>
  </body>
</html>`;
}

function renderJobHtml(job, index) {
  return `<section style="margin: 22px 0;">
    <h2 style="font-size: 18px; margin: 0 0 8px;">${index}. ${escapeHtml(job.company)} - ${escapeHtml(job.title)}</h2>
    <ul style="margin: 0 0 8px; padding-left: 20px;">
      <li><strong>Location:</strong> ${escapeHtml(job.location)}</li>
      <li><strong>Match:</strong> ${escapeHtml(job.fit)}</li>
    </ul>
    <p style="margin: 0;"><a href="${escapeHtml(job.url)}">Open job</a></p>
  </section>`;
}

function buildFit(value) {
  const matched = candidateProfile.skills.filter((skill) =>
    value.toLowerCase().includes(skill.toLowerCase().replace(".js", "")),
  );

  if (matched.length === 0) {
    return "Potential Node.js/backend match. Review the posting details before applying.";
  }

  return `Matches: ${matched.slice(0, 7).join(", ")}.`;
}

function normalizeLinkedInUrl(url) {
  return url.split("?")[0].replace(/^https:\/\/www\.linkedin\.com/, "https://in.linkedin.com");
}

function readMeta(html, name) {
  const match = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"));
  return match ? match[1] : "";
}

function readClassText(html, className) {
  const match = html.match(new RegExp(`<[^>]+class=["'][^"']*${className}[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, "i"));
  return match ? stripTags(match[1]) : "";
}

function firstMeaningfulLine(value) {
  return value
    .split(/\s{2,}|\n+/)
    .map((line) => clean(line))
    .find((line) => /node|backend|developer|software engineer|full stack/i.test(line));
}

function inferCompany(value) {
  const match = value.match(/(?:at|by)\s+([A-Z][A-Za-z0-9 .&-]{2,60})/);
  return match ? match[1] : "";
}

function inferLocation(value) {
  if (/greater ahmedabad/i.test(value)) return "Greater Ahmedabad Area";
  if (/ahmedabad/i.test(value)) return "Ahmedabad, Gujarat, India";
  if (/remote/i.test(value)) return "Remote";
  if (/india/i.test(value)) return "India";
  return "";
}

function stripTags(value) {
  return String(value).replace(/<[^>]*>/g, " ");
}

function clean(value) {
  return decodeHtml(String(value)).replace(/\s+/g, " ").trim();
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

  return String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, entity) => entities[entity.toLowerCase()] || match);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
