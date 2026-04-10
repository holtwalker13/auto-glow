import { formatUsPhoneInput } from '../lib/formatUsPhone'

type Contact = { name: string; phone: string; email: string; notes: string }

export function ContactStep({
  value,
  onChange,
}: {
  value: Contact
  onChange: (next: Contact) => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none ring-cyan-400/50 transition placeholder:text-slate-500 focus:border-cyan-400/40 focus:ring-2"
          placeholder="Your name"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          autoComplete="name"
          required
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="phone">
          Phone
        </label>
        <input
          id="phone"
          type="tel"
          inputMode="tel"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none ring-cyan-400/50 transition placeholder:text-slate-500 focus:border-cyan-400/40 focus:ring-2"
          placeholder="(555) 123-4567 or +1 …"
          value={value.phone}
          onChange={(e) => onChange({ ...value, phone: formatUsPhoneInput(e.target.value) })}
          autoComplete="tel"
          required
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none ring-cyan-400/50 transition placeholder:text-slate-500 focus:border-cyan-400/40 focus:ring-2"
          placeholder="you@example.com"
          value={value.email}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
          autoComplete="email"
          required
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
