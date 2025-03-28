export function Loader({ className }: { className?: string }) {
    return (
        <div className={`border-t-transparent border-solid rounded-full border-2 border-blue-500 border-t-2 animate-spin ${className}`} style={{ width: '1em', height: '1em' }} />
    );
}
  