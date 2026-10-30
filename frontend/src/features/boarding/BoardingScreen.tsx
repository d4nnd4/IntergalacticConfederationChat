import { memo } from "react";
import { useSession } from "../../comms/SessionProvider";
import { PixelPortrait } from "../../pixel/PixelPortrait";
import type { Profile } from "../../types";
import { RingBand } from "../../ui/RingBand";
import { Saucer } from "../../ui/Saucer";
import { TractorBeam } from "../../ui/TractorBeam";
import styles from "./BoardingScreen.module.css";

const PALETTES = ["dusk", "tide", "drought"] as const;

export function BoardingScreen() {
  const { profiles, board, loadError } = useSession();

  return (
    <div className={styles.screen}>
      <header className={styles.masthead}>
        <Saucer size={72} beam />
        <span className={styles.kicker}>Science Fiction · Assembly Edition</span>
        <h1 className={styles.title}>Intergalactic Confederation</h1>
        <p className={styles.subtitle}>Choose the delegate you will speak as</p>
      </header>

      {loadError && (
        <p className={styles.error} role="alert">
          The relay did not answer ({loadError}). Is the backend running?
        </p>
      )}
      {!loadError && profiles.length === 0 && <TractorBeam label="Contacting Ganymede…" />}

      <ol className={styles.shelf}>
        {profiles.map((profile, index) => (
          <li key={profile.id}>
            <CoverCard profile={profile} index={index} onBoard={board} />
          </li>
        ))}
      </ol>
    </div>
  );
}

interface CardProps {
  profile: Profile;
  index: number;
  onBoard: (id: string) => void;
}

const CoverCard = memo(function CoverCard({ profile, index, onBoard }: CardProps) {
  return (
    <button
      type="button"
      className={styles.card}
      data-palette={PALETTES[index % PALETTES.length]}
      onClick={() => onBoard(profile.id)}
      aria-label={`Board as ${profile.name}, ${profile.title} of the ${profile.race}`}
    >
      <span className={styles.cardBand}>
        <span className={styles.cardKicker}>{profile.member ? "Founder Assembly" : "Observer"}</span>
        <span className={styles.cardName}>{profile.name}</span>
        <span className={styles.cardRace}>{profile.race}</span>
      </span>
      <span className={styles.art}>
        <span className={styles.sun} />
        {index % 2 === 0 && <RingBand className={styles.rings} />}
        <span className={styles.ground} />
        <span className={styles.shadow} />
        <PixelPortrait id={profile.id} size={112} label="" className={styles.figure} />
        <span className={styles.bio}>{profile.bio}</span>
      </span>
      <span className={styles.foot}>
        <span>No. {index + 1} in the series</span>
        <span>{profile.title}</span>
      </span>
    </button>
  );
});
