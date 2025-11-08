#!/usr/bin/env python3
"""Create a sample movies database for testing."""

import duckdb

# Sample movie data
movies = [
    ("The Shawshank Redemption", 1994, 25, 142, 9.3, 2500000),
    ("The Godfather", 1972, 6, 175, 9.2, 1900000),
    ("The Dark Knight", 2008, 185, 152, 9.0, 2700000),
    ("Pulp Fiction", 1994, 8, 154, 8.9, 1800000),
    ("Forrest Gump", 1994, 55, 142, 8.8, 1700000),
    ("Inception", 2010, 160, 148, 8.8, 2100000),
    ("The Matrix", 1999, 63, 136, 8.7, 1500000),
    ("Goodfellas", 1990, 25, 146, 8.7, 1200000),
    ("Interstellar", 2014, 165, 169, 8.6, 900000),
    ("City of God", 2002, 30, 130, 8.6, 800000),
    ("Parasite", 2019, 11, 132, 8.6, 700000),
    ("The Green Mile", 1999, 60, 189, 8.6, 1100000),
    ("Gladiator", 2000, 103, 155, 8.5, 1000000),
    ("The Usual Suspects", 1995, 6, 106, 8.5, 900000),
    ("The Prestige", 2006, 40, 130, 8.5, 850000),
]

# Create connection and database
conn = duckdb.connect("data.duckdb")

# Create sequence for auto-increment
conn.execute("CREATE SEQUENCE IF NOT EXISTS seq_movies START 1")

# Create movies table
conn.execute("""
    CREATE TABLE IF NOT EXISTS movies (
        id INTEGER PRIMARY KEY DEFAULT nextval('seq_movies'),
        title VARCHAR,
        year INTEGER,
        budget_millions INTEGER,
        runtime_minutes INTEGER,
        rating FLOAT,
        votes INTEGER
    )
""")

# Insert sample data
for title, year, budget, runtime, rating, votes in movies:
    conn.execute(
        "INSERT INTO movies (title, year, budget_millions, runtime_minutes, rating, votes) VALUES (?, ?, ?, ?, ?, ?)",
        [title, year, budget, runtime, rating, votes]
    )

conn.commit()

# Verify the data
result = conn.execute("SELECT COUNT(*) as count FROM movies").fetchall()
print(f"✓ Created movies database with {result[0][0]} movies")

# Show a sample
print("\nSample data:")
sample = conn.execute("SELECT * FROM movies LIMIT 3").fetchall()
for row in sample:
    print(f"  {row}")

conn.close()
