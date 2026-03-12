from ortools.sat.python import cp_model
from typing import List, Dict, Any
import datetime
import random
try:
    import jpholiday
    HAS_JPHOLIDAY = True
except (ImportError, TypeError):
    # TypeError can occur on Python 3.8 due to jpholiday's modern type hinting
    HAS_JPHOLIDAY = False

def solve_schedule(year: int, month: int, staff_list: List[Dict], requests: List[Dict], facility_id: int = 1, seed: int = 42, constraints: List[Dict] = None, settings: Dict = None) -> Dict[str, Any]:
    """
    Generates a shift schedule based on staff skills, monthly calendar constraints, leave requests, and daily overrides.
    """
    model = cp_model.CpModel()
    rng = random.Random(seed)
    
    # Use provided settings or defaults
    if settings is None:
        settings = {
            "min_headcount": 12 if facility_id == 1 else 9,
            "weight_leveling_low": 2000,
            "weight_leveling_mid": 8000,
            "weight_leveling_high": 25000,
            "base_shift_reward": 2
        }

    min_headcount = settings.get("min_headcount", 12 if facility_id == 1 else 9)
    
    # 1. Establish the Calendar
    if month == 12:
        next_month_date = datetime.date(year + 1, 1, 1)
    else:
        next_month_date = datetime.date(year, month + 1, 1)
    
    num_days = (next_month_date - datetime.date(year, month, 1)).days
    
    operating_days = []
    closed_days = []
    # 公休日数 = Saturdays + Sundays + Japanese national holidays
    # Sundays → facility closed (no one works)
    # Saturdays + national holidays falling on weekdays → full-timers rotate off (公休シフト制)
    public_holiday_count = 0  # total Sat + Sun + national holidays + company holidays
    
    for d in range(1, num_days + 1):
        current_date = datetime.date(year, month, d)
        is_saturday = current_date.weekday() == 5
        is_sunday = current_date.weekday() == 6
        is_national_holiday = HAS_JPHOLIDAY and jpholiday.is_holiday(current_date)
        
        # Determine if it's a company winter holiday (12/29-1/3)
        is_winter_holiday = (current_date.month == 12 and current_date.day in [29, 30, 31]) or \
                            (current_date.month == 1 and current_date.day in [1, 2, 3])
        
        # Only Sundays and company winter holidays close the facility
        is_closed = is_sunday or is_winter_holiday
        
        # Count Sat + Sun + national holiday + company holiday as 公休 for full-timers
        if is_saturday or is_sunday or is_national_holiday or is_winter_holiday:
            public_holiday_count += 1
            print(f"DEBUG: Day {d} is holiday (Sat:{is_saturday}, Sun:{is_sunday}, Nat:{is_national_holiday}, Winter:{is_winter_holiday}) -> Count: {public_holiday_count}")
            
        if is_closed:
            closed_days.append(d)
        else:
            operating_days.append(d)
            
    # Parse constraints into a lookup: day -> {min_headcount_override: int|None, is_priority: bool}
    constraint_lookup = {}
    if constraints:
        for c in constraints:
            try:
                c_date = datetime.datetime.strptime(c['date'], "%Y-%m-%d").date()
                if c_date.year == year and c_date.month == month:
                    constraint_lookup[c_date.day] = {
                        "min_headcount_override": c.get('min_headcount_override'),
                        "is_priority": c.get('is_priority', False)
                    }
            except Exception:
                continue
    
    # Helper to identify specialized drivers (only driver role)
    def check_is_driver_only(s_dict):
        return s_dict.get('is_driver') and \
               not s_dict.get('is_care_worker') and \
               not s_dict.get('is_nurse') and \
               not s_dict.get('is_consultant') and \
               not s_dict.get('is_functional_trainer')

    # Required daily placements
    req_nurse = 1
    req_consultant = 1
    req_care = 5
    req_driver = 4

    num_staff = len(staff_list)
    
    if num_staff == 0:
        return {"error": "スタッフが登録されていません。"}

    # Build a set of (staff_id, day) that have a leave request
    leave_request_days = set()  # (staff_id, day)
    for req in requests:
        req_date = datetime.datetime.strptime(req['date'], "%Y-%m-%d").date()
        if req_date.year == year and req_date.month == month:
            leave_request_days.add((req['staff_id'], req_date.day))

    # 2. Variables
    shifts = {}
    for s in range(num_staff):
        for d in range(1, num_days + 1):
            shifts[(s, d)] = model.NewBoolVar(f'shift_s{s}_d{d}')
            
            # Closed days: no one works
            if d in closed_days:
                model.Add(shifts[(s, d)] == 0)
                continue
                
            staff_dict = staff_list[s]
            current_date = datetime.date(year, month, d)
            weekday = current_date.weekday()  # 0=Mon ... 6=Sun
            
            DAY_FLAGS = {0: 'is_available_mon', 1: 'is_available_tue', 2: 'is_available_wed',
                         3: 'is_available_thu', 4: 'is_available_fri', 5: 'is_available_sat', 6: 'is_available_sun'}
            
            if staff_dict.get('is_part_time'):
                flag = DAY_FLAGS.get(weekday)
                is_contracted_day = flag and staff_dict.get(flag, False)
                has_leave = (staff_dict['id'], d) in leave_request_days
                
                if not is_contracted_day:
                    # Cannot work on non-contracted days
                    model.Add(shifts[(s, d)] == 0)
                # Relaxed: part-timers prefer work on contracted days, but we don't MUST enforce it
                # if it blocks feasibility. However, usually they WANT to work.
                # To be safe, we allow them to NOT work if it helps, but reward working.
                # model.Add(shifts[(s, d)] == 1) -> replaced by reward in objective
            else:
                # Full-time driver-only staff: must work every operating day unless leave requested
                is_driver_only = check_is_driver_only(staff_dict)
                if is_driver_only and d in operating_days:
                    has_leave = (staff_dict['id'], d) in leave_request_days
                    if not has_leave:
                        model.Add(shifts[(s, d)] == 1)

    # role_assignments[(s, d, role)]: 1 if staff s acts as 'role' on day d
    roles = ['nurse', 'consultant', 'instructor', 'care', 'driver']
    role_assignments = {}
    for s in range(num_staff):
        staff_dict = staff_list[s]
        is_driver_only = check_is_driver_only(staff_dict)
        
        for d in operating_days:
            for r in roles:
                role_assignments[(s, d, r)] = model.NewBoolVar(f'role_s{s}_d{d}_{r}')
                
                # Check staff qualifications
                has_qual = False
                if r == 'nurse' and staff_dict.get('is_nurse'): has_qual = True
                if r == 'consultant' and staff_dict.get('is_consultant'): has_qual = True
                if r == 'instructor' and staff_dict.get('is_functional_trainer'): has_qual = True
                if r == 'care' and staff_dict.get('is_care_worker'): has_qual = True
                if r == 'driver' and staff_dict.get('is_driver'): has_qual = True
                
                if not has_qual:
                    model.Add(role_assignments[(s, d, r)] == 0)
            
            # Exclusivity Constraints
            # 1. Nurse → cannot hold any other role
            model.Add(sum(role_assignments[(s, d, r)] for r in roles if r != 'nurse') == 0).OnlyEnforceIf(role_assignments[(s, d, 'nurse')])
            
            # 2. Consultant → cannot hold any other role
            model.Add(sum(role_assignments[(s, d, r)] for r in roles if r != 'consultant') == 0).OnlyEnforceIf(role_assignments[(s, d, 'consultant')])
            
            # 3. Driver who is also a care_worker MUST hold care role when working driver
            if staff_dict.get('is_driver') and staff_dict.get('is_care_worker'):
                # If assigned as driver → MUST ALSO be assigned as care
                model.Add(role_assignments[(s, d, 'care')] == 1).OnlyEnforceIf(role_assignments[(s, d, 'driver')])
            
            # 4. Driver-only staff should not be assigned care
            if is_driver_only:
                model.Add(role_assignments[(s, d, 'care')] == 0)
            
            # Max 2 roles per person per day (e.g. care + driver)
            model.Add(sum(role_assignments[(s, d, r)] for r in roles) <= 2)
            
            # Must have at least one role if working
            model.Add(sum(role_assignments[(s, d, r)] for r in roles) >= shifts[(s, d)])
            # No role if not working
            model.Add(sum(role_assignments[(s, d, r)] for r in roles) == 0).OnlyEnforceIf(shifts[(s, d)].Not())

    # 3. Facility Requirements (Hard Constraints per Day)
    for d in operating_days:
        model.Add(sum(role_assignments[(s, d, 'nurse')] for s in range(num_staff)) >= req_nurse)
        model.Add(sum(role_assignments[(s, d, 'consultant')] for s in range(num_staff)) >= req_consultant)
        model.Add(sum(role_assignments[(s, d, 'care')] for s in range(num_staff)) >= req_care)
        model.Add(sum(role_assignments[(s, d, 'driver')] for s in range(num_staff)) >= req_driver)
        # 看護師 + 機能訓練指導員 の合計は 2 以上
        model.Add(
            sum(role_assignments[(s, d, 'nurse')] for s in range(num_staff)) +
            sum(role_assignments[(s, d, 'instructor')] for s in range(num_staff)) >= 2
        )
        
        # New Constraint: Minimum headcount excluding specialized drivers
        # Check for overrides or priority status
        day_info = constraint_lookup.get(d, {})
        current_min = day_info.get('min_headcount_override')
        if current_min is None:
            current_min = min_headcount
            
        # If it's a priority day, bump it! (e.g., +3 from base)
        if day_info.get('is_priority'):
            current_min = max(current_min, min_headcount + 3)

        if current_min > 0:
            # Sum up shifts of all staff who are NOT specialized drivers
            non_driver_only_indices = [s for s in range(num_staff) if not check_is_driver_only(staff_list[s])]
            model.Add(sum(shifts[(s, d)] for s in non_driver_only_indices) >= current_min)

    # 4. Monthly Workday Targets
    # For full-timers: target = num_days - (Sat+Sun+holiday) - paid_leave_days
    staff_targets = {}  # index -> target_work_days
    for s in range(num_staff):
        staff_data = staff_list[s]
        
        paid_leave_days = 0
        for req in requests:
            if req['staff_id'] == staff_data['id']:
                req_date = datetime.datetime.strptime(req['date'], "%Y-%m-%d").date()
                if req_date.year == year and req_date.month == month:
                    reason = req.get('reason', '')
                    if req.get('is_summer_vacation') or '有給' in reason or '有休' in reason or '夏休' in reason:
                        paid_leave_days += 1

        if not staff_data.get('is_part_time'):
            # 公休日数 = 土曜 + 日曜 + 祝日 の合計（シフト制）
            target_work_days = num_days - public_holiday_count - paid_leave_days
            staff_targets[s] = target_work_days
            # Must work between target-1 and target days
            model.Add(sum(shifts[(s, d)] for d in operating_days) >= target_work_days - 1)
            model.Add(sum(shifts[(s, d)] for d in operating_days) <= target_work_days)

    # 5. Leave Requests (Hard Constraints)
    for req in requests:
        req_date = datetime.datetime.strptime(req['date'], "%Y-%m-%d").date()
        if req_date.year == year and req_date.month == month:
            d = req_date.day
            staff_id = req['staff_id']
            s_idx = next((i for i, v in enumerate(staff_list) if v['id'] == staff_id), -1)
            
            if s_idx != -1 and d in operating_days:
                # Hope is now an absolute hard constraint again to eliminate negotiation burden
                model.Add(shifts[(s_idx, d)] == 0)

    # 6. No 5 consecutive workdays (Soft Constraint - penalty-based)
    # Add penalty when 5 consecutive days are all worked
    # objective_terms is already initialized above now
    for s in range(num_staff):
        staff_data = staff_list[s]
        # Only apply for full-time staff (part-timers only work contracted days anyway)
        if not staff_data.get('is_part_time'):
            for start_d in range(1, num_days - 3):
                # Check if 5 consecutive days (start_d to start_d+4) are all operating days
                window = [start_d + i for i in range(5) if (start_d + i) in operating_days]
                if len(window) == 5:
                    # Create a boolean for "all 5 days worked"
                    consecutive_5 = model.NewBoolVar(f'consec5_s{s}_d{start_d}')
                    model.AddMinEquality(consecutive_5, [shifts[(s, d)] for d in window])
                    # Penalize 5-consecutive heavily
                    objective_terms.append(consecutive_5.Not() * 8)

    # 7. Equal distribution and Leveling
    # Calculate average target headcount to stay near it
    total_staff_workdays = 0
    for s in range(num_staff):
        if not staff_list[s].get('is_part_time'):
            total_staff_workdays += staff_targets.get(s, 0)
        else:
            # Estimate part-timer workdays (roughly count contracted days)
            # This helps in balancing even if part-timers are fixed
            for d in operating_days:
                # This is a bit rough but works for balancing
                total_staff_workdays += 1 # Simplified: assume they work if it's their day
    
    avg_headcount = total_staff_workdays / max(1, len(operating_days))
    # Use rounded average to stay centered
    soft_upper_limit = int(avg_headcount + 0.5)
    
    for d in operating_days:
        daily_headcount = sum(shifts[(s, d)] for s in range(num_staff))
        day_info = constraint_lookup.get(d, {})
        
        # If priority day, our "target" is the higher value
        target_for_day = soft_upper_limit
        if day_info.get('is_priority'):
            target_for_day = max(soft_upper_limit, min_headcount + 3)
            
        # Multi-tiered Deviation Penalty
        # We penalize absolute difference from target_for_day
        # diff1: |hc - target| >= 1
        # diff2: |hc - target| >= 2
        # diff3: |hc - target| >= 3
        
        diff1_plus = model.NewBoolVar(f'diff1_p_d{d}')
        diff1_minus = model.NewBoolVar(f'diff1_m_d{d}')
        diff2_plus = model.NewBoolVar(f'diff2_p_d{d}')
        diff2_minus = model.NewBoolVar(f'diff2_m_d{d}')
        diff3_plus = model.NewBoolVar(f'diff3_p_d{d}')
        diff3_minus = model.NewBoolVar(f'diff3_m_d{d}')
        
        model.Add(daily_headcount >= target_for_day + 1).OnlyEnforceIf(diff1_plus)
        model.Add(daily_headcount < target_for_day + 1).OnlyEnforceIf(diff1_plus.Not())
        
        model.Add(daily_headcount <= target_for_day - 1).OnlyEnforceIf(diff1_minus)
        model.Add(daily_headcount > target_for_day - 1).OnlyEnforceIf(diff1_minus.Not())
        
        model.Add(daily_headcount >= target_for_day + 2).OnlyEnforceIf(diff2_plus)
        model.Add(daily_headcount < target_for_day + 2).OnlyEnforceIf(diff2_plus.Not())
        
        model.Add(daily_headcount <= target_for_day - 2).OnlyEnforceIf(diff2_minus)
        model.Add(daily_headcount > target_for_day - 2).OnlyEnforceIf(diff2_minus.Not())
        
        model.Add(daily_headcount >= target_for_day + 3).OnlyEnforceIf(diff3_plus)
        model.Add(daily_headcount < target_for_day + 3).OnlyEnforceIf(diff3_plus.Not())
        
        model.Add(daily_headcount <= target_for_day - 3).OnlyEnforceIf(diff3_minus)
        model.Add(daily_headcount > target_for_day - 3).OnlyEnforceIf(diff3_minus.Not())
        
        # Penalties (significantly strengthened to prioritize leveling)
        # diff1 is now 2000 (was 150)
        # diff2 is now 8000 (was 1000)
        # diff3 is 20000+ (was 5000)
        
        w_low = settings.get("weight_leveling_low", 2000)
        w_mid = settings.get("weight_leveling_mid", 8000)
        w_high = settings.get("weight_leveling_high", 25000)

        objective_terms.append(diff1_plus.Not() * w_low)
        objective_terms.append(diff1_minus.Not() * w_low)
        objective_terms.append(diff2_plus.Not() * w_mid)
        objective_terms.append(diff2_minus.Not() * w_mid)
        objective_terms.append(diff3_plus.Not() * w_high)
        objective_terms.append(diff3_minus.Not() * w_high)

        # Tie breaker / Individual targets
        for s in range(num_staff):
            staff_d = staff_list[s]
            tie_breaker = rng.randint(0, 4)
            # Dynamic base shift reward (default 2)
            base_reward = settings.get("base_shift_reward", 2)
            
            # Additional reward for part-timers on their contracted days to encourage participation
            if staff_d.get('is_part_time'):
                weekday = datetime.date(year, month, d).weekday()
                flag = DAY_FLAGS.get(weekday)
                if flag and staff_d.get(flag):
                    base_reward += 500 # High reward to make them work contracted days
            
            objective_terms.append(shifts[(s, d)] * base_reward + (shifts[(s, d)] * tie_breaker))

    model.Maximize(sum(objective_terms))

    # 8. Solve
    solver = cp_model.CpSolver()
    # Randomize the search for more variety using the provided seed
    solver.parameters.random_seed = seed
    solver.parameters.max_time_in_seconds = 20.0
    status = solver.Solve(model)

    if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
        schedule_result = []
        for d in range(1, num_days + 1):
            daily_schedule = {
                "day": d,
                "is_closed": d in closed_days,
                "staff": [],
                "absences": []
            }
            if d in operating_days:
                # Build a lookup: who is working today?
                working_staff_ids = set()
                for s in range(num_staff):
                    if solver.Value(shifts[(s, d)]) == 1:
                        assigned_roles = []
                        for r in roles:
                            if solver.Value(role_assignments[(s, d, r)]) == 1:
                                assigned_roles.append(r)
                        daily_schedule["staff"].append({
                            "staff_id": staff_list[s]["id"],
                            "name": staff_list[s]["name"],
                            "roles": assigned_roles,
                            "is_driver": bool(staff_list[s].get('is_driver', False))
                        })
                        working_staff_ids.add(staff_list[s]["id"])

                # Build absences: staff NOT working on this operating day
                date_str = datetime.date(year, month, d).strftime("%Y-%m-%d")
                for s in range(num_staff):
                    sid = staff_list[s]["id"]
                    if sid not in working_staff_ids:
                        # Find if they have a leave request
                        reason_code = None
                        for req in requests:
                            if req['staff_id'] == sid and req['date'] == date_str:
                                r = req.get('reason', '')
                                if req.get('is_summer_vacation') or '夏' in r:
                                    reason_code = '夏'
                                elif '有給' in r or '有休' in r:
                                    reason_code = '有'
                                else:
                                    reason_code = '休'  # 希望休
                                break
                        if reason_code is None:
                            reason_code = '公'  # 公休（シフト制）
                        daily_schedule["absences"].append({
                            "staff_id": sid,
                            "reason": reason_code
                        })
            else:
                # Closed day: all staff are absent for reason '公'
                for s in range(num_staff):
                    daily_schedule["absences"].append({
                        "staff_id": staff_list[s]["id"],
                        "reason": "公"
                    })
            schedule_result.append(daily_schedule)
            
        # Compile summary per staff
        staff_summary = {}
        for s in range(num_staff):
            staff_id = staff_list[s]['id']
            worked_days = sum(1 for d in operating_days if solver.Value(shifts[(s, d)]))
                    
            paid_leaves = 0
            for req in requests:
                if req['staff_id'] == staff_id:
                    req_date = datetime.datetime.strptime(req['date'], "%Y-%m-%d").date()
                    if req_date.year == year and req_date.month == month:
                        reason = req.get('reason', '')
                        if req.get('is_summer_vacation') or '有給' in reason or '有休' in reason or '夏休' in reason:
                            d = req_date.day
                            if d in operating_days:
                                if not solver.Value(shifts[(s, d)]):
                                    paid_leaves += 1
                            else:
                                paid_leaves += 1
                                
            public_holidays = num_days - worked_days - paid_leaves
            
            staff_summary[staff_id] = {
                "work_days": worked_days,
                "paid_leaves": paid_leaves,
                "public_holidays": public_holidays
            }

        return {
            "status": "success",
            "schedule": schedule_result,
            "summary": staff_summary,
            "all_staff": staff_list
        }
    else:
        return {
            "status": "failed",
            "error": "シフトが作成できませんでした。スタッフ数が不足しているか、制約が厳しすぎる可能性があります。"
        }
