export function MoriMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M20 20C4 22 1 9 10 6c7-2 11 6 10 14Z" fill="currentColor" />
      <path d="M20 20C18 4 31 1 34 10c2 7-6 11-14 10Z" fill="currentColor" />
      <path d="M20 20c16-2 19 11 10 14-7 2-11-6-10-14Z" fill="currentColor" />
      <path d="M20 20c2 16-11 19-14 10-2-7 6-11 14-10Z" fill="currentColor" />
    </svg>
  );
}
export function SubjectArt({ kind, large = false }: { kind: string; large?: boolean }) {
  if (kind === 'book')
    return (
      <svg
        className={`subject-art ${large ? 'large' : ''}`}
        viewBox="0 0 320 170"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="m76 49 79 18 84-22 5 85-88 25-83-24 3-82Z"
          fill="#cad7b6"
          stroke="#82956b"
          strokeWidth="1.5"
        />
        <path d="m84 37 73 25v83l-74-24 1-84Z" fill="#f7f9ee" stroke="#82956b" strokeWidth="1.5" />
        <path d="m157 62 73-25 5 85-78 23V62Z" fill="#e9efd9" stroke="#82956b" strokeWidth="1.5" />
        <path
          d="m97 62 42 14m-42 0 42 14m-42 0 42 14m-42 0 30 10m48-39 40-14m-40 28 40-14m-40 28 40-14"
          stroke="#b1be98"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="m191 48 14-5v39l-7-3-7 8V48Z" fill="#a8bc88" />
        <path d="m63 34 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" fill="#acbe8e" />
        <circle cx="268" cy="93" r="4" stroke="#a9b98e" />
      </svg>
    );
  if (kind === 'biology')
    return (
      <svg
        className={`subject-art ${large ? 'large' : ''}`}
        viewBox="0 0 320 170"
        fill="none"
        aria-hidden="true"
      >
        <ellipse
          cx="170"
          cy="89"
          rx="76"
          ry="54"
          transform="rotate(-20 170 89)"
          fill="#f4bda8"
          stroke="#ae6a4f"
          strokeWidth="1.5"
        />
        <ellipse
          cx="170"
          cy="89"
          rx="67"
          ry="45"
          transform="rotate(-20 170 89)"
          stroke="#ae6a4f"
          strokeDasharray="3 5"
        />
        <ellipse cx="169" cy="85" rx="24" ry="21" fill="#c9755f" />
        <ellipse cx="174" cy="81" rx="8" ry="7" fill="#f9ddbd" />
        <path
          d="M118 85c-9-19 19-26 16-11s-12 10-16 11Zm79 32c-9-19 19-26 16-11s-12 10-16 11Z"
          fill="#d5a479"
          stroke="#ae6a4f"
        />
        <path
          d="m203 58 14 5m-17 3 15 6m-14 0 14 6m-82 33 13 5m-17 3 15 6"
          stroke="#ae6a4f"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path d="m215 47 29-16h33M107 111l-28 22H47" stroke="#c78a6e" />
        <circle cx="215" cy="47" r="3" fill="#c78a6e" />
        <circle cx="107" cy="111" r="3" fill="#c78a6e" />
        <circle cx="77" cy="46" r="3" fill="#d8aa8d" />
        <circle cx="260" cy="107" r="5" stroke="#d8aa8d" />
        <path d="m67 85 7 0m-3.5-3.5v7" stroke="#bc8c74" />
      </svg>
    );
  if (kind === 'physics')
    return (
      <svg
        className={`subject-art ${large ? 'large' : ''}`}
        viewBox="0 0 320 170"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="160" cy="85" r="50" stroke="#d4c6e5" strokeDasharray="3 6" />
        <ellipse
          cx="160"
          cy="85"
          rx="82"
          ry="29"
          transform="rotate(-35 160 85)"
          stroke="#89719f"
          strokeWidth="1.5"
        />
        <ellipse
          cx="160"
          cy="85"
          rx="82"
          ry="29"
          transform="rotate(35 160 85)"
          stroke="#89719f"
          strokeWidth="1.5"
        />
        <ellipse
          cx="160"
          cy="85"
          rx="82"
          ry="29"
          transform="rotate(90 160 85)"
          stroke="#89719f"
          strokeWidth="1.5"
        />
        <circle cx="160" cy="85" r="16" fill="#b59acc" />
        <circle cx="155" cy="80" r="6" fill="#d5c1e5" />
        <circle cx="214" cy="41" r="6" fill="#74588f" />
        <circle cx="162" cy="165" r="5" fill="#74588f" />
        <circle cx="102" cy="61" r="5" fill="#74588f" />
        <path d="m65 125 8 0m-4-4v8m197-86h8m-4-4v8" stroke="#a88dbe" />
        <text x="235" y="129" fill="#9c80b3" fontSize="20" fontFamily="Georgia" fontStyle="italic">
          ψ
        </text>
      </svg>
    );
  return (
    <svg
      className={`subject-art ${large ? 'large' : ''}`}
      viewBox="0 0 320 170"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id={large ? 'grid-lg' : 'grid'}
          width="25"
          height="25"
          patternUnits="userSpaceOnUse"
        >
          <path d="M25 0H0v25" stroke="#aec3a3" strokeOpacity=".3" />
        </pattern>
      </defs>
      <rect x="52" y="11" width="218" height="150" fill={`url(#${large ? 'grid-lg' : 'grid'})`} />
      <path d="M68 132h207M96 148V19" stroke="#78926c" strokeWidth="1.2" />
      <path d="m271 129 5 3-5 3M93 24l3-5 3 5" stroke="#78926c" strokeWidth="1.2" />
      <path
        d="M63 120c45 3 55-3 79-33 24-30 26-48 56-54 18-4 38 2 58 20"
        stroke="#536f44"
        strokeWidth="2.7"
        strokeLinecap="round"
      />
      <path d="M150 131V77h-54" stroke="#8ca07b" strokeDasharray="4 4" />
      <circle cx="150" cy="77" r="5" fill="#dce8ce" stroke="#536f44" strokeWidth="2" />
      <text x="217" y="106" fill="#658054" fontSize="25" fontFamily="Georgia" fontStyle="italic">
        ƒ(x)
      </text>
      <text x="76" y="35" fill="#8b9d7f" fontSize="13" fontFamily="Georgia" fontStyle="italic">
        y
      </text>
      <text x="264" y="152" fill="#8b9d7f" fontSize="13" fontFamily="Georgia" fontStyle="italic">
        x
      </text>
    </svg>
  );
}
export function HeroArt() {
  return (
    <svg className="hero-art" viewBox="0 0 430 260" fill="none" aria-hidden="true">
      <ellipse cx="233" cy="225" rx="141" ry="15" fill="#294b32" fillOpacity=".25" />
      <path d="m106 155 146-45 108 45-148 49-106-49Z" fill="#bed89b" />
      <path d="M106 155v17l106 50v-18l-106-49Z" fill="#a5bf89" />
      <path d="m212 204 148-49v16l-148 51v-18Z" fill="#d4e6b7" />
      <path d="m123 149 130-39 90 37-132 44-88-42Z" fill="#e8efce" />
      <path d="m133 141 116-40 99 38-126 43-89-41Z" fill="#f8f7e7" />
      <path d="m133 141 89 41v8l-89-41v-8Z" fill="#d2d9bd" />
      <path d="m222 182 126-43v9l-126 42v-8Z" fill="#e7e9d0" />
      <path d="m146 123 96-31 82 30-98 35-80-34Z" fill="#f4bd8d" />
      <path d="m146 123 80 34v9l-80-34v-9Z" fill="#d7996f" />
      <path d="m226 157 98-35v9l-98 35v-9Z" fill="#f4cc9b" />
      <path d="m161 119 78-26 69 25-80 28-67-27Z" stroke="#c99370" />
      <path d="m234 80 0-43c20-8 33-5 39 6-18 14-29 14-39-6" fill="#b8d795" />
      <path d="M234 102V40" stroke="#d5e7b9" strokeWidth="2" />
      <path d="M234 73c-25 1-37-12-33-28 23 0 34 12 33 28Z" fill="#8eaf76" />
      <path d="m335 58 4 10 10 4-10 4-4 10-4-10-10-4 10-4 4-10Z" fill="#d1e3b0" />
      <path d="m105 76 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" fill="#b9d199" />
      <circle cx="322" cy="196" r="3" fill="#bed699" />
      <circle cx="151" cy="47" r="2" fill="#bed699" />
      <path d="m68 178 16-5m-10-7 5 15" stroke="#92b47a" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
