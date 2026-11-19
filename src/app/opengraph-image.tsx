import { ImageResponse } from 'next/og';

export const alt = 'Interview Monitor: see the screen your webcam can’t';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** The social share card, drawn in code so the landing page needs no image files. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: 'radial-gradient(ellipse 80% 70% at 50% 0%, rgba(37,99,235,0.45), #020617 70%)',
          color: 'white',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 30, fontWeight: 600 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: '#2563eb', display: 'flex' }} />
          Interview Monitor
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>
            See the screen your webcam can’t.
          </div>
          <div style={{ fontSize: 32, color: '#cbd5e1', lineHeight: 1.4 }}>
            Live screen monitoring for remote technical interviews. AI flags what needs a human look.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 32, fontSize: 24, color: '#94a3b8' }}>
          <span>Candidate consent first</span>
          <span>·</span>
          <span>No face recognition</span>
          <span>·</span>
          <span>Review, not verdict</span>
        </div>
      </div>
    ),
    size,
  );
}
