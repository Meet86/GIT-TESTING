import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [contributions, setContributions] = useState({});
  const [selectedIntensity, setSelectedIntensity] = useState(2);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [selectedSquares, setSelectedSquares] = useState(new Set());
  const [calendarData, setCalendarData] = useState(null);
  const [isMouseDown, setIsMouseDown] = useState(false);

  const colors = [
    '#ebedf0',
    '#9be9a8',
    '#40c463',
    '#30a14e',
    '#216e39'
  ];

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Generate year options dynamically
  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let year = currentYear - 10; year <= currentYear + 5; year++) {
    yearOptions.push(year);
  }

  // Fetch calendar data from Python backend
  useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/calendar/${selectedYear}`);
        const result = await response.json();
        
        if (result.success) {
          setCalendarData(result.data);
        } else {
          console.error('Failed to fetch calendar data:', result.message);
        }
      } catch (error) {
        console.error('Error fetching calendar data:', error);
      }
    };

    fetchCalendarData();
  }, [selectedYear]);

  const getContributionsForDate = (dateString) => {
    return contributions[dateString] || 0;
  };

  const setContributionsForDate = (dateString, count) => {
    setContributions(prev => ({
      ...prev,
      [dateString]: count
    }));
  };

  const handleSquareClick = (dateString) => {
    setContributionsForDate(dateString, selectedIntensity);
    setSelectedSquares(prev => {
      const newSelected = new Set(prev);
      newSelected.add(dateString);
      return newSelected;
    });
  };

  const handleSquareRightClick = (e, dateString) => {
    e.preventDefault();
    setContributionsForDate(dateString, 0);
  };

  const handleSquareMouseEnter = (dateString) => {
    setHoveredDay(dateString);
    
    // If mouse is held down, apply intensity to this square too (drag feature)
    if (isMouseDown) {
      setContributionsForDate(dateString, selectedIntensity);
      setSelectedSquares(prev => {
        const newSelected = new Set(prev);
        newSelected.add(dateString);
        return newSelected;
      });
    }
  };

  const handleSquareMouseLeave = () => {
    setHoveredDay(null);
  };

  const handleMouseDown = () => {
    setIsMouseDown(true);
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  const clearYear = () => {
    if (window.confirm(`Are you sure you want to clear all contributions for ${selectedYear}?`)) {
      setContributions({});
      setSelectedSquares(new Set());
    }
  };

  const setAllToIntensity = () => {
    if (window.confirm(`Are you sure you want to set all contributions for ${selectedYear} to intensity ${selectedIntensity}?`)) {
      const newContributions = {};
      
      // Use calendar data to get all dates
      if (calendarData && calendarData.calendar) {
        calendarData.calendar.forEach(week => {
          week.forEach(day => {
            if (day.date && !day.empty) {
              newContributions[day.date] = selectedIntensity;
            }
          });
        });
      }
      
      setContributions(newContributions);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch('http://localhost:3001/api/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          contributions,
          calendar: calendarData?.calendar || null
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setStatus({ type: 'success', message: result.message });
      } else {
        setStatus({ type: 'error', message: result.message });
      }
    } catch (error) {
      setStatus({ type: 'error', message: `Error: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleLegendClick = (intensity) => {
    setSelectedIntensity(intensity);
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key >= '1' && e.key <= '5') {
        const intensity = parseInt(e.key);
        setSelectedIntensity(intensity);
        setStatus({ type: 'success', message: `Selected intensity: ${intensity} commits` });
      } else if (e.key === '0') {
        setSelectedIntensity(0);
        setStatus({ type: 'success', message: `Selected intensity: 0 commits` });
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Use data from Python backend
  const calendar = calendarData?.calendar || [];
  const monthLabels = calendarData?.month_labels || [];
  
  // Flatten calendar: week0-Sun...Sat, week1-Sun...Sat, ...
  // With grid-template-columns: repeat(53, ...), each column = one week
  const flattenCalendar = (calendar) => {
    if (!calendar || calendar.length === 0) return [];
    const flat = [];
    calendar.forEach((week) => {
      week.forEach((day) => {
        flat.push(day);
      });
    });
    return flat;
  };
  
  const flatCalendar = flattenCalendar(calendar);

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
                onChange={(e) => setSelectedYear(parseInt(e.target.value) || currentYear)}
                min="1970"
                max="2100"
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  background: 'var(--color-bg-primary)',
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                  width: '100px'
                }}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        <section className="contribution-graph">
          <div className="graph-header">
            <h2>Contributions in {selectedYear}</h2>
            <p className="graph-subtitle">
              Click and drag to set {selectedIntensity} commits • Right-click to clear • Press 1-5 to change intensity
            </p>
          </div>

          <div className="graph-container">
            <div className="legend">
              <span className="legend-label">Less</span>
              {colors.map((color, index) => (
                <div
                  key={index}
                  className={`legend-color ${selectedIntensity === index ? 'active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleLegendClick(index)}
                  title={`${index} commits (${index === 0 ? 'No' : index})`}
                ></div>
              ))}
              <span className="legend-label">More</span>
            </div>

            <div className="calendar-wrapper">
              <div className="weekday-labels">
                {days.map(day => (
                  <div key={day} className="weekday-label">{day}</div>
                ))}
              </div>
              
              <div className="calendar-content">
                <div className="month-labels">
                  {monthLabels.map((monthIndex, weekIndex) => (
                    <div key={weekIndex} className="month-label">
                      {monthIndex !== null ? months[monthIndex] : ''}
                    </div>
                  ))}
                </div>

                <div 
                  className="calendar-grid"
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {flatCalendar.map((day, index) => {
                    if (day.empty) {
                      return <div key={`empty-${index}`} className="square empty"></div>;
                    }
                    
                    if (!day.date) {
                      return <div key={`null-${index}`} className="square empty"></div>;
                    }

                    const intensity = getContributionsForDate(day.date);
                    const color = colors[Math.min(intensity, colors.length - 1)];
                    
                    return (
                      <div
                        key={day.date}
                        className={`square ${selectedSquares.has(day.date) ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                        data-date={day.date}
                        onClick={() => handleSquareClick(day.date)}
                        onContextMenu={(e) => handleSquareRightClick(e, day.date)}
                        onMouseEnter={() => handleSquareMouseEnter(day.date)}
                        onMouseLeave={handleSquareMouseLeave}
                        title={`${day.date}\n${intensity} commits`}
                      >
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="action-buttons">
            <button onClick={clearYear} className="btn btn-secondary">
              Clear Year
            </button>
            <button onClick={setAllToIntensity} className="btn btn-secondary">
              Set All to Intensity
            </button>
            <button onClick={handleSubmit} className="btn btn-primary" disabled={loading}>
              {loading ? 'Committing...' : 'Commit Changes'}
            </button>
          </div>

          {status.message && (
            <div className={`status ${status.type}`} id="status">
              {status.message}
            </div>
          )}

          {hoveredDay && (
            <div className="hover-info">
              <div className="hover-date">{hoveredDay}</div>
              <div className="hover-commits">
                {getContributionsForDate(hoveredDay)} commit{getContributionsForDate(hoveredDay) !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <div className="footer-content">
          <p>GitGreenAdvance - Edit your GitHub contribution graph</p>
          <p className="keyboard-shortcuts">
            Keyboard shortcuts: 1-5 to select intensity, 0 to clear, click to apply
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
