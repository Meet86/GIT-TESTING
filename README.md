# GitGreenAdvance - Git Contribution Graph Editor

A complete web application that allows you to visually edit your GitHub contribution graph and make commits automatically based on your selections.

## Features

- **GitHub-style Calendar Graph**: Interactive grid similar to GitHub's contribution graph
- **Git-backed History Loading**: Loads the selected year from your local git history
- **Git User Detection**: Shows the configured git user name in the UI
- **Color Intensity Selection**: Choose how many commits to target for a day (0-5 commits per day)
- **Interactive Editor**: Click or drag on squares to set commit intensity from the GUI
- **Random Fill Levels**: Apply 5 random density presets, from sparse activity to heavy activity
- **Year Navigation**: Select the year you want to view and edit
- **Bulk Actions**: Reset to existing history or set all days to a specific intensity
- **Real-time Feedback**: Success/failure messages with commit status
- **Git Integration**: Automatically creates only the missing commits needed to reach your target graph

## Installation

1. **Install all dependencies** (backend and frontend):
   ```bash
   npm run install-all
   ```

## Running the Application

### Start the Backend Server
```bash
npm run server
```
The backend will run on `http://localhost:3001`

### Start the Frontend Development Server
In a new terminal:
```bash
cd frontend
npm run dev
```
The frontend will run on `http://localhost:5173`

## Usage

1. Open both backend and frontend servers
2. Select the year you want to edit
3. Wait for the app to load the current git history and configured git user
4. Set the commit intensity level (0-5 commits per day)
5. Click or drag on any square to set its target intensity
6. Use the random fill buttons when you want the graph to auto-generate a pattern:
   - **Level 1**: fills only a few boxes
   - **Level 5**: fills many boxes and looks much more active
7. Use bulk action buttons:
   - **Reset To Existing**: restores the graph to the commits already in git
   - **Set All to Intensity**: raises all days to the current intensity level
6. When ready, click **Create Missing Commits** to push commits to your repository

## How It Works

1. The frontend sends a request to the backend with all selected dates and their commit counts
2. The backend reads your existing git history for the selected year
3. The backend creates only the missing commits needed to reach the selected target for each day
4. The backend stamps those commits on the exact dates selected in the GUI
5. Changes are pushed to your remote repository
6. You'll see feedback about the commit process

## Project Structure

```
GitGreenAdvance/
├── frontend/                 # React application
│   ├── src/
│   │   ├── App.jsx          # Main application component
│   │   └── App.css          # Styles
│   └── package.json
├── server.js                 # Express backend API
├── index.js                  # Original script (for reference)
├── data.json                 # Temporary data file for commits
└── package.json              # Project dependencies
```

## Technologies Used

- **Backend**: Node.js, Express, simple-git
- **Frontend**: React, Vite
- **Git Integration**: simple-git library

## Notes

- Make sure your local repository is properly configured with remote tracking
- The application will use your default Git credentials
- Existing commits are treated as the baseline; the app only adds commits and does not delete historical ones
- Commits will be pushed to the currently active branch
- This application requires Git to be installed on your system

## License

ISC
