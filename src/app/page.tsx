import styles from "./landing.module.css";

export default function Home() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.poster}>
        {/* Corner decorations */}
        <div className={styles.cornerTl} />
        <div className={styles.cornerTr} />
        <div className={styles.cornerBl} />
        <div className={styles.cornerBr} />

        <div className={styles.content}>
          <div className={styles.topBorder} />

          {/* Header bar */}
          <div className={styles.headerBar}>
            <div className={styles.headerLine} />
            <div className={styles.headerText}>United States Army</div>
            <div className={styles.headerLine} />
          </div>

          {/* Unit designation */}
          <div className={styles.unitBlock}>
            <div className={styles.unitPrefix}>Combat Support Company</div>
            <div className={styles.unitName}>
              4/<span className={styles.unitNameAccent}>502</span> Infantry
            </div>
            <div className={styles.unitSubtitle}>Regiment</div>
          </div>

          {/* Brandenburg Gate silhouette */}
          <div className={styles.gateContainer}>
            <div className={styles.gateGlow} />
            <svg className={styles.gateSvg} viewBox="0 0 620 240" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="gateGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C8A84E" stopOpacity={0.9} />
                  <stop offset="60%" stopColor="#C8A84E" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#8B6914" stopOpacity={0.3} />
                </linearGradient>
              </defs>

              {/* Main columns */}
              <rect x="100" y="70" width="16" height="170" fill="url(#gateGrad)" />
              <rect x="160" y="70" width="16" height="170" fill="url(#gateGrad)" />
              <rect x="220" y="70" width="16" height="170" fill="url(#gateGrad)" />
              <rect x="280" y="70" width="16" height="170" fill="url(#gateGrad)" />
              <rect x="324" y="70" width="16" height="170" fill="url(#gateGrad)" />
              <rect x="384" y="70" width="16" height="170" fill="url(#gateGrad)" />
              <rect x="444" y="70" width="16" height="170" fill="url(#gateGrad)" />
              <rect x="504" y="70" width="16" height="170" fill="url(#gateGrad)" />

              {/* Entablature / top beam */}
              <rect x="90" y="58" width="440" height="16" fill="url(#gateGrad)" />
              <rect x="85" y="50" width="450" height="10" fill="url(#gateGrad)" opacity={0.8} />

              {/* Attic / upper section */}
              <rect x="130" y="30" width="360" height="22" fill="url(#gateGrad)" opacity={0.7} />

              {/* Quadriga (chariot) silhouette */}
              <g fill="#C8A84E" opacity={0.85}>
                <rect x="260" y="18" width="100" height="14" rx="2" />
                <path d="M285 18 Q290 2 310 0 Q330 2 335 18Z" />
                <path d="M262 18 Q264 6 272 4 L278 8 Q274 12 270 18Z" />
                <path d="M272 18 Q276 8 282 5 L286 10 Q282 14 278 18Z" />
                <path d="M342 18 Q346 8 338 5 L334 10 Q338 14 342 18Z" />
                <path d="M352 18 Q350 6 344 4 L338 8 Q342 12 348 18Z" />
                <ellipse cx="310" cy="-4" rx="5" ry="6" />
              </g>

              {/* Cross beams */}
              <rect x="100" y="130" width="420" height="3" fill="url(#gateGrad)" opacity={0.3} />
              <rect x="100" y="170" width="420" height="3" fill="url(#gateGrad)" opacity={0.2} />

              {/* Column bases */}
              <rect x="95" y="236" width="430" height="4" fill="#C8A84E" opacity={0.4} />

              {/* Side wings */}
              <rect x="40" y="100" width="50" height="140" fill="url(#gateGrad)" opacity={0.25} rx="2" />
              <rect x="530" y="100" width="50" height="140" fill="url(#gateGrad)" opacity={0.25} rx="2" />
              <rect x="42" y="96" width="46" height="6" fill="#C8A84E" opacity={0.3} />
              <rect x="532" y="96" width="46" height="6" fill="#C8A84E" opacity={0.3} />
            </svg>
          </div>

          {/* Main title */}
          <div className={styles.mainTitle}>
            <span className={styles.titleThe}>The</span>
            <div className={styles.titleBerlin}>BERLIN</div>
            <div className={styles.titleReunion}>Reunion</div>
            <div className={styles.titleTour}>TOUR</div>
          </div>

          {/* Year */}
          <div className={styles.yearBlock}>
            <div className={styles.yearLine} />
            <div className={styles.year}>2029</div>
            <div className={styles.yearLine} />
          </div>

          {/* Stars */}
          <div className={styles.starsRow}>
            <svg className={styles.star} viewBox="0 0 24 24">
              <polygon points="12,2 15,9 22,9 16.5,14 18.5,22 12,17.5 5.5,22 7.5,14 2,9 9,9" />
            </svg>
            <svg className={styles.star} viewBox="0 0 24 24">
              <polygon points="12,2 15,9 22,9 16.5,14 18.5,22 12,17.5 5.5,22 7.5,14 2,9 9,9" />
            </svg>
            <svg className={styles.starCenter} viewBox="0 0 24 24">
              <polygon points="12,2 15,9 22,9 16.5,14 18.5,22 12,17.5 5.5,22 7.5,14 2,9 9,9" />
            </svg>
            <svg className={styles.star} viewBox="0 0 24 24">
              <polygon points="12,2 15,9 22,9 16.5,14 18.5,22 12,17.5 5.5,22 7.5,14 2,9 9,9" />
            </svg>
            <svg className={styles.star} viewBox="0 0 24 24">
              <polygon points="12,2 15,9 22,9 16.5,14 18.5,22 12,17.5 5.5,22 7.5,14 2,9 9,9" />
            </svg>
          </div>

          {/* Motto */}
          <div className={styles.motto}>
            <div className={styles.mottoText}>Swift Strike</div>
            <div className={styles.mottoLatin}>&ldquo;Hellcats &amp; Widowmakers&rdquo;</div>
          </div>

          {/* Bottom section */}
          <div className={styles.bottomSection}>
            <div className={styles.bottomLine} />
            <div className={styles.bottomInfo}>
              <div className={styles.bottomItem}>
                <div className={styles.bottomLabel}>Brigade</div>
                <div className={styles.bottomValue}>Berlin Brigade</div>
              </div>
              <div className={styles.bottomItem}>
                <div className={styles.bottomLabel}>Destination</div>
                <div className={styles.bottomValue}>Berlin, Germany</div>
              </div>
            </div>
            <div className={styles.bottomBorder} />
          </div>
        </div>
      </div>
    </div>
  );
}
