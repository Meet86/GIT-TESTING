import express from 'express';
import cors from 'cors';
import jsonfile from 'jsonfile';
import simpleGit from 'simple-git';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const dataFilePath = path.join(__dirname, 'data.json');
const git = simpleGit();

app.get('/', (req, res) => {
  res.json({ message: 'GitGreenAdvance Backend API' });
});

app.post('/api/commit', async (req, res) => {
  try {
    const { contributions, calendar } = req.body;

    if (!contributions || typeof contributions !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid contributions data'
      });
    }

    // If calendar data is provided, use visual grid order (week by week, day by day)
    // This ensures commits are created in the same order as they appear on GitHub graph
    let commitsToMake = [];
    
    if (calendar && Array.isArray(calendar)) {
      // Visual grid order: iterate weeks left-to-right, days top-to-bottom (Sun-Sat)
      for (const week of calendar) {
        for (let dayIndex = 0; dayIndex < week.length; dayIndex++) {
          const day = week[dayIndex];
          if (day.date && !day.empty && contributions[day.date]) {
            const count = contributions[day.date];
            if (count && count > 0) {
              // Use UTC date directly - GitHub expects UTC
              // COMPENSATION: Add 1 day to fix the -1 day offset issue
              const tomorrow = new Date(day.date + 'T00:00:00Z');
              tomorrow.setDate(tomorrow.getDate() + 1);
              const compensatedDate = tomorrow.toISOString().split('T')[0];
              const dateFormatted = compensatedDate + 'T00:00:00Z';
              
              commitsToMake.push({
                date: dateFormatted,
                count: count
              });
            }
          }
        }
      }
    } else {
      // Fallback: chronological order if no calendar provided
      const commitDates = Object.keys(contributions);
      for (const dateString of commitDates) {
        const count = contributions[dateString];
        
        if (count && count > 0) {
          // COMPENSATION: Add 1 day to fix the -1 day offset issue
          const tomorrow = new Date(dateString + 'T00:00:00Z');
          tomorrow.setDate(tomorrow.getDate() + 1);
          const compensatedDate = tomorrow.toISOString().split('T')[0];
          const dateFormatted = compensatedDate + 'T00:00:00Z';
          
          commitsToMake.push({
            date: dateFormatted,
            count: count
          });
        }
      }
    }

    if (commitsToMake.length === 0) {
      return res.json({
        success: false,
        message: 'No contributions to commit'
      });
    }

    let totalCommits = 0;

    for (const commit of commitsToMake) {
      for (let i = 0; i < commit.count; i++) {
        const data = {
          date: commit.date,
          commitCount: i + 1
        };

        await jsonfile.writeFile(dataFilePath, data);
        
        await git.add([dataFilePath]);
        await git.commit(`Update: ${commit.date} (Commit ${i + 1})`, {
          '--date': commit.date
        });
        
        totalCommits++;
      }
    }

    await git.push();

    res.json({
      success: true,
      message: `Successfully made ${totalCommits} commits`,
      commits: totalCommits
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.get('/api/contributions', (req, res) => {
  try {
    res.json({
      success: true,
      message: 'To be implemented: Fetch contributions from Git'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.get('/api/calendar/:year', (req, res) => {
  try {
    const year = parseInt(req.params.year) || new Date().getFullYear();
    
    // Call Python script to generate calendar data
    const pythonProcess = spawn('python', ['calendar_generator.py', year.toString()]);
    
    let data = '';
    let errorData = '';
    
    pythonProcess.stdout.on('data', (chunk) => {
      data += chunk;
    });
    
    pythonProcess.stderr.on('data', (chunk) => {
      errorData += chunk;
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python error:', errorData);
        return res.status(500).json({
          success: false,
          message: 'Failed to generate calendar data',
          error: errorData
        });
      }
      
      try {
        const calendarData = JSON.parse(data);
        res.json({
          success: true,
          data: calendarData
        });
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        res.status(500).json({
          success: false,
          message: 'Failed to parse calendar data'
        });
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`GitGreenAdvance server running on port ${PORT}`);
});
