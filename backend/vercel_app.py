from app import create_app

app = create_app()

# This is used by Vercel serverless function
handler = app