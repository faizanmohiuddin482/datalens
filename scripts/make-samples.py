"""Generates the three demo files. Deterministic, so the repo diff is stable."""
import csv, random, datetime, os

random.seed(17)
OUT = "public/samples"
os.makedirs(OUT, exist_ok=True)

DEPTS = {
    "Engineering": (1_800_000, 4_200_000, 34),
    "Sales":       (1_200_000, 3_600_000, 22),
    "Marketing":   (1_000_000, 2_400_000, 12),
    "People":      (900_000,  2_000_000, 10),
    "Finance":     (1_100_000, 2_800_000,  9),
    "Support":     (600_000,  1_400_000, 15),
}
LOCATIONS = ["Hyderabad", "Bengaluru", "Mumbai", "Remote"]
LEVELS = ["Associate", "Senior Associate", "Manager", "Senior Manager", "Director"]
FIRST = ["Aarav","Diya","Rohan","Ananya","Vikram","Meera","Arjun","Priya","Karan","Sneha",
         "Rahul","Ishita","Aditya","Nisha","Siddharth","Kavya","Manish","Pooja","Varun","Tara",
         "Imran","Fatima","Joseph","Grace","Daniel","Leah","Samuel","Ruth","Noah","Zara"]
LAST  = ["Sharma","Reddy","Iyer","Khan","Nair","Gupta","Menon","Bose","Rao","Desai",
         "Patel","Joshi","Verma","Chopra","Malhotra","Pillai","Sinha","Kaur","Dutta","Shetty"]

employees, comp = [], []
eid = 1000
for dept, (lo, hi, n) in DEPTS.items():
    for _ in range(n):
        eid += 1
        emp_id = f"DB{eid}"
        level = random.choices(LEVELS, weights=[35, 30, 20, 10, 5])[0]
        bump = LEVELS.index(level) / (len(LEVELS) - 1)
        ctc = int(lo + (hi - lo) * (0.35 * random.random() + 0.65 * bump))
        ctc = round(ctc, -3)
        joined = datetime.date(2019, 1, 1) + datetime.timedelta(days=random.randint(0, 2300))
        active = random.random() > 0.11
        employees.append({
            "Employee ID": emp_id,
            "Full Name": f"{random.choice(FIRST)} {random.choice(LAST)}",
            "Department": dept,
            "Level": level,
            "Location": random.choices(LOCATIONS, weights=[40, 30, 15, 15])[0],
            # Day-first dates on purpose: exercises the ambiguity detection.
            "Joining Date": joined.strftime("%d/%m/%Y"),
            "Status": "Active" if active else "Exited",
        })
        comp.append({
            "Emp ID": emp_id,
            # Currency symbols and separators on purpose: exercises the parser.
            "Annual CTC": f"₹{ctc:,}",
            "Variable Pay %": f"{random.choice([5,8,10,12,15,20])}%",
            "Last Revision": (joined + datetime.timedelta(days=random.randint(300, 900))).strftime("%d/%m/%Y"),
        })

attendance = []
for e in employees:
    if e["Status"] != "Active":
        continue
    for month in range(1, 7):
        present = random.randint(17, 22)
        attendance.append({
            "Emp ID": e["Employee ID"],
            "Month": f"2026-{month:02d}",
            "Days Present": present,
            "Leave Days": max(0, 22 - present),
            # "N/A" appears here on purpose: it must become SQL NULL, not break the column.
            "Overtime Hours": random.choice([0, 0, 2, 4, 6, 8, "N/A"]),
        })

def write(name, rows):
    with open(f"{OUT}/{name}", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader(); w.writerows(rows)
    print(f"{name}: {len(rows)} rows")

write("employees.csv", employees)
write("compensation.csv", comp)
write("attendance.csv", attendance)
