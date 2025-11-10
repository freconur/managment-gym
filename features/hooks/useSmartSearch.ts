import { useState, useEffect, useMemo, useCallback } from 'react'

export interface SearchableItem {
  id?: string
  name?: string
}

interface UseSmartSearchOptions {
  items: SearchableItem[]
  debounceDelay?: number
  autoSelect?: boolean
  onAutoSelect?: (item: SearchableItem) => void
}

interface UseSmartSearchReturn {
  searchTerm: string
  debouncedSearchTerm: string
  setSearchTerm: (term: string) => void
  filteredItems: SearchableItem[]
  clearSearch: () => void
}

// Función de normalización de texto (elimina acentos y convierte a minúsculas)
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina diacríticos (acentos)
    .trim()
}

// Algoritmo de distancia de Levenshtein optimizado (mide la diferencia entre dos strings)
const levenshteinDistance = (str1: string, str2: string): number => {
  const len1 = str1.length
  const len2 = str2.length

  // Si una cadena está vacía, la distancia es la longitud de la otra
  if (len1 === 0) return len2
  if (len2 === 0) return len1

  // Si las cadenas son idénticas, distancia es 0
  if (str1 === str2) return 0

  // Optimización: usar solo dos filas en lugar de una matriz completa
  // Esto reduce el uso de memoria de O(n*m) a O(min(n,m))
  let prevRow: number[] = Array(len2 + 1).fill(0).map((_, i) => i)
  let currRow: number[] = Array(len2 + 1).fill(0)

  // Calcular distancia fila por fila
  for (let i = 1; i <= len1; i++) {
    currRow[0] = i
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      currRow[j] = Math.min(
        prevRow[j] + 1,           // eliminación
        currRow[j - 1] + 1,      // inserción
        prevRow[j - 1] + cost     // sustitución
      )
    }
    // Intercambiar filas para la siguiente iteración
    ;[prevRow, currRow] = [currRow, prevRow]
  }

  return prevRow[len2]
}

// Calcular similitud entre dos strings (0-1, donde 1 es idéntico)
const calculateSimilarity = (str1: string, str2: string): number => {
  if (str1 === str2) return 1
  if (str1.length === 0 || str2.length === 0) return 0

  const maxLen = Math.max(str1.length, str2.length)
  const distance = levenshteinDistance(str1, str2)
  const similarity = 1 - distance / maxLen

  return Math.max(0, similarity)
}

// Búsqueda difusa mejorada (encuentra substrings similares)
const fuzzyMatch = (
  text: string,
  pattern: string,
  threshold: number = 0.6
): { matched: boolean; similarity: number; bestMatch?: string } => {
  const normalizedText = normalizeText(text)
  const normalizedPattern = normalizeText(pattern)

  // Si coincide exactamente
  if (normalizedText === normalizedPattern) {
    return { matched: true, similarity: 1, bestMatch: normalizedText }
  }

  // Si el patrón está contenido exactamente
  if (normalizedText.includes(normalizedPattern)) {
    return { matched: true, similarity: 0.95, bestMatch: normalizedPattern }
  }

  // Si el texto empieza con el patrón
  if (normalizedText.startsWith(normalizedPattern)) {
    return { matched: true, similarity: 0.9, bestMatch: normalizedPattern }
  }

  // Búsqueda difusa en el texto completo
  const fullSimilarity = calculateSimilarity(normalizedText, normalizedPattern)
  if (fullSimilarity >= threshold) {
    return { matched: true, similarity: fullSimilarity, bestMatch: normalizedText }
  }

  // Búsqueda difusa por palabras
  const textWords = normalizedText.split(/\s+/)
  const patternWords = normalizedPattern.split(/\s+/)

  // Si todas las palabras del patrón tienen coincidencias difusas
  let allWordsMatched = true
  let totalSimilarity = 0
  let matchedCount = 0

  for (const patternWord of patternWords) {
    let bestWordSimilarity = 0
    let wordMatched = false

    for (const textWord of textWords) {
      const wordSimilarity = calculateSimilarity(textWord, patternWord)
      if (wordSimilarity >= threshold) {
        wordMatched = true
        bestWordSimilarity = Math.max(bestWordSimilarity, wordSimilarity)
      }
    }

    if (wordMatched) {
      totalSimilarity += bestWordSimilarity
      matchedCount++
    } else {
      allWordsMatched = false
    }
  }

  if (allWordsMatched && matchedCount > 0) {
    const avgSimilarity = totalSimilarity / matchedCount
    return { matched: true, similarity: avgSimilarity * 0.8, bestMatch: normalizedPattern }
  }

  // Búsqueda difusa por substrings (optimizada - solo si el patrón es corto)
  if (normalizedPattern.length <= 8) {
    const minSubstringLength = Math.min(3, normalizedPattern.length)
    let bestSubstringSimilarity = 0
    const maxSubstringLength = normalizedPattern.length + 2

    // Limitar la búsqueda para mejorar el rendimiento
    for (let i = 0; i <= Math.min(normalizedText.length - minSubstringLength, 50); i++) {
      const maxLen = Math.min(normalizedText.length - i, maxSubstringLength)
      for (let len = minSubstringLength; len <= maxLen; len++) {
        const substring = normalizedText.substring(i, i + len)
        const similarity = calculateSimilarity(substring, normalizedPattern)
        bestSubstringSimilarity = Math.max(bestSubstringSimilarity, similarity)

        // Si encontramos una similitud muy alta, podemos parar
        if (bestSubstringSimilarity >= 0.9) break
      }
      if (bestSubstringSimilarity >= 0.9) break
    }

    if (bestSubstringSimilarity >= threshold) {
      return { matched: true, similarity: bestSubstringSimilarity * 0.7, bestMatch: normalizedPattern }
    }
  }

  return { matched: false, similarity: 0 }
}

// Función de búsqueda inteligente y eficiente
const smartSearch = (
  items: SearchableItem[],
  searchTerm: string
): SearchableItem[] => {
  const trimmedSearch = searchTerm.trim()

  // Si no hay término de búsqueda, retornar todos los items
  if (!trimmedSearch) {
    return items
  }

  // Si el término es muy corto (1 carácter), búsqueda simple y rápida
  if (trimmedSearch.length === 1) {
    const normalizedSearch = normalizeText(trimmedSearch)
    return items.filter(item => {
      if (!item.name) return false
      const normalizedName = normalizeText(item.name)
      return normalizedName.includes(normalizedSearch) || normalizedName.startsWith(normalizedSearch)
    })
  }

  const normalizedSearch = normalizeText(trimmedSearch)
  const searchWords = normalizedSearch.split(/\s+/).filter(word => word.length > 0)

  // Si no hay palabras válidas, retornar todos los items
  if (searchWords.length === 0) {
    return items
  }

  // Cache para nombres normalizados (evita normalizar múltiples veces)
  const normalizedCache = new Map<string, string>()

  // Función para obtener nombre normalizado (con cache)
  const getNormalizedName = (name: string): string => {
    if (!normalizedCache.has(name)) {
      normalizedCache.set(name, normalizeText(name))
    }
    return normalizedCache.get(name)!
  }

  // Función para calcular el score de coincidencia (con búsqueda difusa)
  const calculateScore = (itemName: string): number => {
    const normalizedName = getNormalizedName(itemName)

    // Búsqueda difusa con umbral adaptativo según la longitud del término
    const threshold = normalizedSearch.length <= 3 ? 0.5 : 0.6
    const fuzzyResult = fuzzyMatch(itemName, normalizedSearch, threshold)

    // Si el nombre coincide exactamente
    if (normalizedName === normalizedSearch) {
      return 100
    }

    // Si el nombre empieza con el término de búsqueda
    if (normalizedName.startsWith(normalizedSearch)) {
      return 90
    }

    // Si la búsqueda difusa encontró una coincidencia muy buena (similarity > 0.85)
    if (fuzzyResult.matched && fuzzyResult.similarity > 0.85) {
      return Math.round(85 + (fuzzyResult.similarity - 0.85) * 15) // 85-100
    }

    // Si todas las palabras están presentes exactamente
    const allWordsMatch = searchWords.every(word => normalizedName.includes(word))
    if (allWordsMatch) {
      // Priorizar si la primera palabra está al inicio
      if (normalizedName.startsWith(searchWords[0])) {
        return 80
      }
      // Priorizar si todas las palabras están juntas
      if (normalizedName.includes(normalizedSearch)) {
        return 75
      }
      return 70
    }

    // Si la búsqueda difusa encontró una coincidencia buena (similarity > 0.7)
    if (fuzzyResult.matched && fuzzyResult.similarity > 0.7) {
      return Math.round(60 + (fuzzyResult.similarity - 0.7) * 20) // 60-80
    }

    // Si todas las palabras tienen coincidencias difusas
    let allWordsFuzzyMatch = true
    let avgFuzzySimilarity = 0
    let fuzzyMatchCount = 0

    for (const word of searchWords) {
      const wordFuzzyResult = fuzzyMatch(itemName, word, 0.5)
      if (wordFuzzyResult.matched) {
        avgFuzzySimilarity += wordFuzzyResult.similarity
        fuzzyMatchCount++
      } else {
        allWordsFuzzyMatch = false
      }
    }

    if (allWordsFuzzyMatch && fuzzyMatchCount > 0) {
      const avgSimilarity = avgFuzzySimilarity / fuzzyMatchCount
      return Math.round(50 + avgSimilarity * 20) // 50-70
    }

    // Si alguna palabra está presente exactamente
    const someWordsMatch = searchWords.some(word => normalizedName.includes(word))
    if (someWordsMatch) {
      return 50
    }

    // Si la búsqueda difusa encontró alguna coincidencia (similarity > 0.5)
    if (fuzzyResult.matched && fuzzyResult.similarity > 0.5) {
      return Math.round(30 + (fuzzyResult.similarity - 0.5) * 40) // 30-50
    }

    return 0
  }

  // Filtrar y ordenar por relevancia (optimizado)
  const results: Array<{ item: SearchableItem; score: number }> = []

  for (const item of items) {
    if (!item.name) continue
    const score = calculateScore(item.name)
    if (score > 0) {
      results.push({ item, score })
    }
  }

  // Ordenar por score descendente
  results.sort((a, b) => b.score - a.score)

  return results.map(({ item }) => item)
}

export const useSmartSearch = (
  options: UseSmartSearchOptions
): UseSmartSearchReturn => {
  const { items, debounceDelay = 300, autoSelect = false, onAutoSelect } = options

  const [searchTerm, setSearchTerm] = useState<string>('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('')

  // Debounce para el término de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, debounceDelay)

    return () => clearTimeout(timer)
  }, [searchTerm, debounceDelay])

  // Filtrar items con búsqueda inteligente (usa el término con debounce)
  const filteredItems = useMemo(() => {
    return smartSearch(items, debouncedSearchTerm)
  }, [items, debouncedSearchTerm])

  // Auto-seleccionar el resultado más relevante cuando cambian los items filtrados
  useEffect(() => {
    if (autoSelect && debouncedSearchTerm.trim() && filteredItems.length > 0) {
      const bestMatch = filteredItems[0] // El primer resultado es el más relevante (ya está ordenado)
      if (bestMatch && onAutoSelect) {
        onAutoSelect(bestMatch)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredItems, debouncedSearchTerm, autoSelect])

  // Función para limpiar la búsqueda
  const clearSearch = useCallback(() => {
    setSearchTerm('')
    setDebouncedSearchTerm('')
  }, [])

  return {
    searchTerm,
    debouncedSearchTerm,
    setSearchTerm,
    filteredItems,
    clearSearch
  }
}

