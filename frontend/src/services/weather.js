// Weather service for fetching weather data by geolocation
// Uses OpenWeatherMap API (requires API key)

const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY
const BASE_URL = "https://api.openweathermap.org/data/2.5/weather"

export async function getWeatherByCoords(lat, lon) {
  if (!OPENWEATHER_API_KEY) throw new Error("Missing OpenWeatherMap API key")
  const url = `${BASE_URL}?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
  const response = await fetch(url)
  if (!response.ok) throw new Error("Failed to fetch weather data")
  const data = await response.json()
  return {
    main: data.weather[0].main,
    description: data.weather[0].description,
    icon: data.weather[0].icon,
    temp: data.main.temp,
    city: data.name,
    country: data.sys.country,
  }
} 