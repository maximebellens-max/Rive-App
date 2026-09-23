// Modèle de document partagé pour le mandat de vente/recherche — la même
// logique de rédaction (quelle phrase, quelle donnée va où, quelles clauses
// sont conditionnelles) sert à la fois à l'aperçu en direct affiché dans
// l'éditeur (mandate-live-preview.tsx, rendu HTML) et au PDF final
// (mandate-pdf.tsx, rendu react-pdf) — un seul endroit à corriger si une
// formulation change, jamais de risque que les deux dérivent l'un de
// l'autre. Inspiré du principe de rédaction "texte à trous" de MyNotary :
// chaque section est une liste de paragraphes, chaque paragraphe une liste
// de jetons (texte fixe, ou donnée insérée) — un jeton "field" est ce qui
// s'affiche en surbrillance dans l'aperçu, pour montrer d'un coup d'œil ce
// qui vient d'être saisi.
import { feeForPrice } from './mandates'
import { amountInWords } from './number-to-words'

export type Token = { kind: 'text'; text: string } | { kind: 'field'; field: string; text: string; empty: boolean }
export type Paragraph = Token[]
export type DocSection = { id: string; title: string; paragraphs: Paragraph[] }

function t(text: string): Token {
  return { kind: 'text', text }
}

function f(field: string, value: string | number | null | undefined, placeholder = '—'): Token {
  const empty = value === null || value === undefined || value === ''
  return { kind: 'field', field, text: empty ? placeholder : String(value), empty }
}

// Variante pour un montant déjà mis en forme par amountFull/euros (qui
// renvoient eux-mêmes '—' quand la valeur brute est vide) : sans ce
// helper, passer directement le texte déjà formaté à f() ferait lire
// empty=false même pour un prix non renseigné, puisque la chaîne '—'
// n'est ni null, ni undefined, ni vide — le jeton se serait affiché en
// "rempli" (surlignage accent) au lieu de "vide" (surlignage avertissement).
// L'état vide/rempli se juge donc toujours sur la valeur BRUTE, jamais sur
// le texte déjà mis en forme.
function fMoney(field: string, raw: number | null | undefined, display: string): Token {
  const empty = raw === null || raw === undefined
  return { kind: 'field', field, text: display, empty }
}

// Espace normale (pas d'espace fine insécable, absente de la police PDF de
// base) comme séparateur de milliers — voir la même remarque dans
// mandate-pdf.tsx, dont cette fonction est la copie exacte pour ne jamais
// afficher un montant différemment entre l'aperçu et le PDF final.
export function euros(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  const fixed = n.toFixed(2)
  const [intPart, decPart] = fixed.split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${grouped},${decPart} €`
}

export function amountFull(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  const words = amountInWords(Math.trunc(n))
  return `${words} EUROS (${euros(n)})`
}

export type MandateVenteInput = {
  type: string
  exclusivity: string
  address: string
  property_type: string
  surface: number | null
  pieces: number | null
  price: number | null
  duration_months: number | null
  renewal_notice_days: number | null
  notes: string
}

// Sections dont le contenu dépend des champs "Bien / Prix / Honoraires /
// Durée / Exclusivité" édités dans l'onglet Rédaction — volontairement
// séparées des blocs Mandant/Mandataire (état civil, coordonnées agence) qui
// eux ne se retapent jamais en direct : ils sont déjà remplis une fois pour
// toutes (voir createMandate, qui reprend l'état civil du prospect) et ne
// se modifient qu'à la marge.
export function buildVenteSections(mandate: MandateVenteInput): DocSection[] {
  const isVente = mandate.type === 'vente'
  const isExclusif = mandate.exclusivity === 'exclusif'
  const fee = feeForPrice(mandate.price)

  const sections: DocSection[] = []

  sections.push({
    id: 'objet',
    title: 'Objet du contrat',
    paragraphs: [
      isVente
        ? [
            t('Le Mandant confère au Mandataire un mandat '),
            f('exclusivity', isExclusif ? 'exclusif' : mandate.exclusivity === 'simple' ? 'simple, sans exclusivité,' : '', 'à préciser'),
            t(' de vendre le Bien désigné ci-dessous, aux conditions, prix et charges qui suivent, convenus entre les parties.'),
          ]
        : [
            t(
              "Le présent mandat a pour objet principal la recherche d'un bien immobilier, ainsi que le conseil et l'accompagnement du Mandant dans l'ensemble des démarches liées à ce projet (visites, analyse des biens, négociation, financement, rédaction des documents juridiques liés à l'acquisition)."
            ),
          ],
    ],
  })

  sections.push({
    id: 'bien',
    title: isVente ? 'Désignation du bien' : 'Recherche du Mandant',
    paragraphs: [
      [
        f('property_type', mandate.property_type, 'Bien'),
        t(' situé '),
        f('address', mandate.address),
        ...(mandate.surface ? [t(", d'une superficie d'environ "), f('surface', `${mandate.surface} m²`)] : []),
        ...(mandate.pieces ? [t(', '), f('pieces', `${mandate.pieces} pièce(s)`)] : []),
        t('.'),
      ],
      ...(mandate.notes ? [[f('notes', mandate.notes)] as Paragraph] : []),
    ],
  })

  sections.push({
    id: 'prix',
    title: isVente ? 'Prix de vente' : 'Budget',
    paragraphs: [
      isVente
        ? [t('Le prix de vente du Bien est fixé à la somme de '), fMoney('price', mandate.price, amountFull(mandate.price)), t('.')]
        : [
            t("Le budget maximum consacré à cette acquisition, honoraires du Mandataire inclus, est de "),
            fMoney('price', mandate.price, amountFull(mandate.price)),
            t('.'),
          ],
    ],
  })

  sections.push({
    id: 'honoraires',
    title: 'Honoraires du Mandataire',
    paragraphs: [
      [
        t("En cas de réalisation de l'opération, le Mandataire aura droit à une rémunération d'un montant de "),
        // Même champ "price" que la section Prix ci-dessus (les honoraires
        // sont un pourcentage du prix, jamais saisis séparément) : l'état
        // vide/rempli suit donc mandate.price, pas le montant calculé "fee"
        // (qui vaut 0 — jamais vide — même quand price est null).
        fMoney('price', mandate.price, amountFull(fee)),
        t(' TTC. Ces honoraires sont à la charge du '),
        // Texte simple (pas un jeton "field") : dérivé du type de mandat, pas
        // d'un champ modifiable dans l'éditeur — ne doit donc pas être
        // compté ni surligné comme une donnée saisie.
        t(isVente ? 'Vendeur' : 'Mandant'),
        t(", exigibles le jour où l'opération sera effectivement conclue et réitérée par acte authentique."),
      ],
    ],
  })

  const dureeParagraph: Paragraph = [
    t('Le présent mandat est donné pour une durée de '),
    f('duration_months', mandate.duration_months, 'à préciser'),
    t(' mois à compter de sa signature. À la fin de cette période, il prendra automatiquement fin. Il pourra être dénoncé à tout moment par chacune des parties avec un préavis de '),
    f('renewal_notice_days', mandate.renewal_notice_days ?? 15),
    t(" jours, par lettre recommandée avec demande d'avis de réception, passé un délai de trois mois à compter de la signature du mandat."),
  ]
  if (isVente && isExclusif) {
    dureeParagraph.push(
      t(
        " La clause d'exclusivité peut être dénoncée dans les mêmes conditions après ce délai de trois mois ; à défaut de dénonciation, elle vaudra pour toute la durée du mandat."
      )
    )
  }
  sections.push({ id: 'duree', title: 'Durée du mandat', paragraphs: [dureeParagraph] })

  if (isVente && isExclusif) {
    sections.push({
      id: 'clause_exclusivite',
      title: 'Conditions particulières au mandat exclusif',
      paragraphs: [
        [
          t(
            "Le Mandant déclare ne pas avoir déjà consenti de mandat de vente en cours de validité et s'interdit de le faire ultérieurement sans avoir préalablement dénoncé le présent mandat. Pendant toute la durée du mandat, le Mandant s'interdit de vendre le bien, directement ou par l'intermédiaire d'un autre Mandataire. Pendant le cours du mandat et dans l'année qui suivra son expiration ou sa résiliation, le Mandant s'interdit de vendre le Bien, directement ou indirectement, à une personne présentée par le Mandataire."
          ),
        ],
      ],
    })
  }

  return sections
}

// Nombre de champs "réellement remplis" sur un ensemble de sections — sert
// à la petite jauge de complétion par catégorie (ex. "4/6") affichée dans
// l'éditeur, à l'image du "13/13" vu sur les fiches MyNotary.
export function sectionCompletion(sections: DocSection[]): { filled: number; total: number } {
  let filled = 0
  let total = 0
  const seen = new Set<string>()
  for (const s of sections) {
    for (const p of s.paragraphs) {
      for (const tok of p) {
        if (tok.kind !== 'field') continue
        if (seen.has(tok.field)) continue
        seen.add(tok.field)
        total += 1
        if (!tok.empty) filled += 1
      }
    }
  }
  return { filled, total }
}