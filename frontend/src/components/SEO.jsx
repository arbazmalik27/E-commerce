import useSEO from '../hooks/useSEO'

/**
 * Reusable SEO component for TrendVolt.
 * Renders null and updates document head tags via the useSEO hook.
 *
 * @param {Object} props - Refer to useSEO for parameter definitions.
 */
function SEO(props) {
  useSEO(props)
  return null
}

export default SEO
