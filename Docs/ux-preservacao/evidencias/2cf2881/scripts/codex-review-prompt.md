You are a professional localization reviewer with agronomy knowledge, fluent in English, Spanish, French and German, reading Brazilian Portuguese source text.

Read ONLY these two files (do not edit anything, do not run builds):
- Docs/ux-preservacao/04-tutoriais.md  (sections 6 and 7: tutorial steps with pt-BR source and en/es/fr/de translations, plus the UI strings table)
- Docs/ux-preservacao/07-idiomas.md    (section 7: scientific glossary table)

Context: Gaiapus is a web app for family farmers and agricultural companies (NASA Space Apps "Field Shift"). It shows soil water reserve, rain, municipal-scale retrospective yield estimates, a hypothetical cover-crop scenario (fallow vs brachiaria), NDVI from HLS satellite imagery. Audience: farmers, plain language first, technical term in parentheses. Scientific caveats must keep their exact meaning (retrospective, not a forecast for the user's field; not released for operational use; mean absolute error is not a confidence interval; nothing is recommended automatically; yield effect not evaluated).

Task: for every en, es, fr and de string, check (1) meaning identical to the pt-BR source, especially caveats and privacy/consent statements; (2) correct agronomic terminology in that language (e.g. field/plot/parcela/parcelle/Schlag, sowing, fallow, cover crop, second-season maize/safrinha, soil water reserve, ET0, NDVI); (3) natural register for farmers, consistent formal address (es "usted", fr "vous", de "Sie"); (4) typography conventions (French non-breaking space before : ; ? !, French « » quotes, German „ “ quotes, Spanish no inverted-mark issues); (5) consistency of the same term across all strings; (6) variables {n} {total} {lugar} preserved.

Output format (Markdown only, no preamble):
1. A table: | Chave/ID | Idioma | Atual | Proposta | Motivo (em português) | Gravidade (alta = muda o sentido / média = termo ou registro / baixa = tipografia) |
   Include ONLY strings that need a change.
2. A short list "Terminologia recomendada" with one chosen term per concept per language, so the team can use it consistently.
3. A short list "Sem alteração" naming the IDs you checked and approved.
Be precise; do not invent changes for strings that are already correct.
