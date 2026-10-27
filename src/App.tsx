import { useState } from 'react';
import { Home } from './screens/Home';
import { Main } from './screens/Main';
import { Setup } from './screens/Setup';
import { useStore } from './store';
import { Toaster } from './ui/kit';

type View = 'home' | 'setup' | 'game';

export function App() {
  const { game, actions } = useStore();
  const [view, setView] = useState<View>('home');
  const inGame = actions.length > 0 && game.phase.name !== 'setup';
  const shown: View = view === 'game' && !inGame ? 'home' : view;

  return (
    <div className="frame">
      {shown === 'home' && <Home onNew={() => setView('setup')} onContinue={() => setView('game')} />}
      {shown === 'setup' && <Setup onCancel={() => setView('home')} onStart={() => setView('game')} />}
      {shown === 'game' && <Main />}
      <Toaster />
    </div>
  );
}
