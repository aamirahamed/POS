// A small arithmetic evaluator for checking agent-written answer keys. Supports numbers, + - * / ^,
// parentheses, unary minus, and sqrt/ln/log10/exp/abs/round. It parses; it never executes code.

const FUNCTIONS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt,
  ln: Math.log,
  log10: Math.log10,
  exp: Math.exp,
  abs: Math.abs,
  round: Math.round,
};

export const evaluate = (expression: string): number => {
  const src = expression.replace(/,/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  let i = 0;

  const peek = () => src[i];
  const skip = () => { while (src[i] === ' ') i++; };
  const fail = (msg: string): never => { throw new Error(`${msg} at position ${i} in "${expression}"`); };

  // expr := term (('+'|'-') term)*
  const expr = (): number => {
    let v = term();
    for (skip(); peek() === '+' || peek() === '-'; skip()) {
      const op = src[i++];
      const r = term();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };

  // term := power (('*'|'/') power)*
  const term = (): number => {
    let v = power();
    for (skip(); peek() === '*' || peek() === '/'; skip()) {
      const op = src[i++];
      const r = power();
      if (op === '/' && r === 0) fail('Division by zero');
      v = op === '*' ? v * r : v / r;
    }
    return v;
  };

  // power := unary ('^' power)?   (right-associative)
  const power = (): number => {
    const base = unary();
    skip();
    if (peek() === '^') { i++; return Math.pow(base, power()); }
    return base;
  };

  // unary := '-' unary | primary
  const unary = (): number => {
    skip();
    if (peek() === '-') { i++; return -unary(); }
    if (peek() === '+') { i++; return unary(); }
    return primary();
  };

  // primary := number | name '(' expr ')' | '(' expr ')'
  const primary = (): number => {
    skip();
    if (peek() === '(') {
      i++;
      const v = expr();
      skip();
      if (peek() !== ')') fail('Expected )');
      i++;
      return v;
    }
    const name = /^[a-z][a-z0-9]*/.exec(src.slice(i))?.[0];
    if (name) {
      const fn = FUNCTIONS[name];
      if (!fn) fail(`Unknown function ${name}`);
      i += name.length;
      skip();
      if (peek() !== '(') fail('Expected ( after function name');
      i++;
      const v = expr();
      skip();
      if (peek() !== ')') fail('Expected )');
      i++;
      return fn(v);
    }
    const num = /^\d+(\.\d+)?|^\.\d+/.exec(src.slice(i))?.[0];
    if (!num) fail('Expected a number');
    i += num!.length;
    return parseFloat(num!);
  };

  const value = expr();
  skip();
  if (i < src.length) fail('Unexpected character');
  if (!Number.isFinite(value)) fail('Result is not a finite number');
  return value;
};

// True when the stated answer matches the evaluated expression within tolerance
export const checksOut = (expression: string, stated: number, tolerance: number): boolean => {
  try {
    return Math.abs(evaluate(expression) - stated) <= Math.max(tolerance, 1e-9);
  } catch {
    return false;
  }
};
