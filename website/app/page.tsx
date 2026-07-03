import dynamic from 'next/dynamic'
import Hero from '@/sections/Hero'

/* Below-fold sections: lazy-loaded as separate JS chunks */
const UseCases      = dynamic(() => import('@/sections/UseCases'))
const About         = dynamic(() => import('@/sections/About'))
const AiOs          = dynamic(() => import('@/sections/AiOs'))
const BusinessEngine = dynamic(() => import('@/sections/BusinessEngine'))
const Factories     = dynamic(() => import('@/sections/Factories'))
const Roadmap       = dynamic(() => import('@/sections/Roadmap'))
const News          = dynamic(() => import('@/sections/News'))
const BetaAccess    = dynamic(() => import('@/sections/BetaAccess'))
const Contact       = dynamic(() => import('@/sections/Contact'))

export default function HomePage() {
  return (
    <>
      <Hero />
      <UseCases />
      <About />
      <AiOs />
      <BusinessEngine />
      <Factories />
      <Roadmap />
      <News />
      <BetaAccess />
      <Contact />
    </>
  )
}
