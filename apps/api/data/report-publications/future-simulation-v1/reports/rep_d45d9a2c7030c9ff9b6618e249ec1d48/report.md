# Technical simulation report — Uberlândia, soybean and second-season maize, harvests 2027 and 2028

_Whole run — 4 crop seasons_

## Identification and validity

- **Report:** Technical simulation report, template 1.0.0, texts 1.a53182923b5d
- **Simulation identifier:** `sim_fd61ab4118a4e32398a12156`
- **Place:** Uberlândia (31) — BR:ibge:3170206
- **Spatial scale:** Regional (municipality or county). The results do not describe an individual field.
- **Crop plan:** `soy>maize2` — soybean and second-season maize
- **Scope of this report:** Whole run — 4 crop seasons
- **Simulated period:** 1 January 2025 to 26 June 2028
- **Data cutoff:** 31 August 2026 at 23:59 UTC
- **Simulation issued:** 15 November 2026 at 13:41 UTC
- **Report generated:** 15 November 2026 at 23:13 UTC
- **Kind of result:** Simulation conditional on historical weather
- **Scientific status by component:** weather: climatological scenario; water balance: experimental physical model; crop phases: experimental physical model; yield: reference

**Crop seasons covered by this report**

| Crop | Season | Sowing | Expected harvest | Cycle (days) | Calendar source |
| :--- | :--- | :--- | :--- | ---: | :--- |
| Soybean | 2026/2027 | 5 November 2026 | 27 February 2027 | 115 | fixed state calendar (a hypothesis) |
| Second-season maize | 2027 | 28 February 2027 | 27 June 2027 | 120 | fixed state calendar (a hypothesis) |
| Soybean | 2027/2028 | 5 November 2027 | 27 February 2028 | 115 | fixed state calendar (a hypothesis) |
| Second-season maize | 2028 | 28 February 2028 | 26 June 2028 | 120 | fixed state calendar (a hypothesis) |

The three dates above are different things: the data cutoff is the last moment of the data used; the simulation was issued later; this report was generated from the saved result and changes none of its numbers.

This run explores trajectories under historical climate variability; it is not a daily weather forecast for 2027 and 2028.

## Summary for the producer

### Main results

- Among the 4 crop seasons of this report, second-season maize 2027 has the largest median seasonal crop evapotranspiration deficit: **154.1 mm**, with P10 **101.8 mm** and P90 **210.3 mm**, across 22 scenarios. These values describe simulated water limitation, not a recommended irrigation depth.
- Second-season maize 2027 — at least 10 crop days in the reproductive phase with water stress (Ks \< 1), not necessarily consecutive: **21 of 22 scenarios (95.5%)**. This is a frequency in the simulated scenarios, not a calibrated probability.
- Soybean 2026/2027: historical municipal yield reference of **3,502 kg/ha**, calculated from 2017–2021 data. Second-season maize 2027: historical municipal yield reference of **5,406 kg/ha**, calculated from 2017–2021 data. Soybean 2027/2028: historical municipal yield reference of **3,502 kg/ha**, calculated from 2017–2021 data. Second-season maize 2028: historical municipal yield reference of **5,406 kg/ha**, calculated from 2017–2021 data. A historical reference is independent of the simulated weather scenarios; it is not a yield forecast for a field or for the harvests of this report.

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

Sowing on 5 November 2026; expected harvest on 27 February 2027; cycle of 115 days. Calendar: fixed state calendar (a hypothesis).

**Seasonal statistics across the scenarios — soybean 2026/2027**

| Indicator | Unit | P10 | P50 (median) | P90 | Scenarios (n) |
| :--- | :--- | ---: | ---: | ---: | ---: |
| Precipitation in the crop cycle | mm | 795.9 | 987.1 | 1,100.3 | 22 |
| Crop evapotranspiration demand (ETc) | mm | 429.6 | 438.7 | 491.5 | 22 |
| Actual crop evapotranspiration (ETa) | mm | 400.1 | 421.5 | 436.4 | 22 |
| Crop evapotranspiration deficit (ETc − ETa) | mm | \<0.1 | 13.2 | 74.8 | 22 |
| Mean soil water storage | mm | 38.4 | 43.7 | 46.6 | 22 |
| Days with water stress (Ks \< 1) | days | 0.1 | 9.5 | 22.7 | 22 |
| Days with water stress in the reproductive phase | days | 0.0 | 6.5 | 19.5 | 22 |
| Longest dry spell (consecutive days with rain \< 1 mm) | days | 4.0 | 6.0 | 11.8 | 22 |

- P10, P50 and P90 are quantiles of each indicator across the scenarios. P10 is not always the unfavourable side: a smaller deficit is favourable, a smaller rainfall is not.
- The P10–P90 range is the spread of the simulated scenarios (spread of the climate scenarios only). It is not a calibrated 80% confidence interval.
- ETc is the evapotranspiration demand of the crop under the conditions of the model.
- ETa is the evapotranspiration the model estimates actually happened with the water available.
- The deficit is the seasonal sum of ETc − ETa delivered by the model. It is not rebuilt from the columns: quantiles of different indicators can come from different scenarios, so P50(ETc) − P50(ETa) need not equal P50(deficit).
- Quantiles of day counts are interpolated and can be fractional (9.5 days). No scenario simulated a fraction of a day.
- A value shown as “\<” is positive but below the displayed precision; it is not zero.
- Water stress means the stress coefficient of the model is below 1 (Ks \< 1). It indicates water limitation in the model, not irreversible damage or a percentage of yield loss.

**Events across the scenarios — soybean 2026/2027**

| Event (definition) | Scenarios with the event | Frequency |
| :--- | ---: | ---: |
| At least 10 crop days in the reproductive phase with water stress (Ks \< 1), not necessarily consecutive | 7 of 22 | 31.8% |
| At least one run of 15 consecutive crop days with precipitation below 1 mm per day | 1 of 22 | 4.5% |
| Seasonal sum of ETc − ETa on crop days of at least 100 mm | 2 of 22 | 9.1% |

- Frequency in the simulated scenarios; it is not a calibrated probability. Zero occurrences do not mean the event is impossible. The thresholds are definitions of the simulation protocol, not official management limits.

**Crop phases of the model calendar — soybean 2026/2027**

| Phase | Start | End | Days |
| :--- | :--- | :--- | ---: |
| Establishment | 5 November 2026 | 19 November 2026 | 15 |
| Vegetative | 20 November 2026 | 24 December 2026 | 35 |
| Reproductive | 25 December 2026 | 7 February 2027 | 45 |
| Maturation | 8 February 2027 | 27 February 2027 | 20 |

- Phases are those of the model calendar. They are not growth stages observed in the field and are not more detailed than the model supports.

### Second-season maize — season 2027 (harvest 2027)

Sowing on 28 February 2027; expected harvest on 27 June 2027; cycle of 120 days. Calendar: fixed state calendar (a hypothesis).

Sowing was moved from the regional calendar date (5 January 2027) to 28 February 2027 (second-season maize sown after the previous harvest).

**Seasonal statistics across the scenarios — second-season maize 2027**

| Indicator | Unit | P10 | P50 (median) | P90 | Scenarios (n) |
| :--- | :--- | ---: | ---: | ---: | ---: |
| Precipitation in the crop cycle | mm | 194.2 | 329.5 | 492.9 | 22 |
| Crop evapotranspiration demand (ETc) | mm | 307.8 | 337.8 | 369.4 | 22 |
| Actual crop evapotranspiration (ETa) | mm | 149.2 | 179.1 | 247.3 | 22 |
| Crop evapotranspiration deficit (ETc − ETa) | mm | 101.8 | 154.1 | 210.3 | 22 |
| Mean soil water storage | mm | 20.0 | 25.1 | 31.1 | 22 |
| Days with water stress (Ks \< 1) | days | 43.1 | 59.5 | 70.7 | 22 |
| Days with water stress in the reproductive phase | days | 24.1 | 38.0 | 40.0 | 22 |
| Longest dry spell (consecutive days with rain \< 1 mm) | days | 19.1 | 31.5 | 38.7 | 22 |

- P10, P50 and P90 are quantiles of each indicator across the scenarios. P10 is not always the unfavourable side: a smaller deficit is favourable, a smaller rainfall is not.
- The P10–P90 range is the spread of the simulated scenarios (spread of the climate scenarios only). It is not a calibrated 80% confidence interval.
- ETc is the evapotranspiration demand of the crop under the conditions of the model.
- ETa is the evapotranspiration the model estimates actually happened with the water available.
- The deficit is the seasonal sum of ETc − ETa delivered by the model. It is not rebuilt from the columns: quantiles of different indicators can come from different scenarios, so P50(ETc) − P50(ETa) need not equal P50(deficit).
- Quantiles of day counts are interpolated and can be fractional (59.5 days). No scenario simulated a fraction of a day.
- Water stress means the stress coefficient of the model is below 1 (Ks \< 1). It indicates water limitation in the model, not irreversible damage or a percentage of yield loss.

**Events across the scenarios — second-season maize 2027**

| Event (definition) | Scenarios with the event | Frequency |
| :--- | ---: | ---: |
| At least 10 crop days in the reproductive phase with water stress (Ks \< 1), not necessarily consecutive | 21 of 22 | 95.5% |
| At least one run of 15 consecutive crop days with precipitation below 1 mm per day | 21 of 22 | 95.5% |
| Seasonal sum of ETc − ETa on crop days of at least 100 mm | 20 of 22 | 90.9% |

- Frequency in the simulated scenarios; it is not a calibrated probability. Zero occurrences do not mean the event is impossible. The thresholds are definitions of the simulation protocol, not official management limits.

**Crop phases of the model calendar — second-season maize 2027**

| Phase | Start | End | Days |
| :--- | :--- | :--- | ---: |
| Establishment | 28 February 2027 | 19 March 2027 | 20 |
| Vegetative | 20 March 2027 | 28 April 2027 | 40 |
| Reproductive | 29 April 2027 | 7 June 2027 | 40 |
| Maturation | 8 June 2027 | 27 June 2027 | 20 |

- Phases are those of the model calendar. They are not growth stages observed in the field and are not more detailed than the model supports.

### Soybean — season 2027/2028 (harvest 2028)

Sowing on 5 November 2027; expected harvest on 27 February 2028; cycle of 115 days. Calendar: fixed state calendar (a hypothesis).

**Seasonal statistics across the scenarios — soybean 2027/2028**

| Indicator | Unit | P10 | P50 (median) | P90 | Scenarios (n) |
| :--- | :--- | ---: | ---: | ---: | ---: |
| Precipitation in the crop cycle | mm | 747.3 | 976.0 | 1,058.3 | 22 |
| Crop evapotranspiration demand (ETc) | mm | 430.4 | 439.4 | 501.6 | 22 |
| Actual crop evapotranspiration (ETa) | mm | 402.0 | 422.8 | 443.4 | 22 |
| Crop evapotranspiration deficit (ETc − ETa) | mm | \<0.1 | 16.4 | 76.1 | 22 |
| Mean soil water storage | mm | 37.4 | 43.6 | 46.6 | 22 |
| Days with water stress (Ks \< 1) | days | 0.1 | 11.0 | 23.0 | 22 |
| Days with water stress in the reproductive phase | days | 0.0 | 7.0 | 19.5 | 22 |
| Longest dry spell (consecutive days with rain \< 1 mm) | days | 4.1 | 6.0 | 11.8 | 22 |

- P10, P50 and P90 are quantiles of each indicator across the scenarios. P10 is not always the unfavourable side: a smaller deficit is favourable, a smaller rainfall is not.
- The P10–P90 range is the spread of the simulated scenarios (spread of the climate scenarios only). It is not a calibrated 80% confidence interval.
- ETc is the evapotranspiration demand of the crop under the conditions of the model.
- ETa is the evapotranspiration the model estimates actually happened with the water available.
- The deficit is the seasonal sum of ETc − ETa delivered by the model. It is not rebuilt from the columns: quantiles of different indicators can come from different scenarios, so P50(ETc) − P50(ETa) need not equal P50(deficit).
- Quantiles of day counts are interpolated and can be fractional (0.1 days). No scenario simulated a fraction of a day.
- A value shown as “\<” is positive but below the displayed precision; it is not zero.
- Water stress means the stress coefficient of the model is below 1 (Ks \< 1). It indicates water limitation in the model, not irreversible damage or a percentage of yield loss.

**Events across the scenarios — soybean 2027/2028**

| Event (definition) | Scenarios with the event | Frequency |
| :--- | ---: | ---: |
| At least 10 crop days in the reproductive phase with water stress (Ks \< 1), not necessarily consecutive | 8 of 22 | 36.4% |
| At least one run of 15 consecutive crop days with precipitation below 1 mm per day | 1 of 22 | 4.5% |
| Seasonal sum of ETc − ETa on crop days of at least 100 mm | 2 of 22 | 9.1% |

- Frequency in the simulated scenarios; it is not a calibrated probability. Zero occurrences do not mean the event is impossible. The thresholds are definitions of the simulation protocol, not official management limits.

**Crop phases of the model calendar — soybean 2027/2028**

| Phase | Start | End | Days |
| :--- | :--- | :--- | ---: |
| Establishment | 5 November 2027 | 19 November 2027 | 15 |
| Vegetative | 20 November 2027 | 24 December 2027 | 35 |
| Reproductive | 25 December 2027 | 7 February 2028 | 45 |
| Maturation | 8 February 2028 | 27 February 2028 | 20 |

- Phases are those of the model calendar. They are not growth stages observed in the field and are not more detailed than the model supports.

### Second-season maize — season 2028 (harvest 2028)

Sowing on 28 February 2028; expected harvest on 26 June 2028; cycle of 120 days. Calendar: fixed state calendar (a hypothesis).

Sowing was moved from the regional calendar date (5 January 2028) to 28 February 2028 (second-season maize sown after the previous harvest).

**Seasonal statistics across the scenarios — second-season maize 2028**

| Indicator | Unit | P10 | P50 (median) | P90 | Scenarios (n) |
| :--- | :--- | ---: | ---: | ---: | ---: |
| Precipitation in the crop cycle | mm | 228.8 | 346.6 | 492.9 | 22 |
| Crop evapotranspiration demand (ETc) | mm | 307.8 | 338.3 | 373.9 | 22 |
| Actual crop evapotranspiration (ETa) | mm | 151.2 | 179.1 | 250.1 | 22 |
| Crop evapotranspiration deficit (ETc − ETa) | mm | 101.8 | 154.1 | 226.3 | 22 |
| Mean soil water storage | mm | 20.7 | 25.2 | 31.2 | 22 |
| Days with water stress (Ks \< 1) | days | 44.0 | 59.0 | 67.8 | 22 |
| Days with water stress in the reproductive phase | days | 24.0 | 38.0 | 40.0 | 22 |
| Longest dry spell (consecutive days with rain \< 1 mm) | days | 19.1 | 31.5 | 40.8 | 22 |

- P10, P50 and P90 are quantiles of each indicator across the scenarios. P10 is not always the unfavourable side: a smaller deficit is favourable, a smaller rainfall is not.
- The P10–P90 range is the spread of the simulated scenarios (spread of the climate scenarios only). It is not a calibrated 80% confidence interval.
- ETc is the evapotranspiration demand of the crop under the conditions of the model.
- ETa is the evapotranspiration the model estimates actually happened with the water available.
- The deficit is the seasonal sum of ETc − ETa delivered by the model. It is not rebuilt from the columns: quantiles of different indicators can come from different scenarios, so P50(ETc) − P50(ETa) need not equal P50(deficit).
- Quantiles of day counts are interpolated and can be fractional (31.5 days). No scenario simulated a fraction of a day.
- Water stress means the stress coefficient of the model is below 1 (Ks \< 1). It indicates water limitation in the model, not irreversible damage or a percentage of yield loss.

**Events across the scenarios — second-season maize 2028**

| Event (definition) | Scenarios with the event | Frequency |
| :--- | ---: | ---: |
| At least 10 crop days in the reproductive phase with water stress (Ks \< 1), not necessarily consecutive | 21 of 22 | 95.5% |
| At least one run of 15 consecutive crop days with precipitation below 1 mm per day | 21 of 22 | 95.5% |
| Seasonal sum of ETc − ETa on crop days of at least 100 mm | 20 of 22 | 90.9% |

- Frequency in the simulated scenarios; it is not a calibrated probability. Zero occurrences do not mean the event is impossible. The thresholds are definitions of the simulation protocol, not official management limits.

**Crop phases of the model calendar — second-season maize 2028**

| Phase | Start | End | Days |
| :--- | :--- | :--- | ---: |
| Establishment | 28 February 2028 | 18 March 2028 | 20 |
| Vegetative | 19 March 2028 | 27 April 2028 | 40 |
| Reproductive | 28 April 2028 | 6 June 2028 | 40 |
| Maturation | 7 June 2028 | 26 June 2028 | 20 |

- Phases are those of the model calendar. They are not growth stages observed in the field and are not more detailed than the model supports.

## Supporting charts

Selection rule of the three trajectories: central scenario defined by the protocol; drier and wetter are the scenarios with the largest and the smallest crop deficit.

The drier and wetter trajectories are chosen once for the whole run, not for each season. In a single season the “drier” one can therefore show a smaller deficit than the central one. The central trajectory is one whole simulated scenario. It need not coincide with the median of each day.

The shaded band joins the daily P10 and P90 of all scenarios. It is not a physically coherent trajectory, and its edges are not “the P10 scenario” or “the P90 scenario”. Three trajectories do not represent the whole ensemble: frequencies and quantiles are those of the tables in the previous section, never computed from these three.

**Soil water storage — soybean 2026/2027**

Daily soil water storage from 5 November 2026 to 27 February 2027 for three whole scenarios (central, drier, wetter), over the daily P10–P90 band of all scenarios. The storage capacity is 55 mm. The table below gives the same trajectories in numbers.

**Lowest soil water storage of the three trajectories — soybean 2026/2027**

| Trajectory | Scenario (weather year) | Lowest storage (mm) | Date of lowest storage |
| :--- | :--- | ---: | :--- |
| Central | a2015 (2015) | 13.5 | 27 January 2027 |
| Drier | a2022 (2022) | 25.0 | 25 December 2026 |
| Wetter | a2011 (2011) | 9.4 | 8 February 2027 |

**Cumulative evapotranspiration deficit — soybean 2026/2027**

Cumulative ETc − ETa from 5 November 2026 to 27 February 2027 for the same three scenarios. Each line ends at the seasonal deficit of that scenario. The table below gives the same trajectories in numbers.

**Seasonal deficit of the three trajectories — soybean 2026/2027**

| Trajectory | Scenario (weather year) | Seasonal deficit (mm) |
| :--- | :--- | ---: |
| Central | a2015 (2015) | 10.5 |
| Drier | a2022 (2022) | 0.0 |
| Wetter | a2011 (2011) | 18.8 |

Weather of the days shown: climatological scenario (historical weather) from 5 November 2026 to 27 February 2027.

The charts use the daily resolution of the series (115 days); no point was removed.

**Soil water storage — second-season maize 2027**

Daily soil water storage from 28 February 2027 to 27 June 2027 for three whole scenarios (central, drier, wetter), over the daily P10–P90 band of all scenarios. The storage capacity is 55 mm. The table below gives the same trajectories in numbers.

**Lowest soil water storage of the three trajectories — second-season maize 2027**

| Trajectory | Scenario (weather year) | Lowest storage (mm) | Date of lowest storage |
| :--- | :--- | ---: | :--- |
| Central | a2015 (2015) | 0.1 | 13 May 2027 |
| Drier | a2022 (2022) | 0.1 | 28 May 2027 |
| Wetter | a2011 (2011) | 1.8 | 4 June 2027 |

**Cumulative evapotranspiration deficit — second-season maize 2027**

Cumulative ETc − ETa from 28 February 2027 to 27 June 2027 for the same three scenarios. Each line ends at the seasonal deficit of that scenario. The table below gives the same trajectories in numbers.

**Seasonal deficit of the three trajectories — second-season maize 2027**

| Trajectory | Scenario (weather year) | Seasonal deficit (mm) |
| :--- | :--- | ---: |
| Central | a2015 (2015) | 211.6 |
| Drier | a2022 (2022) | 186.2 |
| Wetter | a2011 (2011) | 58.3 |

Weather of the days shown: climatological scenario (historical weather) from 28 February 2027 to 27 June 2027.

The charts use the daily resolution of the series (120 days); no point was removed.

**Soil water storage — soybean 2027/2028**

Daily soil water storage from 5 November 2027 to 27 February 2028 for three whole scenarios (central, drier, wetter), over the daily P10–P90 band of all scenarios. The storage capacity is 55 mm. The table below gives the same trajectories in numbers.

**Lowest soil water storage of the three trajectories — soybean 2027/2028**

| Trajectory | Scenario (weather year) | Lowest storage (mm) | Date of lowest storage |
| :--- | :--- | ---: | :--- |
| Central | a2015 (2015) | 11.4 | 24 February 2028 |
| Drier | a2022 (2022) | 8.1 | 22 December 2027 |
| Wetter | a2011 (2011) | 10.8 | 6 January 2028 |

**Cumulative evapotranspiration deficit — soybean 2027/2028**

Cumulative ETc − ETa from 5 November 2027 to 27 February 2028 for the same three scenarios. Each line ends at the seasonal deficit of that scenario. The table below gives the same trajectories in numbers.

**Seasonal deficit of the three trajectories — soybean 2027/2028**

| Trajectory | Scenario (weather year) | Seasonal deficit (mm) |
| :--- | :--- | ---: |
| Central | a2015 (2015) | 21.4 |
| Drier | a2022 (2022) | 63.0 |
| Wetter | a2011 (2011) | 26.5 |

Weather of the days shown: climatological scenario (historical weather) from 5 November 2027 to 27 February 2028.

The charts use the daily resolution of the series (115 days); no point was removed.

**Soil water storage — second-season maize 2028**

Daily soil water storage from 28 February 2028 to 26 June 2028 for three whole scenarios (central, drier, wetter), over the daily P10–P90 band of all scenarios. The storage capacity is 55 mm. The table below gives the same trajectories in numbers.

**Lowest soil water storage of the three trajectories — second-season maize 2028**

| Trajectory | Scenario (weather year) | Lowest storage (mm) | Date of lowest storage |
| :--- | :--- | ---: | :--- |
| Central | a2015 (2015) | 0.8 | 15 May 2028 |
| Drier | a2022 (2022) | \<0.1 | 26 June 2028 |
| Wetter | a2011 (2011) | 0.1 | 26 May 2028 |

**Cumulative evapotranspiration deficit — second-season maize 2028**

Cumulative ETc − ETa from 28 February 2028 to 26 June 2028 for the same three scenarios. Each line ends at the seasonal deficit of that scenario. The table below gives the same trajectories in numbers.

**Seasonal deficit of the three trajectories — second-season maize 2028**

| Trajectory | Scenario (weather year) | Seasonal deficit (mm) |
| :--- | :--- | ---: |
| Central | a2015 (2015) | 112.8 |
| Drier | a2022 (2022) | 289.8 |
| Wetter | a2011 (2011) | 121.0 |

Weather of the days shown: climatological scenario (historical weather) from 28 February 2028 to 26 June 2028.

The charts use the daily resolution of the series (120 days); no point was removed.

## Yield, economics and alternatives

Yield is shown as published. Economic results are unavailable in this run.

### Yield — soybean 2026/2027

- **Kind of result:** Historical municipal reference (not a forecast for this harvest)
- **Value:** **3,502 kg/ha**
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

### Yield — second-season maize 2027

- **Kind of result:** Historical municipal reference (not a forecast for this harvest)
- **Value:** **5,406 kg/ha**
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
- **Value:** **3,502 kg/ha**
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

### Yield — second-season maize 2028

- **Kind of result:** Historical municipal reference (not a forecast for this harvest)
- **Value:** **5,406 kg/ha**
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
| 20% | `maize2:2027` | 0 |
| 20% | `maize2:2028` | 0 |
| 20% | `soy:2027` | 0 |
| 20% | `soy:2028` | 0 |
| 90% | `maize2:2027` | 0 |
| 90% | `maize2:2028` | 0 |
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
| Climatological scenario (historical weather) | 1 September 2026 | 26 June 2028 | blocks of historical years over NASA POWER data |

- Each period uses only the kind of weather named in its row. No source is extended beyond its period.

**Data sources**

| Use | Provider and product | Availability at the cutoff | Period covered by the source file | SHA-256 |
| :--- | :--- | :--- | :--- | :--- |
| Historical weather | NASA POWER — NASA POWER daily point, community AG (rain IMERG\_PRECTOT) | unknown (archived retrospective series; only observations dated up to the cutoff are used) | 1 January 2001 to 31 December 2024 | `0b99cc4cc3c9bbb9f2cad1260c1021c7d73189183cb78c65325309c66868a1a8` |
| Observed weather before the cutoff | NASA POWER — NASA POWER daily point, community AG (rain IMERG\_PRECTOT) | unknown (archived retrospective series; only observations dated up to the cutoff are used) | 1 January 2025 to 14 November 2026 | `ade4e7cb60b9a10748a308c48954e447fcb44a92163df07b6ec560bfa31fb405` |
| Reference evapotranspiration (ET0) | FAO-56 Penman-Monteith, daily | not available | not available | not available |

- The period covered by a source file can be longer than the period used. This run uses observed data up to the data cutoff (31 August 2026 at 23:59 UTC) and the weather years listed under “Scenario ensemble”.
- The file of the source “observed weather before the cutoff” covers dates until 14 November 2026, after the data cutoff. That does not show that later dates were used: the periods actually used are those of “Weather by period”.

### Engine, intervals and validation

- **Protocol:** `future_simulation_v1`
- **Engine version:** `crop-simulation-v1`
- **Parameter set:** `gaiapus-fao56-br-v1`
- **Method of the P10–P90 range:** spread of the climate scenarios only
- **Validation:** Experimental results. See the limitations below; the scientific status of each component is in the first section.

**Calendar rules applied**

| Rule | Harvest year | Regional calendar date | Date used |
| :--- | :--- | :--- | :--- |
| second-season maize sown after the previous harvest | 2027 | 5 January 2027 | 28 February 2027 |
| second-season maize sown after the previous harvest | 2028 | 5 January 2028 | 28 February 2028 |

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

- **Report identifier:** `rep_d45d9a2c7030c9ff9b6618e249ec1d48`
- **Facts of this report (SHA-256):** `b76879a1ef2c36f5ec27e44e380a091160ffeac77d217d736c6393368c984654`
- **Run file (SHA-256):** `efbc5cac8dc16fa58eadc423da051705efc8ad21149f9f4e600577b054b14e17`
- **Daily series file (SHA-256):** `d18a7b9a4ba25b42458a40f6cabd57ce760c7ebca37b2e78fbe42fc6067831e4`
- **Scientific identity (SHA-256):** `fd61ab4118a4e32398a12156d4700718438efc18ff73115b003227c7f084b426`
- **Series content declared by the run (SHA-256):** `2d259faf67dbf3024c7a36aa271686371c6579b879bcfe927295ae812d95014e`

A report in another language of the same run and scope has the same facts hash: only the wording changes.

---

Deterministic report produced by Gaiapus from a saved simulation result. The same run, scope, language and versions always give this text; no number was recalculated to write it. Report rep\_d45d9a2c7030c9ff9b6618e249ec1d48 · facts b76879a1ef2c36f5.
