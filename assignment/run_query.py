"""Runs one saved query with DuckDB and prints the version and the rows as JSON.

Usage: python run_query.py <folder with the CSV files> <query file>
"""

import json
import sys

import duckdb

folder, query_file = sys.argv[1], sys.argv[2]
connection = duckdb.connect()
connection.execute(f"SET file_search_path = '{folder}'")
with open(query_file) as file:
    cursor = connection.execute(file.read())
rows = [list(row) for row in cursor.fetchall()]
print(json.dumps({"duckdb": duckdb.__version__, "rows": rows}, default=str))
