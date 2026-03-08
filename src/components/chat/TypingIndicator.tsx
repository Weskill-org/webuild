export default function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-secondary text-secondary-foreground px-4 py-2.5 rounded-2xl rounded-bl-md">
        <div className="flex gap-1 items-center h-4">
          <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
