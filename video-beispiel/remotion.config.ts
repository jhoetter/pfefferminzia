import {Config} from '@remotion/cli/config';

// Die Musik liegt im Repo unter assets/music (Audiio-Lizenz: nur in eigenen Produktionen).
// Nach dem Kopieren nach ~/pfefferminzia-video: Pfad anpassen, z. B. '../pfefferminzia/assets/music'.
Config.setPublicDir('../assets/music');
Config.setVideoImageFormat('jpeg');
