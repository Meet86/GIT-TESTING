import express from "express";
import cors from "cors";
import jsonfile from "jsonfile";
import simpleGit from "simple-git";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const dataFilePath = path.join(__dirname, "data.json");
const git = simpleGit();

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function generateCalendarData(year) {
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const endOfYear = new Date(Date.UTC(year, 11, 31));
  const startOffset = startOfYear.getUTCDay();
  const endOffset = 6 - endOfYear.getUTCDay();

  const gridStart = addDays(startOfYear, -startOffset);
  const gridEnd = addDays(endOfYear, endOffset);
  const calendar = [];
  const monthLabels = [];

  for (
    let currentWeekStart = new Date(gridStart);
    currentWeekStart <= gridEnd;
    currentWeekStart = addDays(currentWeekStart, 7)
  ) {
    const week = [];
    let monthLabel = null;

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = addDays(currentWeekStart, dayOffset);
      const inSelectedYear = currentDate.getUTCFullYear() === year;
      const isMonthBoundary = currentDate.getUTCDate() === 1;

      if (
        inSelectedYear &&
        (isMonthBoundary || (calendar.length === 0 && dayOffset === 0))
      ) {
        monthLabel = currentDate.getUTCMonth();
      }

      week.push({
        date: inSelectedYear ? formatDate(currentDate) : null,
        empty: !inSelectedYear,
      });
    }

    calendar.push(week);
    monthLabels.push(monthLabel);
  }

  return {
    year,
    calendar,
    month_labels: monthLabels,
  };
}

async function getGitUserName() {
  try {
    const localName = await git.raw(["config", "--get", "user.name"]);
    const trimmedLocalName = localName.trim();
    if (trimmedLocalName) {
      return trimmedLocalName;
    }
  } catch {
    // Fall back to global config below.
  }

  try {
    const globalName = await git.raw([
      "config",
      "--global",
      "--get",
      "user.name",
    ]);
    const trimmedGlobalName = globalName.trim();
    if (trimmedGlobalName) {
      return trimmedGlobalName;
    }
  } catch {
    // Ignore missing config and return a default name.
  }

  return "Unknown user";
}

async function getContributionMap(year) {
  const start = `${year}-01-01T00:00:00Z`;
  const end = `${year}-12-31T23:59:59Z`;
  const rawLog = await git.raw([
    "log",
    "--all",
    `--since=${start}`,
    `--until=${end}`,
    "--date=short",
    "--pretty=format:%ad",
  ]);

  const contributions = {};

  for (const line of rawLog.split(/\r?\n/)) {
    const date = line.trim();
    if (!date) {
      continue;
    }

    contributions[date] = (contributions[date] || 0) + 1;
  }

  return contributions;
}

function buildCommitTimestamp(dateString, commitIndex, commitCount) {
  const safeCount = Math.max(commitCount, 1);
  const hour = 9 + Math.floor((commitIndex / safeCount) * 10);
  const minute = (commitIndex * 11) % 60;
  const second = (commitIndex * 7) % 60;
  return `${dateString}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}Z`;
}

app.get("/", (req, res) => {
  res.json({ message: "GitGreenAdvance Backend API" });
});

app.post("/api/commit", async (req, res) => {
  try {
    const { contributions } = req.body;

    if (!contributions || typeof contributions !== "object") {
      return res.status(400).json({
        success: false,
        message: "Invalid contributions data",
      });
    }

    const contributionYears = [
      ...new Set(
        Object.keys(contributions)
          .map((date) => Number.parseInt(date.slice(0, 4), 10))
          .filter((year) => Number.isInteger(year)),
      ),
    ];

    const existingContributionMaps = await Promise.all(
      contributionYears.map((year) => getContributionMap(year)),
    );

    const existingContributions = existingContributionMaps.reduce(
      (mergedContributions, yearMap) => ({
        ...mergedContributions,
        ...yearMap,
      }),
      {},
    );

    const commitsToMake = Object.entries(contributions)
      .map(([date, count]) => {
        const targetCount = Number.parseInt(count, 10);
        const existingCount = existingContributions[date] || 0;
        const missingCount = Math.max(targetCount - existingCount, 0);

        return {
          date,
          count: missingCount,
          existingCount,
          targetCount,
        };
      })
      .filter(
        ({ count, targetCount }) => Number.isInteger(targetCount) && count > 0,
      )
      .sort((left, right) => left.date.localeCompare(right.date));

    if (commitsToMake.length === 0) {
      return res.json({
        success: false,
        message:
          "No new commits were needed. The selected days already match or exceed your current git history.",
      });
    }

    let totalCommits = 0;

    for (const commit of commitsToMake) {
      for (let i = 0; i < commit.count; i++) {
        const timestamp = buildCommitTimestamp(commit.date, i, commit.count);
        const data = {
          date: timestamp,
          commitCount: i + 1,
        };

        await jsonfile.writeFile(dataFilePath, data);

        await git.add([dataFilePath]);
        await git
          .env({
            GIT_AUTHOR_DATE: timestamp,
            GIT_COMMITTER_DATE: timestamp,
          })
          .commit(`Update: ${commit.date} (Commit ${i + 1})`, {
            "--date": timestamp,
          });

        totalCommits++;
      }
    }

    await git.push();

    res.json({
      success: true,
      message: `Successfully made ${totalCommits} commits`,
      commits: totalCommits,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

app.get("/api/contributions/:year", async (req, res) => {
  try {
    const year = parseInt(req.params.year, 10) || new Date().getFullYear();
    const [userName, contributions] = await Promise.all([
      getGitUserName(),
      getContributionMap(year),
    ]);

    res.json({
      success: true,
      data: {
        userName,
        contributions,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

app.get("/api/calendar/:year", (req, res) => {
  try {
    const year = parseInt(req.params.year, 10) || new Date().getFullYear();

    res.json({
      success: true,
      data: generateCalendarData(year),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`GitGreenAdvance server running on port ${PORT}`);
});
