export function buildChangeLogData(store: any): {
  allChanges: Array<{ typ: string, schuelerName: string, feld: string, alt: string, neu: string }>
  exportTargetLabel: string
  printableLogLines: string[]
} {
  const schuelerById = new Map<number, any>((store.enmExport?.schueler ?? []).map((item: any) => [item.id, item]))
  const lerngruppeById = new Map<number, any>((store.enmExport?.lerngruppen ?? []).map((item: any) => [item.id, item]))
  const fachById = new Map<number, any>((store.enmExport?.faecher ?? []).map((item: any) => [item.id, item]))

  const noteChanges = store.listNoteChanges().map((change: any) => {
    const schueler = schuelerById.get(change.schuelerId)
    const lerngruppe = lerngruppeById.get(change.lerngruppeId)
    const fach = lerngruppe ? fachById.get(lerngruppe.fachID) : null
    return {
      typ: 'Note',
      schuelerName: schueler ? `${schueler.nachname}, ${schueler.vorname}` : `ID ${change.schuelerId}`,
      feld: fach?.kuerzelAnzeige || fach?.kuerzel || `Lerngruppe ${change.lerngruppeId}`,
      alt: change.originalNote ?? '–',
      neu: change.newNote ?? '–',
    }
  })

  const noteQuartalChanges = store.listNoteQuartalChanges().map((change: any) => {
    const schueler = schuelerById.get(change.schuelerId)
    const lerngruppe = lerngruppeById.get(change.lerngruppeId)
    const fach = lerngruppe ? fachById.get(lerngruppe.fachID) : null
    return {
      typ: 'Quartalsnote',
      schuelerName: schueler ? `${schueler.nachname}, ${schueler.vorname}` : `ID ${change.schuelerId}`,
      feld: fach?.kuerzelAnzeige || fach?.kuerzel || `Lerngruppe ${change.lerngruppeId}`,
      alt: change.originalNote ?? '–',
      neu: change.newNote ?? '–',
    }
  })

  const bemerkungLabels = {
    ASV: 'Arbeits- und Sozialverhalten',
    AUE: 'Ausserunterrichtliches Engagement',
    ZB: 'Zeugnisbemerkungen',
  } as const

  const bemerkungChanges = store.listBemerkungChanges().map((change: any) => {
    const schueler = schuelerById.get(change.schuelerId)
    return {
      typ: 'Bemerkung',
      schuelerName: schueler ? `${schueler.nachname}, ${schueler.vorname}` : `ID ${change.schuelerId}`,
      feld: bemerkungLabels[change.field as keyof typeof bemerkungLabels],
      alt: change.originalValue?.trim() || '–',
      neu: change.newValue?.trim() || '–',
    }
  })

  const fachbezogeneBemerkungChanges = store.listFachbezogeneBemerkungChanges().map((change: any) => {
    const schueler = schuelerById.get(change.schuelerId)
    const lerngruppe = lerngruppeById.get(change.lerngruppeId)
    const fach = lerngruppe ? fachById.get(lerngruppe.fachID) : null
    return {
      typ: 'Fachbemerkung',
      schuelerName: schueler ? `${schueler.nachname}, ${schueler.vorname}` : `ID ${change.schuelerId}`,
      feld: fach?.kuerzelAnzeige || fach?.kuerzel || `Lerngruppe ${change.lerngruppeId}`,
      alt: change.originalValue?.trim() || '–',
      neu: change.newValue?.trim() || '–',
    }
  })

  const fehlstundenLabels = {
    fehlstundenGesamt: 'Fehlstunden gesamt',
    fehlstundenGesamtUnentschuldigt: 'Fehlstunden unentschuldigt',
  } as const

  const fehlstundenChanges = store.listFehlstundenChanges().map((change: any) => {
    const schueler = schuelerById.get(change.schuelerId)
    return {
      typ: 'Fehlstunden',
      schuelerName: schueler ? `${schueler.nachname}, ${schueler.vorname}` : `ID ${change.schuelerId}`,
      feld: fehlstundenLabels[change.field as keyof typeof fehlstundenLabels],
      alt: String(change.originalValue),
      neu: String(change.newValue),
    }
  })

  const fachbezogeneFehlstundenLabels = {
    fehlstundenFach: 'FS',
    fehlstundenUnentschuldigtFach: 'FSU',
  } as const

  const fachbezogeneFehlstundenChanges = store.listFachbezogeneFehlstundenChanges().map((change: any) => {
    const schueler = schuelerById.get(change.schuelerId)
    const lerngruppe = lerngruppeById.get(change.lerngruppeId)
    const fach = lerngruppe ? fachById.get(lerngruppe.fachID) : null
    return {
      typ: 'Fachfehlstunden',
      schuelerName: schueler ? `${schueler.nachname}, ${schueler.vorname}` : `ID ${change.schuelerId}`,
      feld: `${fach?.kuerzelAnzeige || fach?.kuerzel || `Lerngruppe ${change.lerngruppeId}`} ${fachbezogeneFehlstundenLabels[change.field as keyof typeof fachbezogeneFehlstundenLabels]}`,
      alt: String(change.originalValue),
      neu: String(change.newValue),
    }
  })

  const teilleistungsartById = new Map<number, any>((store.enmExport?.teilleistungsarten ?? [])
    .map((item: any) => [Number(item.id), item]))

  const teilleistungChanges = store.listTeilleistungNoteChanges().map((change: any) => {
    const schueler = schuelerById.get(change.schuelerId)
    const lerngruppe = lerngruppeById.get(change.lerngruppeId)
    const fach = lerngruppe ? fachById.get(lerngruppe.fachID) : null
    const art = teilleistungsartById.get(change.artID)
    return {
      typ: 'Teilleistung',
      schuelerName: schueler ? `${schueler.nachname}, ${schueler.vorname}` : `ID ${change.schuelerId}`,
      feld: `${fach?.kuerzelAnzeige || fach?.kuerzel || `Lerngruppe ${change.lerngruppeId}`} · ${art?.bezeichnung || `Art ${change.artID}`}`,
      alt: change.originalValue ?? '–',
      neu: change.newValue ?? '–',
    }
  })

  const allChanges = [
    ...noteChanges,
    ...noteQuartalChanges,
    ...fehlstundenChanges,
    ...fachbezogeneFehlstundenChanges,
    ...bemerkungChanges,
    ...fachbezogeneBemerkungChanges,
    ...teilleistungChanges,
  ]

  const exportTargetLabel = store.dataSource === 'server'
    ? 'SVWS-Server (Import v2)'
    : store.dataSource === 'file'
      ? 'Download als enm.changed.json.gz'
      : 'Unbekannte Datenquelle'

  const printableLogLines = [
    `Aenderungslog vom ${new Date().toLocaleString('de-DE')}`,
    `Gesamt: ${allChanges.length} Aenderungen`,
    '',
    ...allChanges.map((item, index) => `${index + 1}. [${item.typ}] ${item.schuelerName} | ${item.feld} | Alt: ${item.alt} | Neu: ${item.neu}`),
  ]

  return {
    allChanges,
    exportTargetLabel,
    printableLogLines,
  }
}
