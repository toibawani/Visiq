# Scenarios Directory

This directory contains scenario JSON files for the VISIQ simulation factory.

## Scenario Schema

Each scenario is a JSON file with the following structure:

```json
{
  "id": "string (unique identifier, alphanumeric with hyphens, max 50 chars)",
  "engine": "string (engine module name)",
  "title": "string (a question, under 60 chars)",
  "hook": "string (under 120 characters)",
  "chapter": "string (one of: Motion, Gravity, Waves, Light, Heat and Matter, Fields, Life, Earth, Chaos and Math, Modern)",
  "tags": ["string array"],
  "level": "string (Beginner, Intermediate, Advanced)",
  "params": {
    "paramName": {
      "value": number,
      "min": number,
      "max": number,
      "unit": "string"
    }
  },
  "goal": "string (what the user should discover)",
  "predict": {
    "question": "string (the prediction question)",
    "options": ["string array (2-4 options)"],
    "answer": number (index of correct option),
    "why": "string (explanation)"
  },
  "whatHappens": "string (40-120 words)",
  "whyItHappens": "string (40-120 words)",
  "limits": "string (where the model breaks down)",
  "sources": ["string array (source URLs or citations)"],
  "reviewStatus": "string (approved, needs-check)"
}
```

## Validation Rules

- `id` must be unique across all scenarios
- `id` must match pattern: `^[a-z0-9-]{1,50}$`
- `params` values must be within min/max bounds
- `predict.answer` must be a valid index in `options`
- `whatHappens` and `whyItHappens` must be 40-120 words
- `reviewStatus` "needs-check" scenarios are hidden from the site
- All required fields must be present
- Banned words: "AI", "artificial intelligence", "machine learning" (unless in technical context)

## File Naming

Scenario files should be named after their ID: `{id}.json`

Example: `projectile-45-degrees.json`

## Adding a Scenario

1. Create a new JSON file in this directory
2. Follow the schema above
3. Run `npm run build-manifest` to regenerate the manifest
4. Run `npm run gate` to validate the scenario
5. Commit the scenario file

## Engine Modules

Engine modules are in `engines/` (to be created). Each engine implements:
- `metadata`: engine info (name, version, description)
- `paramsSchema`: parameter definitions with bounds and units
- `init(params)`: initialize simulation state
- `step(state, dt)`: pure fixed-timestep step function (testable headless)
- `draw(state, canvas)`: render to canvas
- `telemetry(state)`: return telemetry data
- `describe(state)`: return human-readable description
