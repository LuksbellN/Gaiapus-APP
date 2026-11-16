# Technical simulation report — Rio Verde, soybean and second-season maize, harvests 2027 and 2028

_Whole run — 4 crop seasons_

## Identification and validity

- **Report:** Technical simulation report, template 1.0.0, texts 1.b5267b3fe207
- **Simulation identifier:** `sim_e269df77be6e76cb588194fc`
- **Place:** Rio Verde (52) — BR:ibge:5218805
- **Spatial scale:** Regional (municipality or county). The results do not describe an individual field.
- **Crop plan:** `soy>maize2` — soybean and second-season maize
- **Scope of this report:** Whole run — 4 crop seasons
- **Simulated period:** 1 January 2025 to 15 June 2028
- **Data cutoff:** 31 August 2026 at 23:59 UTC
- **Simulation issued:** 15 November 2026 at 13:41 UTC
- **Report generated:** 15 November 2026 at 23:40 UTC
- **Kind of result:** Simulation conditional on historical weather
- **Scientific status by component:** weather: climatological scenario; water balance: experimental physical model; crop phases: experimental physical model; yield: unavailable

**Crop seasons covered by this report**

| Crop | Season | Sowing | Expected harvest | Cycle (days) | Calendar source |
| :--- | :--- | :--- | :--- | ---: | :--- |
| Soybean | 2026/2027 | 25 October 2026 | 16 February 2027 | 115 | fixed state calendar (a hypothesis) |
| Second-season maize | 2027 | 17 February 2027 | 16 June 2027 | 120 | fixed state calendar (a hypothesis) |
| Soybean | 2027/2028 | 25 October 2027 | 16 February 2028 | 115 | fixed state calendar (a hypothesis) |
| Second-season maize | 2028 | 17 February 2028 | 15 June 2028 | 120 | fixed state calendar (a hypothesis) |

The three dates above are different things: the data cutoff is the last moment of the data used; the simulation was issued later; this report was generated from the saved result and changes none of its numbers.

This run explores trajectories under historical climate variability; it is not a daily weather forecast for 2027 and 2028.

## Summary for the producer

### Main results

- Among the 4 crop seasons of this report, second-season maize 2027 has the largest median seasonal crop evapotranspiration deficit: **117.9 mm**, with P10 **67.5 mm** and P90 **171.7 mm**, across 22 scenarios. These values describe simulated water limitation, not a recommended irrigation depth.
- Second-season maize 2027 — at least 10 crop days in the reproductive phase with water stress (Ks \< 1), not necessarily consecutive: **20 of 22 scenarios (90.9%)**. This is a frequency in the simulated scenarios, not a calibrated probability.
- Yield is unavailable for soybean 2026/2027, second-season maize 2027, soybean 2027/2028 and second-season maize 2028: data source unavailable. No substitute value is shown.

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

Sowing on 25 October 2026; expected harvest on 16 February 2027; cycle of 115 days. Calendar: fixed state calendar (a hypothesis).

**Seasonal statistics across the scenarios — soybean 2026/2027**

| Indicator | Unit | P10 | P50 (median) | P90 | Scenarios (n) |
| :--- | :--- | ---: | ---: | ---: | ---: |
| Precipitation in the crop cycle | mm | 778.3 | 875.9 | 1,012.8 | 22 |
| Crop evapotranspiration demand (ETc) | mm | 417.8 | 430.8 | 459.9 | 22 |
| Actual crop evapotranspiration (ETa) | mm | 404.3 | 420.8 | 434.4 | 22 |
| Crop evapotranspiration deficit (ETc − ETa) | mm | 0.7 | 7.2 | 43.3 | 22 |
| Mean soil water storage | mm | 38.6 | 44.4 | 47.2 | 22 |
| Days with water stress (Ks \< 1) | days | 1.1 | 5.5 | 21.6 | 22 |
| Days with water stress in the reproductive phase | days | 0.0 | 4.5 | 18.9 | 22 |
| Longest dry spell in the crop cycle | days | 4.0 | 5.0 | 8.0 | 22 |

- P10, P50 and P90 are quantiles of each indicator across the scenarios. P10 is the low end of that indicator, not a “bad scenario”: for the deficit, the low end is the side with less water limitation.
- The P10–P90 range is the spread of the simulated scenarios (spread of the climate scenarios only). It is not a calibrated 80% confidence interval.
- ETc is the evapotranspiration demand of the crop under the conditions of the model.
- ETa is the evapotranspiration the model estimates actually happened with the water available.
- The deficit is the seasonal sum of ETc − ETa delivered by the model. It is not rebuilt from the columns: quantiles of different indicators can come from different scenarios, so P50(ETc) − P50(ETa) need not equal P50(deficit).
- Quantiles of day counts are interpolated and can be fractional (5.5 days). No scenario simulated a fraction of a day.
- Water stress means the stress coefficient of the model is below 1 (Ks \< 1). It indicates water limitation in the model, not irreversible damage or a percentage of yield loss.

**Events across the scenarios — soybean 2026/2027**

| Event (definition) | Scenarios with the event | Frequency |
| :--- | ---: | ---: |
| At least 10 crop days in the reproductive phase with water stress (Ks \< 1), not necessarily consecutive | 6 of 22 | 27.3% |
| At least one run of 15 consecutive crop days with precipitation below 1 mm per day | 0 of 22 | 0.0% |
| Seasonal sum of ETc − ETa on crop days of at least 100 mm | 0 of 22 | 0.0% |

- Frequency in the simulated scenarios; it is not a calibrated probability. Zero occurrences do not mean the event is impossible. The thresholds are definitions of the simulation protocol, not official management limits.

**Crop phases of the model calendar — soybean 2026/2027**

| Phase | Start | End | Days |
| :--- | :--- | :--- | ---: |
| Establishment | 25 October 2026 | 8 November 2026 | 15 |
| Vegetative | 9 November 2026 | 13 December 2026 | 35 |
| Reproductive | 14 December 2026 | 27 January 2027 | 45 |
| Maturation | 28 January 2027 | 16 February 2027 | 20 |

- Phases are those of the model calendar. They are not growth stages observed in the field and are not more detailed than the model supports.

### Second-season maize — season 2027 (harvest 2027)

Sowing on 17 February 2027; expected harvest on 16 June 2027; cycle of 120 days. Calendar: fixed state calendar (a hypothesis).

Sowing was moved from the regional calendar date (1 February 2027) to 17 February 2027 (second-season maize sown after the previous harvest).

**Seasonal statistics across the scenarios — second-season maize 2027**

| Indicator | Unit | P10 | P50 (median) | P90 | Scenarios (n) |
| :--- | :--- | ---: | ---: | ---: | ---: |
| Precipitation in the crop cycle | mm | 362.2 | 481.5 | 664.4 | 22 |
| Crop evapotranspiration demand (ETc) | mm | 316.4 | 337.2 | 359.2 | 22 |
| Actual crop evapotranspiration (ETa) | mm | 171.7 | 215.6 | 252.3 | 22 |
| Crop evapotranspiration deficit (ETc − ETa) | mm | 67.5 | 117.9 | 171.7 | 22 |
| Mean soil water storage | mm | 23.9 | 29.2 | 33.3 | 22 |
| Days with water stress (Ks \< 1) | days | 33.8 | 50.5 | 65.0 | 22 |
| Days with water stress in the reproductive phase | days | 21.2 | 31.0 | 39.7 | 22 |
| Longest dry spell in the crop cycle | days | 14.1 | 23.0 | 31.6 | 22 |

- P10, P50 and P90 are quantiles of each indicator across the scenarios. P10 is the low end of that indicator, not a “bad scenario”: for the deficit, the low end is the side with less water limitation.
- The P10–P90 range is the spread of the simulated scenarios (spread of the climate scenarios only). It is not a calibrated 80% confidence interval.
- ETc is the evapotranspiration demand of the crop under the conditions of the model.
- ETa is the evapotranspiration the model estimates actually happened with the water available.
- The deficit is the seasonal sum of ETc − ETa delivered by the model. It is not rebuilt from the columns: quantiles of different indicators can come from different scenarios, so P50(ETc) − P50(ETa) need not equal P50(deficit).
- Quantiles of day counts are interpolated and can be fractional (50.5 days). No scenario simulated a fraction of a day.
- Water stress means the stress coefficient of the model is below 1 (Ks \< 1). It indicates water limitation in the model, not irreversible damage or a percentage of yield loss.

**Events across the scenarios — second-season maize 2027**

| Event (definition) | Scenarios with the event | Frequency |
| :--- | ---: | ---: |
| At least 10 crop days in the reproductive phase with water stress (Ks \< 1), not necessarily consecutive | 20 of 22 | 90.9% |
| At least one run of 15 consecutive crop days with precipitation below 1 mm per day | 19 of 22 | 86.4% |
| Seasonal sum of ETc − ETa on crop days of at least 100 mm | 16 of 22 | 72.7% |

- Frequency in the simulated scenarios; it is not a calibrated probability. Zero occurrences do not mean the event is impossible. The thresholds are definitions of the simulation protocol, not official management limits.

**Crop phases of the model calendar — second-season maize 2027**

| Phase | Start | End | Days |
| :--- | :--- | :--- | ---: |
| Establishment | 17 February 2027 | 8 March 2027 | 20 |
| Vegetative | 9 March 2027 | 17 April 2027 | 40 |
| Reproductive | 18 April 2027 | 27 May 2027 | 40 |
| Maturation | 28 May 2027 | 16 June 2027 | 20 |

- Phases are those of the model calendar. They are not growth stages observed in the field and are not more detailed than the model supports.

### Soybean — season 2027/2028 (harvest 2028)

Sowing on 25 October 2027; expected harvest on 16 February 2028; cycle of 115 days. Calendar: fixed state calendar (a hypothesis).

**Seasonal statistics across the scenarios — soybean 2027/2028**

| Indicator | Unit | P10 | P50 (median) | P90 | Scenarios (n) |
| :--- | :--- | ---: | ---: | ---: | ---: |
| Precipitation in the crop cycle | mm | 730.4 | 860.4 | 1,001.1 | 22 |
| Crop evapotranspiration demand (ETc) | mm | 420.5 | 432.9 | 467.4 | 22 |
| Actual crop evapotranspiration (ETa) | mm | 405.0 | 421.9 | 448.2 | 22 |
| Crop evapotranspiration deficit (ETc − ETa) | mm | 0.8 | 9.5 | 47.8 | 22 |
| Mean soil water storage | mm | 38.4 | 43.8 | 47.2 | 22 |
| Days with water stress (Ks \< 1) | days | 2.0 | 6.5 | 25.6 | 22 |
| Days with water stress in the reproductive phase | days | 0.0 | 5.0 | 19.0 | 22 |
| Longest dry spell in the crop cycle | days | 4.0 | 5.0 | 8.0 | 22 |

- P10, P50 and P90 are quantiles of each indicator across the scenarios. P10 is the low end of that indicator, not a “bad scenario”: for the deficit, the low end is the side with less water limitation.
- The P10–P90 range is the spread of the simulated scenarios (spread of the climate scenarios only). It is not a calibrated 80% confidence interval.
- ETc is the evapotranspiration demand of the crop under the conditions of the model.
- ETa is the evapotranspiration the model estimates actually happened with the water available.
- The deficit is the seasonal sum of ETc − ETa delivered by the model. It is not rebuilt from the columns: quantiles of different indicators can come from different scenarios, so P50(ETc) − P50(ETa) need not equal P50(deficit).
- Quantiles of day counts are interpolated and can be fractional (6.5 days). No scenario simulated a fraction of a day.
- Water stress means the stress coefficient of the model is below 1 (Ks \< 1). It indicates water limitation in the model, not irreversible damage or a percentage of yield loss.

**Events across the scenarios — soybean 2027/2028**

| Event (definition) | Scenarios with the event | Frequency |
| :--- | ---: | ---: |
| At least 10 crop days in the reproductive phase with water stress (Ks \< 1), not necessarily consecutive | 7 of 22 | 31.8% |
| At least one run of 15 consecutive crop days with precipitation below 1 mm per day | 0 of 22 | 0.0% |
| Seasonal sum of ETc − ETa on crop days of at least 100 mm | 0 of 22 | 0.0% |

- Frequency in the simulated scenarios; it is not a calibrated probability. Zero occurrences do not mean the event is impossible. The thresholds are definitions of the simulation protocol, not official management limits.

**Crop phases of the model calendar — soybean 2027/2028**

| Phase | Start | End | Days |
| :--- | :--- | :--- | ---: |
| Establishment | 25 October 2027 | 8 November 2027 | 15 |
| Vegetative | 9 November 2027 | 13 December 2027 | 35 |
| Reproductive | 14 December 2027 | 27 January 2028 | 45 |
| Maturation | 28 January 2028 | 16 February 2028 | 20 |

- Phases are those of the model calendar. They are not growth stages observed in the field and are not more detailed than the model supports.

### Second-season maize — season 2028 (harvest 2028)

Sowing on 17 February 2028; expected harvest on 15 June 2028; cycle of 120 days. Calendar: fixed state calendar (a hypothesis).

Sowing was moved from the regional calendar date (1 February 2028) to 17 February 2028 (second-season maize sown after the previous harvest).

**Seasonal statistics across the scenarios — second-season maize 2028**

| Indicator | Unit | P10 | P50 (median) | P90 | Scenarios (n) |
| :--- | :--- | ---: | ---: | ---: | ---: |
| Precipitation in the crop cycle | mm | 368.6 | 498.0 | 664.4 | 22 |
| Crop evapotranspiration demand (ETc) | mm | 316.4 | 337.6 | 361.4 | 22 |
| Actual crop evapotranspiration (ETa) | mm | 174.9 | 216.3 | 252.7 | 22 |
| Crop evapotranspiration deficit (ETc − ETa) | mm | 67.5 | 117.9 | 178.7 | 22 |
| Mean soil water storage | mm | 24.2 | 29.4 | 33.4 | 22 |
| Days with water stress (Ks \< 1) | days | 33.8 | 50.5 | 64.8 | 22 |
| Days with water stress in the reproductive phase | days | 21.2 | 31.0 | 38.9 | 22 |
| Longest dry spell in the crop cycle | days | 14.1 | 23.0 | 32.9 | 22 |

- P10, P50 and P90 are quantiles of each indicator across the scenarios. P10 is the low end of that indicator, not a “bad scenario”: for the deficit, the low end is the side with less water limitation.
- The P10–P90 range is the spread of the simulated scenarios (spread of the climate scenarios only). It is not a calibrated 80% confidence interval.
- ETc is the evapotranspiration demand of the crop under the conditions of the model.
- ETa is the evapotranspiration the model estimates actually happened with the water available.
- The deficit is the seasonal sum of ETc − ETa delivered by the model. It is not rebuilt from the columns: quantiles of different indicators can come from different scenarios, so P50(ETc) − P50(ETa) need not equal P50(deficit).
- Quantiles of day counts are interpolated and can be fractional (50.5 days). No scenario simulated a fraction of a day.
- Water stress means the stress coefficient of the model is below 1 (Ks \< 1). It indicates water limitation in the model, not irreversible damage or a percentage of yield loss.

**Events across the scenarios — second-season maize 2028**

| Event (definition) | Scenarios with the event | Frequency |
| :--- | ---: | ---: |
| At least 10 crop days in the reproductive phase with water stress (Ks \< 1), not necessarily consecutive | 20 of 22 | 90.9% |
| At least one run of 15 consecutive crop days with precipitation below 1 mm per day | 19 of 22 | 86.4% |
| Seasonal sum of ETc − ETa on crop days of at least 100 mm | 16 of 22 | 72.7% |

- Frequency in the simulated scenarios; it is not a calibrated probability. Zero occurrences do not mean the event is impossible. The thresholds are definitions of the simulation protocol, not official management limits.

**Crop phases of the model calendar — second-season maize 2028**

| Phase | Start | End | Days |
| :--- | :--- | :--- | ---: |
| Establishment | 17 February 2028 | 7 March 2028 | 20 |
| Vegetative | 8 March 2028 | 16 April 2028 | 40 |
| Reproductive | 17 April 2028 | 26 May 2028 | 40 |
| Maturation | 27 May 2028 | 15 June 2028 | 20 |

- Phases are those of the model calendar. They are not growth stages observed in the field and are not more detailed than the model supports.

## Supporting charts

Selection rule of the three trajectories: central scenario defined by the protocol; drier and wetter are the scenarios with the largest and the smallest crop deficit.

The drier and wetter trajectories are chosen once for the whole run, not for each season. In a single season the “drier” one can therefore show a smaller deficit than the central one. The central trajectory is one whole simulated scenario. It need not coincide with the median of each day.

The shaded band joins the daily P10 and P90 of all scenarios. It is not a physically coherent trajectory, and its edges are not “the P10 scenario” or “the P90 scenario”. Three trajectories do not represent the whole ensemble: frequencies and quantiles are those of the tables in the previous section, never computed from these three.

**Soil water storage — soybean 2026/2027**

Daily soil water storage from 25 October 2026 to 16 February 2027 for three whole scenarios (central, drier, wetter), over the daily P10–P90 band of all scenarios. The storage capacity is 55 mm. The table below gives the same trajectories in numbers.

**Lowest soil water storage of the three trajectories — soybean 2026/2027**

| Trajectory | Scenario (weather year) | Lowest storage (mm) | Date of lowest storage |
| :--- | :--- | ---: | :--- |
| Central | a2001 (2001) | 20.9 | 26 January 2027 |
| Drier | a2022 (2022) | 13.2 | 2 December 2026 |
| Wetter | a2011 (2011) | 17.2 | 8 February 2027 |

**Cumulative evapotranspiration deficit — soybean 2026/2027**

Cumulative ETc − ETa from 25 October 2026 to 16 February 2027 for the same three scenarios. Each line ends at the seasonal deficit of that scenario. The table below gives the same trajectories in numbers.

**Seasonal deficit of the three trajectories — soybean 2026/2027**

| Trajectory | Scenario (weather year) | Seasonal deficit (mm) |
| :--- | :--- | ---: |
| Central | a2001 (2001) | 0.8 |
| Drier | a2022 (2022) | 6.5 |
| Wetter | a2011 (2011) | 2.7 |

Weather of the days shown: climatological scenario (historical weather) from 25 October 2026 to 16 February 2027.

The charts use the daily resolution of the series (115 days); no point was removed.

**Soil water storage — second-season maize 2027**

Daily soil water storage from 17 February 2027 to 16 June 2027 for three whole scenarios (central, drier, wetter), over the daily P10–P90 band of all scenarios. The storage capacity is 55 mm. The table below gives the same trajectories in numbers.

**Lowest soil water storage of the three trajectories — second-season maize 2027**

| Trajectory | Scenario (weather year) | Lowest storage (mm) | Date of lowest storage |
| :--- | :--- | ---: | :--- |
| Central | a2001 (2001) | 0.7 | 2 May 2027 |
| Drier | a2022 (2022) | \<0.1 | 28 May 2027 |
| Wetter | a2011 (2011) | 7.0 | 12 May 2027 |

**Cumulative evapotranspiration deficit — second-season maize 2027**

Cumulative ETc − ETa from 17 February 2027 to 16 June 2027 for the same three scenarios. Each line ends at the seasonal deficit of that scenario. The table below gives the same trajectories in numbers.

**Seasonal deficit of the three trajectories — second-season maize 2027**

| Trajectory | Scenario (weather year) | Seasonal deficit (mm) |
| :--- | :--- | ---: |
| Central | a2001 (2001) | 172.5 |
| Drier | a2022 (2022) | 156.9 |
| Wetter | a2011 (2011) | 11.5 |

Weather of the days shown: climatological scenario (historical weather) from 17 February 2027 to 16 June 2027.

The charts use the daily resolution of the series (120 days); no point was removed.

**Soil water storage — soybean 2027/2028**

Daily soil water storage from 25 October 2027 to 16 February 2028 for three whole scenarios (central, drier, wetter), over the daily P10–P90 band of all scenarios. The storage capacity is 55 mm. The table below gives the same trajectories in numbers.

**Lowest soil water storage of the three trajectories — soybean 2027/2028**

| Trajectory | Scenario (weather year) | Lowest storage (mm) | Date of lowest storage |
| :--- | :--- | ---: | :--- |
| Central | a2001 (2001) | 20.7 | 24 December 2027 |
| Drier | a2022 (2022) | 5.1 | 17 December 2027 |
| Wetter | a2011 (2011) | 9.8 | 2 January 2028 |

**Cumulative evapotranspiration deficit — soybean 2027/2028**

Cumulative ETc − ETa from 25 October 2027 to 16 February 2028 for the same three scenarios. Each line ends at the seasonal deficit of that scenario. The table below gives the same trajectories in numbers.

**Seasonal deficit of the three trajectories — soybean 2027/2028**

| Trajectory | Scenario (weather year) | Seasonal deficit (mm) |
| :--- | :--- | ---: |
| Central | a2001 (2001) | 1.0 |
| Drier | a2022 (2022) | 67.7 |
| Wetter | a2011 (2011) | 23.9 |

Weather of the days shown: climatological scenario (historical weather) from 25 October 2027 to 16 February 2028.

The charts use the daily resolution of the series (115 days); no point was removed.

**Soil water storage — second-season maize 2028**

Daily soil water storage from 17 February 2028 to 15 June 2028 for three whole scenarios (central, drier, wetter), over the daily P10–P90 band of all scenarios. The storage capacity is 55 mm. The table below gives the same trajectories in numbers.

**Lowest soil water storage of the three trajectories — second-season maize 2028**

| Trajectory | Scenario (weather year) | Lowest storage (mm) | Date of lowest storage |
| :--- | :--- | ---: | :--- |
| Central | a2001 (2001) | 0.4 | 21 May 2028 |
| Drier | a2022 (2022) | \<0.1 | 15 June 2028 |
| Wetter | a2011 (2011) | 0.2 | 22 May 2028 |

**Cumulative evapotranspiration deficit — second-season maize 2028**

Cumulative ETc − ETa from 17 February 2028 to 15 June 2028 for the same three scenarios. Each line ends at the seasonal deficit of that scenario. The table below gives the same trajectories in numbers.

**Seasonal deficit of the three trajectories — second-season maize 2028**

| Trajectory | Scenario (weather year) | Seasonal deficit (mm) |
| :--- | :--- | ---: |
| Central | a2001 (2001) | 97.7 |
| Drier | a2022 (2022) | 191.8 |
| Wetter | a2011 (2011) | 104.4 |

Weather of the days shown: climatological scenario (historical weather) from 17 February 2028 to 15 June 2028.

The charts use the daily resolution of the series (120 days); no point was removed.

## Yield, economics and alternatives

Neither yield nor economic results are available in this run.

### Yield — soybean 2026/2027

Yield unavailable: data source unavailable. No substitute value is shown. A yield appears here only when a later publication provides one for this place and crop.

### Yield — second-season maize 2027

Yield unavailable: data source unavailable. No substitute value is shown. A yield appears here only when a later publication provides one for this place and crop.

### Yield — soybean 2027/2028

Yield unavailable: data source unavailable. No substitute value is shown. A yield appears here only when a later publication provides one for this place and crop.

### Yield — second-season maize 2028

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
| Climatological scenario (historical weather) | 1 September 2026 | 15 June 2028 | blocks of historical years over NASA POWER data |

- Each period uses only the kind of weather named in its row. No source is extended beyond its period.

**Data sources**

| Use | Provider and product | Availability at the cutoff | Period covered by the source file | SHA-256 |
| :--- | :--- | :--- | :--- | :--- |
| Historical weather | NASA POWER — NASA POWER daily point, community AG (rain IMERG\_PRECTOT) | unknown (archived retrospective series; only observations dated up to the cutoff are used) | 1 January 2001 to 31 December 2024 | `c585ec66007ecd2022013d2d6493376d07b2cd7244cd78142f0c2d9866a8dc9a` |
| Observed weather before the cutoff | NASA POWER — NASA POWER daily point, community AG (rain IMERG\_PRECTOT) | unknown (archived retrospective series; only observations dated up to the cutoff are used) | 1 January 2025 to 14 November 2026 | `d04d61718d15a5a002dd78d41c9a36d30fea01c7235c2cc30ed9a90f9b70c3ee` |
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
| second-season maize sown after the previous harvest | 2027 | 1 February 2027 | 17 February 2027 |
| second-season maize sown after the previous harvest | 2028 | 1 February 2028 | 17 February 2028 |

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

- **Report identifier:** `rep_f087e674a7057366ac19090a0c4cd39d`
- **Facts of this report (SHA-256):** `a37bfe5d72b26453d12e83267aaf6fcdab68318339aaa31d35a5b435b314910d`
- **Run file (SHA-256):** `dfddb67b89f29a5f3ecb8c8125cb9ca6907cebcc45150372bfb0eff3482b0182`
- **Daily series file (SHA-256):** `7fb65a1bc733e3223cfd16f66c6fdc18007fcfe392851b54bd5f342041aec02a`
- **Scientific identity (SHA-256):** `e269df77be6e76cb588194fc198bf9a017d9a2f12845a639a8c3835cad193f4d`
- **Series content declared by the run (SHA-256):** `fc04785d7cfb9ca2c797609d21b43948c1463a88e823e8ace9b62a1734b946f4`

A report in another language of the same run and scope has the same facts hash: only the wording changes.

---

Deterministic report produced by Gaiapus from a saved simulation result. The same run, scope, language and versions always give this text; no number was recalculated to write it. Report rep\_f087e674a7057366ac19090a0c4cd39d · facts a37bfe5d72b26453.
