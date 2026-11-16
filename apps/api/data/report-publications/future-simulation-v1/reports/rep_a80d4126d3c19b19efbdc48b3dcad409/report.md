# Technical simulation report — Barreiras, soybean, harvests 2027 and 2028

_Whole run — 2 crop seasons_

## Identification and validity

- **Report:** Technical simulation report, template 1.0.0, texts 1.b5267b3fe207
- **Simulation identifier:** `sim_9cd555885306ffcd15715546`
- **Place:** Barreiras (29) — BR:ibge:2903201
- **Spatial scale:** Regional (municipality or county). The results do not describe an individual field.
- **Crop plan:** `soy` — soybean
- **Scope of this report:** Whole run — 2 crop seasons
- **Simulated period:** 1 January 2025 to 13 March 2028
- **Data cutoff:** 31 August 2026 at 23:59 UTC
- **Simulation issued:** 15 November 2026 at 13:41 UTC
- **Report generated:** 15 November 2026 at 23:40 UTC
- **Kind of result:** Simulation conditional on historical weather
- **Scientific status by component:** weather: climatological scenario; water balance: experimental physical model; crop phases: experimental physical model; yield: unavailable

**Crop seasons covered by this report**

| Crop | Season | Sowing | Expected harvest | Cycle (days) | Calendar source |
| :--- | :--- | :--- | :--- | ---: | :--- |
| Soybean | 2026/2027 | 20 November 2026 | 14 March 2027 | 115 | fixed state calendar (a hypothesis) |
| Soybean | 2027/2028 | 20 November 2027 | 13 March 2028 | 115 | fixed state calendar (a hypothesis) |

The three dates above are different things: the data cutoff is the last moment of the data used; the simulation was issued later; this report was generated from the saved result and changes none of its numbers.

This run explores trajectories under historical climate variability; it is not a daily weather forecast for 2027 and 2028.

## Summary for the producer

### Main results

- Among the 2 crop seasons of this report, soybean 2026/2027 has the largest median seasonal crop evapotranspiration deficit: **148.5 mm**, with P10 **59.8 mm** and P90 **213.6 mm**, across 22 scenarios. These values describe simulated water limitation, not a recommended irrigation depth.
- Soybean 2026/2027 — at least 10 crop days in the reproductive phase with water stress (Ks \< 1), not necessarily consecutive: **21 of 22 scenarios (95.5%)**. This is a frequency in the simulated scenarios, not a calibrated probability.
- Yield is unavailable for soybean 2026/2027 and soybean 2027/2028: data source unavailable. No substitute value is shown.

The report gives no overall “good” or “bad” verdict and no confidence score: each statement above is tied to the values shown.

### What can change the reading

Soil water storage capacity was assumed to be **55 mm** (profile AD4-hypothesis). It is a hypothesis, not a measurement of this area, and a different capacity changes the simulated deficit and stress.

### What to check now

1. Check whether the assumed storage capacity of 55 mm matches the soil profile of the area. Why: it is a hypothesis of this run and it drives the simulated deficit.
2. No yield figure is available for this place (data source unavailable). Why it matters: a budget needs a yield from your own records or from an official source.
3. To compare irrigation or other management options, a management result with applied depths and costs, run on the same scenarios, is needed. Why: this report contains none, and the difference between two weather scenarios is not the effect of a management choice.

These are checks of data and assumptions of this run. They are not an agronomic prescription or a planting recommendation.

## Results by crop and season

### Soybean — season 2026/2027 (harvest 2027)

Sowing on 20 November 2026; expected harvest on 14 March 2027; cycle of 115 days. Calendar: fixed state calendar (a hypothesis).

**Seasonal statistics across the scenarios — soybean 2026/2027**

| Indicator | Unit | P10 | P50 (median) | P90 | Scenarios (n) |
| :--- | :--- | ---: | ---: | ---: | ---: |
| Precipitation in the crop cycle | mm | 515.0 | 655.0 | 815.1 | 22 |
| Crop evapotranspiration demand (ETc) | mm | 449.8 | 499.7 | 522.7 | 22 |
| Actual crop evapotranspiration (ETa) | mm | 294.0 | 364.2 | 413.0 | 22 |
| Crop evapotranspiration deficit (ETc − ETa) | mm | 59.8 | 148.5 | 213.6 | 22 |
| Mean soil water storage | mm | 26.4 | 30.6 | 37.6 | 22 |
| Days with water stress (Ks \< 1) | days | 25.6 | 44.0 | 55.0 | 22 |
| Days with water stress in the reproductive phase | days | 11.6 | 25.5 | 36.4 | 22 |
| Longest dry spell in the crop cycle | days | 7.2 | 12.5 | 16.0 | 22 |

- P10, P50 and P90 are quantiles of each indicator across the scenarios. P10 is the low end of that indicator, not a “bad scenario”: for the deficit, the low end is the side with less water limitation.
- The P10–P90 range is the spread of the simulated scenarios (spread of the climate scenarios only). It is not a calibrated 80% confidence interval.
- ETc is the evapotranspiration demand of the crop under the conditions of the model.
- ETa is the evapotranspiration the model estimates actually happened with the water available.
- The deficit is the seasonal sum of ETc − ETa delivered by the model. It is not rebuilt from the columns: quantiles of different indicators can come from different scenarios, so P50(ETc) − P50(ETa) need not equal P50(deficit).
- Quantiles of day counts are interpolated and can be fractional (25.5 days). No scenario simulated a fraction of a day.
- Water stress means the stress coefficient of the model is below 1 (Ks \< 1). It indicates water limitation in the model, not irreversible damage or a percentage of yield loss.

**Events across the scenarios — soybean 2026/2027**

| Event (definition) | Scenarios with the event | Frequency |
| :--- | ---: | ---: |
| At least 10 crop days in the reproductive phase with water stress (Ks \< 1), not necessarily consecutive | 21 of 22 | 95.5% |
| At least one run of 15 consecutive crop days with precipitation below 1 mm per day | 7 of 22 | 31.8% |
| Seasonal sum of ETc − ETa on crop days of at least 100 mm | 14 of 22 | 63.6% |

- Frequency in the simulated scenarios; it is not a calibrated probability. Zero occurrences do not mean the event is impossible. The thresholds are definitions of the simulation protocol, not official management limits.

**Crop phases of the model calendar — soybean 2026/2027**

| Phase | Start | End | Days |
| :--- | :--- | :--- | ---: |
| Establishment | 20 November 2026 | 4 December 2026 | 15 |
| Vegetative | 5 December 2026 | 8 January 2027 | 35 |
| Reproductive | 9 January 2027 | 22 February 2027 | 45 |
| Maturation | 23 February 2027 | 14 March 2027 | 20 |

- Phases are those of the model calendar. They are not growth stages observed in the field and are not more detailed than the model supports.

### Soybean — season 2027/2028 (harvest 2028)

Sowing on 20 November 2027; expected harvest on 13 March 2028; cycle of 115 days. Calendar: fixed state calendar (a hypothesis).

**Seasonal statistics across the scenarios — soybean 2027/2028**

| Indicator | Unit | P10 | P50 (median) | P90 | Scenarios (n) |
| :--- | :--- | ---: | ---: | ---: | ---: |
| Precipitation in the crop cycle | mm | 517.0 | 658.2 | 820.3 | 22 |
| Crop evapotranspiration demand (ETc) | mm | 449.8 | 501.8 | 524.0 | 22 |
| Actual crop evapotranspiration (ETa) | mm | 293.0 | 369.7 | 414.3 | 22 |
| Crop evapotranspiration deficit (ETc − ETa) | mm | 61.9 | 130.6 | 213.6 | 22 |
| Mean soil water storage | mm | 26.5 | 30.4 | 37.6 | 22 |
| Days with water stress (Ks \< 1) | days | 25.6 | 43.0 | 54.8 | 22 |
| Days with water stress in the reproductive phase | days | 12.1 | 25.5 | 36.3 | 22 |
| Longest dry spell in the crop cycle | days | 7.2 | 12.0 | 16.0 | 22 |

- P10, P50 and P90 are quantiles of each indicator across the scenarios. P10 is the low end of that indicator, not a “bad scenario”: for the deficit, the low end is the side with less water limitation.
- The P10–P90 range is the spread of the simulated scenarios (spread of the climate scenarios only). It is not a calibrated 80% confidence interval.
- ETc is the evapotranspiration demand of the crop under the conditions of the model.
- ETa is the evapotranspiration the model estimates actually happened with the water available.
- The deficit is the seasonal sum of ETc − ETa delivered by the model. It is not rebuilt from the columns: quantiles of different indicators can come from different scenarios, so P50(ETc) − P50(ETa) need not equal P50(deficit).
- Quantiles of day counts are interpolated and can be fractional (25.5 days). No scenario simulated a fraction of a day.
- Water stress means the stress coefficient of the model is below 1 (Ks \< 1). It indicates water limitation in the model, not irreversible damage or a percentage of yield loss.

**Events across the scenarios — soybean 2027/2028**

| Event (definition) | Scenarios with the event | Frequency |
| :--- | ---: | ---: |
| At least 10 crop days in the reproductive phase with water stress (Ks \< 1), not necessarily consecutive | 21 of 22 | 95.5% |
| At least one run of 15 consecutive crop days with precipitation below 1 mm per day | 6 of 22 | 27.3% |
| Seasonal sum of ETc − ETa on crop days of at least 100 mm | 13 of 22 | 59.1% |

- Frequency in the simulated scenarios; it is not a calibrated probability. Zero occurrences do not mean the event is impossible. The thresholds are definitions of the simulation protocol, not official management limits.

**Crop phases of the model calendar — soybean 2027/2028**

| Phase | Start | End | Days |
| :--- | :--- | :--- | ---: |
| Establishment | 20 November 2027 | 4 December 2027 | 15 |
| Vegetative | 5 December 2027 | 8 January 2028 | 35 |
| Reproductive | 9 January 2028 | 22 February 2028 | 45 |
| Maturation | 23 February 2028 | 13 March 2028 | 20 |

- Phases are those of the model calendar. They are not growth stages observed in the field and are not more detailed than the model supports.

## Supporting charts

Selection rule of the three trajectories: central scenario defined by the protocol; drier and wetter are the scenarios with the largest and the smallest crop deficit.

The drier and wetter trajectories are chosen once for the whole run, not for each season. In a single season the “drier” one can therefore show a smaller deficit than the central one. The central trajectory is one whole simulated scenario. It need not coincide with the median of each day.

The shaded band joins the daily P10 and P90 of all scenarios. It is not a physically coherent trajectory, and its edges are not “the P10 scenario” or “the P90 scenario”. Three trajectories do not represent the whole ensemble: frequencies and quantiles are those of the tables in the previous section, never computed from these three.

**Soil water storage — soybean 2026/2027**

Daily soil water storage from 20 November 2026 to 14 March 2027 for three whole scenarios (central, drier, wetter), over the daily P10–P90 band of all scenarios. The storage capacity is 55 mm. The table below gives the same trajectories in numbers.

**Lowest soil water storage of the three trajectories — soybean 2026/2027**

| Trajectory | Scenario (weather year) | Lowest storage (mm) | Date of lowest storage |
| :--- | :--- | ---: | :--- |
| Central | a2022 (2022) | 0.8 | 10 March 2027 |
| Drier | a2011 (2011) | 0.8 | 6 March 2027 |
| Wetter | a2003 (2003) | 10.0 | 23 December 2026 |

**Cumulative evapotranspiration deficit — soybean 2026/2027**

Cumulative ETc − ETa from 20 November 2026 to 14 March 2027 for the same three scenarios. Each line ends at the seasonal deficit of that scenario. The table below gives the same trajectories in numbers.

**Seasonal deficit of the three trajectories — soybean 2026/2027**

| Trajectory | Scenario (weather year) | Seasonal deficit (mm) |
| :--- | :--- | ---: |
| Central | a2022 (2022) | 173.8 |
| Drier | a2011 (2011) | 216.4 |
| Wetter | a2003 (2003) | 10.8 |

Weather of the days shown: climatological scenario (historical weather) from 20 November 2026 to 14 March 2027.

The charts use the daily resolution of the series (115 days); no point was removed.

**Soil water storage — soybean 2027/2028**

Daily soil water storage from 20 November 2027 to 13 March 2028 for three whole scenarios (central, drier, wetter), over the daily P10–P90 band of all scenarios. The storage capacity is 55 mm. The table below gives the same trajectories in numbers.

**Lowest soil water storage of the three trajectories — soybean 2027/2028**

| Trajectory | Scenario (weather year) | Lowest storage (mm) | Date of lowest storage |
| :--- | :--- | ---: | :--- |
| Central | a2022 (2022) | 5.2 | 16 December 2027 |
| Drier | a2011 (2011) | 1.4 | 17 February 2028 |
| Wetter | a2003 (2003) | 3.2 | 11 January 2028 |

**Cumulative evapotranspiration deficit — soybean 2027/2028**

Cumulative ETc − ETa from 20 November 2027 to 13 March 2028 for the same three scenarios. Each line ends at the seasonal deficit of that scenario. The table below gives the same trajectories in numbers.

**Seasonal deficit of the three trajectories — soybean 2027/2028**

| Trajectory | Scenario (weather year) | Seasonal deficit (mm) |
| :--- | :--- | ---: |
| Central | a2022 (2022) | 76.9 |
| Drier | a2011 (2011) | 247.1 |
| Wetter | a2003 (2003) | 61.6 |

Weather of the days shown: climatological scenario (historical weather) from 20 November 2027 to 13 March 2028.

The charts use the daily resolution of the series (115 days); no point was removed.

## Yield, economics and alternatives

Neither yield nor economic results are available in this run.

### Yield — soybean 2026/2027

Yield unavailable: data source unavailable. No substitute value is shown. A yield appears here only when a later publication provides one for this place and crop.

### Yield — soybean 2027/2028

Yield unavailable: data source unavailable. No substitute value is shown. A yield appears here only when a later publication provides one for this place and crop.

Total production is not calculated: this run declares no area. With a valid area it would be an arithmetic estimate (yield × area), not a production forecast.

### Economics

**Economic analysis unavailable: this result does not include prices, costs and an integrated budget.**

No revenue, cost, margin or currency is shown, and none is derived from a reduction of water stress. A budget needs a yield suited to it, an area, prices with unit, currency, date and source, and costs on the same basis.

### Management alternatives

**Management comparison unavailable: no management result run on the same scenarios, with paired members, is linked to this run.**

The drier and wetter trajectories are weather scenarios. They are not two controlled management options and are not compared as if they were. This run simulates no irrigation: no applied depth, water volume or irrigation schedule is shown. The evapotranspiration deficit is not an irrigation depth.

## Assumptions, methods and traceability

### Soil and initial condition

- **Soil water storage capacity:** 55 mm — hypothesis (not measured for this area)
- **Soil profile:** `AD4-hypothesis`
- **Initial storage:** 50% of the capacity — hypothesis (not measured for this area)
- **Warm-up before the seasons:** 1 January 2025 to 31 August 2026, with observed weather

**Sensitivity to the initial storage**

| Initial storage | Season | Value |
| ---: | :--- | ---: |
| 20% | `soy:2027` | 0 |
| 20% | `soy:2028` | 0 |
| 90% | `soy:2027` | 0 |
| 90% | `soy:2028` | 0 |

- Quantity evaluated: difference of the seasonal crop deficit (mm) in the central scenario.
- A zero in this analysis concerns only the initial storage, for the quantity and the scenario named above. It does not remove the other sources of uncertainty.

### Scenario ensemble

- **Method:** whole historical years reapplied over the calendar of the season
- **Scenarios (members):** 22
- **Distinct historical years used:** 22
- **Weather years:** 2001–2022
- **Eligible years:** 22
- **Excluded years:** none
- **Years chosen by request:** no
- **Coverage class:** standard (at least 15 complete years)
- **Seed:** 42
- **Calendar alignment:** day offset from an aligned start; largest shift between source day and calendar day: 1 day. Each source day is used once and precipitation totals are preserved.

The coverage class counts historical years. It says how many scenarios exist, not how accurate they are.

**Weather by period**

| Kind of weather | Start | End | Origin |
| :--- | :--- | :--- | :--- |
| Observed | 1 January 2025 | 31 August 2026 | NASA POWER daily point, community AG (rain IMERG\_PRECTOT) |
| Climatological scenario (historical weather) | 1 September 2026 | 13 March 2028 | blocks of historical years over NASA POWER data |

- Each period uses only the kind of weather named in its row. No source is extended beyond its period.

**Data sources**

| Use | Provider and product | Availability at the cutoff | Period covered by the source file | SHA-256 |
| :--- | :--- | :--- | :--- | :--- |
| Historical weather | NASA POWER — NASA POWER daily point, community AG (rain IMERG\_PRECTOT) | unknown (archived retrospective series; only observations dated up to the cutoff are used) | 1 January 2001 to 31 December 2024 | `cf4c8f0099d212ad1e0547778277d3ed5ca85a3fdf0f08a59ef64455574ff358` |
| Observed weather before the cutoff | NASA POWER — NASA POWER daily point, community AG (rain IMERG\_PRECTOT) | unknown (archived retrospective series; only observations dated up to the cutoff are used) | 1 January 2025 to 14 November 2026 | `6e6de6efafcec98598e2acad4fa2ec2dd38f6c75bf8de0a903c3dc670a9576b9` |
| Reference evapotranspiration (ET0) | FAO-56 Penman-Monteith, daily | not available | not available | not available |

- The period covered by a source file can be longer than the period used. This run uses observed data up to the data cutoff (31 August 2026 at 23:59 UTC) and the weather years listed under “Scenario ensemble”.
- The file of the source “observed weather before the cutoff” covers dates until 14 November 2026, after the data cutoff. That does not show that later dates were used: the periods actually used are those of “Weather by period”.

### Engine, intervals and validation

- **Protocol:** `future_simulation_v1`
- **Engine version:** `crop-simulation-v1`
- **Parameter set:** `gaiapus-fao56-br-v1`
- **Method of the P10–P90 range:** spread of the climate scenarios only
- **Validation:** Experimental results. See the limitations below; the scientific status of each component is in the first section.

### Limitations declared by the run

- Weather after the cutoff is a scenario from historical years, not a daily forecast.
- Frequencies across historical scenarios are not calibrated probabilities.
- The soil is one reservoir; there is no root depth profile.
- The soil storage capacity is a hypothesis.
- The sowing and harvest calendar is a hypothesis.
- The parameters of the periods without a crop (fallow) are a hypothesis.
- The results were not validated against field measurements.
- Heat, frost, pests and diseases are not represented; none of them is inferred from rain or water stress.

### Identification of the results

- **Report identifier:** `rep_a80d4126d3c19b19efbdc48b3dcad409`
- **Facts of this report (SHA-256):** `64a99e286d1d87b5e4165ba882a930991128f6b0ecf2b22306eddf98c2e904dd`
- **Run file (SHA-256):** `2bf7553fe772a06dc9318f492d3b1712c4d0ba25e5651c844e46b828e90b1ba6`
- **Daily series file (SHA-256):** `1edb8ab84c4bc29f92673f87df4711b2f751096e196d172bed62eb5db080d0d0`
- **Scientific identity (SHA-256):** `9cd555885306ffcd15715546cc602ddbe1998f7968f49b8585ea5975a64709cc`
- **Series content declared by the run (SHA-256):** `0789e4bb234f37f0f7298c30d5bec4362d06735ba6a0cecdeed78de4fa2cc462`

A report in another language of the same run and scope has the same facts hash: only the wording changes.

---

Deterministic report produced by Gaiapus from a saved simulation result. The same run, scope, language and versions always give this text; no number was recalculated to write it. Report rep\_a80d4126d3c19b19efbdc48b3dcad409 · facts 64a99e286d1d87b5.
