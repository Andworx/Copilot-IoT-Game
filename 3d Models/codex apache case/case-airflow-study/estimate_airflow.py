"""First-pass forced-air estimate for the APACHE case study.

Edit the constants below after identifying the exact power supply, fans,
Raspberry Pi loads, converters, filter, and allowed temperature rise.
"""

ESTIMATED_HEAT_WATTS = 30.0
ALLOWED_RISE_C = 10.0
SAFETY_FACTOR = 1.75
FILTER_AND_GRILLE_DERATING = 0.60
PROPOSED_FAN_FREE_AIR_CFM = 20.0

# Near room conditions, one CFM carries about 0.569 W per degree C.
ideal_cfm = ESTIMATED_HEAT_WATTS / (0.569 * ALLOWED_RISE_C)
design_cfm = ideal_cfm * SAFETY_FACTOR
required_free_air_rating = design_cfm / FILTER_AND_GRILLE_DERATING
available_derated_cfm = PROPOSED_FAN_FREE_AIR_CFM * FILTER_AND_GRILLE_DERATING

print(f"Estimated heat:              {ESTIMATED_HEAT_WATTS:6.1f} W")
print(f"Allowed internal rise:       {ALLOWED_RISE_C:6.1f} C")
print(f"Ideal airflow:               {ideal_cfm:6.1f} CFM")
print(f"Design airflow with margin:  {design_cfm:6.1f} CFM")
print(f"Required fan free-air rating:{required_free_air_rating:6.1f} CFM")
print(f"Proposed derated airflow:    {available_derated_cfm:6.1f} CFM")

if available_derated_cfm >= design_cfm:
    print("RESULT: Proposed nominal fan rating meets this preliminary estimate.")
else:
    print("RESULT: Increase fan rating, vent area, or allowed temperature rise.")

