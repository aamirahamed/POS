import { describe, it, expect } from 'vitest';
import { evaluate, checksOut } from './arith.ts';

describe('evaluate', () => {
    it('follows precedence and parentheses', () => {
        expect(evaluate('2 + 3 * 4')).toBe(14);
        expect(evaluate('(2 + 3) * 4')).toBe(20);
        expect(evaluate('2 ^ 3 ^ 2')).toBe(512); // right-associative
        expect(evaluate('-3 + 5')).toBe(2);
        expect(evaluate('10 - 4 - 3')).toBe(3); // left-associative
    });

    it('handles the sample answer keys', () => {
        expect(evaluate('(4.4 - 4.0) / 4.0 * 100')).toBeCloseTo(10);
        expect(evaluate('95 / (95 + 990) * 100')).toBeCloseTo(8.756, 3);
        expect(evaluate('0.3 * 500')).toBe(150);
    });

    it('accepts thousands separators and typographic operators', () => {
        expect(evaluate('1,085 × 2')).toBe(2170);
        expect(evaluate('9 ÷ 3 − 1')).toBe(2);
    });

    it('supports the allowed functions', () => {
        expect(evaluate('sqrt(16) + abs(-2)')).toBe(6);
        expect(evaluate('ln(exp(2))')).toBeCloseTo(2);
        expect(evaluate('log10(1000)')).toBeCloseTo(3);
    });

    it('rejects anything that is not arithmetic', () => {
        expect(() => evaluate('alert(1)')).toThrow(/Unknown function/);
        expect(() => evaluate('process.exit()')).toThrow();
        expect(() => evaluate('2 +')).toThrow();
        expect(() => evaluate('1 / 0')).toThrow(/Division by zero/);
        expect(() => evaluate('(1 + 2')).toThrow(/Expected \)/);
    });
});

describe('checksOut', () => {
    it('accepts a stated answer within tolerance and rejects a wrong one', () => {
        expect(checksOut('95 / 1085 * 100', 8.8, 0.1)).toBe(true);
        expect(checksOut('95 / 1085 * 100', 9.5, 0.1)).toBe(false); // a typical model slip
        expect(checksOut('not maths', 1, 1)).toBe(false);
    });
});
