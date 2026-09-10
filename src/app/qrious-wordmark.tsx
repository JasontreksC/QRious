import styles from './y2k-theme.module.css';

type WordmarkVariant = 'flux-demo' | 'audio-nugget' | 'custom' | 'bagel';

// 'audio-nugget', 'custom', 'bagel'로 바꾸면 이전 워드마크를 사용할 수 있습니다.
const WORDMARK_VARIANT: WordmarkVariant = 'flux-demo';

const PIXEL_HEART = [
  '0110110',
  '1111111',
  '1111111',
  '0111110',
  '0011100',
  '0001000',
] as const;

const HEART_DOTS = PIXEL_HEART.flatMap((row, rowIndex) =>
  [...row].flatMap((pixel, columnIndex) =>
    pixel === '1' ? [{ rowIndex, columnIndex }] : []
  )
);

export function PixelHeart({
  side,
  className,
}: {
  side?: 'left' | 'right';
  className?: string;
}) {
  return (
    <span
      className={`${styles.pixelHeart} ${
        side === 'left'
          ? styles.pixelHeartLeft
          : side === 'right'
            ? styles.pixelHeartRight
            : ''
      } ${className ?? ''}`}
      aria-hidden="true"
    >
      {HEART_DOTS.map(({ rowIndex, columnIndex }, index) => (
        <span
          key={`${rowIndex}-${columnIndex}`}
          className={styles.pixelHeartDot}
          style={{
            gridRow: rowIndex + 1,
            gridColumn: columnIndex + 1,
            animationDelay: `-${(index * 0.09).toFixed(2)}s`,
            animationDuration: `${1.25 + ((rowIndex + columnIndex) % 4) * 0.18}s`,
          }}
        />
      ))}
    </span>
  );
}

function WordmarkHearts() {
  return (
    <>
      <PixelHeart side="left" />
      <PixelHeart side="right" />
    </>
  );
}

function CustomWordmark() {
  return (
    <span
      className={`${styles.wordmarkStage} ${styles.customWordmarkStage}`}
      aria-hidden="true"
    >
      <span className={styles.customWordmark}>
        <svg
          className={styles.customWordmarkSvg}
          viewBox="0 0 720 180"
          role="img"
          aria-label="QRious"
        >
        <defs>
          <linearGradient id="qrious-custom-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#414b4f" />
            <stop offset="0.48" stopColor="#2d3437" />
            <stop offset="1" stopColor="#202629" />
          </linearGradient>
          <g id="qrious-custom-letters">
            <path
              fillRule="evenodd"
              d="M29 18h76c21 0 31 11 31 32v65c0 21-10 31-31 31H29C9 146 0 136 0 115V50c0-21 9-32 29-32Zm16 32c-9 0-13 5-13 14v38c0 9 4 13 13 13h43c10 0 15-4 15-13V64c0-9-5-14-15-14H45Z"
            />
            <path d="m68 98 73 58h-45l-50-43 22-15Z" />
            <path
              fillRule="evenodd"
              d="M148 18h78c25 0 37 11 37 34v25c0 18-8 28-25 33l37 36h-46l-34-33h-14v33h-33V18Zm33 31v34h36c9 0 13-4 13-12V61c0-8-4-12-13-12h-36Z"
            />
            <path d="M281 57h34l-4 89h-34l4-89Z" />
            <path d="M285 18h31l-1 29h-33l3-29Z" />
            <path
              fillRule="evenodd"
              d="M355 54h55c22 0 33 11 33 33v27c0 22-11 32-33 32h-55c-23 0-34-10-34-32V87c0-22 11-33 34-33Zm9 28c-7 0-10 4-10 11v15c0 7 3 10 10 10h36c7 0 10-3 10-10V93c0-7-3-11-10-11h-36Z"
            />
            <path d="M450 55h34v51c0 9 4 13 13 13h15c10 0 14-4 14-13V55h34v59c0 22-11 32-34 32h-42c-23 0-34-10-34-32V55Z" />
            <path d="M598 54h67c22 0 33 9 33 28v7h-34v-4c0-5-3-7-9-7h-39c-6 0-9 2-9 7v3c0 5 3 7 9 7h50c23 0 34 9 34 27v3c0 14-4 21-13 25-5 3-13 4-23 4h-66c-23 0-35-9-35-28v-7h35v4c0 5 3 7 9 7h40c6 0 9-2 9-7v-3c0-5-3-7-9-7h-49c-23 0-35-9-35-27v-4c0-19 12-28 35-28Z" />
          </g>
        </defs>

        <use
          href="#qrious-custom-letters"
          fill="#2d3437"
          opacity="0.52"
          transform="translate(29 15) skewX(-4)"
        />
        <use
          href="#qrious-custom-letters"
          fill="#50b0d1"
          transform="translate(11 10) skewX(-4)"
        />
        <use
          href="#qrious-custom-letters"
          fill="#ef238e"
          transform="translate(25 -3) skewX(-4)"
        />
        <use
          href="#qrious-custom-letters"
          fill="url(#qrious-custom-fill)"
          stroke="white"
          strokeLinejoin="round"
          strokeWidth="7"
          paintOrder="stroke fill"
          transform="translate(18 2) skewX(-4)"
        />
        </svg>
      </span>
      <WordmarkHearts />
    </span>
  );
}

function FontWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={styles.wordmarkStage} aria-hidden="true">
      <span className={`${styles.wordmark} ${className}`} data-text="QRious">
        QRious
      </span>
      <WordmarkHearts />
    </span>
  );
}

function BagelWordmark() {
  return <FontWordmark />;
}

function AudioNuggetWordmark() {
  return <FontWordmark className={styles.audioNuggetWordmark} />;
}

function FluxDemoWordmark() {
  return <FontWordmark className={styles.fluxDemoWordmark} />;
}

const WORDMARKS: Record<WordmarkVariant, () => React.JSX.Element> = {
  'flux-demo': FluxDemoWordmark,
  'audio-nugget': AudioNuggetWordmark,
  custom: CustomWordmark,
  bagel: BagelWordmark,
};

export function QriousWordmark() {
  const SelectedWordmark = WORDMARKS[WORDMARK_VARIANT];
  return <SelectedWordmark />;
}
