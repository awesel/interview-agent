export default function Home() {
  return (
    <main className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">AI Interview Agent MVP</h1>
      <div className="flex gap-3">
        <a className="btn" href="/login">Login</a>
        <a className="btn" href="/dashboard">Dashboard</a>
        <a className="btn" href="/interview">Run Demo Interview</a>
      </div>
    </main>
  );
}
