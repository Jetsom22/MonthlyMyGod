import { useState } from 'react';
import { GalleryScreen } from './ui/screens/GalleryScreen';
import { MatchScreen, type MatchConfig } from './ui/screens/MatchScreen';
import { TitleScreen } from './ui/screens/TitleScreen';

type Screen = { name: 'title' } | { name: 'match'; config: MatchConfig; key: number } | { name: 'gallery' };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'title' });
  const toTitle = () => setScreen({ name: 'title' });

  switch (screen.name) {
    case 'title':
      return <TitleScreen onStart={(config) => setScreen({ name: 'match', config, key: Date.now() })} onGallery={() => setScreen({ name: 'gallery' })} />;
    case 'match':
      return <MatchScreen key={screen.key} config={screen.config} onExit={toTitle} />;
    case 'gallery':
      return <GalleryScreen onBack={toTitle} />;
  }
}
