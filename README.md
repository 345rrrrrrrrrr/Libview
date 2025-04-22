# Python Library Explorer WebApp (Libview)

[![Python 3.8+](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![Flask](https://img.shields.io/badge/Flask-2.0.1-green.svg)](https://flask.palletsprojects.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A modern web application that empowers developers to search, explore, and understand Python libraries with ease. Libview provides intuitive access to library metadata, source code, and AI-powered assistance to streamline your development workflow.

![Libview Screenshot](https://via.placeholder.com/800x400?text=Libview+Screenshot)

## ✨ Features

- **Comprehensive Search:** Find any installed Python library or explore packages from PyPI
- **Library Metadata:** View version information, dependencies, descriptions, and more
- **Code Explorer:** Navigate library structure (classes, functions, methods) with ease
- **Source Code Viewer:** Examine implementation details with syntax highlighting
- **Code Examples:** Access practical usage examples for popular libraries
- **Library Assistant:** Get AI-powered recommendations and answers to your library-related questions
- **Modern UI:** Enjoy a clean, responsive interface with dark mode support

## 🚀 Project Structure

```
Libview/
├── backend/                # Flask backend
│   ├── app/                # Application code
│   │   ├── __init__.py     # Flask app initialization
│   │   ├── api.py          # API endpoints
│   │   └── assistant.py    # Library Assistant functionality
│   ├── requirements.txt    # Main dependencies
│   ├── requirements/       # Extra requirements
│   │   └── dev.txt         # Development dependencies
│   └── run.py              # Application entry point
└── frontend/               # React frontend
    ├── public/             # Static files
    └── src/                # React source code
        ├── components/     # React components
        ├── services/       # API integration
        └── types/          # TypeScript type definitions
```

## 🏁 Getting Started

### Prerequisites

- Python 3.8+
- Node.js 14+
- npm or yarn
- tmux (optional, for running both services simultaneously)

### Quick Start

The easiest way to run the application is using the provided script:

```bash
chmod +x run.sh
./run.sh
```

This will start both the backend and frontend services in the current terminal. The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Manual Setup

#### Backend (Flask)

```bash
cd backend
pip install -r requirements.txt
python run.py
```

The backend will run at http://localhost:5000

#### Frontend (React)

```bash
cd frontend
npm install
npm start
```

The frontend will run at http://localhost:3000

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/search?q=<query>` | GET | Search for libraries |
| `/api/library/<library_name>` | GET | Get library information |
| `/api/library/<library_name>/source?type=<type>&name=<name>&parent=<parent>` | GET | Get source code |
| `/api/library/<library_name>/examples` | GET | Get code examples |
| `/api/assistant?query=<query>` | GET | Get AI-powered library recommendations |
| `/api/pypi/search?q=<query>&page=<page>&per_page=<per_page>` | GET | Search PyPI packages |
| `/api/pypi/package/<package_name>` | GET | Get PyPI package details |

## 📖 Usage

1. **Search for Libraries**:
   - Enter a Python library name in the search bar (e.g., "requests", "numpy", "flask")
   - Or browse PyPI packages to discover new libraries

2. **Explore Library Details**:
   - View library metadata, version information, and documentation links
   - Browse the library's classes, functions, and constants
   - Click on any component to see its documentation

3. **View Source Code**:
   - Click "View Code" next to any component to see the implementation
   - Use the syntax-highlighted code viewer to understand the implementation

4. **Get AI Assistance**:
   - Use the Library Assistant with natural language queries like:
     - "What's the best library for data visualization?"
     - "I need a package for web scraping"
     - "Help me find a good HTTP client"

## 🛠️ Technologies Used

- **Backend**:
  - Flask: Web framework
  - Python's inspect module: Library introspection
  - AI-powered library recommendation system

- **Frontend**:
  - React: UI framework
  - TypeScript: Type-safe JavaScript
  - TailwindCSS: Styling
  - Monaco Editor: Code viewer with syntax highlighting

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.