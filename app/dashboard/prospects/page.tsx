import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NewLeadForm from './new-lead-form'

const CATEGORY_LABEL: Record<string, string> = {
  acheteur: 'Acheteur',
  vendeur: 'Vendeur',
  investisseur: 'Investisseur',
}

export default async function ProspectsPage() {
  const supabase = await createClient()

  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, category, phone, email, critere_lieu, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Prospects</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {leads?.length ?? 0} prospect{(leads?.length ?? 0) > 1 ? 's' : ''}
        </p>
      </div>

      <NewLeadForm />

      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Catégorie</th>
              <th className="px-4 py-3 font-medium">Secteur</th>
              <th className="px-4 py-3 font-medium">Téléphone</th>
              <th className="px-4 py-3 font-medium">Email</th>
            </tr>
          </thead>
          <tbody>
            {!leads?.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  Aucun prospect pour l&apos;instant.
                </td>
              </tr>
            )}
            {leads?.map((lead) => (
              <tr key={lead.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-4 py-3 font-medium text-neutral-900">
                  <Link href={`/dashboard/prospects/${lead.id}`} className="hover:underline">
                    {lead.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {CATEGORY_LABEL[lead.category ?? ''] ?? lead.category}
                </td>
                <td className="px-4 py-3 text-neutral-600">{lead.critere_lieu || '—'}</td>
                <td className="px-4 py-3 text-neutral-600">{lead.phone || '—'}</td>
                <td className="px-4 py-3 text-neutral-600">{lead.email || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
