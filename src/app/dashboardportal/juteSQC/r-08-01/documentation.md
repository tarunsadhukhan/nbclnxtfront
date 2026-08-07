Here is a technical handoff document designed specifically for a software developer. It outlines the data architecture, input requirements, and the business logic (calculations) required to build the Morrah Weight Quality Control application.

---

# Developer Handoff: Morrah Weight QC App

## 1. Global Constants & Configuration

Before building the logic, the application needs to store the following global parameters (ideally configurable in an admin settings panel, but hardcoded for version 1):

* **`STANDARD_MIN_WEIGHT`**: 1200 (Grams)
* **`STANDARD_MAX_WEIGHT`**: 1400 (Grams)
* **`SAMPLE_SIZE`**: 10 (Number of readings required per batch)

---

## 2. Frontend: User Input Fields (Data Entry UI)

The app needs a form for the QC inspectors on the floor. Here are the required fields, their data types, and UI suggestions:

### Metadata / Batch Info

* **Date**: `Date` (Auto-fill with current date, but allow manual override).
* **Inspector Name**: `String` (UI: Dropdown list of active workers/inspectors to avoid typos).
* **Department**: `String` (UI: Dropdown, default set to "SQC").
* **Quality of Jute**: `String` (UI: Dropdown e.g., "D/4", "D/5", "A/5", "10Lbs").
* **Trolley No.**: `String` or `Integer` (UI: Text input or number pad. Represents the batch ID).
* **Average MR% (Moisture Regain)**: `Float` (UI: Number input, typically ranges between 15.0 and 20.0).

### Sample Data

* **Sample Weights (1 through 10)**: `Array of Integers` (UI: 10 sequential numeric input fields. Must capture weight in grams).
* *Validation*: Form should not submit unless exactly 10 inputs are provided.

---

## 3. Backend: Basic Analysis & Business Logic

Once the user hits "Submit", the backend should process the `Sample Weights` array before saving the complete record to the database.

Here is the pseudo-code/logic for the required computations:

**A. Core Statistical Calculations:**

* **`Average Weight`**: `Sum of all 10 weights / 10`
* **`Maximum Weight`**: `Max(Sample Weights)`
* **`Minimum Weight`**: `Min(Sample Weights)`
* **`Range (Diff)`**: `Maximum Weight - Minimum Weight`
* **`CV% (Coefficient of Variation)`**: `(Standard Deviation of the 10 weights / Average Weight) * 100`

**B. Quality Categorization (Bucketing):**
Iterate through the 10 sample weights and increment the respective counters based on the constants:

* **`LT (Light) Count`**: Count of weights `< STANDARD_MIN_WEIGHT` (1200)
* **`OK (Pass) Count`**: Count of weights `>= STANDARD_MIN_WEIGHT` AND `<= STANDARD_MAX_WEIGHT` (1200 to 1400)
* **`HY (Heavy) Count`**: Count of weights `> STANDARD_MAX_WEIGHT` (1400)

**C. Percentage Conversions:**

* **`LT%`**: `(LT Count / 10) * 100`
* **`OK%`**: `(OK Count / 10) * 100`
* **`HY%`**: `(HY Count / 10) * 100`

---

## 4. Database Schema (Suggested)

The database table (e.g., `morrah_qc_logs`) should save both the raw inputs and the calculated data to avoid heavy recalculations during dashboard reporting.

| Column Name | Data Type | Description |
| --- | --- | --- |
| `id` | UUID / Primary Key | Unique identifier for the entry |
| `created_at` | Timestamp | Exact time of submission |
| `entry_date` | Date | Date of the inspection |
| `inspector_name` | String / Varchar | Name of the worker |
| `department` | String / Varchar | E.g., "SQC" |
| `jute_quality` | String / Varchar | E.g., "D/5" |
| `trolley_no` | String / Varchar | Batch identifier |
| `weights` | JSONB / Array | `[1350, 1280, 1410...]` (Stores all 10) |
| `avg_mr_percent` | Float | E.g., 17.5 |
| `calc_avg_weight` | Float | Computed average |
| `calc_max` | Integer | Heaviest sample |
| `calc_min` | Integer | Lightest sample |
| `calc_range` | Integer | Max - Min |
| `calc_cv_pct` | Float | Coefficient of Variation |
| `count_lt` | Integer | Count of < 1200g |
| `count_ok` | Integer | Count of 1200g-1400g |
| `count_hy` | Integer | Count of > 1400g |

## 5. Future Feature Recommendations for the Dev

* **Real-time UI Feedback**: As the user types in the 10 weights, have the app UI turn the text **Red** if it's `< 1200` or `> 1400`, and **Green** if it is `1200-1400`. This gives instant visual feedback to the worker before submission.
* **Auto-flagging**: If the `OK%` drops below a certain threshold (e.g., < 60%), trigger an alert to a floor manager's dashboard.