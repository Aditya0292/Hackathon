#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extract instructor-specific data from feedback CSV
Windows-compatible version without special characters
"""

import sys
import csv
import os
from collections import defaultdict

def extract_instructor_data(input_csv):
    """Split CSV by instructor and save separate files."""
    try:
        # Read the CSV file
        instructor_data = defaultdict(list)
        headers = None
        
        with open(input_csv, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            headers = reader.fieldnames
            
            if 'Instructor' not in headers:
                print(f"Error: CSV must have 'Instructor' column. Found columns: {headers}")
                sys.exit(1)
            
            for row in reader:
                instructor = row.get('Instructor', '').strip()
                if instructor:
                    instructor_data[instructor].append(row)
        
        if not instructor_data:
            print("Error: No instructor data found in CSV")
            sys.exit(1)
        
        # Create instructor_data directory if it doesn't exist
        output_dir = os.path.join(os.path.dirname(input_csv), '..', 'instructor_data')
        os.makedirs(output_dir, exist_ok=True)
        
        # Write separate CSV files for each instructor
        for instructor, rows in instructor_data.items():
            # Clean instructor name for filename - remove dots and clean up
            safe_name = instructor.replace('.', '').replace(' ', '_')
            safe_name = safe_name.replace('/', '_').replace('\\', '_')
            # Remove multiple underscores
            while '__' in safe_name:
                safe_name = safe_name.replace('__', '_')
            safe_name = safe_name.strip('_')
            
            output_file = os.path.join(output_dir, f"{safe_name}_feedback.csv")
            
            with open(output_file, 'w', encoding='utf-8', newline='') as file:
                writer = csv.DictWriter(file, fieldnames=headers)
                writer.writeheader()
                writer.writerows(rows)
            
            print(f"Created: {output_file} ({len(rows)} responses)")
        
        print(f"Successfully split into {len(instructor_data)} instructor files")
        
    except FileNotFoundError:
        print(f"Error: File not found: {input_csv}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extract_instructor_data.py <feedback.csv>")
        sys.exit(1)
    
    extract_instructor_data(sys.argv[1])