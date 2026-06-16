from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import os

load_dotenv()

engine = create_engine(os.getenv("MIGRATION_DATABASE_URL"))

with engine.begin() as conn:
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS connection_test (
            id SERIAL PRIMARY KEY,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """))

print("Table created successfully")