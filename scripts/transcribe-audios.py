import os
import sys
import whisper
from pathlib import Path

# Add ffmpeg to PATH if installed via winget
FFMPEG_DIR = Path.home() / "AppData/Local/Microsoft/WinGet/Packages"
for ffmpeg_path in FFMPEG_DIR.glob("Gyan.FFmpeg*/ffmpeg*/bin"):
    os.environ["PATH"] = str(ffmpeg_path) + os.pathsep + os.environ["PATH"]
    break

AUDIO_DIR = Path(__file__).parent / "audios"
OUTPUT_DIR = Path(__file__).parent / "transcriptions"

AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".flac", ".webm", ".mp4", ".mpeg"}

def main():
    model_name = sys.argv[1] if len(sys.argv) > 1 else "base"

    print(f"Carregando modelo '{model_name}'...")
    model = whisper.load_model(model_name)

    AUDIO_DIR.mkdir(exist_ok=True)
    OUTPUT_DIR.mkdir(exist_ok=True)

    files = [f for f in AUDIO_DIR.iterdir() if f.suffix.lower() in AUDIO_EXTENSIONS]

    if not files:
        print(f"Nenhum audio encontrado em {AUDIO_DIR}")
        print(f"Coloque seus arquivos de audio la e rode novamente.")
        return

    print(f"Encontrados {len(files)} arquivo(s) de audio.\n")

    for i, audio_file in enumerate(sorted(files), 1):
        print(f"[{i}/{len(files)}] Transcrevendo: {audio_file.name}")
        result = model.transcribe(str(audio_file), language="pt")

        output_file = OUTPUT_DIR / f"{audio_file.stem}.txt"
        output_file.write_text(result["text"].strip(), encoding="utf-8")
        print(f"  -> Salvo em: {output_file.name}\n")

    print("Pronto! Todas as transcricoes estao em:", OUTPUT_DIR)


if __name__ == "__main__":
    main()
