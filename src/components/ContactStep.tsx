type Contact = { name: string; phone: string; email: string; notes: string }

export function ContactStep({
  value,
  onChange,
  userTestOptionalContact = false,
}: {
  value: Contact
  onChange: (next: Contact) => void
  /** When true, fields are not required (faster user testing). Turn off before launch. */
  userTestOptionalContact?: boolean
}) {
  return (
    <div className="space-y-5">
      {userTestOptionalContact ? (
        <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
          User test mode: contact fields are optional so you can fly through the flow. Re-enable
          validation before launch.
        </p>
      ) : null}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="name">
          Name
          {userTestOptionalContact ? (
            <span className="font-normal text-slate-500"> (optional for testing)</span>
          ) : null}
        </label>
        <input
          id="name"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none ring-cyan-400/50 transition placeholder:text-slate-500 focus:border-cyan-400/40 focus:ring-2"
          placeholder="Your name"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          autoComplete="name"
          required={!userTestOptionalContact}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="phone">
          Phone
          {userTestOptionalContact ? (
            <span className="font-normal text-slate-500"> (optional for testing)</span>
          ) : null}
        </label>
        <input
          id="phone"
          type="tel"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none ring-cyan-400/50 transition placeholder:text-slate-500 focus:border-cyan-400/40 focus:ring-2"
          placeholder="Best number to reach you"
          value={value.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
          autoComplete="tel"
          required={!userTestOptionalContact}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="email">
          Email
          {userTestOptionalContact ? (
            <span className="font-normal text-slate-500"> (optional for testing)</span>
          ) : null}
        </label>
        <input
          id="email"
          type="email"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none ring-cyan-400/50 transition placeholder:text-slate-500 focus:border-cyan-400/40 focus:ring-2"
          placeholder="you@example.com"
          value={value.email}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
          autoComplete="email"
          required={!userTestOptionalContact}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="notes">
          Notes <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <textarea
          id="notes"
          rows={3}
          className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none ring-cyan-400/50 transition placeholder:text-slate-500 focus:border-cyan-400/40 focus:ring-2"
          placeholder="Anything we should know about access, pets, or condition?"
          value={value.notes}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
        />
      </div>
    </div>
  )
}
