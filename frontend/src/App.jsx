import { cloneElement, useEffect, useMemo, useState } from "react";
import CalendarHeatmap from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";
import "./App.css";

const MAX_INTENSITY = 5;
const COLORS = [
  "#ebedf0",
  "#c7f0cf",
  "#82d89c",
  "#49b96a",
  "#2d8f4c",
  "#1e682f",
];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getRandomFillConfig(level) {
  const configs = {
    1: { density: 0.12, min: 1, max: 1 },
    2: { density: 0.24, min: 1, max: 2 },
    3: { density: 0.38, min: 1, max: 3 },
    4: { density: 0.55, min: 2, max: 4 },
    5: { density: 0.72, min: 3, max: 5 },
  };

  return configs[level] || configs[3];
}

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function getYearStart(year) {
  return new Date(Date.UTC(year, 0, 1));
}

function getYearEnd(year) {
  return new Date(Date.UTC(year, 11, 31));
}

function buildYearDates(year) {
  const dates = [];
  const cursor = getYearStart(year);
  const end = getYearEnd(year);

  while (cursor <= end) {
    dates.push(formatDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function getDisplayCount(count) {
  return Math.max(0, Math.min(Number.parseInt(count, 10) || 0, MAX_INTENSITY));
}

function App() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [baseContributions, setBaseContributions] = useState({});
  const [contributions, setContributions] = useState({});
  const [selectedIntensity, setSelectedIntensity] = useState(2);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [gitUserName, setGitUserName] = useState("");
  const [isMouseDown, setIsMouseDown] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchYearData = async () => {
      setCalendarLoading(true);
      setStatus({ type: "", message: "" });

      try {
        const response = await fetch(
          `http://localhost:3001/api/contributions/${selectedYear}`,
        );
        const result = await response.json();

        if (cancelled) {
          return;
        }

        if (!result.success) {
          throw new Error(result.message || "Failed to load contributions");
        }

        const nextContributions = result.data.contributions || {};
        setBaseContributions(nextContributions);
        setContributions(nextContributions);
        setGitUserName(result.data.userName || "Unknown user");
      } catch (error) {
        if (!cancelled) {
          setStatus({
            type: "error",
            message: `Failed to load repository data: ${error.message}`,
          });
        }
      } finally {
        if (!cancelled) {
          setCalendarLoading(false);
        }
      }
    };

    fetchYearData();

    return () => {
      cancelled = true;
    };
  }, [selectedYear]);

  useEffect(() => {
    const handleMouseUp = () => {
      setIsMouseDown(false);
    };

    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key >= "1" && event.key <= String(MAX_INTENSITY)) {
        const intensity = Number.parseInt(event.key, 10);
        setSelectedIntensity(intensity);
        setStatus({
          type: "success",
          message: `Selected intensity: ${intensity} commits`,
        });
      } else if (event.key === "0") {
        setSelectedIntensity(0);
        setStatus({
          type: "success",
          message: "Selected intensity: 0 commits",
        });
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  const yearDates = useMemo(() => buildYearDates(selectedYear), [selectedYear]);

  const heatmapValues = useMemo(
    () =>
      yearDates.map((date) => ({
        date,
        count: contributions[date] || 0,
        baseCount: baseContributions[date] || 0,
      })),
    [baseContributions, contributions, yearDates],
  );

  const activeDays = Object.values(contributions).filter(
    (count) => count > 0,
  ).length;
  const totalCommits = Object.values(contributions).reduce(
    (sum, count) => sum + count,
    0,
  );

  const setContributionsForDate = (dateString, count) => {
    setContributions((previous) => {
      const nextContributions = { ...previous };
      const nextCount = Math.max(count, baseContributions[dateString] || 0);

      if (nextCount > 0) {
        nextContributions[dateString] = nextCount;
      } else {
        delete nextContributions[dateString];
      }

      return nextContributions;
    });
  };

  const handleDayApply = (dateString, intensity = selectedIntensity) => {
    setContributionsForDate(dateString, intensity);
  };

  const handleDayReset = (event, dateString) => {
    event.preventDefault();
    setContributionsForDate(dateString, 0);
  };

  const clearYear = () => {
    if (
      window.confirm(
        `Reset ${selectedYear} back to the commits that already exist in git history?`,
      )
    ) {
      setContributions(baseContributions);
    }
  };

  const setAllToIntensity = () => {
    if (
      window.confirm(
        `Are you sure you want to set all contributions for ${selectedYear} to intensity ${selectedIntensity}?`,
      )
    ) {
      const nextContributions = { ...baseContributions };

      yearDates.forEach((date) => {
        nextContributions[date] = Math.max(
          selectedIntensity,
          baseContributions[date] || 0,
        );
      });

      setContributions(nextContributions);
    }
  };

  const applyRandomFill = (level) => {
    const config = getRandomFillConfig(level);
    const nextContributions = { ...baseContributions };

    yearDates.forEach((date) => {
      if (Math.random() <= config.density) {
        const spread = config.max - config.min + 1;
        const randomIntensity = config.min + Math.floor(Math.random() * spread);
        nextContributions[date] = Math.max(
          randomIntensity,
          baseContributions[date] || 0,
        );
      }
    });

    setContributions(nextContributions);
    setStatus({
      type: "success",
      message: `Applied random fill level ${level}. Level 1 stays sparse and level 5 fills much more of the year.`,
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await fetch("http://localhost:3001/api/commit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contributions }),
      });

      const result = await response.json();

      if (result.success) {
        setBaseContributions({ ...contributions });
        setStatus({ type: "success", message: result.message });
      } else {
        setStatus({ type: "error", message: result.message });
      }
    } catch (error) {
      setStatus({ type: "error", message: `Error: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const transformDayElement = (element, value) => {
    if (!value?.date) {
      return element;
    }

    return cloneElement(element, {
      ...element.props,
      className: `${element.props.className || ""} day-cell`.trim(),
      onMouseDown: (event) => {
        if (event.button !== 0) {
          return;
        }

        setIsMouseDown(true);
        handleDayApply(value.date);
      },
      onMouseEnter: () => {
        setHoveredDay(value);

        if (isMouseDown) {
          handleDayApply(value.date);
        }
      },
      onMouseLeave: () => {
        setHoveredDay(null);
      },
      onContextMenu: (event) => handleDayReset(event, value.date),
    });
  };

  const classForValue = (value) => {
    if (!value?.date) {
      return "color-empty";
    }

    const level = getDisplayCount(value.count);
    return level === 0 ? "color-empty" : `color-github-${level}`;
  };

  const titleForValue = (value) => {
    if (!value?.date) {
      return "";
    }

    return `${value.date}: ${value.count} commit${value.count === 1 ? "" : "s"}`;
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>Git Contribution Graph Editor</h1>
          <div className="header-controls">
            <div className="control-group">
              <label>Year:</label>
              <input
                type="number"
                value={selectedYear}
                onChange={(event) =>
                  setSelectedYear(
                    Number.parseInt(event.target.value, 10) ||
                      new Date().getFullYear(),
                  )
                }
                min="1970"
                max="2100"
                style={{
                  padding: "0.5rem 1rem",
                  border: "1px solid var(--color-border)",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  fontFamily: "inherit",
                  background: "var(--color-bg-primary)",
                  color: "var(--color-text-primary)",
                  cursor: "pointer",
                  width: "100px",
                }}
              />
            </div>
            <div className="control-group repo-meta">
              <span className="repo-pill">
                Git user: {gitUserName || "Loading..."}
              </span>
              <span className="repo-pill">Days selected: {activeDays}</span>
              <span className="repo-pill">Target commits: {totalCommits}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        <section className="contribution-graph">
          <div className="graph-header">
            <h2>Contributions in {selectedYear}</h2>
            <p className="graph-subtitle">
              {calendarLoading
                ? "Loading your git history for this year..."
                : "Loaded from your local git history. Use the GitHub-style graph below to paint a pattern, right-click to reset a day, and press 1-5 to change intensity."}
            </p>
          </div>

          <div className="random-fill-panel">
            <span className="random-fill-label">Random Fill</span>
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                type="button"
                className="btn btn-random"
                disabled={calendarLoading}
                onClick={() => applyRandomFill(level)}
              >
                Level {level}
              </button>
            ))}
          </div>

          <div className="graph-container">
            <div className="legend">
              <span className="legend-label">Less</span>
              {COLORS.map((color, index) => (
                <button
                  key={index}
                  type="button"
                  className={`legend-color ${selectedIntensity === index ? "active" : ""}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedIntensity(index)}
                  title={index === 0 ? "Clear day" : `${index} commits`}
                ></button>
              ))}
              <span className="legend-label">More</span>
            </div>

            <div className="heatmap-shell">
              <CalendarHeatmap
                startDate={getYearStart(selectedYear)}
                endDate={getYearEnd(selectedYear)}
                values={heatmapValues}
                showMonthLabels={true}
                showWeekdayLabels={true}
                showOutOfRangeDays={true}
                monthLabels={MONTHS}
                weekdayLabels={DAYS}
                gutterSize={4}
                classForValue={classForValue}
                titleForValue={titleForValue}
                transformDayElement={transformDayElement}
                onMouseLeave={() => setHoveredDay(null)}
              />
            </div>
          </div>

          <div className="action-buttons">
            <button onClick={clearYear} className="btn btn-secondary">
              Reset To Existing
            </button>
            <button
              onClick={setAllToIntensity}
              className="btn btn-secondary"
              disabled={calendarLoading}
            >
              Set All to Intensity
            </button>
            <button
              onClick={handleSubmit}
              className="btn btn-primary"
              disabled={loading || calendarLoading}
            >
              {loading ? "Committing..." : "Create Missing Commits"}
            </button>
          </div>

          {status.message && (
            <div className={`status ${status.type}`} id="status">
              {status.message}
            </div>
          )}

          {hoveredDay && (
            <div className="hover-info">
              <div className="hover-date">{hoveredDay.date}</div>
              <div className="hover-commits">
                {hoveredDay.count} commit{hoveredDay.count !== 1 ? "s" : ""}
              </div>
              <div className="hover-base">
                Existing in git: {hoveredDay.baseCount}
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <div className="footer-content">
          <p>GitGreenAdvance - Edit your GitHub contribution graph</p>
          <p className="keyboard-shortcuts">
            Keyboard shortcuts: 1-5 to select intensity, 0 to clear, click or
            drag to apply
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
