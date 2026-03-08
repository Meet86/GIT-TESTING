#!/usr/bin/env python3

from datetime import datetime, timedelta
import json
import sys


def generate_calendar(year):
    start = datetime(year, 1, 1)
    end = datetime(year, 12, 31)

    # Move start backward to nearest Sunday (GitHub style)
    start -= timedelta(days=(start.weekday() + 1) % 7)

    calendar = []
    current = start

    while current <= end:
        week = []

        for _ in range(7):
            if current.year == year:
                week.append({
                    "date": current.strftime("%Y-%m-%d"),
                    "empty": False
                })
            else:
                week.append({
                    "date": None,
                    "empty": True
                })

            current += timedelta(days=1)

        calendar.append(week)

    return calendar


def generate_month_labels(calendar):
    labels = []
    seen_months = set()

    for week in calendar:
        label = None
        for day in week:
            if day["date"]:
                dt = datetime.strptime(day["date"], "%Y-%m-%d")
                if dt.day == 1 and dt.month not in seen_months:
                    label = dt.month - 1
                    seen_months.add(dt.month)
                    break
        labels.append(label)

    return labels


def main():
    year = int(sys.argv[1]) if len(sys.argv) > 1 else datetime.now().year

    calendar = generate_calendar(year)
    month_labels = generate_month_labels(calendar)

    data = {
        "calendar": calendar,
        "month_labels": month_labels,
        "year": year
    }

    print(json.dumps(data))


if __name__ == "__main__":
    main()
