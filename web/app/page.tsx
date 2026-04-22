import Chat from "@/components/chat";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="w-full max-w-3xl flex flex-col flex-1 px-4 py-6">
        <header className="mb-4">
          <h1 className="text-2xl font-semibold">🍳 Cooking Agent</h1>
          <p className="text-sm text-muted-foreground">
            Ask for a recipe, a substitution, or a technique.
          </p>
        </header>
        <Chat />
      </div>
    </main>
  );
}
