import { createContext, useContext, useEffect, useState } from "react"
import { getWeatherByCoords } from "../services/weather"

const WeatherContext = createContext()

export function WeatherProvider({ children }) {
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.")
      setLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const data = await getWeatherByCoords(position.coords.latitude, position.coords.longitude)
          setWeather(data)
        } catch (err) {
          setError("Failed to fetch weather data.")
        } finally {
          setLoading(false)
        }
      },
      (err) => {
        setError("Unable to retrieve your location.")
        setLoading(false)
      }
    )
  }, [])

  return (
    <WeatherContext.Provider value={{ weather, loading, error }}>
      {children}
    </WeatherContext.Provider>
  )
}

export function useWeather() {
  return useContext(WeatherContext)
} 