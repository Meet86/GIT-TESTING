# GitGreenAdvance - Git Contribution Graph Editor

A complete web application that allows you to visually edit your GitHub contribution graph and make commits automatically based on your selections.

## Features

- **GitHub-style Calendar Graph**: Interactive grid similar to GitHub's contribution graph
- **Color Intensity Selection**: Choose how many commits to make (0-5 commits per day)
- **Interactive Editor**: Click on squares to set commit intensity
- **Date Navigation**: Select year and month to view and edit contributions
- **Bulk Actions**: Clear entire month or set all days to specific intensity
- **Real-time Feedback**: Success/failure messages with commit status
- **Git Integration**: Automatically commits changes to your repository

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
2. Select the year and month you want to edit
3. Set the commit intensity level (0-5 commits per day)
4. Click on any square to set its commit intensity:
   - Left click: Increase intensity (cycles from 0 to 5)
   - Right click: Clear (set to 0)
5. Use bulk action buttons:
   - **Clear Month**: Resets all days in current month to 0 commits
   - **Set All to Intensity**: Sets all days to current intensity level
6. When ready, click **Commit Changes** to push commits to your repository

## How It Works

1. The frontend sends a request to the backend with all selected dates and their commit counts
2. The backend generates commits with the specified dates
3. Changes are pushed to your remote repository
4. You'll see feedback about the commit process

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

- **Backend**: Node.js, Express, simple-git, moment.js
- **Frontend**: React, Vite
- **Git Integration**: simple-git library

## Notes

- Make sure your local repository is properly configured with remote tracking
- The application will use your default Git credentials
- Commits will be pushed to the currently active branch
- This application requires Git to be installed on your system

## License

ISC
