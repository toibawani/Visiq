/* ===================================================
   VISIQ — SCENARIO VALIDATOR
   Author: Devin
   Hand-written validator with tests for scenario validation
=================================================== */

class ScenarioValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
    }

    /**
     * Validate a scenario object
     * @param {object} scenario - Scenario to validate
     * @returns {object} { valid: boolean, errors: array, warnings: array }
     */
    validate(scenario) {
        this.errors = [];
        this.warnings = [];

        if (!scenario || typeof scenario !== 'object') {
            this.errors.push('Scenario must be an object');
            return { valid: false, errors: this.errors, warnings: this.warnings };
        }

        this.validateId(scenario.id);
        this.validateEngine(scenario.engine);
        this.validateTitle(scenario.title);
        this.validateHook(scenario.hook);
        this.validateChapter(scenario.chapter);
        this.validateTags(scenario.tags);
        this.validateLevel(scenario.level);
        this.validateParams(scenario.params);
        this.validateGoal(scenario.goal);
        this.validatePredict(scenario.predict);
        this.validateWhatHappens(scenario.whatHappens);
        this.validateWhyItHappens(scenario.whyItHappens);
        this.validateLimits(scenario.limits);
        this.validateSources(scenario.sources);
        this.validateReviewStatus(scenario.reviewStatus);

        return {
            valid: this.errors.length === 0,
            errors: this.errors,
            warnings: this.warnings
        };
    }

    validateId(id) {
        if (!id || typeof id !== 'string') {
            this.errors.push('id is required and must be a string');
            return;
        }

        if (!/^[a-z0-9-]{1,50}$/.test(id)) {
            this.errors.push('id must be alphanumeric with hyphens, max 50 chars');
        }
    }

    validateEngine(engine) {
        if (!engine || typeof engine !== 'string') {
            this.errors.push('engine is required and must be a string');
        }
    }

    validateTitle(title) {
        if (!title || typeof title !== 'string') {
            this.errors.push('title is required and must be a string');
            return;
        }

        if (title.length > 60) {
            this.errors.push('title must be under 60 characters');
        }

        if (!title.includes('?')) {
            this.warnings.push('title should be a question (ends with ?)');
        }
    }

    validateHook(hook) {
        if (!hook || typeof hook !== 'string') {
            this.errors.push('hook is required and must be a string');
            return;
        }

        if (hook.length > 120) {
            this.errors.push('hook must be under 120 characters');
        }
    }

    validateChapter(chapter) {
        const validChapters = [
            'Motion',
            'Gravity',
            'Waves',
            'Light',
            'Heat and Matter',
            'Fields',
            'Life',
            'Earth',
            'Chaos and Math',
            'Modern'
        ];

        if (!chapter || typeof chapter !== 'string') {
            this.errors.push('chapter is required and must be a string');
            return;
        }

        if (!validChapters.includes(chapter)) {
            this.errors.push(`chapter must be one of: ${validChapters.join(', ')}`);
        }
    }

    validateTags(tags) {
        if (!Array.isArray(tags)) {
            this.errors.push('tags must be an array');
            return;
        }

        tags.forEach((tag, index) => {
            if (typeof tag !== 'string') {
                this.errors.push(`tags[${index}] must be a string`);
            }
        });
    }

    validateLevel(level) {
        const validLevels = ['Beginner', 'Intermediate', 'Advanced'];

        if (!level || typeof level !== 'string') {
            this.errors.push('level is required and must be a string');
            return;
        }

        if (!validLevels.includes(level)) {
            this.errors.push(`level must be one of: ${validLevels.join(', ')}`);
        }
    }

    validateParams(params) {
        if (!params || typeof params !== 'object') {
            this.errors.push('params is required and must be an object');
            return;
        }

        Object.entries(params).forEach(([name, param]) => {
            if (!param || typeof param !== 'object') {
                this.errors.push(`params.${name} must be an object`);
                return;
            }

            if (typeof param.value !== 'number') {
                this.errors.push(`params.${name}.value must be a number`);
            }

            if (typeof param.min !== 'number') {
                this.errors.push(`params.${name}.min must be a number`);
            }

            if (typeof param.max !== 'number') {
                this.errors.push(`params.${name}.max must be a number`);
            }

            if (typeof param.unit !== 'string') {
                this.errors.push(`params.${name}.unit must be a string`);
            }

            // Check bounds
            if (typeof param.value === 'number' &&
                typeof param.min === 'number' &&
                typeof param.max === 'number') {
                if (param.value < param.min || param.value > param.max) {
                    this.errors.push(`params.${name}.value must be between min and max`);
                }
            }
        });
    }

    validateGoal(goal) {
        if (!goal || typeof goal !== 'string') {
            this.errors.push('goal is required and must be a string');
        }
    }

    validatePredict(predict) {
        if (!predict || typeof predict !== 'object') {
            this.errors.push('predict is required and must be an object');
            return;
        }

        if (!predict.question || typeof predict.question !== 'string') {
            this.errors.push('predict.question is required and must be a string');
        }

        if (!Array.isArray(predict.options) || predict.options.length < 2 || predict.options.length > 4) {
            this.errors.push('predict.options must be an array with 2-4 options');
        } else {
            predict.options.forEach((option, index) => {
                if (typeof option !== 'string') {
                    this.errors.push(`predict.options[${index}] must be a string`);
                }
            });
        }

        if (typeof predict.answer !== 'number') {
            this.errors.push('predict.answer must be a number');
        } else if (Array.isArray(predict.options)) {
            if (predict.answer < 0 || predict.answer >= predict.options.length) {
                this.errors.push('predict.answer must be a valid index in options');
            }
        }

        if (!predict.why || typeof predict.why !== 'string') {
            this.errors.push('predict.why is required and must be a string');
        }
    }

    validateWhatHappens(whatHappens) {
        if (!whatHappens || typeof whatHappens !== 'string') {
            this.errors.push('whatHappens is required and must be a string');
            return;
        }

        const wordCount = whatHappens.split(/\s+/).length;
        if (wordCount < 40 || wordCount > 120) {
            this.errors.push('whatHappens must be 40-120 words');
        }
    }

    validateWhyItHappens(whyItHappens) {
        if (!whyItHappens || typeof whyItHappens !== 'string') {
            this.errors.push('whyItHappens is required and must be a string');
            return;
        }

        const wordCount = whyItHappens.split(/\s+/).length;
        if (wordCount < 40 || wordCount > 120) {
            this.errors.push('whyItHappens must be 40-120 words');
        }
    }

    validateLimits(limits) {
        if (!limits || typeof limits !== 'string') {
            this.errors.push('limits is required and must be a string');
        }
    }

    validateSources(sources) {
        if (!Array.isArray(sources)) {
            this.errors.push('sources must be an array');
            return;
        }

        sources.forEach((source, index) => {
            if (typeof source !== 'string') {
                this.errors.push(`sources[${index}] must be a string`);
            }
        });
    }

    validateReviewStatus(reviewStatus) {
        const validStatuses = ['approved', 'needs-check'];

        if (!reviewStatus || typeof reviewStatus !== 'string') {
            this.errors.push('reviewStatus is required and must be a string');
            return;
        }

        if (!validStatuses.includes(reviewStatus)) {
            this.errors.push(`reviewStatus must be one of: ${validStatuses.join(', ')}`);
        }
    }

    /**
     * Validate multiple scenarios and check for duplicate IDs
     * @param {array} scenarios - Array of scenario objects
     * @returns {object} { valid: boolean, errors: array, warnings: array, duplicates: array }
     */
    validateAll(scenarios) {
        const allErrors = [];
        const allWarnings = [];
        const duplicates = [];

        // Check for duplicate IDs
        const ids = scenarios.map(s => s.id);
        const seen = new Set();
        ids.forEach(id => {
            if (seen.has(id)) {
                duplicates.push(id);
            }
            seen.add(id);
        });

        if (duplicates.length > 0) {
            allErrors.push(`Duplicate scenario IDs: ${duplicates.join(', ')}`);
        }

        // Validate each scenario
        scenarios.forEach((scenario, index) => {
            const result = this.validate(scenario);
            if (!result.valid) {
                allErrors.push(`Scenario ${index} (${scenario.id}): ${result.errors.join(', ')}`);
            }
            allWarnings.push(...result.warnings.map(w => `Scenario ${index} (${scenario.id}): ${w}`));
        });

        return {
            valid: allErrors.length === 0,
            errors: allErrors,
            warnings: allWarnings,
            duplicates
        };
    }
}

// Export for use in build script and tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScenarioValidator;
}
