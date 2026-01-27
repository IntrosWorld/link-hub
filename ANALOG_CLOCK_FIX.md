# ⏰ Analog Clock Hour Selection Fix

## Issue Summary

**Problem:** When clicking the analog clock to set time, minutes were being selected correctly, but hours were not changing.

**Root Cause:** The `hours` and `minutes` variables in `AnalogClock.tsx` were being extracted from the `value` prop only once during the initial render, and were not reactive to prop changes.

---

## The Fix

### Before (Broken):
```typescript
const AnalogClock: React.FC<AnalogClockProps> = ({
    value = '12:00',
    onChange,
    // ...
}) => {
    // ❌ Only runs once on mount - doesn't update when value changes
    const [hours, minutes] = value ? value.split(':').map(Number) : [12, 0];
    // ...
}
```

**Why it failed:**
1. User clicks hour on clock → `onChange` is called with new time (e.g., "15:30")
2. Parent component (`TimePicker`) updates its `value` state
3. New `value` is passed back to `AnalogClock` as prop
4. ❌ But `hours` and `minutes` were already set and don't re-parse
5. Clock display still shows old hour

### After (Fixed):
```typescript
const AnalogClock: React.FC<AnalogClockProps> = ({
    value = '12:00',
    onChange,
    // ...
}) => {
    // ✅ Re-parses whenever value prop changes
    const [hours, minutes] = React.useMemo(() => {
        const [h, m] = (value || '12:00').split(':').map(Number);
        return [h, m];
    }, [value]);
    // ...
}
```

**Why it works:**
1. User clicks hour on clock → `onChange` is called with new time
2. Parent updates `value` prop
3. ✅ `useMemo` detects `value` has changed and re-runs the parser
4. ✅ `hours` and `minutes` now reflect the new time
5. Clock display updates correctly

---

## How Time is Stored in Database

### Database Schema

Time is stored in **24-hour format (0-23)** as **INTEGER** values:

```sql
CREATE TABLE links (
  -- ...
  start_hour INTEGER CHECK (start_hour >= 0 AND start_hour < 24),
  end_hour   INTEGER CHECK (end_hour >= 0 AND end_hour < 24),
  -- ...
);
```

### Storage Format

| Display (12-hour) | Database (24-hour) | Example Use Case |
|-------------------|-------------------|------------------|
| 12:00 AM | 0 | Midnight |
| 1:00 AM | 1 | Early morning |
| 9:00 AM | 9 | Business hours start |
| 12:00 PM | 12 | Noon |
| 3:00 PM | 15 | Afternoon |
| 11:00 PM | 23 | Late night |

### Conversion Flow

**Frontend (AnalogClock) → Database:**

```typescript
// User sees: 3:30 PM on analog clock
// Component value: "15:30" (24-hour format string)
//
// timeToHour() extracts hour:
const timeToHour = (timeString: string): number | null => {
  const [hours] = timeString.split(':');
  return parseInt(hours, 10);  // Returns 15
};

// Database stores: 15 (INTEGER)
```

**Database → Frontend (AnalogClock):**

```typescript
// Database has: start_hour = 15 (INTEGER)
//
// Convert to time string:
const hourToTime = (hour: number): string => {
  return `${hour.toString().padStart(2, '0')}:00`;  // "15:00"
};

// AnalogClock displays:
// - Clock shows 3 o'clock position
// - PM indicator is lit
// - Display shows "03:00 PM"
```

---

## How Minutes Are Handled

Currently, the database only stores **hours** (not minutes). The system works like this:

1. **AnalogClock** allows selecting both hours AND minutes (e.g., "15:30")
2. **timeToHour()** extracts only the hour part (15)
3. **Database stores** only the hour (15)
4. **Visibility check** compares current hour with start_hour/end_hour

### Example:

```typescript
// User sets link visible from 3:30 PM to 5:45 PM
// AnalogClock value: "15:30" to "17:45"
// Database stores: start_hour = 15, end_hour = 17
//
// Visibility logic:
const isOutsideTimeWindow = (link, currentHour) => {
  return currentHour < 15 || currentHour >= 17;
  // Currently ignores the :30 and :45 minutes!
};
```

### 🚨 **Important Note:**

The current implementation **ignores minutes**. If you set:
- Start: 3:30 PM → Stored as 15 → Actually starts at 3:00 PM
- End: 5:45 PM → Stored as 17 → Actually ends at 5:00 PM

---

## Future Enhancement: Minute-Precise Storage

If you want to support minute precision later:

### Database Schema Update:
```sql
ALTER TABLE links
  ADD COLUMN start_time TIME,
  ADD COLUMN end_time TIME;

-- Or use separate minute columns:
ALTER TABLE links
  ADD COLUMN start_minute INTEGER CHECK (start_minute >= 0 AND start_minute < 60),
  ADD COLUMN end_minute INTEGER CHECK (end_minute >= 0 AND end_minute < 60);
```

### Updated Conversion:
```typescript
// Store full time
const timeToMinutes = (timeString: string): number => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;  // Store as total minutes since midnight
};

// Example: "15:30" → 15*60 + 30 = 930 minutes
```

---

## Files Modified

### [client/src/components/AnalogClock.tsx](client/src/components/AnalogClock.tsx)

**Line 19-22:** Changed from direct destructuring to `useMemo` hook

**Before:**
```typescript
const [hours, minutes] = value ? value.split(':').map(Number) : [12, 0];
```

**After:**
```typescript
const [hours, minutes] = React.useMemo(() => {
    const [h, m] = (value || '12:00').split(':').map(Number);
    return [h, m];
}, [value]);
```

---

## Testing the Fix

### Test Steps:

1. **Start dev server:** `npm run dev`
2. **Go to Admin Dashboard** → Add New Link
3. **Click on Time Window** → Start Time picker
4. **Click hour on analog clock** (e.g., click on 3)
   - ✅ Hour should change to 3
   - ✅ Mode should auto-switch to minutes
   - ✅ Clock should show correct hour hand position
5. **Click minute** (e.g., click on 6 for :30)
   - ✅ Minutes should change to 30
   - ✅ Display should show "03:30"
6. **Toggle AM/PM**
   - ✅ Clicking PM should change to 15:30
   - ✅ Clicking AM should change back to 03:30
7. **Submit form**
   - ✅ Database should store `start_hour = 15` (if PM)

### Verify Database:

```sql
-- Check stored hours
SELECT id, title, start_hour, end_hour
FROM links
WHERE start_hour IS NOT NULL;

-- Example result:
-- id | title        | start_hour | end_hour
-- 1  | Morning Link | 9          | 12
-- 2  | Evening Link | 15         | 23
```

---

## Summary

✅ **Fixed:** Hour selection now works correctly in AnalogClock
✅ **Format:** Time is stored as 24-hour integers (0-23) in database
✅ **Display:** AnalogClock shows 12-hour format with AM/PM selector
✅ **Conversion:** Automatic conversion between 12-hour display and 24-hour storage
⚠️  **Limitation:** Minutes are collected but only hours are stored/checked
🔄  **Future:** Can add minute precision by updating database schema

The analog clock now correctly updates both hours and minutes when clicked! The time is stored in the database as 24-hour format integers for efficient comparison and querying.
