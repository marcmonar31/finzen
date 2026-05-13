interface Props {
  emoji: string;
  titulo: string;
}

export function Placeholder({ emoji, titulo }: Props) {
  return (
    <div className="min-h-full bg-app flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-3xl bg-surface shadow-[var(--shadow-card)] flex items-center justify-center text-4xl mb-5">
        {emoji}
      </div>
      <h2 className="font-bold text-xl text-fg mb-2">{titulo}</h2>
      <p className="text-fg-muted text-sm">Disponible próximamente</p>
    </div>
  );
}
