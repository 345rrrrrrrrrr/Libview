# Python Library Explorer WebApp (Libview)

A web application that allows users to search for any Python library, view its metadata, explore its classes, functions, and methods, and view the source code with proper syntax highlighting.

## Features

- Search for any installed Python library
- View library metadata (version, description, etc.)
- Explore library structure (classes, functions, methods)
- View docstrings and source code with syntax highlighting
- User-friendly interface with modern design

## Project Structure

```
Libview/
├── backend/                # Flask backend
│   ├── app/                # Application code
│   │   ├── __init__.py     # Flask app initialization
│   │   └── api.py          # API endpoints
│   ├── requirements.txt    # Main dependencies
│   ├── requirements/       # Extra requirements
│   │   └── dev.txt         # Development dependencies
│   └── run.py              # Application entry point
└── frontend/               # React frontend
    ├── public/             # Static files
    └── src/                # React source code
```

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 14+
- tmux (optional, for running both services simultaneously)

### Quick Start

The easiest way to run the application is using the provided start script:

```bash
chmod +x start.sh
./start.sh
```

This will start both the backend and frontend in a tmux session. The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Manual Setup

#### Backend (Flask)

```bash
cd backend
pip install -r requirements.txt
./start_dev.sh
# Or alternatively: python run.py
```

The backend will run at http://localhost:5000

#### Frontend (React)

```bash
cd frontend
npm install
npm start
```

The frontend will run at http://localhost:3000

## API Endpoints

- `GET /api/search?q=<query>` - Search for libraries
- `GET /api/library/<library_name>` - Get library information
- `GET /api/library/<library_name>/source?type=<type>&name=<name>&parent=<parent>` - Get source code

## Usage

1. Enter a Python library name in the search bar (e.g., "requests", "numpy", "flask")
2. Select a library from the search results
3. Browse the library's classes, functions, and constants
4. Click "View Code" to see the source code of any component with syntax highlighting

## Technologies Used

- **Backend**: Flask, Python's inspect module
- **Frontend**: React, TypeScript, TailwindCSS, Monaco Editor
- **Development**: tmux for running multiple services