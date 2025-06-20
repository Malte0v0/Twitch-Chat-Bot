export function sanitizeInput(input) {
  return input.replace(/[\x00-\x1F\x7F]/g, '');
}