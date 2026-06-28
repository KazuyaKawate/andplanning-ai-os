export type NavItem = {
  label: string
  href: string
}

export type Factory = {
  id: string
  name: string
  nameJa: string
  descriptionJa: string
  icon: string
  status: 'active' | 'stub' | 'planned'
  accentColor: string
}

export type Phase = {
  number: number
  title: string
  description: string
  status: 'completed' | 'in-progress' | 'planned'
  percentage: number
}

export type NewsItem = {
  id: string
  title: string
  date: string
  category: string
  href: string
}
