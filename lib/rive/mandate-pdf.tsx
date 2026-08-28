import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { feeForPrice, formatDate as fmtDate } from './mandates'
import { amountInWords } from './number-to-words'

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, lineHeight: 1.45, color: '#1a1a1a', fontFamily: 'Helvetica' },
  h1: { fontSize: 15, fontWeight: 700, marginBottom: 4 },
  h2: { fontSize: 11, fontWeight: 700, marginTop: 14, marginBottom: 6, textTransform: 'uppercase' },
  h3: { fontSize: 10, fontWeight: 700, marginTop: 8, marginBottom: 3 },
  p: { marginBottom: 5 },
  small: { fontSize: 8.5, color: '#555' },
  bold: { fontWeight: 700 },
  bullet: { flexDirection: 'row', marginBottom: 3, paddingLeft: 4 },
  bulletDot: { width: 10 },
  bulletText: { flex: 1 },
  headerBox: { marginBottom: 18, paddingBottom: 10, borderBottom: '1pt solid #ccc' },
  signRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 },
  signBlock: { width: '45%' },
  signLine: { marginTop: 30, borderTop: '0.5pt solid #999', paddingTop: 4 },
  footer: { position: 'absolute', bottom: 24, left: 48, right: 48, fontSize: 8, color: '#999', textAlign: 'center' },
})

// Formatage manuel (espace normale comme séparateur de milliers) : la police PDF de
// base (Helvetica) ne contient pas le glyphe de l'espace fine insécable qu'utilise
// Intl.NumberFormat('fr-FR') par défaut, ce qui produit un caractère erroné à l'impression.
function euros(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  const fixed = n.toFixed(2)
  const [intPart, decPart] = fixed.split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${grouped},${decPart} €`
}

function amountFull(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  const words = amountInWords(Math.trunc(n))
  return `${words} EUROS (${euros(n)})`
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  )
}

type Agency = {
  name: string
  legal_form: string
  share_capital: number | null
  siren: string
  rcs_city: string
  address: string
  phone: string
  email: string
  legal_rep_civility: string
  legal_rep_first_name: string
  legal_rep_last_name: string
  carte_pro_number: string
  carte_pro_date: string | null
  carte_pro_cci: string
  insurer_name: string
  insurer_address: string
  insurer_policy_number: string
}

type Party = {
  civility: string
  first_name: string
  last_name: string
  address: string
  birth_date: string | null
  birth_place: string
  nationality: string
  marital_status: string
  phone: string
  email: string
}

type Mandate = {
  type: string
  mandate_number: number | null
  address: string
  property_type: string
  surface: number | null
  pieces: number | null
  price: number | null
  exclusivity: string
  duration_months: number | null
  renewal_notice_days: number
  notes: string
}

function AgencyBlock({ agency }: { agency: Agency }) {
  const rep = `${agency.legal_rep_civility} ${agency.legal_rep_first_name} ${agency.legal_rep_last_name}`.trim()
  return (
    <View>
      <Text style={styles.p}>
        {agency.legal_form || 'Société'} <Text style={styles.bold}>{agency.name}</Text> au capital de{' '}
        {agency.share_capital ? euros(agency.share_capital) : '—'}, dont le siège social est situé au{' '}
        {agency.address || '—'}, immatriculée sous le numéro de SIREN {agency.siren || '—'} RCS de{' '}
        {agency.rcs_city || '—'}, dont le représentant est {rep || '—'}.
      </Text>
      <Text style={styles.p}>
        Téléphone de contact : {agency.phone || '—'} — Adresse mail de contact : {agency.email || '—'}
      </Text>
      <Text style={styles.p}>
        Titulaire de la carte professionnelle numéro {agency.carte_pro_number || '—'}, délivrée le{' '}
        {agency.carte_pro_date ? fmtDate(agency.carte_pro_date) : '—'} par la CCI de{' '}
        {agency.carte_pro_cci || '—'}.
      </Text>
      <Text style={styles.p}>
        L&apos;Agence n&apos;ayant pas souscrit la déclaration prévue au 6° de l&apos;article 3 ou au 4° de
        l&apos;article 80 de la loi n° 70-9 du 2 janvier 1970, ne peut recevoir ni détenir d&apos;autres fonds,
        effets ou valeurs que ceux représentatifs de sa rémunération ou de ses honoraires.
      </Text>
      <Text style={styles.p}>
        Agence titulaire d&apos;une police d&apos;assurance Responsabilité Civile Professionnelle souscrite auprès
        de {agency.insurer_name || '—'}, situé {agency.insurer_address || '—'}, sous le numéro{' '}
        {agency.insurer_policy_number || '—'}.
      </Text>
      <Text style={styles.p}>
        La représentation de l&apos;agence est assurée par {rep || '—'}, son représentant légal.
      </Text>
      <Text style={styles.p}>Ci-après dénommé le &quot;Mandataire&quot; ou &quot;l&apos;Agence&quot; dans le reste de l&apos;acte.</Text>
    </View>
  )
}

function PartyBlock({ party }: { party: Party }) {
  return (
    <Text style={styles.p}>
      {party.civility} {party.first_name} {party.last_name} demeurant {party.address || '—'}.
      {party.birth_place ? ` Né(e) à ${party.birth_place}` : ''}
      {party.birth_date ? ` le ${fmtDate(party.birth_date)}` : ''}
      {party.nationality ? `. De nationalité ${party.nationality}.` : '.'}
      {party.phone ? ` Téléphone : ${party.phone}.` : ''}
      {party.email ? ` Email : ${party.email}.` : ''}
      {party.marital_status ? ` ${party.marital_status}.` : ''}
    </Text>
  )
}

const LEGAL_BOILERPLATE = {
  discrimination: `Il est ici rappelé que constitue une discrimination toute distinction opérée entre les personnes en raison de leurs origine, sexe, situation de famille, grossesse, apparence physique, particulière vulnérabilité résultant de leur situation économique, apparente ou connue de son auteur, patronyme, lieu de résidence, état de santé, perte d'autonomie, handicap, caractéristiques génétiques, moeurs, orientation sexuelle, identité de genre, âge, opinions politiques, activités syndicales, capacité à s'exprimer dans une langue autre que le français, appartenance ou non-appartenance, vraie ou supposée, à une ethnie, une nation, une prétendue race ou une religion déterminée. Le mandataire informe le mandant que toute discrimination commise à l'égard d'une personne est ainsi punie de trois ans d'emprisonnement et de 45 000 € d'amende (article 225-2 du code pénal). En conséquence, les parties prennent l'engagement exprès de n'opposer à un candidat à l'acquisition des présents biens aucun refus fondé sur un motif discriminatoire au sens de l'article 225-1 du code pénal. Par ailleurs, le mandant s'interdit expressément de donner au mandataire des directives et consignes, verbales ou écrites, tendant à refuser l'acquisition pour des motifs discriminatoires au sens de l'article 225-1 du code pénal.`,
  donneesPersonnelles: [
    `Le Mandant est informé et accepte que le Mandataire puisse collecter, stocker, traiter et utiliser les données personnelles mentionnées au Mandat, conformément aux dispositions de la loi Informatique et Libertés du 6 janvier 1978. Ces opérations de traitement sont nécessaires à la conclusion et l'exécution du Mandat.`,
    `Le traitement de ces données a pour base juridique l'exécution du contrat avec le Mandataire ainsi que le respect des obligations légales relatives notamment à la lutte contre le blanchiment de capitaux et le financement du terrorisme.`,
    `Les informations collectées sont strictement confidentielles et ne sont destinées qu'au Mandataire et aux personnes intervenant dans le cadre de l'exécution de l'opération immobilière. En conséquence, les données personnelles ne sont transmises à aucun tiers en dehors des intervenants dans le cadre de l'exécution de l'opération immobilière (avocats, notaires, etc.). En concluant le présent Mandat, le Mandant consent que ses données personnelles puissent être communiquées par le Mandataire auxdits intervenants.`,
    `Aucune utilisation des données personnelles du Mandant à d'autres fins que les finalités décrites au présent article ne sera effectuée par le Mandataire sans le consentement préalable exprès du Mandant.`,
    `Les données personnelles du Mandant sont conservées pour la durée nécessaire à l'exécution de l'opération immobilière, augmentée le cas échéant des délais légaux de prescription applicables.`,
    `Conformément à la règlementation, le Mandant dispose des droits de demander l'accès, la rectification, l'effacement, une limitation ou opposition au traitement de ses données personnelles et la portabilité de ses données. Il dispose également de la faculté de formuler des directives sur le sort de ses données après son décès et d'introduire une réclamation auprès de la CNIL. Le Mandant peut exercer ses droits en contactant le Mandataire aux adresses ci-dessus indiquées.`,
  ],
  infoMandant: `En sa qualité de consommateur, le Mandant reconnait avoir reçu du Mandataire, avant la signature du présent mandat, toutes les informations utiles au titre de l'obligation d'information précontractuelle, prévue par le Code de la Consommation. Le Mandant est également informé qu'il peut s'opposer à l'utilisation de ses coordonnées téléphoniques à des fins de prospection commerciales en s'inscrivant sur la liste d'opposition au démarchage téléphonique ou en s'inscrivant sur la liste rouge disponible sur le site bloctel.gouv.fr. En cas de différend, le Mandant est enfin informé qu'il devra adresser une réclamation écrite au Mandataire. Si la réponse à sa réclamation ne le satisfait pas ou en l'absence de réponse dans un délai de 30 jours, le Mandant pourra saisir le médiateur de la consommation compétent inscrit sur la liste des médiateurs agréés par la Commission d'évaluation et de contrôle de la médiation sur www.economie.gouv.fr/mediation-conso/saisir-mediateur.`,
  retractation: `Le présent mandat étant consenti hors établissement ou à distance, le Mandant bénéficie conformément aux articles L. 221-18 et suivants du Code de la Consommation, d'un délai de quatorze jours pour rétracter son consentement au présent mandat. Ce délai commencera à courir le premier jour qui suit la conclusion du mandat par l'ensemble des parties, et prendra fin à l'expiration de la dernière heure du dernier jour du délai. Si ce délai expire un samedi, un dimanche ou un jour férié ou chômé, il sera prorogé jusqu'au premier jour ouvrable suivant. S'il souhaite exercer son droit de rétractation, le Mandant pourra notifier sa décision en adressant au Mandataire une déclaration écrite en ce sens. L'exercice du droit de rétractation mettra fin aux obligations réciproques des parties d'exécuter le contrat.`,
  election: `Les parties soussignées font élection de domicile chacune à leur adresse respective indiquée en tête de l'acte.`,
}

export function MandateDocument({
  agency,
  mandate,
  parties,
}: {
  agency: Agency
  mandate: Mandate
  parties: Party[]
}) {
  const isVente = mandate.type === 'vente'
  const isExclusif = mandate.exclusivity === 'exclusif'
  const fee = feeForPrice(mandate.price)
  const title = isVente
    ? `MANDAT ${isExclusif ? 'EXCLUSIF' : 'SIMPLE'} DE VENTE N° ${mandate.mandate_number ?? '—'}`
    : `MANDAT DE RECHERCHE N° ${mandate.mandate_number ?? '—'}`

  return (
    <Document title={title}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.headerBox}>
          <Text style={styles.h1}>{title}</Text>
          <Text style={styles.small}>
            Conformément à la loi n° 70-9 du 2 janvier 1970 et au décret n° 72-678 du 20 juillet 1972
          </Text>
          <Text style={[styles.small, { marginTop: 4 }]}>
            {agency.name} — {agency.address}
          </Text>
        </View>

        <Text style={styles.h2}>Les parties à l&apos;acte</Text>
        <Text style={styles.h3}>Le Mandant</Text>
        {parties.length ? (
          parties.map((p, i) => <PartyBlock key={i} party={p} />)
        ) : (
          <Text style={styles.p}>—</Text>
        )}
        <Text style={styles.p}>Ci-après dénommé le &quot;Mandant&quot; dans le reste de l&apos;acte.</Text>

        <Text style={styles.h3}>Le Mandataire</Text>
        <AgencyBlock agency={agency} />

        <Text style={styles.h2}>Objet du contrat</Text>
        {isVente ? (
          <Text style={styles.p}>
            Le Mandant confère au Mandataire un mandat {isExclusif ? 'exclusif' : 'simple, sans exclusivité,'} de
            vendre le Bien désigné ci-dessous, aux conditions, prix et charges qui suivent, convenus entre les
            parties. Ce mandat porte le n° {mandate.mandate_number ?? '—'} au registre des mandats.
          </Text>
        ) : (
          <Text style={styles.p}>
            Le présent mandat a pour objet principal la recherche d&apos;un bien immobilier, ainsi que le conseil et
            l&apos;accompagnement du Mandant dans l&apos;ensemble des démarches liées à ce projet (visites, analyse
            des biens, négociation, financement, rédaction des documents juridiques liés à l&apos;acquisition). Ce
            mandat porte le n° {mandate.mandate_number ?? '—'} au registre des mandats.
          </Text>
        )}

        <Text style={styles.h2}>{isVente ? 'Désignation du bien' : 'Recherche du Mandant'}</Text>
        <Text style={styles.p}>
          {mandate.property_type || 'Bien'} situé {mandate.address || '—'}
          {mandate.surface ? `, d'une superficie d'environ ${mandate.surface} m²` : ''}
          {mandate.pieces ? `, ${mandate.pieces} pièce(s)` : ''}.
        </Text>
        {mandate.notes ? <Text style={styles.p}>{mandate.notes}</Text> : null}

        <Text style={styles.h2}>{isVente ? 'Prix de vente' : 'Budget'}</Text>
        <Text style={styles.p}>
          {isVente
            ? `Le prix de vente du Bien est fixé à la somme de ${amountFull(mandate.price)}.`
            : `Le budget maximum consacré à cette acquisition, honoraires du Mandataire inclus, est de ${amountFull(mandate.price)}.`}
        </Text>

        <Text style={styles.h2}>Honoraires du Mandataire</Text>
        <Text style={styles.p}>
          En cas de réalisation de l&apos;opération, le Mandataire aura droit à une rémunération d&apos;un montant
          de {amountFull(fee)} TTC. Ces honoraires sont à la charge du {isVente ? 'Vendeur' : 'Mandant'}, exigibles
          le jour où l&apos;opération sera effectivement conclue et réitérée par acte authentique.
        </Text>

        <Text style={styles.h2}>Durée du mandat</Text>
        <Text style={styles.p}>
          Le présent mandat est donné pour une durée de {mandate.duration_months ?? '—'} mois à compter de sa
          signature. À la fin de cette période, il prendra automatiquement fin. Il pourra être dénoncé à tout
          moment par chacune des parties avec un préavis de {mandate.renewal_notice_days} jours, par lettre
          recommandée avec demande d&apos;avis de réception, passé un délai de trois mois à compter de la
          signature du mandat.
          {isVente && isExclusif
            ? " La clause d'exclusivité peut être dénoncée dans les mêmes conditions après ce délai de trois mois ; à défaut de dénonciation, elle vaudra pour toute la durée du mandat."
            : ''}
        </Text>

        {isVente && (
          <>
            <Text style={styles.h2}>Obligations du Mandant</Text>
            <Bullet>Avoir la capacité juridique pour disposer pleinement du bien ;</Bullet>
            <Bullet>
              Ne faire l&apos;objet d&apos;aucune mesure de protection de la personne ni d&apos;aucune procédure
              collective, de redressement ou de liquidation judiciaire ;
            </Bullet>
            <Bullet>Que le bien ne fait l&apos;objet d&apos;aucune procédure de saisie immobilière.</Bullet>
            <Text style={styles.p}>
              Il s&apos;engage à remettre dans les meilleurs délais au Mandataire tous les documents nécessaires à
              l&apos;exécution du mandat (titre de propriété, diagnostics obligatoires, etc.).
            </Text>
            {isExclusif && (
              <>
                <Text style={styles.h3}>Conditions particulières au mandat exclusif</Text>
                <Text style={styles.p}>
                  Le Mandant déclare ne pas avoir déjà consenti de mandat de vente en cours de validité et
                  s&apos;interdit de le faire ultérieurement sans avoir préalablement dénoncé le présent mandat.
                  Pendant toute la durée du mandat, le Mandant s&apos;interdit de vendre le bien, directement ou par
                  l&apos;intermédiaire d&apos;un autre Mandataire. Pendant le cours du mandat et dans l&apos;année
                  qui suivra son expiration ou sa résiliation, le Mandant s&apos;interdit de vendre le Bien,
                  directement ou indirectement, à une personne présentée par le Mandataire.
                </Text>
              </>
            )}
          </>
        )}

        {!isVente && (
          <>
            <Text style={styles.h2}>Obligations du Mandant</Text>
            <Text style={styles.p}>
              Le Mandant déclare avoir la capacité juridique pour acquérir un bien immobilier, ne faire l&apos;objet
              d&apos;aucune mesure de protection de la personne ni d&apos;aucune procédure collective, et
              n&apos;avoir pas consenti par ailleurs de mandat exclusif de recherche non expiré ou dénoncé. Il
              s&apos;engage à collaborer pleinement avec le Mandataire et à signer, aux conditions prévues par le
              présent mandat, tout compromis ou promesse de vente avec le vendeur que lui aura présenté le
              Mandataire.
            </Text>
            <Text style={styles.p}>
              Pendant le cours du présent mandat et dans l&apos;année qui suivra son expiration ou sa résiliation,
              le Mandant s&apos;interdit de traiter directement ou indirectement avec un Vendeur présenté par le
              Mandataire, concernant l&apos;acquisition du bien correspondant à la description ci-dessus, sous
              peine d&apos;une indemnité forfaitaire égale au montant des honoraires prévus au présent mandat.
            </Text>
          </>
        )}

        <Text style={styles.h2}>Données personnelles</Text>
        {LEGAL_BOILERPLATE.donneesPersonnelles.map((t, i) => (
          <Text key={i} style={styles.p}>
            {t}
          </Text>
        ))}

        {isVente && (
          <>
            <Text style={styles.h2}>Engagement de non-discrimination</Text>
            <Text style={styles.p}>{LEGAL_BOILERPLATE.discrimination}</Text>
          </>
        )}

        <Text style={styles.h2}>Information du Mandant</Text>
        <Text style={styles.p}>{LEGAL_BOILERPLATE.infoMandant}</Text>

        <Text style={styles.h2}>Droit de rétractation</Text>
        <Text style={styles.p}>{LEGAL_BOILERPLATE.retractation}</Text>

        <Text style={styles.h2}>Élection de domicile</Text>
        <Text style={styles.p}>{LEGAL_BOILERPLATE.election}</Text>

        <Text style={styles.h2}>Signatures</Text>
        <View style={styles.signRow}>
          <View style={styles.signBlock}>
            {parties.map((p, i) => (
              <View key={i} style={styles.signLine}>
                <Text>
                  {p.civility} {p.first_name} {p.last_name}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.signBlock}>
            <View style={styles.signLine}>
              <Text>
                {agency.legal_rep_civility} {agency.legal_rep_first_name} {agency.legal_rep_last_name}
              </Text>
              <Text style={styles.small}>Pour {agency.name}</Text>
            </View>
          </View>
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  )
}
