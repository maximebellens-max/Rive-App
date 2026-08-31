import { createClient } from '@/lib/supabase/server'
import PartnerForm from './partner-form'
import PartnerRow from './partner-row'

export default async function PartnersPage() {
  const supabase = await createClient()

  const { data: partners } = await supabase.from('partners').select('*').order('name', { ascending: true })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Contacts pro</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {partners?.length ?? 0} contact{(partners?.length ?? 0) > 1 ? 's' : ''}
        </p>
      </div>

      <PartnerForm />

      <div className="flex flex-col gap-3">
        {!partners?.length && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-neutral-200 bg-surface py-16 text-center shadow-sm">
            <h2 className="text-sm font-semibold text-neutral-900">Aucun contact pour l&apos;instant</h2>
            <p className="max-w-sm text-sm text-neutral-500">
              Notaires, banques, artisans, diagnostiqueurs — ajoute ici les contacts que tu sollicites régulièrement.
            </p>
          </div>
        )}
        {partners?.map((p) => (
          <PartnerRow key={p.id} partner={p} />
        ))}
      </div>
    </div>
  )
}
