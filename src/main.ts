import './style.css';
import { loadContent } from './content';
import { Audio } from './engine/audio';
import { Game } from './engine/game';
import { battleSpeed, cycleBattleSpeed } from './engine/settings';
import { Shell } from './engine/shell';
import { titleScreen } from './screens/title';

loadContent();

const shell = new Shell();
const audio = new Audio();
const game = new Game(shell, audio);

const muteButton = document.getElementById('mute') as HTMLButtonElement;
const syncMuteLabel = (): void => {
  muteButton.textContent = `Sound: ${audio.isMuted ? 'off' : 'on'}`;
};
const toggleSound = (): void => {
  audio.toggleMute();
  syncMuteLabel();
};
muteButton.addEventListener('click', toggleSound);
shell.onGlobalKey('m', toggleSound);
syncMuteLabel();

const speedButton = document.getElementById('speed') as HTMLButtonElement;
const syncSpeedLabel = (): void => {
  speedButton.textContent = `Battle: ${battleSpeed()}`;
};
speedButton.addEventListener('click', () => {
  cycleBattleSpeed();
  syncSpeedLabel();
});
syncSpeedLabel();

// Browsers block audio until the first gesture; resume the audio context then.
for (const type of ['pointerdown', 'keydown'] as const) {
  window.addEventListener(type, () => audio.unlock(), { once: true });
}

game.go(titleScreen);

// Handy for debugging in the browser console during development.
if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = game;
