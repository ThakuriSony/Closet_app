export function getGreetingByTime(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 18) return "Good Afternoon";
  return "Good Evening";
}

export function buildGreeting(name: string | null, date: Date = new Date()): string {
  const base = getGreetingByTime(date);
  const trimmed = name?.trim();
  return trimmed ? `${base}, ${trimmed}` : base;
}
