import dynamic from 'next/dynamic'
import Hero from '@/sections/Hero'

/* Below-fold sections: lazy-loaded as separate JS chunks */
const About     = dynamic(() => import('@/sections/About'))
const AiOs      = dynamic(() => import('@/sections/AiOs'))
const Factories = dynamic(() => import('@/sections/Factories'))
const Roadmap   = dynamic(() => import('@/sections/Roadmap'))
const News      = dynamic(() => import('@/sections/News'))
const Contact   = dynamic(() => import('@/sections/Contact'))

export default function HomePage() {
  return (
    <>
      <Hero />
      <About />
      <AiOs />
      <Factories />
      <Roadmap />
      <News />
      <Contact />
    </>
  )
}
