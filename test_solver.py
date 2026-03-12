import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'my-webapp', 'backend'))

from solver import solve_schedule

staff_list = [
    {"id": 1, "name": "Test Staff", "is_part_time": False, "is_care_worker": True}
]
requests = []

print("Running solve_schedule for 2026/12")
result_dec = solve_schedule(2026, 12, staff_list, requests)
if "summary" in result_dec:
    print(f"Dec 2026 Summary for Staff 1: {result_dec['summary'][1]}")

print("\nRunning solve_schedule for 2027/1")
result_jan = solve_schedule(2027, 1, staff_list, requests)
if "summary" in result_jan:
    print(f"Jan 2027 Summary for Staff 1: {result_jan['summary'][1]}")
