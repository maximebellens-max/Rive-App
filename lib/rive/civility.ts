// Devine la civilité (Monsieur/Madame) à partir du prénom saisi, pour éviter
// à l'agent de la choisir à la main à chaque nouvelle fiche — reste modifiable
// partout où elle s'affiche (fiche prospect, création de mandat). Approche
// volontairement simple (liste de prénoms courants) plutôt qu'un service
// externe : pas de dépendance réseau, pas de latence, et le marché visé
// (France/Suisse romande) est couvert par une liste de prénoms usuels. Un
// prénom absent de la liste (rare, composé inhabituel, prénom étranger...) ne
// force rien : l'agent choisit lui-même, comme avant.

const FEMININE_FIRST_NAMES = new Set([
  'marie', 'nathalie', 'isabelle', 'sylvie', 'catherine', 'martine', 'christine', 'monique',
  'francoise', 'brigitte', 'anne', 'jacqueline', 'nicole', 'chantal', 'genevieve', 'sandrine',
  'valerie', 'corinne', 'patricia', 'veronique', 'stephanie', 'celine', 'julie', 'aurelie',
  'emilie', 'laetitia', 'caroline', 'virginie', 'delphine', 'audrey', 'marion', 'camille',
  'manon', 'laura', 'lea', 'chloe', 'sarah', 'clara', 'emma', 'lucie', 'jeanne', 'louise',
  'alice', 'juliette', 'margaux', 'pauline', 'charlotte', 'elodie', 'melanie', 'karine',
  'sophie', 'sandra', 'severine', 'aurore', 'claire', 'helene', 'laurence', 'beatrice',
  'dominique', 'agnes', 'annie', 'denise', 'simone', 'yvette', 'josiane', 'georgette',
  'suzanne', 'renee', 'odette', 'ginette', 'colette', 'huguette', 'liliane', 'micheline',
  'danielle', 'claudine', 'jocelyne', 'marceline', 'raymonde', 'marguerite', 'therese',
  'gisele', 'paulette', 'solange', 'annick', 'bernadette', 'evelyne', 'ghislaine', 'jeannine',
  'josette', 'lucette', 'madeleine', 'micheline', 'noelle', 'yolande', 'fabienne', 'florence',
  'nadine', 'nadege', 'sabine', 'sabrina', 'sonia', 'tatiana', 'vanessa', 'viviane', 'wendy',
  'amelie', 'amandine', 'anais', 'angele', 'ines', 'jade', 'lina', 'lola', 'mila', 'nina',
  'rose', 'zoe', 'oceane', 'morgane', 'melissa', 'jessica', 'jennifer', 'kelly', 'linda',
  'diana', 'elise', 'estelle', 'fanny', 'gaelle', 'ines', 'iris', 'justine', 'kim', 'lauriane',
  'leila', 'lisa', 'maeva', 'maud', 'mathilde', 'maud', 'noemie', 'ophelie', 'perrine',
  'romane', 'roxane', 'tiffany', 'vicki', 'ambre', 'apolline', 'axelle', 'capucine', 'celia',
  'cindy', 'coralie', 'elsa', 'eva', 'gabrielle', 'inaya', 'jasmine', 'lily', 'lyna', 'maya',
  'mia', 'nolwenn', 'olivia', 'sasha', 'yasmine', 'agathe', 'albane', 'alix', 'anouk', 'aurea',
  'bianca', 'cassandre', 'celestine', 'diane', 'eleonore', 'elena', 'flavie', 'garance',
  'giulia', 'hortense', 'ida', 'irene', 'josephine', 'leonie', 'lou', 'luna', 'malia', 'melia',
  'melina', 'mona', 'nadia', 'naomi', 'oceane', 'pia', 'salome', 'thais', 'valentine', 'victoria',
  'yasmina', 'zelie', 'assia', 'aya', 'fatima', 'fatoumata', 'khadija', 'leila', 'nadia',
  'nour', 'samira', 'sofia', 'yasmine', 'zineb', 'aylin', 'elif', 'esma', 'meryem',
])

const MASCULINE_FIRST_NAMES = new Set([
  'jean', 'pierre', 'michel', 'andre', 'philippe', 'alain', 'bernard', 'jacques', 'daniel',
  'claude', 'gerard', 'christian', 'rene', 'patrick', 'roger', 'louis', 'marcel', 'georges',
  'henri', 'robert', 'francois', 'yves', 'guy', 'raymond', 'paul', 'joseph', 'maurice',
  'gilbert', 'roland', 'serge', 'bernard', 'dominique', 'didier', 'thierry', 'pascal',
  'eric', 'laurent', 'olivier', 'stephane', 'frederic', 'nicolas', 'sebastien', 'vincent',
  'julien', 'david', 'christophe', 'marc', 'jerome', 'gilles', 'bruno', 'denis', 'herve',
  'antoine', 'francois', 'benoit', 'thomas', 'guillaume', 'romain', 'maxime', 'alexandre',
  'mathieu', 'kevin', 'anthony', 'jonathan', 'florian', 'quentin', 'lucas', 'hugo', 'nathan',
  'leo', 'louis', 'gabriel', 'raphael', 'arthur', 'jules', 'adam', 'noah', 'ethan', 'tom',
  'theo', 'enzo', 'mathis', 'nolan', 'sacha', 'valentin', 'axel', 'baptiste', 'clement',
  'corentin', 'damien', 'dorian', 'elliot', 'fabien', 'gaetan', 'ismael', 'jason', 'kylian',
  'loic', 'mael', 'malo', 'martin', 'maxence', 'morgan', 'nicolas', 'oscar', 'remi', 'simon',
  'tanguy', 'thibault', 'timeo', 'ulysse', 'victor', 'wesley', 'yanis', 'zacharie', 'aaron',
  'adrien', 'alexis', 'ambroise', 'amine', 'anatole', 'angelo', 'aristide', 'armand',
  'augustin', 'aurelien', 'basile', 'brice', 'cedric', 'cesar', 'charles', 'cyril', 'diego',
  'donovan', 'edouard', 'elias', 'emile', 'emmanuel', 'erwan', 'evan', 'ewen', 'ferdinand',
  'flavien', 'franck', 'gaspard', 'geoffrey', 'germain', 'guillaume', 'hadrien', 'ibrahim',
  'ilyes', 'isaac', 'ivan', 'jean-baptiste', 'jean-marc', 'jean-paul', 'jean-pierre',
  'joachim', 'johan', 'jordan', 'josselin', 'karim', 'kilian', 'lenny', 'leon', 'lilian',
  'lorenzo', 'luca', 'ludovic', 'mahe', 'marius', 'marvin', 'matteo', 'mehdi', 'melvin',
  'milan', 'mohamed', 'nathanael', 'nino', 'noe', 'octave', 'owen', 'pablo', 'pacome',
  'pierre-antoine', 'quentin', 'rayan', 'regis', 'reda', 'reuben', 'rodolphe', 'ryan',
  'samuel', 'sofiane', 'stanislas', 'sullivan', 'sylvain', 'tanguy', 'teo', 'theodore',
  'thibaut', 'tristan', 'tristan', 'valentino', 'wael', 'xavier', 'yann', 'yassine', 'younes',
  'yuri', 'zakaria', 'ilan', 'idris', 'amir', 'walid', 'karam', 'malik',
])

function normalize(firstName: string): string {
  return firstName
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // accents
}

// Un prénom composé ("Jean-Baptiste", "Anne Sophie") est d'abord cherché tel
// quel, puis via son premier segment — la civilité d'un prénom composé se
// devine généralement au premier prénom.
export function guessCivility(firstName: string): 'Monsieur' | 'Madame' | null {
  const full = normalize(firstName)
  if (!full) return null

  const candidates = [full, ...full.split(/[\s-]+/).filter(Boolean)]

  for (const c of candidates) {
    if (FEMININE_FIRST_NAMES.has(c)) return 'Madame'
    if (MASCULINE_FIRST_NAMES.has(c)) return 'Monsieur'
  }
  return null
}