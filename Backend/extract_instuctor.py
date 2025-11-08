#!/usr/bin/env python3
"""
Extract Instructor Data Script
-------------------------------
This script processes a feedback dataset and creates separate CSV files
for each instructor containing their respective feedback entries.

Usage:
    python extract_instructor_data.py <input_csv_file>
    
Example:
    python extract_instructor_data.py feedback_data.csv
"""

import pandas as pd
import os
import sys
import re


def sanitize_filename(name):
    """
    Convert instructor name to a safe filename format.
    
    Args:
        name (str): Original instructor name
        
    Returns:
        str: Sanitized filename-safe string
    """
    # Replace spaces with underscores and remove special characters
    safe_name = re.sub(r'[^\w\s-]', '', str(name))
    safe_name = re.sub(r'[\s]+', '_', safe_name)
    return safe_name.strip('_')


def load_feedback_data(filepath):
    """
    Load the feedback CSV file into a pandas DataFrame.
    
    Args:
        filepath (str): Path to the input CSV file
        
    Returns:
        pd.DataFrame: Loaded feedback data
        
    Raises:
        FileNotFoundError: If the input file doesn't exist
        Exception: For other pandas reading errors
    """
    try:
        df = pd.read_csv(filepath)
        print(f"✓ Successfully loaded '{filepath}'")
        print(f"  Total rows: {len(df)}")
        return df
    except FileNotFoundError:
        print(f"❌ Error: File '{filepath}' not found.")
        print("   Please check the file path and try again.")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error reading CSV file: {e}")
        sys.exit(1)


def validate_dataframe(df):
    """
    Validate that the DataFrame contains the required 'Instructor' column.
    
    Args:
        df (pd.DataFrame): Input DataFrame to validate
        
    Returns:
        bool: True if valid, exits program if invalid
    """
    if 'Instructor' not in df.columns:
        print("❌ Error: 'Instructor' column not found in the CSV file.")
        print(f"   Available columns: {', '.join(df.columns)}")
        sys.exit(1)
    return True


def create_output_directory(directory_name='instructor_data'):
    """
    Create the output directory if it doesn't exist.
    
    Args:
        directory_name (str): Name of the directory to create
        
    Returns:
        str: Path to the created directory
    """
    try:
        # Get absolute path to ensure we're working with full path
        abs_directory = os.path.abspath(directory_name)
        
        # Force create the directory
        os.makedirs(abs_directory, exist_ok=True)
        
        # Verify it was actually created
        if os.path.exists(abs_directory) and os.path.isdir(abs_directory):
            print(f"✓ Directory ready: '{directory_name}'")
            print(f"  Full path: {abs_directory}")
            return abs_directory
        else:
            raise Exception(f"Directory verification failed for '{abs_directory}'")
            
    except Exception as e:
        print(f"❌ Error with directory '{directory_name}': {e}")
        print(f"   Using current directory instead...")
        current_dir = os.getcwd()
        print(f"   Files will be saved to: {current_dir}")
        return current_dir


def extract_instructor_files(df, output_dir='instructor_data'):
    """
    Extract feedback data for each instructor into separate CSV files.
    
    Args:
        df (pd.DataFrame): Input feedback DataFrame
        output_dir (str): Directory to save instructor files
        
    Returns:
        list: List of created filenames
    """
    # Remove rows with missing instructor names
    original_count = len(df)
    df_clean = df.dropna(subset=['Instructor'])
    removed_count = original_count - len(df_clean)
    
    if removed_count > 0:
        print(f"⚠ Warning: Ignored {removed_count} row(s) with missing instructor names")
    
    # Get unique instructors
    unique_instructors = df_clean['Instructor'].unique()
    print(f"\n✓ Found {len(unique_instructors)} unique instructor(s)")
    
    created_files = []
    
    # Process each instructor
    for instructor in unique_instructors:
        try:
            # Filter data for this instructor
            instructor_data = df_clean[df_clean['Instructor'] == instructor]
            
            # Create safe filename
            safe_name = sanitize_filename(instructor)
            filename = f"{safe_name}_feedback.csv"
            filepath = os.path.join(output_dir, filename)
            
            # Debug: Print the exact path we're trying to write
            print(f"  → Attempting to write: {filepath}")
            
            # Double-check directory exists
            if not os.path.exists(output_dir):
                os.makedirs(output_dir, exist_ok=True)
                print(f"     Created directory: {output_dir}")
            
            # Try writing with explicit path normalization
            normalized_path = os.path.normpath(filepath)
            
            # Save to CSV with explicit encoding
            instructor_data.to_csv(normalized_path, index=False, encoding='utf-8-sig')
            
            # Verify file was created
            if os.path.exists(normalized_path):
                created_files.append(filename)
                print(f"     ✓ Success: {filename} ({len(instructor_data)} row(s))")
            else:
                print(f"     ✗ File not found after write: {filename}")
            
        except PermissionError as e:
            print(f"  ✗ Permission denied for '{instructor}': {e}")
            print(f"     This may be due to OneDrive sync. Try closing OneDrive or using a local folder.")
        except Exception as e:
            print(f"  ✗ Failed to create file for '{instructor}': {e}")
            print(f"     Error type: {type(e).__name__}")
            continue
    
    return created_files


def print_summary(created_files, output_dir):
    """
    Print a summary of the extraction process.
    
    Args:
        created_files (list): List of created filenames
        output_dir (str): Directory where files were saved
    """
    print(f"\n{'='*60}")
    print(f"✅ Extraction complete! Created {len(created_files)} instructor file(s)")
    print(f"   in the '{output_dir}' folder.")
    print(f"{'='*60}")


def main():
    """
    Main function to orchestrate the instructor data extraction process.
    """
    # Check command line arguments
    if len(sys.argv) < 2:
        print("Usage: python extract_instructor_data.py <input_csv_file>")
        print("Example: python extract_instructor_data.py feedback_data.csv")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_directory = r'C:\Temp\instructor_data'  # or any local path
    
    print("="*60)
    print("Instructor Feedback Data Extractor")
    print("="*60)
    print(f"Working directory: {os.getcwd()}\n")
    
    # Step 1: Load the feedback data
    df = load_feedback_data(input_file)
    
    # Step 2: Validate the DataFrame structure
    validate_dataframe(df)
    
    # Step 3: Create output directory
    output_path = create_output_directory(output_directory)
    
    # Step 4: Extract and save instructor-specific files
    created_files = extract_instructor_files(df, output_path)
    
    # Step 5: Print summary
    print_summary(created_files, output_directory)


if __name__ == "__main__":
    main()