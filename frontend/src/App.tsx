import { lazy, Suspense, useState } from "react";
import styles from "./App.module.css";
import { useSession } from "./comms/SessionProvider";
import { ArchiveView } from "./features/archive/ArchiveView";
import { BoardingScreen } from "./features/boarding/BoardingScreen";
import { CommsView } from "./features/comms/CommsView";
import { CoverBand } from "./shell/CoverBand";
import type { Scene } from "./types";
import { Horizon } from "./ui/Horizon";
import { TractorBeam } from "./ui/TractorBeam";

const ArcadeView = lazy(() => import("./features/arcade/ArcadeView"));

export function App() {
  const { delegate } = useSession();
  const [scene, setScene] = useState<Scene>("comms");

  if (!delegate) {
    return (
      <>
        <Horizon scene="comms" />
        <BoardingScreen />
      </>
    );
  }

  return (
    <div className={styles.app}>
      <Horizon scene={scene} />
      <CoverBand scene={scene} onSceneChange={setScene} />
      <main className={styles.main}>
        <CommsView hidden={scene !== "comms"} />
        <ArchiveView hidden={scene !== "archive"} />
        {scene === "arcade" && (
          <Suspense fallback={<TractorBeam label="Fuelling Ringfall…" />}>
            <ArcadeView />
          </Suspense>
        )}
      </main>
    </div>
  );
}
