import { useComms } from "../comms/CommsProvider";
import { useSession } from "../comms/SessionProvider";
import { PixelPortrait } from "../pixel/PixelPortrait";
import type { Scene } from "../types";
import { ChromeButton } from "../ui/ChromeButton";
import { Saucer } from "../ui/Saucer";
import { SignalLamp } from "../ui/SignalLamp";
import styles from "./CoverBand.module.css";

const TABS: ReadonlyArray<{ scene: Scene; number: string; label: string }> = [
  { scene: "comms", number: "No. 1", label: "Transmissions" },
  { scene: "archive", number: "No. 2", label: "The Archive" },
  { scene: "arcade", number: "No. 3", label: "Ringfall" },
];

interface Props {
  scene: Scene;
  onSceneChange: (scene: Scene) => void;
}

export function CoverBand({ scene, onSceneChange }: Props) {
  const { status } = useComms();
  const { delegate, disembark } = useSession();

  return (
    <header className={styles.band}>
      <div className={styles.brand}>
        <Saucer size={44} />
        <div>
          <span className={styles.kicker}>Science Fiction</span>
          <span className={styles.title}>I.C. Comms</span>
        </div>
      </div>

      <nav className={styles.tabs} aria-label="Sections">
        {TABS.map((tab) => (
          <button
            key={tab.scene}
            type="button"
            className={styles.tab}
            aria-current={scene === tab.scene ? "page" : undefined}
            onClick={() => onSceneChange(tab.scene)}
          >
            <span className={styles.tabNumber}>{tab.number}</span>
            <span className={styles.tabLabel}>{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className={styles.status}>
        <SignalLamp status={status} />
        {delegate && (
          <div className={styles.delegate}>
            <PixelPortrait id={delegate.id} size={32} label="" />
            <div className={styles.delegateText}>
              <span className={styles.delegateName}>{delegate.name}</span>
              <span className={styles.delegateRace}>{delegate.race}</span>
            </div>
            <ChromeButton tone="ghost" onClick={disembark}>
              Disembark
            </ChromeButton>
          </div>
        )}
      </div>
    </header>
  );
}
