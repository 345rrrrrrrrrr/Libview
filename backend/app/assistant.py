"""
Library Assistant module for answering questions about Python libraries.
Uses locally available models to provide recommendations based on natural language queries.
"""
import json
import os
import re
from pathlib import Path
import requests
from collections import defaultdict

# Cache directory for storing library data
CACHE_DIR = Path(__file__).parent / "code_examples_cache"
CACHE_DIR.mkdir(exist_ok=True)

# Library categories for classification
LIBRARY_CATEGORIES = {
    "ai": ["machine learning", "deep learning", "neural networks", "nlp", "computer vision", "ai"],
    "data_science": ["data analysis", "statistics", "visualization", "data processing", "dataframes"],
    "web": ["web framework", "http", "api", "rest", "graphql", "async"],
    "database": ["database", "sql", "nosql", "orm", "data storage"],
    "networking": ["networking", "sockets", "protocol", "requests"],
    "security": ["security", "authentication", "encryption", "hashing", "login", "user management"],
    "testing": ["testing", "test framework", "mocking", "assertions", "coverage"],
    "ui": ["ui", "gui", "interface", "widgets", "dashboard"],
}

# Common libraries by category
COMMON_LIBRARIES = {
    "ai": [
        {"name": "tensorflow", "summary": "Open source machine learning framework"},
        {"name": "pytorch", "summary": "Deep learning framework with strong GPU acceleration"},
        {"name": "scikit-learn", "summary": "Simple and efficient tools for machine learning and data analysis"},
        {"name": "huggingface-transformers", "summary": "State-of-the-art Natural Language Processing for PyTorch and TensorFlow"},
        {"name": "keras", "summary": "Deep learning API running on top of TensorFlow"},
        {"name": "spacy", "summary": "Industrial-strength Natural Language Processing in Python"},
        {"name": "nltk", "summary": "Natural Language Toolkit"},
        {"name": "fastai", "summary": "Simplifies training fast and accurate neural nets"},
        {"name": "opencv-python", "summary": "Computer vision and machine learning software library"},
        {"name": "gensim", "summary": "Topic modeling and document similarity toolkit"}
    ],
    "data_science": [
        {"name": "pandas", "summary": "Powerful data structures for data analysis, time series, and statistics"},
        {"name": "numpy", "summary": "Fundamental package for array computing in Python"},
        {"name": "matplotlib", "summary": "Comprehensive library for creating static, animated, and interactive visualizations"},
        {"name": "seaborn", "summary": "Statistical data visualization based on matplotlib"},
        {"name": "scipy", "summary": "Fundamental algorithms for scientific computing in Python"},
        {"name": "plotly", "summary": "Interactive graphing library for Python"},
        {"name": "statsmodels", "summary": "Statistical models and tests"},
        {"name": "dask", "summary": "Parallel computing library that scales Python"}
    ],
    "web": [
        {"name": "flask", "summary": "Lightweight WSGI web application framework"},
        {"name": "django", "summary": "High-level Python Web framework that encourages rapid development"},
        {"name": "fastapi", "summary": "Modern, fast web framework for building APIs with Python 3.6+"},
        {"name": "tornado", "summary": "Python web framework and asynchronous networking library"},
        {"name": "bottle", "summary": "Fast and simple WSGI-micro framework for Python"},
        {"name": "pyramid", "summary": "Small, fast, down-to-earth Python web framework"},
        {"name": "starlette", "summary": "Lightweight ASGI framework for building async web services"}
    ],
    "database": [
        {"name": "sqlalchemy", "summary": "Database Abstraction Library for Python"},
        {"name": "pymongo", "summary": "Python driver for MongoDB"},
        {"name": "psycopg2", "summary": "PostgreSQL database adapter for Python"},
        {"name": "peewee", "summary": "Small, expressive ORM for Python"},
        {"name": "redis-py", "summary": "Redis Python Client"},
        {"name": "pymysql", "summary": "Pure Python MySQL Client"},
        {"name": "elasticsearch-py", "summary": "Official low-level client for Elasticsearch"}
    ],
    "security": [
        {"name": "authlib", "summary": "The ultimate Python library in building OAuth and OpenID Connect servers"},
        {"name": "passlib", "summary": "Comprehensive password hashing framework"},
        {"name": "pyjwt", "summary": "JSON Web Token implementation in Python"},
        {"name": "cryptography", "summary": "Cryptographic recipes and primitives for Python"},
        {"name": "flask-login", "summary": "User session management for Flask"},
        {"name": "django-allauth", "summary": "Integrated set of Django applications addressing authentication, registration, account management"},
        {"name": "bcrypt", "summary": "Modern password hashing for your software and your servers"}
    ],
    "testing": [
        {"name": "pytest", "summary": "Simple powerful testing with Python"},
        {"name": "unittest", "summary": "Built-in unit testing framework"},
        {"name": "nose2", "summary": "Next generation of nicer testing for Python"},
        {"name": "mock", "summary": "Rolling backport of unittest.mock for Python"},
        {"name": "hypothesis", "summary": "Property-based testing library for Python"}
    ],
    "ui": [
        {"name": "tkinter", "summary": "Standard GUI library for Python"},
        {"name": "pyqt5", "summary": "Python bindings for the Qt application framework"},
        {"name": "pyside2", "summary": "Python bindings for the Qt application framework (official)"},
        {"name": "wxpython", "summary": "Cross-platform GUI toolkit for Python"},
        {"name": "dash", "summary": "Analytical Web Apps for Python, R, Julia, and more"},
        {"name": "streamlit", "summary": "The fastest way to build and share data apps"},
        {"name": "gradio", "summary": "Create UIs for your machine learning model in Python in 3 minutes"}
    ],
}

def search_pypi(query, max_results=20):
    """Search PyPI for packages matching the query."""
    try:
        response = requests.get(
            f"https://pypi.org/pypi/search/api/?q={query}",
            headers={"Accept": "application/json"},
            timeout=5
        )
        if response.status_code == 200:
            results = response.json().get("results", [])
            return [{
                "name": pkg.get("name", ""),
                "version": pkg.get("version", ""),
                "summary": pkg.get("summary", "")
            } for pkg in results[:max_results]]
        return []
    except Exception as e:
        print(f"Error searching PyPI: {e}")
        return []

def categorize_query(query):
    """Determine which categories the query is related to."""
    query = query.lower()
    scores = defaultdict(int)
    
    for category, keywords in LIBRARY_CATEGORIES.items():
        for keyword in keywords:
            if keyword in query:
                scores[category] += 1
                
    # Return categories sorted by score, highest first
    return sorted(scores.items(), key=lambda x: x[1], reverse=True)

def answer_library_question(query):
    """Process a natural language query about Python libraries."""
    response = {
        "query": query,
        "libraries": [],
        "message": ""
    }
    
    # Determine categories from the query
    categories = categorize_query(query)
    
    if not categories:
        # If no specific categories detected, do a general search
        search_results = search_pypi(query)
        response["libraries"] = search_results[:10]
        response["message"] = f"Here are some Python libraries related to '{query}':"
        return response
    
    # Get libraries from the top categories
    libraries = []
    category_names = []
    
    for category, score in categories[:2]:  # Use top 2 categories
        category_names.append(category.replace('_', ' '))
        libraries.extend(COMMON_LIBRARIES.get(category, []))
    
    # If we have too few results, supplement with a PyPI search
    if len(libraries) < 5:
        search_results = search_pypi(query)
        # Add unique libraries from search results
        existing_names = {lib["name"] for lib in libraries}
        for lib in search_results:
            if lib["name"] not in existing_names:
                libraries.append(lib)
                existing_names.add(lib["name"])
    
    response["libraries"] = libraries[:15]  # Limit to 15 libraries
    
    if category_names:
        category_text = " and ".join(category_names)
        response["message"] = f"Here are Python libraries for {category_text} based on your query:"
    else:
        response["message"] = f"Here are Python libraries that might help with '{query}':"
    
    return response