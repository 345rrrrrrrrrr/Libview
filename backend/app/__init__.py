from flask import Flask
from flask_cors import CORS
from .api import api_bp

def create_app():
    app = Flask(__name__)
    
    # Create comprehensive CORS settings for GitHub Codespaces
    # This will allow requests from all GitHub Codespaces URLs and local development
    cors_config = {
        "origins": ["*"],  # Allow all origins (not recommended for production)
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Accept"],
        "supports_credentials": True,
        "expose_headers": ["Content-Type", "X-CSRFToken"]
    }
    
    # Apply CORS configuration to all routes
    CORS(app, resources={r"/*": cors_config})
    
    # Register blueprints
    app.register_blueprint(api_bp, url_prefix='/api')
    
    @app.route('/')
    def index():
        return {"status": "API is running"}
    
    return app