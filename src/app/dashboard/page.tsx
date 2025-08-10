export default function DashboardPage() {
  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Interviewer Dashboard</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <section className="border rounded-xl p-4">
          <h2 className="font-medium mb-2">Create Interviewer / Project</h2>
          <p className="text-sm text-gray-500">Form TBD. Placeholder for title, JSON upload, time limits.</p>
        </section>
        <section className="border rounded-xl p-4">
          <h2 className="font-medium mb-2">Active Interviews</h2>
          <p className="text-sm text-gray-500">List of ongoing sessions.</p>
        </section>
        <section className="border rounded-xl p-4">
          <h2 className="font-medium mb-2">Completed / Responses</h2>
          <p className="text-sm text-gray-500">Summary cards and export actions.</p>
        </section>
      </div>
    </main>
  );
}


