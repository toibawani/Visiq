import { describe, it, expect, beforeEach } from 'vitest';
import ScenarioValidator from '../assets/scenario-validator.js';

describe('ScenarioValidator', () => {
    let validator;

    beforeEach(() => {
        validator = new ScenarioValidator();
    });

    describe('validateId', () => {
        it('should accept valid IDs', () => {
            const result = validator.validateId('projectile-45-degrees');
            expect(validator.errors).toHaveLength(0);
        });

        it('should reject missing ID', () => {
            validator.validateId(null);
            expect(validator.errors).toContain('id is required and must be a string');
        });

        it('should reject invalid characters', () => {
            validator.validateId('Projectile_45');
            expect(validator.errors).toContain('id must be alphanumeric with hyphens, max 50 chars');
        });

        it('should reject IDs over 50 chars', () => {
            validator.validateId('a'.repeat(51));
            expect(validator.errors).toContain('id must be alphanumeric with hyphens, max 50 chars');
        });
    });

    describe('validateTitle', () => {
        it('should accept valid titles', () => {
            validator.validateTitle('What happens when you throw a ball?');
            expect(validator.errors).toHaveLength(0);
        });

        it('should reject titles over 60 chars', () => {
            validator.validateTitle('a'.repeat(61));
            expect(validator.errors).toContain('title must be under 60 characters');
        });

        it('should warn if title is not a question', () => {
            validator.validateTitle('Projectile motion');
            expect(validator.warnings).toContain('title should be a question (ends with ?)');
        });
    });

    describe('validateHook', () => {
        it('should accept valid hooks', () => {
            validator.validateHook('Explore projectile motion with and without air resistance');
            expect(validator.errors).toHaveLength(0);
        });

        it('should reject hooks over 120 chars', () => {
            validator.validateHook('a'.repeat(121));
            expect(validator.errors).toContain('hook must be under 120 characters');
        });
    });

    describe('validateChapter', () => {
        it('should accept valid chapters', () => {
            validator.validateChapter('Motion');
            expect(validator.errors).toHaveLength(0);
        });

        it('should reject invalid chapters', () => {
            validator.validateChapter('Invalid Chapter');
            expect(validator.errors[0]).toMatch(/chapter must be one of:/);
        });
    });

    describe('validateParams', () => {
        it('should accept valid params', () => {
            validator.validateParams({
                angle: { value: 45, min: 0, max: 90, unit: 'deg' }
            });
            expect(validator.errors).toHaveLength(0);
        });

        it('should reject params value out of bounds', () => {
            validator.validateParams({
                angle: { value: 100, min: 0, max: 90, unit: 'deg' }
            });
            expect(validator.errors).toContain('params.angle.value must be between min and max');
        });
    });

    describe('validatePredict', () => {
        it('should accept valid predict', () => {
            validator.validatePredict({
                question: 'Will it land?',
                options: ['Yes', 'No'],
                answer: 0,
                why: 'Because physics'
            });
            expect(validator.errors).toHaveLength(0);
        });

        it('should reject invalid answer index', () => {
            validator.validatePredict({
                question: 'Will it land?',
                options: ['Yes', 'No'],
                answer: 5,
                why: 'Because physics'
            });
            expect(validator.errors).toContain('predict.answer must be a valid index in options');
        });
    });

    describe('validateWhatHappens', () => {
        it('should accept valid whatHappens', () => {
            const text = 'The ball follows a parabolic trajectory under gravity. Air resistance causes it to slow down and fall shorter than predicted. Without air resistance, it follows the ideal projectile motion equations traced by kinematics over time, with range and height determined by launch angle and speed.';
            validator.validateWhatHappens(text);
            expect(validator.errors).toHaveLength(0);
        });

        it('should reject whatHappens under 40 words', () => {
            validator.validateWhatHappens('Short text');
            expect(validator.errors).toContain('whatHappens must be 40-120 words');
        });

        it('should reject whatHappens over 120 words', () => {
            validator.validateWhatHappens('word '.repeat(121));
            expect(validator.errors).toContain('whatHappens must be 40-120 words');
        });
    });

    describe('validateAll', () => {
        it('should detect duplicate IDs', () => {
            const scenarios = [
                { id: 'test', engine: 'test', title: 'Test?', hook: 'Test', chapter: 'Motion', tags: [], level: 'Beginner', params: {}, goal: 'Test', predict: { question: 'Test?', options: ['A', 'B'], answer: 0, why: 'Test' }, whatHappens: 'Test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test', whyItHappens: 'Test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test', limits: 'Test', sources: [], reviewStatus: 'approved' },
                { id: 'test', engine: 'test', title: 'Test?', hook: 'Test', chapter: 'Motion', tags: [], level: 'Beginner', params: {}, goal: 'Test', predict: { question: 'Test?', options: ['A', 'B'], answer: 0, why: 'Test' }, whatHappens: 'Test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test', whyItHappens: 'Test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test test', limits: 'Test', sources: [], reviewStatus: 'approved' }
            ];
            const result = validator.validateAll(scenarios);
            expect(result.valid).toBe(false);
            expect(result.duplicates).toContain('test');
        });
    });
});
