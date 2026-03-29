/**
 * ZIP-Parser für den Browser
 * Entpackt eine .gz-Datei (SVWS ENM-Export) und parst das enthaltene JSON.
 *
 * Abhängigkeit: fflate (npm install fflate)
 * SVWS liefert eine einzelne enm.json in einem .gz-Container (kein ZIP-Archiv).
 */

import { gunzipSync } from 'fflate'
import type { EnmExport } from '../types/enm'
import { validateEnmExport } from '../types/validation'

// ---------------------------------------------------------------------------
// Hauptfunktion
// ---------------------------------------------------------------------------

/**
 * Entpackt und parst einen SVWS ENM-Export.
 * Akzeptiert sowohl ArrayBuffer (aus fetch) als auch File (aus <input>).
 *
 * @throws TypeError  wenn das JSON nicht dem ENM-Schema entspricht
 * @throws SyntaxError wenn das JSON nicht parsebar ist
 * @throws Error       bei Entpack-Fehlern
 */
export async function parseEnmGzip(input: ArrayBuffer | File): Promise<EnmExport> {
  const buffer = await toUint8Array(input)
  const jsonBytes = decompress(buffer)
  const raw = parseJson(jsonBytes)
  return validateEnmExport(raw)
}

// ---------------------------------------------------------------------------
// Interne Hilfsfunktionen
// ---------------------------------------------------------------------------

async function toUint8Array(input: ArrayBuffer | File): Promise<Uint8Array> {
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input)
  }

  // File → ArrayBuffer → Uint8Array
  const buffer = await input.arrayBuffer()
  return new Uint8Array(buffer)
}

function decompress(data: Uint8Array): Uint8Array {
  try {
    return gunzipSync(data)
  } catch (err) {
    throw new Error(
      `Die Datei konnte nicht entpackt werden. ` +
      `Bitte prüfen Sie, ob es sich um eine gültige .gz-Datei handelt. ` +
      `(${err instanceof Error ? err.message : String(err)})`
    )
  }
}

function parseJson(data: Uint8Array): unknown {
  const text = new TextDecoder('utf-8').decode(data)
  try {
    return JSON.parse(text)
  } catch (err) {
    throw new SyntaxError(
      `Die entpackte Datei enthält kein gültiges JSON. ` +
      `(${err instanceof Error ? err.message : String(err)})`
    )
  }
}
