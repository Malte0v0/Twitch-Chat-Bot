export function sanitizeInput(input) {
  return input.replace(/[\x00-\x1F\x7F]/g, '');
}

export function splitLength(input, limit) {
  let strings = [];

  for (let i = 0; i < input.length; i += limit) {
    strings.push(input.slice(i, i + limit));
  }

  return strings;
}