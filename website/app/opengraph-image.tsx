import { ImageResponse } from 'next/og'

export const runtime     = 'edge'
export const alt         = 'And Planning — Build Your AI Factory. Operate Your Future.'
export const size        = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          background: '#0F172A',
          padding: '80px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        {/* Background accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '600px',
            height: '600px',
            background: 'radial-gradient(ellipse at top right, rgba(6,182,212,0.12) 0%, transparent 60%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '500px',
            height: '500px',
            background: 'radial-gradient(ellipse at bottom left, rgba(37,99,235,0.10) 0%, transparent 60%)',
          }}
        />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#06B6D4', letterSpacing: '3px', textTransform: 'uppercase' }}>
            AI Operating System
          </span>
        </div>

        {/* Brand name */}
        <div
          style={{
            fontSize: '88px',
            fontWeight: 700,
            color: '#FFFFFF',
            lineHeight: 1.0,
            letterSpacing: '-3px',
            marginBottom: '24px',
          }}
        >
          And Planning
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: '32px',
            fontWeight: 400,
            color: '#94A3B8',
            lineHeight: 1.4,
            marginBottom: '48px',
            maxWidth: '900px',
          }}
        >
          Build Your AI Factory.{' '}
          <span style={{ color: '#06B6D4' }}>Operate Your Future.</span>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '48px' }}>
          {[
            { value: '6', label: 'AI Factories' },
            { value: '9', label: 'Step Workflow' },
            { value: '3',  label: 'AI Providers'  },
          ].map((stat) => (
            <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '36px', fontWeight: 700, color: '#FFFFFF' }}>{stat.value}</span>
              <span style={{ fontSize: '14px', color: '#475569' }}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            right: '80px',
            fontSize: '16px',
            color: '#334155',
            fontFamily: 'monospace',
          }}
        >
          andplanning.ai
        </div>
      </div>
    ),
    { ...size },
  )
}
