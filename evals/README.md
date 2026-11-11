# Evals

The agents' own pipeline, run on cases taken from real stops. Two parts run in CI with every test run:

- `tests/evals.test.ts`: questions real portals asked (`src/evals/questions.ts`), answered by the rules for a made-up applicant (`src/evals/sample.ts`). Fails on any harmful answer (a wrong value, a fact only the applicant can give, a made-up security answer shown to them) and on any question that passed before and stops passing.
- `tests/evals-pages.test.ts`: small copies of portal pages where runs stopped, run through the engine in Chromium with no model. Fails when a page that passed before stops passing.

`baseline.json` lists what passes today. It only moves up: when a change makes a new case pass, add its id.

The model part (`/admin/evals`) runs the same questions through the decide pass and the profile check with the real models, and the navigator on its hard cases, and shows the score per model. Run it after changing a prompt or a model.

## Adding a case from a real stop

Every stop now saves the page with typed values removed to the applicant's private folder (`documents/<user>/runner-debug/<application>.html`, next to the screenshot). Rebuild the form's structure in `tests/evals-pages.test.ts` with made-up values, write down what a careful person would do, and add it. Never copy an applicant's details into a case.
