# Musik (Audiio-Instrumentals)

Die vier WAV-Dateien liegen hier als verlustfreies FLAC (141 MB → 92 MB).
Sie wurden mit `flac -8 -e -p --keep-foreign-metadata` kodiert, deshalb
entstehen beim Entpacken **bitgenau** die Original-WAVs.

## Wiederherstellen

```sh
brew install flac   # falls nötig
cd assets/music
for f in *.flac; do flac -d --keep-foreign-metadata "$f"; done
shasum -a 256 -c SHA256SUMS
```

Die Tracks unterliegen der Audiio-Lizenz: nur in eigenen Produktionen
verwenden, nicht als Rohdateien weitergeben.
