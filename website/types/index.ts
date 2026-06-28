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
  features: string[]
  releaseLabel: string
}

export type OsComponent = {
  id: string
  name: string
  descriptionJa: string
  icon: string
}

export type OsLayer = {
  id: string
  title: string
  titleJa: string
  components: OsComponent[]
}

export type RoadmapItem = {
  date: string
  title: string
  descriptionJa: string
  status: 'completed' | 'in-progress' | 'planned'
  isHighlight?: boolean
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

export type SocialLink = {
  id:       string
  label:    string
  href:     string
  icon:     'github' | 'x' | 'note' | 'email'
  external: boolean
}

export type LegalLink = {
  label: string
  href:  string
}
