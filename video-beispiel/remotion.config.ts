import {Config} from '@remotion/cli/config';

// Die Musik liegt unter assets/music – vorher herunterladen (assets/music/README.md). Audiio-Lizenz: nur in eigenen Produktionen.
// Nach dem Kopieren nach ~/pfefferminzia-video: Pfad anpassen, z. B. '../pfefferminzia/assets/music'.
Config.setPublicDir('../assets/music');
Config.setVideoImageFormat('jpeg');
