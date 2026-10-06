export const CATEGORIES = [
  { value: 'home', label: 'Home' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'everyday', label: 'Everyday' },
] as const

export const categoryLabel = (value: string) => CATEGORIES.find((c) => c.value === value)?.label ?? value
