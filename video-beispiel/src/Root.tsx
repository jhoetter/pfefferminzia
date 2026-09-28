import {Composition} from 'remotion';
import {Pitch} from './Pitch';
import {DURATION, FPS} from './theme';

export const Root: React.FC = () => (
  <Composition id="Pitch" component={Pitch} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} />
);
