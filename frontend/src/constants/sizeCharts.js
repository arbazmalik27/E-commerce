/**
 * Centralized Size Chart Definitions & Deterministic Recommendation Engine (Frontend)
 * 
 * Provides reference charts and deterministic sizing recommendations.
 * No AI/ML is used. Sizing recommendations are deterministic and explainable.
 */

export const SIZE_CHART_TYPES = {
  MEN_TOPS: 'men-tops',
  MEN_BOTTOMS: 'men-bottoms',
  WOMEN_TOPS: 'women-tops',
  WOMEN_BOTTOMS: 'women-bottoms',
  FOOTWEAR: 'footwear',
  KIDS_CLOTHING: 'kids-clothing',
  KIDS_FOOTWEAR: 'kids-footwear',
}

/**
 * Maps department and subcategory to a sizing chart type.
 * Returns null if the category does not have clothing/footwear sizing (e.g. accessories, beauty).
 */
export const getProductSizeCategory = (department, subcategory) => {
  if (!department) return null
  const dept = String(department).toLowerCase().trim()
  const subcat = subcategory ? String(subcategory).toLowerCase().trim() : ''

  if (dept === 'accessories' || dept === 'beauty-fragrance') {
    return null
  }

  if (dept === 'footwear' || subcat === 'kids-footwear') {
    if (subcat === 'kids-footwear' || dept === 'kids') {
      return SIZE_CHART_TYPES.KIDS_FOOTWEAR
    }
    return SIZE_CHART_TYPES.FOOTWEAR
  }

  if (dept === 'kids') {
    if (subcat === 'kids-footwear') return SIZE_CHART_TYPES.KIDS_FOOTWEAR
    if (subcat === 'kids-accessories') return null
    return SIZE_CHART_TYPES.KIDS_CLOTHING
  }

  if (dept === 'men' || dept === 'mens') {
    if (['jeans', 'trousers', 'shorts'].includes(subcat)) {
      return SIZE_CHART_TYPES.MEN_BOTTOMS
    }
    return SIZE_CHART_TYPES.MEN_TOPS
  }

  if (dept === 'women' || dept === 'womens') {
    if (['jeans', 'trousers', 'skirts'].includes(subcat)) {
      return SIZE_CHART_TYPES.WOMEN_BOTTOMS
    }
    return SIZE_CHART_TYPES.WOMEN_TOPS
  }

  return null
}

/**
 * Standard generic reference size charts.
 * All measurements specified in inches with CM conversions available.
 */
export const SIZE_CHARTS = {
  [SIZE_CHART_TYPES.MEN_TOPS]: {
    name: "Men's Tops & Outerwear",
    description: 'Reference measurements for T-Shirts, Shirts, Jackets, and Sweaters.',
    headers: ['Size', 'Chest', 'Waist', 'Length'],
    sizes: [
      { label: 'XS', chestMin: 34, chestMax: 36, waistMin: 28, waistMax: 30, length: 26 },
      { label: 'S',  chestMin: 36, chestMax: 38, waistMin: 30, waistMax: 32, length: 27 },
      { label: 'M',  chestMin: 38, chestMax: 40, waistMin: 32, waistMax: 34, length: 28 },
      { label: 'L',  chestMin: 40, chestMax: 42, waistMin: 34, waistMax: 36, length: 29 },
      { label: 'XL', chestMin: 42, chestMax: 44, waistMin: 36, waistMax: 38, length: 30 },
      { label: 'XXL', chestMin: 44, chestMax: 47, waistMin: 38, waistMax: 41, length: 31 },
    ],
    primaryKey: 'chest',
    fields: [
      { id: 'chest', label: 'Chest Circumference', hint: 'Measure around the fullest part of your chest', required: true },
      { id: 'waist', label: 'Waist Circumference', hint: 'Measure around your natural waistline', required: false },
    ],
  },

  [SIZE_CHART_TYPES.MEN_BOTTOMS]: {
    name: "Men's Trousers, Jeans & Shorts",
    description: 'Reference measurements for Jeans, Trousers, and Casual Shorts.',
    headers: ['Size', 'Waist', 'Hip', 'Inseam'],
    sizes: [
      { label: 'XS', waistMin: 28, waistMax: 29, hipMin: 34, hipMax: 35, length: 30 },
      { label: 'S',  waistMin: 30, waistMax: 31, hipMin: 36, hipMax: 37, length: 31 },
      { label: 'M',  waistMin: 32, waistMax: 33, hipMin: 38, hipMax: 39, length: 32 },
      { label: 'L',  waistMin: 34, waistMax: 35, hipMin: 40, hipMax: 41, length: 32 },
      { label: 'XL', waistMin: 36, waistMax: 37, hipMin: 42, hipMax: 43, length: 32 },
      { label: 'XXL', waistMin: 38, waistMax: 40, hipMin: 44, hipMax: 46, length: 33 },
    ],
    primaryKey: 'waist',
    fields: [
      { id: 'waist', label: 'Waist Circumference', hint: 'Measure around your waist where you wear trousers', required: true },
      { id: 'hip', label: 'Hip Circumference', hint: 'Measure around the fullest part of your hips', required: false },
    ],
  },

  [SIZE_CHART_TYPES.WOMEN_TOPS]: {
    name: "Women's Tops, Dresses & Outerwear",
    description: 'Reference measurements for Tops, Kurtis, Dresses, and Jackets.',
    headers: ['Size', 'Bust', 'Waist', 'Hip'],
    sizes: [
      { label: 'XS', chestMin: 31, chestMax: 33, waistMin: 24, waistMax: 26, hipMin: 34, hipMax: 36 },
      { label: 'S',  chestMin: 33, chestMax: 35, waistMin: 26, waistMax: 28, hipMin: 36, hipMax: 38 },
      { label: 'M',  chestMin: 35, chestMax: 37, waistMin: 28, waistMax: 30, hipMin: 38, hipMax: 40 },
      { label: 'L',  chestMin: 37, chestMax: 40, waistMin: 30, waistMax: 33, hipMin: 40, hipMax: 43 },
      { label: 'XL', chestMin: 40, chestMax: 43, waistMin: 33, waistMax: 36, hipMin: 43, hipMax: 46 },
      { label: 'XXL', chestMin: 43, chestMax: 46, waistMin: 36, waistMax: 39, hipMin: 46, hipMax: 49 },
    ],
    primaryKey: 'chest',
    fields: [
      { id: 'chest', label: 'Bust Circumference', hint: 'Measure around the fullest part of your bust', required: true },
      { id: 'waist', label: 'Waist Circumference', hint: 'Measure around the narrowest part of your waist', required: false },
      { id: 'hip', label: 'Hip Circumference', hint: 'Measure around the widest part of your hips', required: false },
    ],
  },

  [SIZE_CHART_TYPES.WOMEN_BOTTOMS]: {
    name: "Women's Jeans, Trousers & Skirts",
    description: 'Reference measurements for Jeans, Trousers, and Skirts.',
    headers: ['Size', 'Waist', 'Hip', 'Inseam'],
    sizes: [
      { label: 'XS', waistMin: 24, waistMax: 26, hipMin: 34, hipMax: 36, length: 29 },
      { label: 'S',  waistMin: 26, waistMax: 28, hipMin: 36, hipMax: 38, length: 29 },
      { label: 'M',  waistMin: 28, waistMax: 30, hipMin: 38, hipMax: 40, length: 30 },
      { label: 'L',  waistMin: 30, waistMax: 33, hipMin: 40, hipMax: 43, length: 30 },
      { label: 'XL', waistMin: 33, waistMax: 36, hipMin: 43, hipMax: 46, length: 30 },
      { label: 'XXL', waistMin: 36, waistMax: 39, hipMin: 46, hipMax: 49, length: 31 },
    ],
    primaryKey: 'waist',
    fields: [
      { id: 'waist', label: 'Waist Circumference', hint: 'Measure around your natural waistline', required: true },
      { id: 'hip', label: 'Hip Circumference', hint: 'Measure around the fullest part of your hips', required: false },
    ],
  },

  [SIZE_CHART_TYPES.FOOTWEAR]: {
    name: 'Footwear (UK / India)',
    description: 'Standard sizing for Sneakers, Shoes, Boots, and Sandals.',
    headers: ['Size (UK/IN)', 'Foot Length (in)', 'Foot Length (cm)', 'EU Equivalent'],
    sizes: [
      { label: '6',  footMin: 9.6, footMax: 9.8, footMinCm: 24.5, footMaxCm: 25.0, eu: '39-40' },
      { label: '7',  footMin: 9.9, footMax: 10.1, footMinCm: 25.1, footMaxCm: 25.8, eu: '40-41' },
      { label: '8',  footMin: 10.2, footMax: 10.4, footMinCm: 25.9, footMaxCm: 26.6, eu: '42' },
      { label: '9',  footMin: 10.5, footMax: 10.8, footMinCm: 26.7, footMaxCm: 27.4, eu: '43' },
      { label: '10', footMin: 10.9, footMax: 11.1, footMinCm: 27.5, footMaxCm: 28.2, eu: '44-45' },
      { label: '11', footMin: 11.2, footMax: 11.5, footMinCm: 28.3, footMaxCm: 29.1, eu: '46' },
      { label: '12', footMin: 11.6, footMax: 11.9, footMinCm: 29.2, footMaxCm: 30.0, eu: '47' },
    ],
    primaryKey: 'footLength',
    fields: [
      { id: 'footLength', label: 'Foot Length', hint: 'Heel to longest toe on a flat surface', required: true },
    ],
  },

  [SIZE_CHART_TYPES.KIDS_CLOTHING]: {
    name: "Kids' Clothing",
    description: 'Standard sizing reference by age range and height for boys and girls.',
    headers: ['Size / Age', 'Child Height', 'Chest', 'Waist'],
    sizes: [
      { label: '2-3Y',  heightMin: 35, heightMax: 38, chestMin: 20, chestMax: 21, waistMin: 19, waistMax: 20 },
      { label: '4-5Y',  heightMin: 39, heightMax: 43, chestMin: 22, chestMax: 23, waistMin: 21, waistMax: 21.5 },
      { label: '6-7Y',  heightMin: 44, heightMax: 48, chestMin: 24, chestMax: 25, waistMin: 22, waistMax: 22.5 },
      { label: '8-9Y',  heightMin: 49, heightMax: 52, chestMin: 26, chestMax: 27, waistMin: 23, waistMax: 23.5 },
      { label: '10-11Y', heightMin: 53, heightMax: 56, chestMin: 28, chestMax: 29, waistMin: 24, waistMax: 25 },
      { label: '12-13Y', heightMin: 57, heightMax: 60, chestMin: 30, chestMax: 31, waistMin: 25, waistMax: 26 },
    ],
    primaryKey: 'age',
    fields: [
      { id: 'age', label: 'Child Age (Years)', hint: 'Enter child approximate age in years (e.g. 5)', required: true },
      { id: 'height', label: 'Child Height', hint: 'Child height standing straight without shoes', required: false },
    ],
  },

  [SIZE_CHART_TYPES.KIDS_FOOTWEAR]: {
    name: "Kids' Footwear",
    description: 'Standard kids shoe sizes by foot length.',
    headers: ['Size (UK/IN)', 'Foot Length (in)', 'Foot Length (cm)'],
    sizes: [
      { label: '8K',  footMin: 5.7, footMax: 6.0, footMinCm: 14.5, footMaxCm: 15.2 },
      { label: '9K',  footMin: 6.1, footMax: 6.3, footMinCm: 15.3, footMaxCm: 16.0 },
      { label: '10K', footMin: 6.4, footMax: 6.7, footMinCm: 16.1, footMaxCm: 17.0 },
      { label: '11K', footMin: 6.8, footMax: 7.0, footMinCm: 17.1, footMaxCm: 17.8 },
      { label: '12K', footMin: 7.1, footMax: 7.3, footMinCm: 17.9, footMaxCm: 18.6 },
      { label: '13K', footMin: 7.4, footMax: 7.7, footMinCm: 18.7, footMaxCm: 19.5 },
      { label: '1',   footMin: 7.8, footMax: 8.0, footMinCm: 19.6, footMaxCm: 20.3 },
      { label: '2',   footMin: 8.1, footMax: 8.3, footMinCm: 20.4, footMaxCm: 21.2 },
    ],
    primaryKey: 'footLength',
    fields: [
      { id: 'footLength', label: 'Foot Length', hint: 'Heel to longest toe on a flat surface', required: true },
    ],
  },
}

/**
 * Deterministic Rule-Based Size Recommendation Engine.
 */
export const recommendSize = ({
  department,
  subcategory,
  productSizes = [],
  measurements = {},
  unit = 'in', // 'in' or 'cm'
  fitPreference = 'regular', // 'slim', 'regular', 'relaxed'
}) => {
  const chartType = getProductSizeCategory(department, subcategory)

  if (!chartType || !SIZE_CHARTS[chartType]) {
    return {
      status: 'unsupported',
      message: 'Size recommendation is not applicable for this product category.',
    }
  }

  const chart = SIZE_CHARTS[chartType]
  const availableProductSizes = Array.isArray(productSizes)
    ? productSizes.filter((s) => s && s.available !== false).map((s) => s.label)
    : []

  const primaryField = chart.primaryKey
  let primaryValue = measurements[primaryField]

  if (primaryValue === undefined || primaryValue === null || primaryValue === '') {
    return {
      status: 'insufficient_data',
      chartType,
      message: `Please enter your ${primaryField === 'footLength' ? 'foot length' : primaryField} to receive a recommendation.`,
    }
  }

  primaryValue = Number(primaryValue)
  if (isNaN(primaryValue) || primaryValue <= 0) {
    return {
      status: 'invalid_data',
      chartType,
      message: 'Please enter a valid positive numerical measurement.',
    }
  }

  let valInInches = primaryValue
  if (unit === 'cm' && primaryField !== 'age') {
    valInInches = Number((primaryValue / 2.54).toFixed(2))
  }

  const chartSizes = chart.sizes

  if (primaryField === 'age') {
    const age = primaryValue
    let bestSize = null
    let betweenSizes = null

    if (age <= 3) {
      bestSize = chartSizes[0]
    } else if (age <= 5) {
      bestSize = chartSizes[1]
    } else if (age <= 7) {
      bestSize = chartSizes[2]
    } else if (age <= 9) {
      bestSize = chartSizes[3]
    } else if (age <= 11) {
      bestSize = chartSizes[4]
    } else if (age <= 13) {
      bestSize = chartSizes[5]
    } else {
      bestSize = chartSizes[chartSizes.length - 1]
    }

    return finalizeRecommendation({
      bestSizeLabel: bestSize.label,
      betweenSizes,
      fitPreference,
      availableProductSizes,
      allProductSizes: productSizes,
      reason: `Based on an age of ${age} year${age > 1 ? 's' : ''}, size ${bestSize.label} is standard.`,
    })
  }

  if (primaryField === 'footLength') {
    let matchedSize = null
    let between = null

    for (let i = 0; i < chartSizes.length; i++) {
      const s = chartSizes[i]
      const min = unit === 'cm' ? s.footMinCm : s.footMin
      const max = unit === 'cm' ? s.footMaxCm : s.footMax

      if (primaryValue >= min && primaryValue <= max) {
        matchedSize = s
        break
      }

      if (i < chartSizes.length - 1) {
        const next = chartSizes[i + 1]
        const nextMin = unit === 'cm' ? next.footMinCm : next.footMin
        if (primaryValue > max && primaryValue < nextMin) {
          matchedSize = fitPreference === 'relaxed' ? next : s
          between = { lower: s.label, upper: next.label }
          break
        }
      }
    }

    if (!matchedSize) {
      const first = chartSizes[0]
      const last = chartSizes[chartSizes.length - 1]
      const firstMin = unit === 'cm' ? first.footMinCm : first.footMin
      const lastMax = unit === 'cm' ? last.footMaxCm : last.footMax

      if (primaryValue < firstMin) {
        matchedSize = first
      } else if (primaryValue > lastMax) {
        matchedSize = last
      }
    }

    return finalizeRecommendation({
      bestSizeLabel: matchedSize.label,
      betweenSizes: between,
      fitPreference,
      availableProductSizes,
      allProductSizes: productSizes,
      reason: between
        ? `Your foot length falls between size ${between.lower} and ${between.upper}. ${fitPreference === 'relaxed' ? `Consider ${between.upper} for a more comfortable fit.` : `Consider ${between.lower} for a snug fit.`}`
        : `Based on your foot measurement of ${primaryValue} ${unit}, size ${matchedSize.label} is the closest match.`,
    })
  }

  let matchedIndex = -1
  let between = null

  for (let i = 0; i < chartSizes.length; i++) {
    const s = chartSizes[i]
    const min = chartType.includes('bottoms') ? s.waistMin : s.chestMin
    const max = chartType.includes('bottoms') ? s.waistMax : s.chestMax

    if (valInInches >= min && valInInches <= max) {
      matchedIndex = i
      break
    }

    if (i < chartSizes.length - 1) {
      const next = chartSizes[i + 1]
      const nextMin = chartType.includes('bottoms') ? next.waistMin : next.chestMin

      if (valInInches > max && valInInches < nextMin) {
        between = { lower: s.label, upper: next.label }
        matchedIndex = fitPreference === 'relaxed' ? i + 1 : i
        break
      }
    }
  }

  if (matchedIndex === -1) {
    const first = chartSizes[0]
    const last = chartSizes[chartSizes.length - 1]
    const firstMin = chartType.includes('bottoms') ? first.waistMin : first.chestMin
    const lastMax = chartType.includes('bottoms') ? last.waistMax : last.chestMax

    if (valInInches < firstMin) {
      matchedIndex = 0
    } else if (valInInches > lastMax) {
      matchedIndex = chartSizes.length - 1
    } else {
      matchedIndex = Math.floor(chartSizes.length / 2)
    }
  }

  if (!between) {
    if (fitPreference === 'relaxed' && matchedIndex < chartSizes.length - 1) {
      const s = chartSizes[matchedIndex]
      const min = chartType.includes('bottoms') ? s.waistMin : s.chestMin
      const max = chartType.includes('bottoms') ? s.waistMax : s.chestMax
      const mid = (min + max) / 2
      if (valInInches >= mid) {
        between = { lower: s.label, upper: chartSizes[matchedIndex + 1].label }
        matchedIndex = matchedIndex + 1
      }
    } else if (fitPreference === 'slim' && matchedIndex > 0) {
      const s = chartSizes[matchedIndex]
      const min = chartType.includes('bottoms') ? s.waistMin : s.chestMin
      const max = chartType.includes('bottoms') ? s.waistMax : s.chestMax
      const mid = (min + max) / 2
      if (valInInches <= mid) {
        between = { lower: chartSizes[matchedIndex - 1].label, upper: s.label }
        matchedIndex = matchedIndex - 1
      }
    }
  }

  const bestSize = chartSizes[matchedIndex]
  const measurementName = chartType.includes('bottoms') ? 'waist' : 'chest'
  const reason = between
    ? `You're between ${between.lower} and ${between.upper}. ${fitPreference === 'relaxed' ? `Consider ${between.upper} for a roomier fit.` : `Consider ${between.lower} for a tailored fit.`}`
    : `Based on your ${measurementName} measurement of ${primaryValue} ${unit}, ${bestSize.label} is the closest match.`

  return finalizeRecommendation({
    bestSizeLabel: bestSize.label,
    betweenSizes: between,
    fitPreference,
    availableProductSizes,
    allProductSizes: productSizes,
    reason,
  })
}

const finalizeRecommendation = ({
  bestSizeLabel,
  betweenSizes,
  fitPreference,
  availableProductSizes,
  allProductSizes,
  reason,
}) => {
  const hasConfiguredSizes = Array.isArray(allProductSizes) && allProductSizes.length > 0

  if (!hasConfiguredSizes) {
    return {
      status: 'recommended',
      recommendedSize: bestSizeLabel,
      isAvailable: true,
      betweenSizes,
      fitPreference,
      reason,
      disclaimer: 'Recommended based on the measurements provided. Actual fit may vary depending on fabric, cut, and personal preference.',
    }
  }

  const isAvailable = availableProductSizes.includes(bestSizeLabel)
  const isExistingSize = allProductSizes.some((s) => s.label === bestSizeLabel)

  if (isAvailable) {
    return {
      status: 'recommended',
      recommendedSize: bestSizeLabel,
      isAvailable: true,
      betweenSizes,
      fitPreference,
      reason,
      disclaimer: 'Recommended based on the measurements provided. Actual fit may vary depending on fabric, cut, and personal preference.',
    }
  }

  return {
    status: isExistingSize ? 'out_of_stock' : 'size_unavailable',
    recommendedSize: bestSizeLabel,
    isAvailable: false,
    betweenSizes,
    fitPreference,
    reason,
    stockMessage: isExistingSize
      ? `Your closest size (${bestSizeLabel}) is currently out of stock for this item.`
      : `Your closest size (${bestSizeLabel}) is not offered for this item.`,
    disclaimer: 'Recommended based on the measurements provided. Sizing does not guarantee a perfect fit.',
  }
}
