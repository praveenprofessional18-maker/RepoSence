export function formatDate(value, options = { month: "short", day: "numeric", year: "numeric" }) {
  return new Date(value).toLocaleDateString(undefined, options);
}

export function formatNumber(value) {
  return new Intl.NumberFormat().format(value);
}
