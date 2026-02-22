import L from "leaflet"

// Load Leaflet CSS dynamically (can't use @import in concatenated SCSS)
function loadLeafletCSS() {
  if (document.getElementById("leaflet-css")) return
  const link = document.createElement("link")
  link.id = "leaflet-css"
  link.rel = "stylesheet"
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  document.head.appendChild(link)
}

// Marker icon fix for bundled Leaflet (default icon paths break with bundlers)
const defaultIcon = L.icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

interface LocationData {
  title: string
  slug: string
  lat: number
  lng: number
}

function renderMap(container: HTMLElement) {
  const raw = container.getAttribute("data-locations")
  const baseSlug = container.getAttribute("data-base") ?? ""
  if (!raw) return

  const locations: LocationData[] = JSON.parse(raw)
  if (locations.length === 0) return

  loadLeafletCSS()

  // Clear any existing map instance
  container.innerHTML = ""

  const map = L.map(container, {
    scrollWheelZoom: false,
  })

  // OpenStreetMap tiles (free, no API key)
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(map)

  // Compute base path for resolving links
  const baseParts = baseSlug.split("/")
  baseParts.pop() // remove the file part to get directory
  const baseDir = baseParts.length > 0 ? baseParts.join("/") + "/" : ""

  // Add markers
  const markers: L.Marker[] = []
  for (const loc of locations) {
    const marker = L.marker([loc.lat, loc.lng], { icon: defaultIcon }).addTo(map)

    // Build relative link from current page to the target page
    const href = `/${loc.slug}`
    marker.bindPopup(
      `<a href="${href}" class="internal" data-slug="${loc.slug}" style="font-weight:500; text-decoration:none;">${loc.title}</a>`,
    )
    markers.push(marker)
  }

  // Fit map to show all markers with padding
  if (markers.length > 0) {
    const group = L.featureGroup(markers)
    map.fitBounds(group.getBounds().pad(0.15))
  }

  // Enable scroll zoom after first click on map
  map.once("click", () => {
    map.scrollWheelZoom.enable()
  })

  // Handle popup link clicks for SPA navigation
  container.addEventListener("click", (e) => {
    const target = e.target as HTMLElement
    if (target.tagName === "A" && target.classList.contains("internal")) {
      e.preventDefault()
      const href = target.getAttribute("href")
      if (href) {
        window.location.href = href
      }
    }
  })

  return map
}

document.addEventListener("nav", () => {
  const container = document.getElementById("travel-map")
  if (!container) return

  const mapInstance = renderMap(container)

  if (mapInstance) {
    window.addCleanup(() => {
      mapInstance.remove()
    })
  }
})
