import requests
import time
import csv
import os
from datetime import datetime

USERNAME = "care.itarang@gmail.com"
PASSWORD = "dm1PHeCI0c"
BASE_URL = "https://apiplatform.intellicar.in/api/standard"

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
        # Extract vehicle numbers
        return [v["vehicleno"] for v in response["data"]]
    print("Error fetching vehicles:", response)
    return []

def save_to_csv(filename, row_dict):
    """
    Appends a single dictionary row to a CSV file.
    Creates headers if the file does not exist.
    """
    file_exists = os.path.isfile(filename)
    fieldnames = list(row_dict.keys())
    
    with open(filename, 'a', newline='') as f:
        # Ignore any extra keys that might show up later relative to the header
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
        if not file_exists:
            writer.writeheader()
        writer.writerow(row_dict)

def fetch_and_save_live_gps(token, vehicleno):
    url = f"{BASE_URL}/getlastgpsstatus"
    payload = {"token": token, "vehicleno": vehicleno}
    response = requests.post(url, json=payload).json()
    if response.get("status") == "SUCCESS" and response.get("data"):
        data = response["data"]
        data["vehicleno"] = vehicleno
        data["fetch_time"] = datetime.now().isoformat()
        save_to_csv("live_gps.csv", data)

def fetch_and_save_latest_can(token, vehicleno):
    url = f"{BASE_URL}/getlatestcan"
    payload = {"token": token, "vehicleno": vehicleno}
    response = requests.post(url, json=payload).json()
    if response.get("status") == "SUCCESS" and response.get("data"):
        data = response["data"]
        # Flatten the nested CAN data for CSV formatting
        flat_data = {"vehicleno": vehicleno, "fetch_time": datetime.now().isoformat()}
        for key, val_dict in data.items():
            if isinstance(val_dict, dict):
                flat_data[f"{key}_value"] = val_dict.get("value", "")
                flat_data[f"{key}_timestamp"] = val_dict.get("timestamp", "")
            else:
                flat_data[key] = val_dict
        save_to_csv("live_can.csv", flat_data)

def fetch_and_save_last_fuel(token, vehicleno):
    url = f"{BASE_URL}/getlastfuelstatus"
    payload = {"token": token, "vehicleno": vehicleno}
    response = requests.post(url, json=payload).json()
    if response.get("status") == "SUCCESS" and response.get("data"):
        data = response["data"]
        data["vehicleno"] = vehicleno
        data["fetch_time"] = datetime.now().isoformat()
        save_to_csv("live_fuel.csv", data)

def main():
    print("Starting Intellicar Live Data Service...")
    while True:
        print(f"\n--- [{datetime.now().isoformat()}] Fetching live data ---")
        token = get_token()
        if token:
            vehicles = get_vehicles(token)
            print(f"Discovered {len(vehicles)} vehicles.")
            for v in vehicles:
                print(f"Fetching live data for vehicle: {v}")
                fetch_and_save_live_gps(token, v)
                fetch_and_save_latest_can(token, v)
                fetch_and_save_last_fuel(token, v)
        else:
            print("Failed to get token. Skipping this iteration.")
        
        print("Waiting 5 minutes...")
        time.sleep(300)

if __name__ == "__main__":
    main()
