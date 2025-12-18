import csv
import random
from datetime import datetime, timedelta

# --- CONFIGURATION ---
FILENAME = "final_corrected_data.csv"

# 1. FIX: Adjusted Regional Weights to match DOH (NCR is now dominant)
REGIONS = ['NCR', 'Region 4A', 'Region 3', 'Region 7', 'Region 11', 'Region 6', 'Region 12', 'Region 1']
# NCR = 45%, 4A = 20%, 3 = 15%, etc.
REGION_WEIGHTS = [45, 20, 15, 8, 5, 4, 2, 1] 

# 2. Modes & Risks
MODES = ['Sexual Contact', 'Sharing of Infected Needles', 'Mother-to-Child']
# Note: 'Unknown' is included in the risk choices below

def get_random_date(year):
    start = datetime(year, 1, 1)
    end = datetime(year, 12, 31)
    delta = end - start
    days = random.randrange(delta.days + 1)
    return (start + timedelta(days=days)).strftime("%Y-%m-%d")

# Function to determine Age Group based on a generated age number
def get_age_group(age):
    if age < 15: return '<15'
    if 15 <= age <= 24: return '15-24'
    if 25 <= age <= 34: return '25-34'
    if 35 <= age <= 49: return '35-49'
    return '50+'

# Distribution of cases per year (The "Rise")
years_dist = {
    2010: 50, 2011: 60, 2012: 70, 2013: 100, 2014: 120,
    2015: 150, 2016: 180, 2017: 200, 2018: 220, 2019: 250,
    2020: 190, 2021: 280, 2022: 320, 2023: 380, 2024: 430
}

data = []
case_id = 10000

print("Generating 3,000 corrected rows (Age Group Only)...")

for year, count in years_dist.items():
    # 2010-2012: More females (15%)
    # 2013-2024: MSM surge (96% Male)
    female_weight = 15 if year <= 2012 else 4
    male_weight = 100 - female_weight
    
    for _ in range(count):
        region = random.choices(REGIONS, weights=REGION_WEIGHTS)[0]
        sex = random.choices(['Male', 'Female'], weights=[male_weight, female_weight])[0]
        
        # Age Logic (Still needed to determine the group)
        # Using the "re-roll" method to avoid the spike at 15
        age = -1
        while age < 15 or age > 70:
            age = int(random.normalvariate(27, 7))
        
        age_group = get_age_group(age)
        
        if sex == 'Female':
            risk = 'Heterosexual'
            mode = 'Sexual Contact'
            if random.random() < 0.05: mode = 'Mother-to-Child'
        else:
            mode = 'Sexual Contact'
            # MSM is dominant risk for Males
            # Added 'Unknown' with a small weight (4%)
            risk = random.choices(['MSM', 'Bisexual', 'Heterosexual', 'Unknown'], weights=[81, 10, 5, 4])[0]
            if random.random() < 0.02: mode = 'Sharing of Infected Needles'

        # Append row WITHOUT the specific 'age'
        data.append([
            case_id, get_random_date(year), region, sex, 
            age_group, mode, risk
        ])
        case_id += 1

# Save to CSV
# Removed "Age" from the header list
header = ["Case_ID", "Diagnosis_Date", "Region", "Sex", "Age_Group", "Mode_of_Transmission", "Risk_Category"]

with open(FILENAME, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(header)
    writer.writerows(data)

print(f"Done! Created '{FILENAME}' with {len(data)} rows.")
print("Columns: Case_ID, Diagnosis_Date, Region, Sex, Age_Group, Mode_of_Transmission, Risk_Category")