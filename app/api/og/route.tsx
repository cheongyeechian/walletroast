import { ImageResponse } from 'next/og';
import { readFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TEMPLATE_W = 1719;
const TEMPLATE_H = 1046;

let cachedTemplate: string | null = null;

async function getTemplateDataUrl(): Promise<string> {
  if (cachedTemplate) return cachedTemplate;
  const buf = await readFile(path.join(process.cwd(), 'public', 'template.jpg'));
  cachedTemplate = `data:image/jpeg;base64,${buf.toString('base64')}`;
  return cachedTemplate;
}

function clip(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const stat = clip(searchParams.get('s') || 'You got roasted.', 140);
  const days = searchParams.get('d') || '0';
  const txs = searchParams.get('t') || '0';
  const value = searchParams.get('p') || '0';

  const template = await getTemplateDataUrl();

  const labelStyle = { color: '#a1a1aa' };
  const valueStyle = { color: '#ffffff', fontWeight: 700 };
  const dotStyle = { color: '#52525b', margin: '0 14px' };

  return new ImageResponse(
    (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundColor: '#0a0a0a',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={template}
          width={TEMPLATE_W}
          height={TEMPLATE_H}
          style={{ position: 'absolute', inset: 0 }}
          alt=""
        />

        {/* Quote text overlay */}
        <div
          style={{
            position: 'absolute',
            top: 320,
            left: 170,
            width: 940,
            height: 360,
            fontSize: 76,
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'flex-start',
          }}
        >
          {stat}
        </div>

        {/* Stats line — covers the template's empty label row */}
        <div
          style={{
            position: 'absolute',
            left: 70,
            top: 815,
            width: 1080,
            height: 60,
            backgroundColor: '#0a0a0a',
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 12,
            fontSize: 34,
          }}
        >
          <span style={labelStyle}>Wallet age</span>
          <span style={{ ...valueStyle, marginLeft: 14 }}>{days}d</span>
          <span style={dotStyle}>·</span>
          <span style={valueStyle}>{txs}</span>
          <span style={{ ...labelStyle, marginLeft: 14 }}>txs analyzed</span>
          <span style={dotStyle}>·</span>
          <span style={valueStyle}>${value}</span>
          <span style={{ ...labelStyle, marginLeft: 14 }}>portfolio</span>
        </div>
      </div>
    ),
    { width: TEMPLATE_W, height: TEMPLATE_H }
  );
}
