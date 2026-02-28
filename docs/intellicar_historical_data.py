import requests
import csv
import os
import time
import datetime
import argparse
import hashlib

USERNAME = "care.itarang@gmail.com"
PASSWORD = "dm1PHeCI0c"
BASE_URL = "https://apiplatform.intellicar.in/api/standard"

ENDPOINTS = [
    ("getgpshistory", None),
    ("getbatterymetricshistory", None),
    ("getdistancetravelled", None),
    ("getfuelhistory", {"inlitres": True}),
    ("getfuelused", None)
]

def get_token():
    url = f"{BASE_URL}/gettoken"
    payload = {"username": USERNAME, "password": PASSWORD}
    response = requests.post(url, json=payload).json()
    if response.get("status") == "SUCCESS":
        return response["data"]["token"]
    print("Error fetching token:", response)
    return None

def get_vehicles(token):
    url = f"{BASE_URL}/listvehicledevicemapping"
    payload = {"token": token}
    response = requests.post(url, json=payload).json()
    if response.get("status") == "SUCCESS":
        return [v["vehicleno"] for v in response["data"]]
    print("Error fetching vehicles:", response)
    return []

def save_to_csv(filename, data_list):
    if not data_list: return
    file_exists = os.path.isfile(filename)
    if isinstance(data_list, dict): data_list = [data_list]
    fieldnames = list(data_list[0].keys())
    with open(filename, 'a', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
        if not file_exists:
            writer.writeheader()
        writer.writerows(data_list)

def fetch_and_save_history(endpoint, token, vehicleno, starttime, endtime, extra_payload=None):
    url = f"{BASE_URL}/{endpoint}"
    payload = {"token": token, "vehicleno": vehicleno, "starttime": starttime, "endtime": endtime}
    if extra_payload: payload.update(extra_payload)
        
    response = requests.post(url, json=payload).json()
    if response.get("status") == "SUCCESS" and response.get("data"):
        data = response["data"]
        if isinstance(data, list):
            for row in data: row["vehicleno"] = vehicleno
        elif isinstance(data, dict):
            data["vehicleno"] = vehicleno
        
        filename = f"historical_{endpoint}.csv"
        save_to_csv(filename, data)
        print(f"[{vehicleno}] Saved {len(data) if isinstance(data, list) else 1} entries for {endpoint}")
    else:
        print(f"[{vehicleno}] No data or error for {endpoint}")

def deduplicate_file(filepath):
    if not os.path.exists(filepath): return
    print(f"Deduplicating {filepath}...")
    temp_filepath = filepath + ".tmp"
    seen = set()
    dupes = 0
    total = 0
    with open(filepath, 'r', newline='') as infile, open(temp_filepath, 'w', newline='') as outfile:
        reader = csv.reader(infile)
        writer = csv.writer(outfile)
        try:
            headers = next(reader)
            writer.writerow(headers)
        except StopIteration: return
        for row in reader:
            total += 1
            h = hashlib.md5("".join(row).encode('utf-8')).digest()
            if h not in seen:
                seen.add(h)
                writer.writerow(row)
            else: dupes += 1
    os.replace(temp_filepath, filepath)
    print(f"  -> Removed {dupes} duplicates from {total} rows. Final: {total-dupes}")

def is_epoch(value):
    try:
        val_str = str(value).strip()
        if not val_str or 'e+' in val_str or val_str == '0': return False
        num = float(value)
        if 1000000000 < num < 3000000000000: return True
    except: pass
    return False

def convert_epoch(value):
    try:
        num = float(value)
        if num > 3000000000: num /= 1000.0
        return datetime.datetime.fromtimestamp(num).strftime("%Y-%m-%d %H:%M:%S")
    except: return value

def convert_timestamps_in_file(filepath):
    if not os.path.exists(filepath): return
    print(f"Converting timestamps in {filepath}...")
    temp_filepath = filepath + ".tmp"
    converted = 0
    with open(filepath, 'r', newline='') as infile, open(temp_filepath, 'w', newline='') as outfile:
        reader = csv.DictReader(infile)
        if not reader.fieldnames:
            os.remove(temp_filepath)
            return
        writer = csv.DictWriter(outfile, fieldnames=reader.fieldnames)
        writer.writeheader()
        for row in reader:
            new_row = {}
            for k, v in row.items():
                if ("time" in k.lower() or "stamp" in k.lower() or is_epoch(v)) and is_epoch(v):
                    new_row[k] = convert_epoch(v)
                    converted += 1
                else:
                    new_row[k] = v
            writer.writerow(new_row)
    if converted > 0:
        os.replace(temp_filepath, filepath)
        print(f"  -> Converted {converted} timestamp fields.")
    else:
        os.remove(temp_filepath)

def main():
    parser = argparse.ArgumentParser(description="Intellicar Historical Data Tool")
    parser.add_argument("--start", help="Start date (YYYY-MM-DD)", default=None)
    parser.add_argument("--end", help="End date (YYYY-MM-DD)", default=None)
    parser.add_argument("--bulk-default", action="store_true", help="Use bulk fallback dates: Sep 1 2025 to Feb 20 2026")
    parser.add_argument("--resume", action="store_true", help="Skip vehicles completely processed in getfuelused")
    parser.add_argument("--clean", action="store_true", help="Remove exact duplicates from all historical CSVs")
    parser.add_argument("--convert-time", action="store_true", help="Format all epoch timestamps to readable datetimes in CSVs")
    args = parser.parse_args()

    files = [f"historical_{ep}.csv" for ep, _ in ENDPOINTS]

    if args.clean:
        print("--- Running Deduplication ---")
        for f in files: deduplicate_file(f)
    
    if args.convert_time:
        print("--- Converting Timestamps ---")
        for f in files: convert_timestamps_in_file(f)

    # If neither clean nor convert-time are passed, then run extraction
    if not args.clean and not args.convert_time:
        print("--- Intellicar Historical Data Exporter ---")
        # Start Time
        if args.start:
            start_dt = datetime.datetime.strptime(args.start, "%Y-%m-%d")
        elif args.bulk_default:
            start_dt = datetime.datetime(2025, 9, 1, 0, 0, 0)
        else: # Default 24 hours ago
            start_dt = datetime.datetime.now() - datetime.timedelta(days=1)
        starttime = int(start_dt.timestamp() * 1000)

        # End Time
        if args.end:
            end_dt = datetime.datetime.strptime(args.end, "%Y-%m-%d")
        elif args.bulk_default:
            end_dt = datetime.datetime(2026, 2, 20, 22, 14, 0)
        else:
            end_dt = datetime.datetime.now()
        endtime = int(end_dt.timestamp() * 1000)
        
        print(f"Fetching historical data from {start_dt} to {end_dt}")

        processed_vehicles = set()
        if args.resume:
            try:
                with open("historical_getfuelused.csv", "r") as f:
                    reader = csv.reader(f)
                    headers = next(reader)
                    if 'vehicleno' in headers:
                        idx = headers.index('vehicleno')
                        for row in reader:
                            if len(row) > idx: processed_vehicles.add(row[idx])
            except: pass
            print(f"Resuming: Skipping {len(processed_vehicles)} fully processed vehicles.")

        token = get_token()
        if token:
            vehicles = get_vehicles(token)
            print(f"Discovered {len(vehicles)} vehicles.")
            
            for i, v in enumerate(vehicles, start=1):
                if args.resume and v in processed_vehicles:
                    print(f"Skipping {i}/{len(vehicles)}: {v}")
                    continue
                print(f"\nProcessing vehicle {i}/{len(vehicles)}: {v}")
                for ep, extra in ENDPOINTS:
                    fetch_and_save_history(ep, token, v, starttime, endtime, extra)
                
            print("\nFinished exporting historical data to CSVs!")
        else:
            print("Failed to get token.")

if __name__ == "__main__":
    main()
