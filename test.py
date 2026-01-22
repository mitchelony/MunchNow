
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

target_timezone = ZoneInfo('UTC')
today = datetime.now(target_timezone)
yesterday = today - timedelta(days=1)

print(f"Today's date: {str(today)[:-3]}")
print(f"Yesterday's date: {yesterday}")
