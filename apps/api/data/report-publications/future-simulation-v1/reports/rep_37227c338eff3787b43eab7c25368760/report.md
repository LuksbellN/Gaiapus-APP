# Technical simulation report — Sorriso, soybean, harvests 2027 and 2028

_Whole run — 2 crop seasons_

## Identification and validity

- **Report:** Technical simulation report, template 1.0.0, texts 1.a53182923b5d
- **Simulation identifier:** `sim_0ef0f2562258c91c5a13ffff`
- **Place:** Sorriso (51) — BR:ibge:5107925
- **Spatial scale:** Regional (municipality or county). The results do not describe an individual field.
- **Crop plan:** `soy` — soybean
- **Scope of this report:** Whole run — 2 crop seasons
- **Simulated period:** 1 January 2025 to 27 January 2028
- **Data cutoff:** 31 August 2026 at 23:59 UTC
- **Simulation issued:** 15 November 2026 at 13:41 UTC
- **Report generated:** 15 November 2026 at 23:13 UTC
- **Kind of result:** Simulation conditional on historical weather
- **Scientific status by component:** weather: climatological scenario; water balance: experimental physical model; crop phases: experimental physical model; yield: reference

**Crop seasons covered by this report**

| Crop | Season | Sowing | Expected harvest | Cycle (days) | Calendar source |
| :--- | :--- | :--- | :--- | ---: | :--- |
| Soybean | 2026/2027 | 5 October 2026 | 27 January 2027 | 115 | fixed state calendar (a hypothesis) |
| Soybean | 2027/2028 | 5 October 2027 | 27 January 2028 | 115 | fixed state calendar (a hypothesis) |

The three dates above are different things: the data cutoff is the last moment of the data used; the simulation was issued later; this report was generated from the saved result and changes none of its numbers.

This run explores trajectories under historical climate variability; it is not a daily weather forecast for 2027 and 2028.

## Summary for the producer

### Main results

- Among the 2 crop seasons of this report, soybean 2027/2028 has the largest median seasonal crop evapotranspiration deficit: **0.1 mm**, with P10 **0.0 mm** and P90 **27.9 mm**, across 22 scenarios. These values describe simulated water limitation, not a recommended irrigation depth.
- Soybean 2027/2028 — at least 10 crop days in the reproductive phase with water stress (Ks \< 1), not necessarily consecutive: **3 of 22 scenarios (13.6%)**. This is a frequency in the simulated scenarios, not a calibrated probability.
- Soybean 2026/2027: historical municipal yield reference of **3,594 kg/ha**, calculated from 2017–2021 data. Soybean 2027/2028: historical municipal yield reference of **3,594 kg/ha**, calculated from 2017–2021 data. A historical reference is independent of the simulated weather scenarios; it is not a yield forecast for a field or for the harvests of this report.

The report gives no overall “good” or “bad” verdict and no confidence score: each statement above is tied to the values shown.

### What can change the reading

Soil water storage capacity was assumed to be **55 mm** (profile AD4-hypothesis). It is a hypothesis, not a measurement of this area, and a different capacity changes the simulated deficit and stress.

### What to check now

1. Check whether the assumed storage capacity of 55 mm matches the soil profile of the area. Why: it is a hypothesis of this run and it drives the simulated deficit.
2. The yield reference ends in 2021; check more recent local data before preparing a budget. Why: the reference is an average of past municipal yields, 6 years before this harvest.
3. To compare irrigation or other management options, a management result with applied depths and costs, run on the same scenarios, is needed. Why: this report contains none, and the difference between two weather scenarios is not the effect of a management choice.

These are checks of data and assumptions of this run. They are not an agronomic prescription or a planting recommendation.

## Results by crop and season

### Soybean — season 2026/2027 (harvest 2027)

Sowing on 5 October 2026; expected harvest on 27 January 2027; cycle of 115 days. Calendar: fixed state calendar (a hypothesis).

**Seasonal statistics across the scenarios — soybean 2026/2027**

| Indicator | Unit | P10 | P50 (median) | P90 | Scenarios (n) |
| :--- | :--- | ---: | ---: | ---: | ---: |
| Precipitation in the crop cycle | mm | 842.5 | 980.6 | 1,182.4 | 22 |
| Crop evapotranspiration demand (ETc) | mm | 376.4 | 391.2 | 415.0 | 22 |
| Actual crop evapotranspiration (ETa) | mm | 375.9 | 386.5 | 400.7 | 22 |
| Crop evapotranspiration deficit (ETc − ETa) | mm | 0.0 | \<0.1 | 9.1 | 22 |
| Mean soil water storage | mm | 45.6 | 47.4 | 49.1 | 22 |
| Days with water stress (Ks \< 1) | days | 0.0 | 0.5 | 6.9 | 22 |
| Days with water stress in the reproductive phase | days | 0.0 | 0.0 | 4.7 | 22 |
| Longest dry spell (consecutive days with rain \< 1 mm) | days | 4.0 | 4.5 | 7.0 | 22 |

- P10, P50 and P90 are quantiles of each indicator across the scenarios. P10 is not always the unfavourable side: a smaller deficit is favourable, a smaller rainfall is not.
- The P10–P90 range is the spread of the simulated scenarios (spread of the climate scenarios only). It is not a calibrated 80% confidence interval.
- ETc is the evapotranspiration demand of the crop under the conditions of the model.
- ETa is the evapotranspiration the model estimates actually happened with the water available.
- The deficit is the seasonal sum of ETc − ETa delivered by the model. It is not rebuilt from the columns: quantiles of different indicators can come from different scenarios, so P50(ETc) − P50(ETa) need not equal P50(deficit).
- Quantiles of day counts are interpolated and can be fractional (0.5 days). No scenario simulated a fraction of a day.
- A value shown as “\<” is positive but below the displayed precision; it is not zero.
- Water stress means the stress coefficient of the model is below 1 (Ks \< 1). It indicates water limitation in the model, not irreversible damage or a percentage of yield loss.

**Events across the scenarios — soybean 2026/2027**

| Event (definition) | Scenarios with the event | Frequency |
| :--- | ---: | ---: |
| At least 10 crop days in the reproductive phase with water stress (Ks \< 1), not necessarily consecutive | 2 of 22 | 9.1% |
| At least one run of 15 consecutive crop days with precipitation below 1 mm per day | 0 of 22 | 0.0% |
| Seasonal sum of ETc − ETa on crop days of at least 100 mm | 0 of 22 | 0.0% |

- Frequency in the simulated scenarios; it is not a calibrated probability. Zero occurrences do not mean the event is impossible. The thresholds are definitions of the simulation protocol, not official management limits.

**Crop phases of the model calendar — soybean 2026/2027**

| Phase | Start | End | Days |
| :--- | :--- | :--- | ---: |
| Establishment | 5 October 2026 | 19 October 2026 | 15 |
| Vegetative | 20 October 2026 | 23 November 2026 | 35 |
| Reproductive | 24 November 2026 | 7 January 2027 | 45 |
| Maturation | 8 January 2027 | 27 January 2027 | 20 |

- Phases are those of the model calendar. They are not growth stages observed in the field and are not more detailed than the model supports.

### Soybean — season 2027/2028 (harvest 2028)

Sowing on 5 October 2027; expected harvest on 27 January 2028; cycle of 115 days. Calendar: fixed state calendar (a hypothesis).

**Seasonal statistics across the scenarios — soybean 2027/2028**

| Indicator | Unit | P10 | P50 (median) | P90 | Scenarios (n) |
| :--- | :--- | ---: | ---: | ---: | ---: |
| Precipitation in the crop cycle | mm | 799.8 | 980.6 | 1,182.4 | 22 |
| Crop evapotranspiration demand (ETc) | mm | 381.0 | 393.1 | 419.4 | 22 |
| Actual crop evapotranspiration (ETa) | mm | 376.2 | 386.9 | 400.6 | 22 |
| Crop evapotranspiration deficit (ETc − ETa) | mm | 0.0 | 0.1 | 27.9 | 22 |
| Mean soil water storage | mm | 42.0 | 47.3 | 49.0 | 22 |
| Days with water stress (Ks \< 1) | days | 0.0 | 1.0 | 16.9 | 22 |
| Days with water stress in the reproductive phase | days | 0.0 | 0.0 | 12.3 | 22 |
| Longest dry spell (consecutive days with rain \< 1 mm) | days | 4.0 | 5.0 | 7.0 | 22 |

- P10, P50 and P90 are quantiles of each indicator across the scenarios. P10 is not always the unfavourable side: a smaller deficit is favourable, a smaller rainfall is not.
- The P10–P90 range is the spread of the simulated scenarios (spread of the climate scenarios only). It is not a calibrated 80% confidence interval.
- ETc is the evapotranspiration demand of the crop under the conditions of the model.
- ETa is the evapotranspiration the model estimates actually happened with the water available.
- The deficit is the seasonal sum of ETc − ETa delivered by the model. It is not rebuilt from the columns: quantiles of different indicators can come from different scenarios, so P50(ETc) − P50(ETa) need not equal P50(deficit).
- Quantiles of day counts are interpolated and can be fractional (16.9 days). No scenario simulated a fraction of a day.
- Water stress means the stress coefficient of the model is below 1 (Ks \< 1). It indicates water limitation in the model, not irreversible damage or a percentage of yield loss.

**Events across the scenarios — soybean 2027/2028**

| Event (definition) | Scenarios with the event | Frequency |
| :--- | ---: | ---: |
| At least 10 crop days in the reproductive phase with water stress (Ks \< 1), not necessarily consecutive | 3 of 22 | 13.6% |
| At least one run of 15 consecutive crop days with precipitation below 1 mm per day | 0 of 22 | 0.0% |
| Seasonal sum of ETc − ETa on crop days of at least 100 mm | 0 of 22 | 0.0% |

- Frequency in the simulated scenarios; it is not a calibrated probability. Zero occurrences do not mean the event is impossible. The thresholds are definitions of the simulation protocol, not official management limits.

**Crop phases of the model calendar — soybean 2027/2028**

| Phase | Start | End | Days |
| :--- | :--- | :--- | ---: |
| Establishment | 5 October 2027 | 19 October 2027 | 15 |
| Vegetative | 20 October 2027 | 23 November 2027 | 35 |
| Reproductive | 24 November 2027 | 7 January 2028 | 45 |
| Maturation | 8 January 2028 | 27 January 2028 | 20 |

- Phases are those of the model calendar. They are not growth stages observed in the field and are not more detailed than the model supports.

## Supporting charts

Selection rule of the three trajectories: central scenario defined by the protocol; drier and wetter are the scenarios with the largest and the smallest crop deficit.

The drier and wetter trajectories are chosen once for the whole run, not for each season. In a single season the “drier” one can therefore show a smaller deficit than the central one. The central trajectory is one whole simulated scenario. It need not coincide with the median of each day.

The shaded band joins the daily P10 and P90 of all scenarios. It is not a physically coherent trajectory, and its edges are not “the P10 scenario” or “the P90 scenario”. Three trajectories do not represent the whole ensemble: frequencies and quantiles are those of the tables in the previous section, never computed from these three.

**Soil water storage — soybean 2026/2027**

Daily soil water storage from 5 October 2026 to 27 January 2027 for three whole scenarios (central, drier, wetter), over the daily P10–P90 band of all scenarios. The storage capacity is 55 mm. The table below gives the same trajectories in numbers.

**Lowest soil water storage of the three trajectories — soybean 2026/2027**

| Trajectory | Scenario (weather year) | Lowest storage (mm) | Date of lowest storage |
| :--- | :--- | ---: | :--- |
| Central | a2006 (2006) | 10.1 | 21 November 2026 |
| Drier | a2022 (2022) | 16.4 | 10 November 2026 |
| Wetter | a2007 (2007) | 25.9 | 6 October 2026 |

**Cumulative evapotranspiration deficit — soybean 2026/2027**

Cumulative ETc − ETa from 5 October 2026 to 27 January 2027 for the same three scenarios. Each line ends at the seasonal deficit of that scenario. The table below gives the same trajectories in numbers.

**Seasonal deficit of the three trajectories — soybean 2026/2027**

| Trajectory | Scenario (weather year) | Seasonal deficit (mm) |
| :--- | :--- | ---: |
| Central | a2006 (2006) | 9.4 |
| Drier | a2022 (2022) | 2.1 |
| Wetter | a2007 (2007) | 0.0 |

Weather of the days shown: climatological scenario (historical weather) from 5 October 2026 to 27 January 2027.

The charts use the daily resolution of the series (115 days); no point was removed.

**Soil water storage — soybean 2027/2028**

Daily soil water storage from 5 October 2027 to 27 January 2028 for three whole scenarios (central, drier, wetter), over the daily P10–P90 band of all scenarios. The storage capacity is 55 mm. The table below gives the same trajectories in numbers.

**Lowest soil water storage of the three trajectories — soybean 2027/2028**

| Trajectory | Scenario (weather year) | Lowest storage (mm) | Date of lowest storage |
| :--- | :--- | ---: | :--- |
| Central | a2006 (2006) | 22.5 | 6 October 2027 |
| Drier | a2022 (2022) | 9.9 | 20 December 2027 |
| Wetter | a2007 (2007) | 24.0 | 15 January 2028 |

**Cumulative evapotranspiration deficit — soybean 2027/2028**

Cumulative ETc − ETa from 5 October 2027 to 27 January 2028 for the same three scenarios. Each line ends at the seasonal deficit of that scenario. The table below gives the same trajectories in numbers.

**Seasonal deficit of the three trajectories — soybean 2027/2028**

| Trajectory | Scenario (weather year) | Seasonal deficit (mm) |
| :--- | :--- | ---: |
| Central | a2006 (2006) | 0.0 |
| Drier | a2022 (2022) | 55.7 |
| Wetter | a2007 (2007) | 0.0 |

Weather of the days shown: climatological scenario (historical weather) from 5 October 2027 to 27 January 2028.

The charts use the daily resolution of the series (115 days); no point was removed.

## Yield, economics and alternatives

Yield is shown as published. Economic results are unavailable in this run.

### Yield — soybean 2026/2027

- **Kind of result:** Historical municipal reference (not a forecast for this harvest)
- **Value:** **3,594 kg/ha**
- **Status of the result:** reference
- **Research status:** historical reference selected
- **Method:** mean of the last five published municipal yields (IBGE PAM)
- **Spatial scale:** municipality — not an estimate for a field
- **Reference years:** 2017–2021
- **Last year of published yield data:** 2021
- **Years between that data and the harvest:** 6
- **When the official data is published:** IBGE PAM data of a year is published by 31 October of the following year
- **Depends on the simulated weather scenarios:** no — the value is the same in every scenario; it is not caused by them
- **Data exposure flags:** `sealed_test_2022_2024_not_read`

This is a historical reference at municipal scale. The line of yield next to the water results does not mean the scenarios cause or change it.

### Yield — soybean 2027/2028

- **Kind of result:** Historical municipal reference (not a forecast for this harvest)
- **Value:** **3,594 kg/ha**
- **Status of the result:** reference
- **Research status:** historical reference selected
- **Method:** mean of the last five published municipal yields (IBGE PAM)
- **Spatial scale:** municipality — not an estimate for a field
- **Reference years:** 2017–2021
- **Last year of published yield data:** 2021
- **Years between that data and the harvest:** 7
- **When the official data is published:** IBGE PAM data of a year is published by 31 October of the following year
- **Depends on the simulated weather scenarios:** no — the value is the same in every scenario; it is not caused by them
- **Data exposure flags:** `sealed_test_2022_2024_not_read`

This is a historical reference at municipal scale. The line of yield next to the water results does not mean the scenarios cause or change it.

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
| Climatological scenario (historical weather) | 1 September 2026 | 27 January 2028 | blocks of historical years over NASA POWER data |

- Each period uses only the kind of weather named in its row. No source is extended beyond its period.

**Data sources**

| Use | Provider and product | Availability at the cutoff | Period covered by the source file | SHA-256 |
| :--- | :--- | :--- | :--- | :--- |
| Historical weather | NASA POWER — NASA POWER daily point, community AG (rain IMERG\_PRECTOT) | unknown (archived retrospective series; only observations dated up to the cutoff are used) | 1 January 2001 to 31 December 2024 | `1f41a273e1195ad8ec5705629f0016584bc8bb173e03e3870a85947670470964` |
| Observed weather before the cutoff | NASA POWER — NASA POWER daily point, community AG (rain IMERG\_PRECTOT) | unknown (archived retrospective series; only observations dated up to the cutoff are used) | 1 January 2025 to 14 November 2026 | `4f64a150ec26dbad40eed4813542d3b07638fb500814b059890594c9b2f2dac0` |
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

- **Report identifier:** `rep_37227c338eff3787b43eab7c25368760`
- **Facts of this report (SHA-256):** `40b172051d6175ee2550ba5004ab18c9957d59b698c6f6da20ceec053a9dc045`
- **Run file (SHA-256):** `f7ac78e673c6478480152b0fb580968e26c0d37a1711dca9eed07f7f8df8e6d9`
- **Daily series file (SHA-256):** `59e8fb288f357728c037c73e558e9c0a638c544943acaaf7d73ca06ebcfbf968`
- **Scientific identity (SHA-256):** `0ef0f2562258c91c5a13ffff87d666019cfe3ae7f4d726d49a8d4e4d694b62c9`
- **Series content declared by the run (SHA-256):** `040ef7c3a095143489159481dea688e5935b24a43293c5bd3328c6da81cb97a9`

A report in another language of the same run and scope has the same facts hash: only the wording changes.

---

Deterministic report produced by Gaiapus from a saved simulation result. The same run, scope, language and versions always give this text; no number was recalculated to write it. Report rep\_37227c338eff3787b43eab7c25368760 · facts 40b172051d6175ee.
